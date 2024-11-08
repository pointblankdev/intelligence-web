import { kv } from '@vercel/kv';
import { CoreTool, streamText } from 'ai';
import { z } from 'zod';

import { customModel } from '@/ai';
import { ContractService } from '@/services/stacks-api/contract';

import {
  ContractAudit,
  validateAuditResponse,
  safeValidateAuditResponse,
  type AuditResponse,
} from './schema';

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
            1. Fungible tokens and their tokenIdentifiers
            2. Data variables and maps defined in the contract
            3. Values that would need to be stored in Arcana
            4. Alignment classification with detailed reasoning

            Contract source:
            ${contract.source_code}

            Response must be valid JSON matching exactly this structure:
            {
              "fungibleTokens": [{
                "name": string,
                "symbol": string,
                "decimals": number,
                "tokenIdentifier": string,
                "isTransferable": boolean,
                "isMintable": boolean,
                "isBurnable": boolean,
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
        maxTokens: 4000,
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
        const jsonResponse = JSON.parse(auditResult);
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
