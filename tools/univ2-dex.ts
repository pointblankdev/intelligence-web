import { CoreTool } from 'ai';
import { z } from 'zod';

import { DexReadService } from '@/services/defi/univ2-dex';

/**
 * Response interfaces for different operation types
 */
interface PoolData {
  id: string;
  token0: string;
  token1: string;
  reserve0: string; // Stringified bigint
  reserve1: string; // Stringified bigint
  totalSupply: string; // Stringified bigint
  swapFee: {
    numerator: number;
    denominator: number;
  };
}

interface SwapQuoteData {
  path: string[];
  amountIn: string; // Stringified bigint
  amountOut: string; // Stringified bigint
  priceImpact: number;
}

interface LiquidityData {
  poolId: string;
  token0Amount: string; // Stringified bigint
  token1Amount: string; // Stringified bigint
  liquidityTokens: string; // Stringified bigint
  shareOfPool: number;
  priceImpact?: number;
}

interface RemovalQuoteData {
  token0Amount: string; // Stringified bigint
  token1Amount: string; // Stringified bigint
  shareOfPool: number;
  percentage?: number;
}

/**
 * Combined response type for DEX operations
 */
interface DexToolResponse {
  success: boolean;
  data?: {
    // Pool Information
    numberOfPools?: number;
    pool?: PoolData;
    pools?: PoolData[];

    // Trading Analysis
    swapQuote?: SwapQuoteData;
    swapQuotes?: SwapQuoteData[];

    // Liquidity Analysis
    liquidityQuote?: LiquidityData;
    liquidityQuotes?: LiquidityData[];

    // Removal Analysis
    removalQuote?: RemovalQuoteData;
    removalQuotes?: RemovalQuoteData[];
  };
  error?: string;
}

/**
 * Operation-specific parameter schemas
 */
const PoolsParams = z
  .object({
    poolId: z
      .string()
      .optional()
      .describe(
        'The unique identifier of a specific pool. Used with getPoolById to query a single pool. ' +
          'Pool IDs start at 1 and increment sequentially as pools are created.'
      ),
    token0: z
      .string()
      .optional()
      .describe(
        'The contract address of the first token in a pair. ' +
          'Used with token1 in getPool to find a specific trading pair. ' +
          'Format: SP2...<contract_address>.<token_name>'
      ),
    token1: z
      .string()
      .optional()
      .describe(
        'The contract address of the second token in a pair. ' +
          'Used with token0 in getPool to find a specific trading pair. ' +
          'Format: SP2...<contract_address>.<token_name>'
      ),
    ids: z
      .array(z.string())
      .optional()
      .describe(
        'Array of pool ids for batch pool queries. Used with getPools to efficiently fetch multiple pools at once. ' +
          'Ids start at 1 and increment up to the number of pools - 1. ' +
          'Example: [1,2,3,4,5]'
      ),
  })
  .describe(
    'Parameters for pool information queries. Used to fetch pool states, reserves, and fees.'
  );

const SwapParams = z
  .object({
    tokenIn: z
      .string()
      .describe(
        'The contract address of the token being sold/swapped in. ' +
          'Required for all swap operations to identify the input token.'
      ),
    tokenOut: z
      .string()
      .describe(
        'The contract address of the token being bought/swapped out. ' +
          'Required for all swap operations to identify the desired output token.'
      ),
    amount: z
      .string()
      .describe(
        'The amount of tokens for the swap operation as a string (represents a BigInt). ' +
          'For normal swaps, this is the input amount. For exactOutput swaps, this is the desired output amount.'
      ),
    path: z
      .array(z.string())
      .optional()
      .describe(
        'Ordered array of token addresses representing a multi-hop swap route. ' +
          'Required for getMultiHopQuote operations. Each address must connect to the next in a valid pool. ' +
          'Example: ["tokenA", "tokenB", "tokenC"] swaps A->B->C'
      ),
    paths: z
      .array(z.array(z.string()))
      .optional()
      .describe(
        'Array of multiple swap paths for batch quote operations. ' +
          'Used with batchGetQuotes to efficiently price multiple possible routes. ' +
          'Each inner array is a complete swap path like the "path" parameter.'
      ),
    exactOutput: z
      .boolean()
      .optional()
      .describe(
        'If true, the amount represents the desired output amount rather than input amount. ' +
          'Used to specify whether to calculate how much input is needed for a specific output amount.'
      ),
  })
  .describe(
    'Parameters for swap operations. Used to calculate trade amounts, routes, and price impacts.'
  );

const LiquidityParams = z
  .object({
    poolId: z
      .string()
      .describe(
        'The unique identifier of the pool to add liquidity to. ' +
          'Required for all liquidity operations to identify the target pool.'
      ),
    amount0: z
      .string()
      .describe(
        'The desired amount of token0 to add as liquidity (as string for BigInt). ' +
          'Used with amount1 to specify the liquidity provision amounts.'
      ),
    amount1: z
      .string()
      .describe(
        'The desired amount of token1 to add as liquidity (as string for BigInt). ' +
          'Used with amount0 to specify the liquidity provision amounts.'
      ),
    minAmount0: z
      .string()
      .optional()
      .describe(
        'Minimum acceptable amount of token0 to add (as string for BigInt). ' +
          'Protects against unfavorable pool state changes. Defaults to 0 if not specified.'
      ),
    minAmount1: z
      .string()
      .optional()
      .describe(
        'Minimum acceptable amount of token1 to add (as string for BigInt). ' +
          'Protects against unfavorable pool state changes. Defaults to 0 if not specified.'
      ),
    queries: z
      .array(
        z.object({
          poolId: z.string(),
          desiredAmount0: z.string(),
          desiredAmount1: z.string(),
          minAmount0: z.string().optional(),
          minAmount1: z.string().optional(),
        })
      )
      .optional()
      .describe(
        'Array of liquidity addition queries for batch operations. ' +
          'Used with batchGetLiquidityQuotes to efficiently calculate multiple liquidity additions. ' +
          'Each query contains the same parameters as a single liquidity addition.'
      ),
  })
  .describe(
    'Parameters for liquidity provision operations. Used to calculate optimal deposit amounts and expected LP tokens.'
  );

const RemovalParams = z
  .object({
    poolId: z
      .string()
      .describe(
        'The unique identifier of the pool to remove liquidity from. ' +
          'Required for all removal operations to identify the target pool.'
      ),
    liquidityTokens: z
      .string()
      .describe(
        'The amount of LP tokens to burn when removing liquidity (as string for BigInt). ' +
          'Represents the share of the pool to be removed.'
      ),
    getTotalRange: z
      .boolean()
      .optional()
      .describe(
        'If true, returns quotes for removing different percentages (25%, 50%, 75%, 100%) of total liquidity. ' +
          'Used with getRemoveLiquidityRangeQuotes to explore different removal options.'
      ),
    queries: z
      .array(
        z.object({
          poolId: z.string(),
          liquidityTokens: z.string(),
        })
      )
      .optional()
      .describe(
        'Array of liquidity removal queries for batch operations. ' +
          'Used with batchGetRemoveLiquidityQuotes to efficiently calculate multiple removals. ' +
          'Each query specifies a pool and amount of LP tokens to remove.'
      ),
  })
  .describe(
    'Parameters for liquidity removal operations. Used to calculate expected returns when removing pool liquidity.'
  );

/**
 * Combined parameter schema for the tool
 */
const dexParamsSchema = z
  .object({
    operation: z
      .enum([
        // Pool Information Operations
        'getNumberOfPools',
        'getPoolById',
        'getPool',
        'getPools',

        // Trading Operations
        'getSwapQuote',
        'getSwapQuoteForExactOutput',
        'getMultiHopQuote',
        'getMultiHopQuoteForExactOutput',
        'batchGetQuotes',

        // Liquidity Operations
        'getLiquidityQuote',
        'calculateLiquidityTokens',
        'batchGetLiquidityQuotes',

        // Removal Operations
        'getRemoveLiquidityQuote',
        'getRemoveLiquidityRangeQuotes',
        'batchGetRemoveLiquidityQuotes',
      ])
      .describe(
        'The specific DEX operation to perform. Each operation requires different parameters:\n' +
          '- Pool Info: poolId or token addresses needed except for getNumberOfPools\n' +
          '- Trading: tokenIn, tokenOut, and amount required; path for multi-hop\n' +
          '- Liquidity: poolId and token amounts required; minimums optional\n' +
          '- Removal: poolId and liquidityTokens required\n' +
          'Batch operations need arrays of the respective parameters.'
      ),

    // Operation-specific parameters
    pools: PoolsParams.optional(),
    swap: SwapParams.optional(),
    liquidity: LiquidityParams.optional(),
    removal: RemovalParams.optional(),
  })
  .describe(
    'Complete parameter schema for DEX operations. Provide the operation name and its corresponding parameters:\n' +
      '- For pool info: use pools object\n' +
      '- For trading: use swap object\n' +
      '- For liquidity: use liquidity object\n' +
      '- For removal: use removal object\n' +
      'Each operation type has specific required and optional parameters.'
  );

export const name = 'DEX-Analysis';
export const dexTool: CoreTool<typeof dexParamsSchema, DexToolResponse> = {
  parameters: dexParamsSchema,
  description: `
    Comprehensive DEX analysis tool for querying pools, analyzing trades,
    and managing liquidity positions. Pool IDs start from 1 and increase.

    Key Functions:
    1. Pool Information
       - Get total number of pools
       - Query specific pools by ID or token addresses
       - Batch fetch multiple pools

    2. Trading Analysis
       - Get swap quotes for direct trades
       - Calculate multi-hop trades
       - Analyze price impacts
       - Batch quote multiple trades

    3. Liquidity Management
       - Calculate optimal liquidity provision
       - Estimate liquidity token minting
       - Get removal quotes
       - Analyze pool share impacts

    Common Use Cases:
    1. Pool Discovery:
       getNumberOfPools -> getPools
       
    2. Trading:
       getPool -> getSwapQuote -> getMultiHopQuote
       
    3. Liquidity Provision:
       getLiquidityQuote -> calculateLiquidityTokens
       
    4. Position Management:
       getRemoveLiquidityQuote -> getRemoveLiquidityRangeQuotes
  `,

  execute: async (
    args: z.infer<typeof dexParamsSchema>,
    { abortSignal }
  ): Promise<DexToolResponse> => {
    try {
      const service = new DexReadService();

      // Pool Information Operations
      if (args.operation === 'getNumberOfPools') {
        const count = await service.getNumberOfPools();
        return { success: true, data: { numberOfPools: count } };
      }

      if (args.operation === 'getPoolById') {
        if (!args.pools?.poolId) {
          return { success: false, error: 'Pool ID is required' };
        }
        const pool = await service.getPoolById(args.pools.poolId);
        return {
          success: true,
          data: { pool: formatPoolData(pool) },
        };
      }

      if (args.operation === 'getPool') {
        if (!args.pools?.token0 || !args.pools?.token1) {
          return { success: false, error: 'Both tokens are required' };
        }
        const pool = await service.getPool(
          args.pools.token0,
          args.pools.token1
        );
        return {
          success: true,
          data: { pool: formatPoolData(pool) },
        };
      }

      if (args.operation === 'getPools') {
        if (!args.pools?.ids?.length) {
          return { success: false, error: 'Token ids are required' };
        }
        const pools = await service.getPools(args.pools.ids);
        return {
          success: true,
          data: { pools: pools.map(formatPoolData) },
        };
      }

      // Trading Operations
      if (args.operation === 'getSwapQuote') {
        if (!args.swap?.tokenIn || !args.swap?.tokenOut || !args.swap?.amount) {
          return {
            success: false,
            error: 'Token addresses and amount are required',
          };
        }
        const quote = await service.getSwapQuote(
          args.swap.tokenIn,
          args.swap.tokenOut,
          BigInt(args.swap.amount)
        );
        return {
          success: true,
          data: { swapQuote: formatSwapQuote(quote) },
        };
      }

      if (args.operation === 'getSwapQuoteForExactOutput') {
        if (!args.swap?.tokenIn || !args.swap?.tokenOut || !args.swap?.amount) {
          return {
            success: false,
            error: 'Token addresses and amount are required',
          };
        }
        const quote = await service.getSwapQuoteForExactOutput(
          args.swap.tokenIn,
          args.swap.tokenOut,
          BigInt(args.swap.amount)
        );
        return {
          success: true,
          data: { swapQuote: formatSwapQuote(quote) },
        };
      }

      if (args.operation === 'getMultiHopQuote') {
        if (!args.swap?.path?.length || !args.swap?.amount) {
          return { success: false, error: 'Path and amount are required' };
        }
        const quote = await service.getMultiHopQuote(
          args.swap.path,
          BigInt(args.swap.amount)
        );
        return {
          success: true,
          data: { swapQuote: formatSwapQuote(quote) },
        };
      }

      if (args.operation === 'getMultiHopQuoteForExactOutput') {
        if (!args.swap?.path?.length || !args.swap?.amount) {
          return { success: false, error: 'Path and amount are required' };
        }
        const quote = await service.getMultiHopQuoteForExactOutput(
          args.swap.path,
          BigInt(args.swap.amount)
        );
        return {
          success: true,
          data: { swapQuote: formatSwapQuote(quote) },
        };
      }

      if (args.operation === 'batchGetQuotes') {
        if (!args.swap?.paths?.length) {
          return { success: false, error: 'Paths array is required' };
        }
        const queries = args.swap.paths.map((path) => ({
          path,
          amountIn: BigInt(args.swap?.amount || '0'),
        }));
        const quotes = await service.batchGetQuotes(queries);
        return {
          success: true,
          data: { swapQuotes: quotes.map(formatSwapQuote) },
        };
      }

      // Liquidity Operations
      if (args.operation === 'getLiquidityQuote') {
        if (
          !args.liquidity?.poolId ||
          !args.liquidity?.amount0 ||
          !args.liquidity?.amount1
        ) {
          return { success: false, error: 'Pool ID and amounts are required' };
        }
        const quote = await service.getLiquidityQuote(
          args.liquidity.poolId,
          BigInt(args.liquidity.amount0),
          BigInt(args.liquidity.amount1),
          BigInt(args.liquidity.minAmount0 || '0'),
          BigInt(args.liquidity.minAmount1 || '0')
        );
        return {
          success: true,
          data: { liquidityQuote: formatLiquidityQuote(quote) },
        };
      }

      if (args.operation === 'calculateLiquidityTokens') {
        if (
          !args.liquidity?.poolId ||
          !args.liquidity?.amount0 ||
          !args.liquidity?.amount1
        ) {
          return { success: false, error: 'Pool ID and amounts are required' };
        }
        const tokens = await service.calculateLiquidityTokens(
          args.liquidity.poolId,
          BigInt(args.liquidity.amount0),
          BigInt(args.liquidity.amount1)
        );
        return {
          success: true,
          data: {
            liquidityQuote: {
              poolId: args.liquidity.poolId,
              token0Amount: args.liquidity.amount0,
              token1Amount: args.liquidity.amount1,
              liquidityTokens: tokens.toString(),
              shareOfPool: 0, // Would need pool data to calculate
            },
          },
        };
      }

      if (args.operation === 'batchGetLiquidityQuotes') {
        if (!args.liquidity?.queries?.length) {
          return { success: false, error: 'Queries array is required' };
        }
        const queries = args.liquidity.queries.map((q) => ({
          poolId: q.poolId,
          desiredAmount0: BigInt(q.desiredAmount0),
          desiredAmount1: BigInt(q.desiredAmount1),
          minAmount0: BigInt(q.minAmount0 || '0'),
          minAmount1: BigInt(q.minAmount1 || '0'),
        }));
        const quotes = await service.batchGetLiquidityQuotes(queries);
        return {
          success: true,
          data: { liquidityQuotes: quotes.map(formatLiquidityQuote) },
        };
      }

      // Removal Operations
      if (args.operation === 'getRemoveLiquidityQuote') {
        if (!args.removal?.poolId || !args.removal?.liquidityTokens) {
          return {
            success: false,
            error: 'Pool ID and liquidity tokens are required',
          };
        }
        const quote = await service.getRemoveLiquidityQuote(
          args.removal.poolId,
          BigInt(args.removal.liquidityTokens)
        );
        return {
          success: true,
          data: { removalQuote: formatRemovalQuote(quote) },
        };
      }

      if (args.operation === 'getRemoveLiquidityRangeQuotes') {
        if (!args.removal?.poolId || !args.removal?.liquidityTokens) {
          return {
            success: false,
            error: 'Pool ID and liquidity tokens are required',
          };
        }
        const quotes = await service.getRemoveLiquidityRangeQuotes(
          args.removal.poolId,
          BigInt(args.removal.liquidityTokens)
        );
        return {
          success: true,
          data: { removalQuotes: quotes.map(formatRemovalQuote) },
        };
      }

      if (args.operation === 'batchGetRemoveLiquidityQuotes') {
        if (!args.removal?.queries?.length) {
          return { success: false, error: 'Queries array is required' };
        }
        const queries = args.removal.queries.map((q) => ({
          poolId: q.poolId,
          liquidityTokens: BigInt(q.liquidityTokens),
        }));
        const quotes = await service.batchGetRemoveLiquidityQuotes(queries);
        return {
          success: true,
          data: { removalQuotes: quotes.map(formatRemovalQuote) },
        };
      }

      return {
        success: false,
        error: 'Invalid operation requested',
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
};

/**
 * Helper Functions for formatting responses
 */
function formatPoolData(pool: any): PoolData {
  return {
    id: pool.id,
    token0: pool.token0,
    token1: pool.token1,
    reserve0: pool.reserve0.toString(),
    reserve1: pool.reserve1.toString(),
    totalSupply: pool.totalSupply.toString(),
    swapFee: pool.swapFee,
  };
}

function formatSwapQuote(quote: any): SwapQuoteData {
  return {
    path: quote.route,
    amountIn: quote.amountIn.toString(),
    amountOut: quote.amountOut.toString(),
    priceImpact: quote.priceImpact,
  };
}

function formatLiquidityQuote(quote: any): LiquidityData {
  return {
    poolId: quote.poolId,
    token0Amount: quote.token0Amount.toString(),
    token1Amount: quote.token1Amount.toString(),
    liquidityTokens: quote.liquidityTokens.toString(),
    shareOfPool: quote.shareOfPool,
    priceImpact: quote.priceImpact,
  };
}

function formatRemovalQuote(quote: any): RemovalQuoteData {
  const formatted: RemovalQuoteData = {
    token0Amount: quote.token0Amount.toString(),
    token1Amount: quote.token1Amount.toString(),
    shareOfPool: quote.shareOfPool,
  };

  if ('percentage' in quote) {
    formatted.percentage = quote.percentage;
  }

  return formatted;
}

// Export the tool
export default dexTool;
