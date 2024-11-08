import { CoreTool } from 'ai';
import { z } from 'zod';

import {
  FtBasicMetadataResponse,
  FtMetadataResponse,
  MetadataService,
  PaginatedFtBasicMetadataResponse,
} from '@/services/stacks-api/tokens';

const metadataService = new MetadataService();

// Define the operation parameters schema
const metadataParamsSchema = z.object({
  operation: z
    .enum([
      'getTokenMetadata',
      'listTokens',
      'batchGetTokenMetadata',
      'findTokensBySymbol',
      'getTokensByContract',
    ])
    .describe('The metadata operation to perform.'),

  // Parameters for getTokenMetadata
  principal: z
    .string()
    .regex(/^[A-Z0-9]+\.[A-Za-z0-9-_]+$/)
    .optional()
    .describe('Contract principal in format: <address>.<contract-name>'),

  locale: z.string().optional().describe('Optional localization parameter'),

  // Parameters for listTokens
  queryOptions: z
    .object({
      name: z.string().optional(),
      symbol: z.string().optional(),
      address: z.string().optional(),
      offset: z.number().min(0).optional(),
      limit: z.number().min(1).max(60).optional(),
      order_by: z.string().optional(),
      order: z.enum(['asc', 'desc']).optional(),
    })
    .optional(),

  // Parameters for batchGetTokenMetadata
  principals: z
    .array(z.string().regex(/^[A-Z0-9]+\.[A-Za-z0-9-_]+$/))
    .optional()
    .describe('Array of contract principals for batch operations'),

  // Parameters for findTokensBySymbol
  symbol: z.string().optional(),

  // Parameters for getTokensByContract
  contractAddress: z.string().optional(),
  limit: z.number().min(1).max(60).optional().default(20),
});

type MetadataParams = z.infer<typeof metadataParamsSchema>;
type MetadataToolResponse = {
  success: boolean;
  data?:
    | FtMetadataResponse
    | PaginatedFtBasicMetadataResponse
    | Array<FtMetadataResponse | null>
    | FtBasicMetadataResponse[];
  error?: string;
};

export const name = 'Stacks-Token-Metadata';
export const metadataTool: CoreTool<
  typeof metadataParamsSchema,
  MetadataToolResponse
> = {
  parameters: metadataParamsSchema,
  description: `Interact with token metadata on the Stacks blockchain.
Available operations:
- getTokenMetadata: Get metadata for a specific fungible token
- listTokens: List fungible tokens with optional filtering
- batchGetTokenMetadata: Get metadata for multiple tokens at once
- findTokensBySymbol: Search tokens by symbol
- getTokensByContract: Get all tokens from a specific contract

Most operations support pagination and filtering options.`,

  execute: async (args: MetadataParams): Promise<MetadataToolResponse> => {
    try {
      const { operation } = args;

      switch (operation) {
        case 'getTokenMetadata':
          if (!args.principal) {
            throw new Error('Principal is required for getTokenMetadata');
          }
          const metadata = await metadataService.getFungibleTokenMetadata(
            args.principal,
            args.locale
          );
          return {
            success: true,
            data: metadata,
          };

        case 'listTokens':
          const tokens = await metadataService.listFungibleTokens(
            args.queryOptions || {}
          );
          return {
            success: true,
            data: tokens,
          };

        case 'batchGetTokenMetadata':
          if (!args.principals?.length) {
            throw new Error(
              'Principals array is required for batch operations'
            );
          }
          const batchResults = await metadataService.batchGetTokenMetadata(
            args.principals
          );
          return {
            success: true,
            data: batchResults,
          };

        case 'findTokensBySymbol':
          if (!args.symbol) {
            throw new Error('Symbol is required for findTokensBySymbol');
          }
          const symbolResults = await metadataService.findTokensBySymbol(
            args.symbol,
            args.limit
          );
          return {
            success: true,
            data: symbolResults,
          };

        case 'getTokensByContract':
          if (!args.contractAddress) {
            throw new Error(
              'Contract address is required for getTokensByContract'
            );
          }
          const contractTokens = await metadataService.getTokensByContract(
            args.contractAddress,
            args.limit
          );
          return {
            success: true,
            data: contractTokens,
          };

        default:
          throw new Error('Invalid metadata operation');
      }
    } catch (error) {
      console.error('Metadata operation error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
};

export default metadataTool;
