import { CoreTool } from 'ai';
import { z } from 'zod';

import { PriceError } from '@/services/defi/errors';
import { KraxelService } from '@/services/defi/kraxel';

const tokenIdentifierSchema = z.string().startsWith('SP').includes('.');

// Main operation parameters schema
const pricesParamsSchema = z.object({
  operation: z
    .enum([
      'getPrice',
      'getPriceById',
      'getPrices',
      'getAllPrices',
      'getAllPools',
    ])
    .describe('The price operation to perform'),

  // Parameters for single token operations
  token: tokenIdentifierSchema
    .optional()
    .describe('Token identifier for single token operations'),

  // Parameters for batch operations
  tokens: z
    .array(tokenIdentifierSchema)
    .optional()
    .describe('Array of tokens for batch operations'),
});

// Response types
type PricesToolResponse = {
  success: boolean;
  data?: {
    prices?: Record<string, number | string>;
    price?: number | string;
    isStale?: boolean;
    refreshed?: boolean;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  cached?: boolean;
  timestamp?: string;
};

// Initialize service
const pricesService = KraxelService.getInstance(
  process.env.KRAXEL_API_URL || 'http://167.172.182.71:3000/v1'
);

export const name = 'Kraxel';
export const pricesTool: CoreTool<
  typeof pricesParamsSchema,
  PricesToolResponse
> = {
  parameters: pricesParamsSchema,
  description: `Get token prices and pool reserve data.
Available operations:
- getPrice: Get price for a single token (falls back to pools if needed)
- getPriceById: Get price for a single token directly from price API
- getPrices: Get prices for multiple tokens
- getAllPrices: Get all token price data available
- getAllPools: Get all pool reserves and TVL data for balancing pools
   `,

  execute: async (args) => {
    try {
      switch (args.operation) {
        case 'getPriceById': {
          if (!args.token) {
            return {
              success: false,
              error: {
                code: 'MISSING_PARAMETER',
                message:
                  'Token identifier is required for getPriceById operation',
              },
            };
          }

          const price = await pricesService.getPriceById(args.token);
          return {
            success: true,
            data: {
              price,
            },
            timestamp: new Date().toISOString(),
          };
        }

        case 'getPrice': {
          if (!args.token) {
            return {
              success: false,
              error: {
                code: 'MISSING_PARAMETER',
                message: 'Token identifier is required for getPrice operation',
              },
            };
          }

          const price = await pricesService.getPrice(args.token);
          return {
            success: true,
            data: {
              price,
            },
            timestamp: new Date().toISOString(),
          };
        }

        case 'getPrices': {
          if (!args.tokens?.length) {
            return {
              success: false,
              error: {
                code: 'MISSING_PARAMETER',
                message:
                  'Token identifiers array is required for getPrices operation',
              },
            };
          }

          const prices = await pricesService.getPrices(args.tokens);
          return {
            success: true,
            data: {
              prices,
            },
            timestamp: new Date().toISOString(),
          };
        }

        case 'getAllPrices': {
          const prices = await pricesService.getAllPrices();
          return {
            success: true,
            data: {
              prices,
            },
            timestamp: new Date().toISOString(),
          };
        }

        case 'getAllPools': {
          const pools = await pricesService.getAllPools();
          return {
            success: true,
            data: {
              pools,
            },
            timestamp: new Date().toISOString(),
          };
        }

        default:
          return {
            success: false,
            error: {
              code: 'INVALID_OPERATION',
              message: 'Invalid operation requested',
            },
          };
      }
    } catch (error) {
      if (error instanceof PriceError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'An unknown error occurred',
        },
        timestamp: new Date().toISOString(),
      };
    }
  },
};

export default pricesTool;
