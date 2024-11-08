import { CoreTool } from 'ai';
import { z } from 'zod';

import { PriceError, PricesService } from '@/services/defi/prices';

// Schema for token symbols
const tokenSymbolSchema = z.string().min(1).max(10);

// Main operation parameters schema
const pricesParamsSchema = z.object({
  operation: z
    .enum([
      'getPrice',
      'getPrices',
      'getAllPrices',
      'refreshPrices',
      'checkStale',
    ])
    .describe('The price operation to perform'),

  // Parameters for single token operations
  symbol: tokenSymbolSchema
    .optional()
    .describe('Token symbol for single token operations'),

  // Parameters for batch operations
  symbols: z
    .array(tokenSymbolSchema)
    .optional()
    .describe('Array of token symbols for batch operations'),

  // Optional force refresh parameter
  forceRefresh: z
    .boolean()
    .optional()
    .default(false)
    .describe('Force refresh prices before operation'),
});

// Response types
type PricesToolResponse = {
  success: boolean;
  data?: {
    prices?: Record<string, number>;
    price?: number;
    isStale?: boolean;
    refreshed?: boolean;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  cached?: boolean;
};

// Initialize service
const pricesService = PricesService.getInstance(
  process.env.API_URL || 'https://charisma.rocks/api/v0'
);

export const name = 'Token-Prices';
export const pricesTool: CoreTool<
  typeof pricesParamsSchema,
  PricesToolResponse
> = {
  parameters: pricesParamsSchema,
  description: `Get token prices from various sources including DEX pools and external APIs.
Available operations:
- getPrice: Get price for a single token
- getPrices: Get prices for multiple tokens
- getAllPrices: Get all available token prices
- refreshPrices: Force refresh all prices
- checkStale: Check if prices for specific tokens are stale

Examples:
1. Get STX price:
   { "operation": "getPrice", "symbol": "STX" }

2. Get multiple prices:
   { "operation": "getPrices", "symbols": ["STX", "CHA", "WELSH"] }

3. Force refresh all prices:
   { "operation": "refreshPrices", "forceRefresh": true }`,

  execute: async (args) => {
    try {
      // Handle force refresh if requested
      if (args.forceRefresh) {
        await pricesService.refreshPrices();
      }

      switch (args.operation) {
        case 'getPrice': {
          if (!args.symbol) {
            return {
              success: false,
              error: {
                code: 'MISSING_PARAMETER',
                message: 'Symbol is required for getPrice operation',
              },
            };
          }

          const price = await pricesService.getPrice(args.symbol);
          const isStale = pricesService.isPriceStale(args.symbol);

          return {
            success: true,
            data: {
              price,
              isStale,
            },
          };
        }

        case 'getPrices': {
          if (!args.symbols?.length) {
            return {
              success: false,
              error: {
                code: 'MISSING_PARAMETER',
                message: 'Symbols array is required for getPrices operation',
              },
            };
          }

          const prices = await pricesService.getPrices(args.symbols);
          const isStale = args.symbols.some((symbol) =>
            pricesService.isPriceStale(symbol)
          );

          return {
            success: true,
            data: {
              prices,
              isStale,
            },
          };
        }

        case 'getAllPrices': {
          const prices = await pricesService.getAllPrices();

          return {
            success: true,
            data: {
              prices,
            },
          };
        }

        case 'refreshPrices': {
          await pricesService.refreshPrices();

          return {
            success: true,
            data: {
              refreshed: true,
            },
          };
        }

        case 'checkStale': {
          if (!args.symbols?.length) {
            return {
              success: false,
              error: {
                code: 'MISSING_PARAMETER',
                message: 'Symbols array is required for checkStale operation',
              },
            };
          }

          const staleStatus = args.symbols.reduce(
            (acc, symbol) => {
              acc[symbol] = pricesService.isPriceStale(symbol);
              return acc;
            },
            {} as Record<string, boolean>
          );

          return {
            success: true,
            data: {
              prices: staleStatus,
            },
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
          error,
        } as any;
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
      };
    }
  },
};

export default pricesTool;
