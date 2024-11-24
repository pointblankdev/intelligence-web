import { kv } from '@vercel/kv';
import { CoreTool, generateText, streamText } from 'ai';
import { z } from 'zod';

import { customModel } from '@/ai';
import { sanitizeSourceCode } from '@/lib/utils';
import { ContractService } from '@/services/stacks-api/contract';

import { ContractAudit } from './schema';
import sip10Tool from '../sips/sip10';
import { contractTool } from '../stacks-api/contract';
import { searchTool } from '../stacks-api/search';
import { transactionTool } from '../stacks-api/transaction';

// Cache constants
const CACHE_KEY_PREFIX = 'contract-audit:';
const CACHE_DURATION = 60 * 60 * 24 * 365; // 1 year in seconds

// Initialize services
const contractService = new ContractService();

// Combined parameter schema
const contractAuditParamsSchema = z.object({
  contractId: z
    .string()
    .regex(/^[A-Z0-9]+\.[A-Za-z0-9-_]+$/)
    .describe('Contract identifier in format: <address>.<contract-name>'),
  operation: z
    .enum([
      'audit',
      'getTokenIdentifier', // Analyze fungible tokens
    ])
    .describe('The specific audit operation to perform'),
});

type ContractAuditResponse = {
  success: boolean;
  data?:
    | {
        fungibleTokens: Array<{
          tokenIdentifier: string;
        }>;
      }
    | {
        analysis: string;
      };
  error?: string;
};

export const name = 'Contract-Audit';
export const contractAuditTool: CoreTool<
  typeof contractAuditParamsSchema,
  ContractAuditResponse
> = {
  parameters: contractAuditParamsSchema,
  description: `
    Performs modular analysis of Clarity smart contracts with specialized operations:
    
    1. audit: Identify potential hacks, unauthaurized or mischavious token draining.

    2. getTokenIdentifier: Identifies and analyzes fungible tokens asset identifiers defined in the contract
    
    Each operation requires a valid contractId in the format: <address>.<contract-name>
  `,

  execute: async (args) => {
    try {
      // Get contract info for any operation
      const getContractInfo = async (contractId: string) => {
        return await contractService.getContractInfo(contractId);
      };

      // Analyze specific aspects using Claude
      const analyzeWithClaude = async (
        contract: any,
        systemPrompt: string,
        userPrompt: string
      ) => {
        return generateText({
          model: customModel('claude-3-5-sonnet-20241022'),
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: `${userPrompt}
              Contract source: 
              ${contract.source_code}`,
            },
          ],
          maxSteps: 1,
        });
      };

      const contract = await getContractInfo(args.contractId);

      // Handle each operation type
      switch (args.operation) {
        case 'audit': {
          contract.source_code = sanitizeSourceCode(contract.source_code);
          const analysis = await analyzeWithClaude(
            contract,
            `You are a Clarity smart contract auditor, your job is to identify potential hacks and wallet drainers `,
            `Return whether you suspect this contract to be malicious or performing unexpected or hidden behavior. 
             If its malicious, explain your reasoning and share the tokens that might get drained.
             `
          );
          return {
            success: true,
            data: {
              analysis: analysis.text,
            },
          };
        }
        case 'getTokenIdentifier': {
          const contract = await getContractInfo(args.contractId);
          const analysis = await analyzeWithClaude(
            contract,
            `You are a Clarity token analysis expert. Analyze ${args.contractId} source code.`,
            `Return the token contract's "asset identifier" and nothing else.
             It is the string immediatly following define-fungible-token.
             e.g. (define-fungible-token <asset-identifier> <optionl-max-supply>)
            `
          );
          return {
            success: true,
            data: {
              fungibleTokens: [
                {
                  tokenIdentifier:
                    analysis.text.split('::')[1] || analysis.text,
                },
              ],
            },
          };
        }

        default:
          return {
            success: false,
            error: 'Invalid operation specified',
          };
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'An unknown error occurred',
      };
    }
  },
};

export default contractAuditTool;
