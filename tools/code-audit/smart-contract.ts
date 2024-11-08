import { kv } from '@vercel/kv';
import { CoreTool, streamText } from 'ai';
import { z } from 'zod';

import { customModel } from '@/ai';
import { ContractService } from '@/services/stacks-api/contract';

import {
  ContractAudit,
  safeValidateAuditResponse,
  type AuditResponse,
} from './schema';
import sip10Tool from '../sips/sip10';
import { contractTool } from '../stacks-api/contract';
import { searchTool } from '../stacks-api/search';
import { transactionTool } from '../stacks-api/transaction';

// Input parameters schema
const contractAuditParamsSchema = z.object({
  contractId: z
    .string()
    .regex(/^[A-Z0-9]+\.[A-Za-z0-9-_]+$/)
    .describe('Contract identifier in format: <address>.<contract-name>'),
  forceRefresh: z
    .boolean()
    .optional()
    .default(false)
    .describe('Force refresh the audit cache only when asked'),
});

// Response type
type ContractAuditResponse = {
  success: boolean;
  data?: ContractAudit;
  error?: string;
  cached?: boolean;
};

// Cache constants
const CACHE_KEY_PREFIX = 'contract-audit:';
const CACHE_DURATION = 60 * 60 * 24 * 365; // 1 year in seconds

// Initialize services
const contractService = new ContractService();

export const name = 'Contract-Audit';
export const contractAuditTool: CoreTool<
  typeof contractAuditParamsSchema,
  ContractAuditResponse
> = {
  parameters: contractAuditParamsSchema,
  description:
    'Performs a comprehensive audit of a Clarity smart contract with Arcana metrics analysis',

  execute: async (args) => {
    try {
      const cacheKey = `${CACHE_KEY_PREFIX}${args.contractId}`;

      // Check cache first
      if (!args.forceRefresh) {
        const cached = await kv.get<ContractAudit>(cacheKey);
        if (cached) {
          return {
            success: true,
            data: cached,
            cached: true,
          };
        }
      }

      const contract = await contractService.getContractInfo(args.contractId);

      // Stream the analysis using Claude
      const { fullStream } = await streamText({
        model: customModel('claude-3-5-sonnet-20241022'),
        system: `You are an expert Clarity smart contract auditor with deep understanding of common Stacks smart contract attack vectors.
                You will analyze contracts and provide detailed security audits in strict JSON format with no additional text or comments.`,
        messages: [
          {
            role: 'user',
            content: `Analyze this Clarity smart contract and provide a comprehensive audit in strict JSON format.
            Pay special attention to:
            1. Fungible tokens and their tokenIdentifiers (ft-token definition name)
            2. Data variables and maps defined in the contract
            3. Function definitions and their parameters
            4. Values that would need to be stored in Arcana
            5. Alignment classification with detailed reasoning

            Contract source:
            ${contract.source_code}

            Response must be only valid JSON matching exactly this structure with no other text or comments allowed so it can be parsed by automated tools:
            {
              "fungibleTokens": [{
                "name": string,
                "symbol": string,
                "decimals": number,
                "tokenIdentifier": string,
                "isTransferable": boolean,
                "isMintable": boolean,
                "isBurnable": boolean,
                "isLpToken": boolean,
                "totalSupply": string (optional),
                "maxSupply": string (optional)
              }],
              "variables": [{
                "name": string,
                "type": string,
                "access": "public" | "private",
                "constant": boolean,
                "currentValue": string (optional)
              }],
              "maps": [{
                "name": string,
                "keyType": string, 
                "valueType": string,
                "description": string
              }]
              "readOnlyFunctions": [{
                "name": string,
                "description": string (optional),
                "parameters": [{
                  "name": string,
                  "type": string,
                  "description": string (optional)
                }],
                "response": {
                  "type": string,
                  "description": string (optional)
                },
                "access": "read-only",
                "costEstimate": {
                  "runtime": number (optional),
                  "read_count": number (optional),
                  "write_count": number (optional)
                }
              }],
              "publicFunctions": [{
                "name": string,
                "description": string (optional),
                "parameters": [{
                  "name": string,
                  "type": string,
                  "description": string (optional)
                }],
                "response": {
                  "type": string,
                  "description": string (optional)
                },
                "access": "public",
                "costEstimate": {
                  "runtime": number (optional),
                  "read_count": number (optional),
                  "write_count": number (optional)
                }
              }],
              "arcanaRecommendation": {
                "alignment": number (0-9, based on criteria below),
                "reasoning": string (explain alignment choice)
              }
            }

            Alignment Scale:
            0 = Undefined
            1 = Lawful Constructive: Transparent governance, audited lending
            2 = Neutral Constructive: Yield optimization, community-driven
            3 = Chaotic Constructive: Privacy protocols, decentralized identity
            4 = Lawful Neutral: AMMs, stablecoins, escrow
            5 = True Neutral: Basic tokens, simple contracts
            6 = Chaotic Neutral: Experimental DeFi
            7 = Lawful Extractive: High-fee protocols
            8 = Neutral Extractive: MEV, aggressive farming
            9 = Chaotic Extractive: Malicious contracts, rug pulls`,
          },
        ],
        // gotta be careful with this, vercel apis will timeout at 15 seconds
        maxSteps: 5,
        experimental_activeTools: [
          'SIP010-Token',
          'Stacks-API-Contract',
          'Stacks-API-Search',
          'Stacks-API-Transaction',
        ],
        tools: {
          'SIP010-Token': sip10Tool,
          'Stacks-API-Contract': contractTool,
          'Stacks-API-Search': searchTool,
          'Stacks-API-Transaction': transactionTool,
        },
        maxTokens: 5000,
      });

      let auditResult = '';

      for await (const delta of fullStream) {
        if (delta.type === 'text-delta') {
          auditResult += delta.textDelta;
        }
      }

      // Validate the AI response
      let parsedResponse: AuditResponse;
      try {
        const jsonResponse = extractAndParseJson(auditResult);
        console.log(jsonResponse);
        const validationResult = safeValidateAuditResponse(jsonResponse);

        if (!validationResult.success) {
          console.error('Validation errors:', validationResult.error);
          return {
            success: false,
            error: 'AI generated invalid audit format',
          };
        }

        parsedResponse = validationResult.data;
      } catch (error) {
        console.error('JSON parse error:', error);
        return {
          success: false,
          error: 'Failed to parse AI response',
        };
      }

      // Combine validated response with contract info
      const audit: ContractAudit = {
        contractId: args.contractId,
        deploymentInfo: {
          blockHeight: contract.block_height,
          txId: contract.tx_id,
          clarityVersion: contract.clarity_version,
        },
        ...parsedResponse,
      };

      // Cache the validated results
      await kv.set(cacheKey, audit, {
        ex: CACHE_DURATION,
      });

      return {
        success: true,
        data: audit,
        cached: false,
      };
    } catch (error) {
      console.error('Contract audit error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'An unknown error occurred',
      };
    }
  },
};

export default contractAuditTool;

/**
 * Safely extracts JSON content from text by finding the outermost matching curly braces
 * @param text Text potentially containing JSON
 * @returns The extracted JSON string or null if no valid JSON structure found
 */
export function extractJsonContent(text: string): string | null {
  try {
    // Remove any leading or trailing whitespace
    const trimmed = text.trim();

    // Find first opening brace
    const firstBrace = trimmed.indexOf('{');
    if (firstBrace === -1) return null;

    let braceCount = 0;
    let lastClosingBrace = -1;

    // Iterate through the string tracking brace pairs
    for (let i = 0; i < trimmed.length; i++) {
      const char = trimmed[i];
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          lastClosingBrace = i;
          // Found complete JSON object, check if there are any other JSON objects
          const remaining = trimmed.slice(i + 1).trim();
          if (remaining.startsWith('{')) {
            // Found another JSON object, this might be an error
            console.warn('Multiple JSON objects found in response');
          }
          break;
        }
      }
    }

    // If we found a matching pair of braces
    if (lastClosingBrace !== -1) {
      const extracted = trimmed.slice(firstBrace, lastClosingBrace + 1);

      // Validate that it's actually valid JSON
      JSON.parse(extracted); // This will throw if invalid

      return extracted;
    }

    return null;
  } catch (error) {
    console.error('Error extracting JSON:', error);
    return null;
  }
}

/**
 * Safely extracts and parses JSON content
 * @param text Text potentially containing JSON
 * @returns Parsed JSON object or null if invalid
 */
export function extractAndParseJson<T = any>(text: string): T | null {
  try {
    const jsonContent = extractJsonContent(text);
    if (!jsonContent) return null;

    return JSON.parse(jsonContent) as T;
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return null;
  }
}
