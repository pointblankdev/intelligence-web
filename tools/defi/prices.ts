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
      'getPrices',
      'getAllPrices',
      'refreshPrices',
      'checkStale',
      'getPoolData',
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
const pricesService = KraxelService.getInstance(
  process.env.KRAXEL_API_URL || 'https://charisma.rocks/api/v0'
);

export const name = 'Token-Prices';
export const pricesTool: CoreTool<
  typeof pricesParamsSchema,
  PricesToolResponse
> = {
  parameters: pricesParamsSchema,
  description: `Get token prices and pool reserve data.
Available operations:
- getPrice: Get price for a single token
- getPrices: Get prices for multiple tokens
- getAllPrices: Get all available token prices
- getPoolData: Get all pool reserves and TVL data for balancing pools

when a user mentiones a token name, it might not be the token identifier.
For example, map these names to these token identifiers.and only pass a token identifier to the function.
If its not in this list, ask the user to provide you with a token identifier.
STX wrappers:
stx: SP1Y5YSTAHZ88XYK1VPDH24GY0HPX5J4JECTMY4A1.wstx
BTC Wrappers:
btc: SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.token-abtc
MEME Coins
welsh: SP3NE50GEXFG9SZGTT51P40X2CKYSZ5CC4ZTZ7A2G.welshcorgicoin-token"
leo: SP1AY6K3PQV5MRT6R4S671NWW2FRVPKM0BR162CT6.leo-token
charisma: SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS.charisma-token
aeusdc: SP3Y2ZSH8P7D50B0VBTSX11S7XSG24M1VB9YFQA4K.token-aeusdc
pepe: SP1Z92MPDQEWZXW36VX71Q25HKF5K2EPCJ304F275.tokensoft-token-v4k68639zxz
nothing: SP32AEEF6WW5Y0NMJ1S8SBSZDAY8R5J32NBZFPKKZ.nope
DEX:
alex: SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.token-alex
velar: SP1Y5YSTAHZ88XYK1VPDH24GY0HPX5J4JECTMY4A1.velar-token

Examples:
1. Get STX price:
   { "operation": "getPrice", "token": "SP1Y5YSTAHZ88XYK1VPDH24GY0HPX5J4JECTMY4A1.wstx" }

2. Get multiple prices:
   { "operation": "getPrices", "tokens": ["SP1Y5YSTAHZ88XYK1VPDH24GY0HPX5J4JECTMY4A1.wstx", "SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS.charisma-token"] }
    
   When you are aksed about market caps of certain tokens, add all reserve0ConvertUsd together if the token is the token0. if its the token1: add up all the reserve1ConvertUsd.
   `,

  execute: async (args) => {
    try {
      switch (args.operation) {
        case 'getPrice': {
          if (!args.token) {
            return {
              success: false,
              error: {
                code: 'MISSING_PARAMETER',
                message: 'Symbol is required for getPrice operation',
              },
            };
          }

          const price = await pricesService.getPrice(args.token);
          return {
            success: true,
            data: {
              price,
            },
          };
        }

        case 'getPrices': {
          if (!args.tokens?.length) {
            return {
              success: false,
              error: {
                code: 'MISSING_PARAMETER',
                message: 'Symbols array is required for getPrices operation',
              },
            };
          }

          const prices = await pricesService.getPrices(args.tokens);
          return {
            success: true,
            data: {
              prices,
            },
          };
        }

        case 'getAllPrices': {
          const prices = await pricesService.getAllPools();

          return {
            success: true,
            data: {
              prices,
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
