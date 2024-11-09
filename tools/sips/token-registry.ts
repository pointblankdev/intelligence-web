import { CoreTool } from 'ai';
import { z } from 'zod';

import { tokenRegistry } from '@/services/sips/token-registry';
import { ContractAudit } from '@/tools/code-audit/schema';

const tokenRegistryParamsSchema = z.object({
  operation: z
    .enum([
      // Discovery
      'registerToken',
      'registerSymbol',
      'registerLpToken',

      // Queries
      'getTokenInfo',
      'resolveSymbol',
      'getLpTokens',

      // List Operations
      'listAll',
      'listSymbols',
      'listMetadata',
      'listLpTokens',
      'listAudits',
      'listPools',
      'listPrices',

      // Updates
      'updateMetadata',
      'updateAudit',
      'updatePrice',

      // Maintenance
      'cleanup',
    ])
    .describe('Registry operation to perform'),

  // Token identification
  contractId: z.string().optional().describe('Contract principal'),
  symbol: z.string().optional().describe('Token symbol'),

  // Operation data
  metadata: z.record(z.any()).optional().describe('Token metadata'),
  audit: z.any().optional().describe('Contract audit results'),
  price: z.number().optional().describe('Token price'),

  // LP token info
  lpInfo: z
    .object({
      dex: z.string(),
      poolId: z.string(),
      token0: z.string(),
      token1: z.string(),
    })
    .optional()
    .describe('LP token information'),

  // Force operations
  force: z.boolean().optional().default(false),
});

export type RegistryResponse = {
  success: boolean;
  data?: any;
  error?: string;
};

export const tokenRegistryTool: CoreTool<
  typeof tokenRegistryParamsSchema,
  RegistryResponse
> = {
  parameters: tokenRegistryParamsSchema,
  description: `Token registry for maintaining a knowledge graph of token information, relationships, and metadata.

Operations:

1. Discovery:
   registerToken(contractId, metadata?) - Add new token with optional metadata
   registerSymbol(contractId, symbol, force?) - Map symbol to contract
   registerLpToken(contractId, lpInfo) - Register LP token with pool data

2. Queries:
   getTokenInfo(contractId) - Get enriched token data
   resolveSymbol(symbol) - Get contract for symbol
   getLpTokens(contractId) - Get LP tokens for contract

3. List Operations:
   listAll() - Get all enriched tokens
   listSymbols() - Get all symbol mappings
   listMetadata() - Get all token metadata
   listLpTokens() - Get all LP tokens and pools
   listAudits() - Get all contract audits
   listPools() - Get all pool relationships
   listPrices() - Get all token prices

4. Updates:
   updateMetadata(contractId, metadata) - Update token metadata
   updateAudit(contractId, audit) - Update contract audit
   updatePrice(symbol, price) - Update token price

Usage Notes:
- Use getTokenInfo to check existence before operations
- Get metadata by using the SIP10 tool with getTokenUriAndMetadata
- Metadata updates are additive (patch)
- Force flag overrides existing symbol mappings
- Contract addresses must be valid chain format
- Symbol operations are case-sensitive

AI Guidelines:
- Check registry before adding new tokens
- Update incomplete/outdated information
- Ask user to clarify conflicting data
- Prioritize basic metadata, relationships, audits, prices`,

  execute: async (args) => {
    try {
      switch (args.operation) {
        case 'registerToken': {
          if (!args.contractId) {
            return {
              success: false,
              error: 'Contract ID required',
            };
          }

          await tokenRegistry.addContract(args.contractId);

          // If metadata provided, store it
          if (args.metadata) {
            await tokenRegistry.setMetadata(args.contractId, args.metadata);
          }

          return {
            success: true,
            data: {
              contractId: args.contractId,
              registered: true,
            },
          };
        }

        case 'registerSymbol': {
          if (!args.symbol || !args.contractId) {
            return {
              success: false,
              error: 'Symbol and contract ID required',
            };
          }

          const success = await tokenRegistry.registerSymbol(
            args.symbol,
            args.contractId,
            args.force
          );

          return {
            success: true,
            data: {
              symbol: args.symbol,
              registered: success,
              conflict: !success && !args.force,
            },
          };
        }

        case 'registerLpToken': {
          if (!args.contractId || !args.lpInfo) {
            return {
              success: false,
              error: 'Contract ID and LP info required',
            };
          }

          await tokenRegistry.registerLpToken(args.contractId, args.lpInfo);

          return {
            success: true,
            data: {
              contractId: args.contractId,
              lpInfo: args.lpInfo,
            },
          };
        }

        case 'getTokenInfo': {
          if (!args.contractId) {
            return {
              success: false,
              error: 'Contract ID required',
            };
          }

          const tokenInfo = await tokenRegistry.getEnrichedToken(
            args.contractId
          );

          return {
            success: true,
            data: tokenInfo,
          };
        }

        case 'resolveSymbol': {
          if (!args.symbol) {
            return {
              success: false,
              error: 'Symbol required',
            };
          }

          const contractId = await tokenRegistry.getContractBySymbol(
            args.symbol
          );

          return {
            success: true,
            data: {
              symbol: args.symbol,
              contractId,
            },
          };
        }

        case 'updateMetadata': {
          if (!args.contractId || !args.metadata) {
            return {
              success: false,
              error: 'Contract ID and metadata required',
            };
          }

          await tokenRegistry.setMetadata(args.contractId, args.metadata);

          return {
            success: true,
            data: {
              contractId: args.contractId,
              metadata: args.metadata,
            },
          };
        }

        case 'updateAudit': {
          if (!args.contractId || !args.audit) {
            return {
              success: false,
              error: 'Contract ID and audit required',
            };
          }

          await tokenRegistry.setAudit(
            args.contractId,
            args.audit as ContractAudit
          );

          return {
            success: true,
            data: {
              contractId: args.contractId,
              updated: true,
            },
          };
        }

        case 'updatePrice': {
          if (!args.symbol || typeof args.price !== 'number') {
            return {
              success: false,
              error: 'Symbol and price required',
            };
          }

          await tokenRegistry.updatePrice(args.symbol, args.price);

          return {
            success: true,
            data: {
              symbol: args.symbol,
              price: args.price,
            },
          };
        }

        case 'cleanup': {
          await tokenRegistry.cleanup();
          return {
            success: true,
            data: {
              cleaned: true,
            },
          };
        }

        // New list operations
        case 'listAll': {
          const tokens = await tokenRegistry.listAllEnrichedTokens();
          return {
            success: true,
            data: { tokens },
          };
        }

        case 'listSymbols': {
          const symbols = await tokenRegistry.listAllSymbols();
          return {
            success: true,
            data: { symbols },
          };
        }

        case 'listMetadata': {
          const metadata = await tokenRegistry.listAllMetadata();
          return {
            success: true,
            data: { metadata },
          };
        }

        case 'listLpTokens': {
          const lpTokens = await tokenRegistry.listAllLpTokens();
          return {
            success: true,
            data: { lpTokens },
          };
        }

        case 'listAudits': {
          const audits = await tokenRegistry.listAllAudits();
          return {
            success: true,
            data: { audits },
          };
        }

        case 'listPools': {
          const pools = await tokenRegistry.listAllPools();
          return {
            success: true,
            data: { pools },
          };
        }

        case 'listPrices': {
          const prices = await tokenRegistry.getAllPrices();
          return {
            success: true,
            data: { prices },
          };
        }

        case 'registerToken': {
          if (!args.contractId) {
            return {
              success: false,
              error: 'Contract ID required',
            };
          }

          await tokenRegistry.addContract(args.contractId);

          if (args.metadata) {
            await tokenRegistry.setMetadata(args.contractId, args.metadata);
          }

          return {
            success: true,
            data: {
              contractId: args.contractId,
              registered: true,
            },
          };
        }

        case 'registerSymbol': {
          if (!args.symbol || !args.contractId) {
            return {
              success: false,
              error: 'Symbol and contract ID required',
            };
          }

          const success = await tokenRegistry.registerSymbol(
            args.symbol,
            args.contractId,
            args.force
          );

          return {
            success: true,
            data: {
              symbol: args.symbol,
              registered: success,
              conflict: !success && !args.force,
            },
          };
        }

        case 'registerLpToken': {
          if (!args.contractId || !args.lpInfo) {
            return {
              success: false,
              error: 'Contract ID and LP info required',
            };
          }

          await tokenRegistry.registerLpToken(args.contractId, args.lpInfo);

          return {
            success: true,
            data: {
              contractId: args.contractId,
              lpInfo: args.lpInfo,
            },
          };
        }

        case 'getTokenInfo': {
          if (!args.contractId) {
            return {
              success: false,
              error: 'Contract ID required',
            };
          }

          const tokenInfo = await tokenRegistry.getEnrichedToken(
            args.contractId
          );

          return {
            success: true,
            data: tokenInfo,
          };
        }

        case 'resolveSymbol': {
          if (!args.symbol) {
            return {
              success: false,
              error: 'Symbol required',
            };
          }

          const contractId = await tokenRegistry.getContractBySymbol(
            args.symbol
          );

          return {
            success: true,
            data: {
              symbol: args.symbol,
              contractId,
            },
          };
        }

        case 'updateMetadata': {
          if (!args.contractId || !args.metadata) {
            return {
              success: false,
              error: 'Contract ID and metadata required',
            };
          }

          await tokenRegistry.setMetadata(args.contractId, args.metadata);

          return {
            success: true,
            data: {
              contractId: args.contractId,
              metadata: args.metadata,
            },
          };
        }

        case 'updateAudit': {
          if (!args.contractId || !args.audit) {
            return {
              success: false,
              error: 'Contract ID and audit required',
            };
          }

          await tokenRegistry.setAudit(
            args.contractId,
            args.audit as ContractAudit
          );

          return {
            success: true,
            data: {
              contractId: args.contractId,
              updated: true,
            },
          };
        }

        case 'updatePrice': {
          if (!args.symbol || typeof args.price !== 'number') {
            return {
              success: false,
              error: 'Symbol and price required',
            };
          }

          await tokenRegistry.updatePrice(args.symbol, args.price);

          return {
            success: true,
            data: {
              symbol: args.symbol,
              price: args.price,
            },
          };
        }

        case 'cleanup': {
          await tokenRegistry.cleanup();
          return {
            success: true,
            data: {
              cleaned: true,
            },
          };
        }

        default:
          return {
            success: false,
            error: 'Invalid operation',
          };
      }
    } catch (error) {
      console.error('Token registry error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
};

export default tokenRegistryTool;
