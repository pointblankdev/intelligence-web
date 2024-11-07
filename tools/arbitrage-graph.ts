import { CoreTool } from 'ai';
import { z } from 'zod';

import {
  Token,
  LPToken,
  ArbitrageGraph,
  Liquidity,
} from '@/services/defi/arbitrage-graph';

// Define response types for different operations
type RateResponse = {
  rateAB?: number;
  rateBA?: number;
  rateA?: number;
  rateB?: number;
};

type ArbitrageResponse = {
  success: boolean;
  data?: RateResponse;
  error?: string;
  liquidityPools?: Array<{
    id: string;
    liquidityA: Liquidity;
    liquidityB: Liquidity;
  }>;
};

// Define the schema for individual token liquidity
const liquiditySchema = z.object({
  token: z.object({
    id: z.string().describe('Unique identifier for the token'),
  }),
  reserve: z
    .number()
    .min(0)
    .describe('Current reserve amount of the token in the pool'),
});

// Define the schema for liquidity pool
const liquidityPoolSchema = z.object({
  id: z.string().describe('Unique identifier for the liquidity pool'),
  liquidityA: liquiditySchema.describe('First token liquidity state'),
  liquidityB: liquiditySchema.describe('Second token liquidity state'),
});

// Define the schema for all possible operations
const arbitrageParamsSchema = z.object({
  operation: z
    .enum(['getSwapRate', 'getMintRates', 'getBurnRates', 'initializePools'])
    .describe('The operation to perform on the DEX graph'),

  // Operation-specific parameters
  sourceTokenId: z
    .string()
    .optional()
    .describe('Source token ID for swap rate calculation'),
  targetTokenId: z
    .string()
    .optional()
    .describe('Target token ID for swap rate calculation'),
  poolId: z
    .string()
    .optional()
    .describe('Liquidity pool ID for mint/burn operations'),

  // Batch initialization parameters
  liquidityPools: z
    .array(liquidityPoolSchema)
    .optional()
    .describe('Array of liquidity pools for initialization'),
});

// Create and maintain a single instance of ArbitrageGraph
let graphInstance: ArbitrageGraph | null = null;

export const name = 'DEX-Arbitrage';
export const arbitrageTool: CoreTool<
  typeof arbitrageParamsSchema,
  ArbitrageResponse
> = {
  parameters: arbitrageParamsSchema,
  description: `
    Analyzes DEX liquidity pools to find arbitrage opportunities and calculate various rates.

    IMPORTANT: Before using this tool, you must first:
    1. Get pool data using the DEX-Analysis tool with operation 'getPools'
    2. Initialize this tool with that pool data

    Example workflow:
    1. Get pools:
        const pools = await dexAnalysisTool.execute({ 
          operation: 'getPools',
          pools: { pairs: [...] }
        });

    2. Initialize arbitrage tool:
        await arbitrageTool.execute({
          operation: 'initializePools',
          pools: pools.data.pools
        });

    3. Use other operations:
        - getSwapRate: Calculate exchange rates between tokens
        - getMintRates: Calculate liquidity provision rates
        - getBurnRates: Calculate withdrawal rates

    All rates use constant product AMM formula.

    All arbitrage opportunities should start and end at the same token.
    All arbitrage paths should be multi-hop, and not ever swap the same pool twice except for the final return swap.
    When looking for arbitrage opportunities, consider multi-hop paths for best results.
    Also make sure to examine if tokens are minted or burned during the process, if that will increase the final amount of tokens out.
  `,
  execute: async (
    args: z.infer<typeof arbitrageParamsSchema>,
    { abortSignal }
  ): Promise<ArbitrageResponse> => {
    try {
      switch (args.operation) {
        case 'initializePools': {
          if (!args.liquidityPools?.length) {
            return {
              success: false,
              error:
                'At least one liquidity pool is required for initialization',
            };
          }

          // Create unique set of tokens from all pools
          const uniqueTokens = new Set<string>();
          args.liquidityPools.forEach((pool) => {
            uniqueTokens.add(pool.liquidityA.token.id);
            uniqueTokens.add(pool.liquidityB.token.id);
          });

          // Create Token instances
          const tokenInstances = Array.from(uniqueTokens).map(
            (id) => new Token(id)
          );

          // Create LPToken instances
          const lpTokenInstances = args.liquidityPools.map((pool) => {
            return new LPToken(
              pool.id,
              {
                token: new Token(pool.liquidityA.token.id),
                reserve: pool.liquidityA.reserve,
              },
              {
                token: new Token(pool.liquidityB.token.id),
                reserve: pool.liquidityB.reserve,
              }
            );
          });

          // Initialize the graph
          graphInstance = new ArbitrageGraph(tokenInstances, lpTokenInstances);

          return {
            success: true,
            liquidityPools: args.liquidityPools,
          };
        }

        case 'getSwapRate': {
          if (!graphInstance) {
            return {
              success: false,
              error:
                'Liquidity pools not initialized. Call initializePools first.',
            };
          }

          if (!args.sourceTokenId || !args.targetTokenId) {
            return {
              success: false,
              error:
                'Both source and target token IDs are required for swap rate calculation',
            };
          }

          const rates = graphInstance.getSwapRate(
            args.sourceTokenId,
            args.targetTokenId
          );

          if (!rates) {
            return {
              success: false,
              error:
                'No direct liquidity pool found between the specified tokens',
            };
          }

          return {
            success: true,
            data: rates,
          };
        }

        case 'getMintRates': {
          if (!graphInstance) {
            return {
              success: false,
              error:
                'Liquidity pools not initialized. Call initializePools first.',
            };
          }

          if (!args.poolId) {
            return {
              success: false,
              error: 'Liquidity pool ID is required for mint rate calculation',
            };
          }

          const rates = graphInstance.getMintRates(args.poolId);

          if (!rates) {
            return {
              success: false,
              error: 'Liquidity pool not found',
            };
          }

          return {
            success: true,
            data: rates,
          };
        }

        case 'getBurnRates': {
          if (!graphInstance) {
            return {
              success: false,
              error:
                'Liquidity pools not initialized. Call initializePools first.',
            };
          }

          if (!args.poolId) {
            return {
              success: false,
              error: 'Liquidity pool ID is required for burn rate calculation',
            };
          }

          const rates = graphInstance.getBurnRates(args.poolId);

          if (!rates) {
            return {
              success: false,
              error: 'Liquidity pool not found',
            };
          }

          return {
            success: true,
            data: rates,
          };
        }

        default:
          return {
            success: false,
            error: 'Invalid operation requested',
          };
      }
    } catch (error) {
      return {
        success: false,
        error: `An unexpected error occurred: ${(error as Error).message}`,
      };
    }
  },
};
