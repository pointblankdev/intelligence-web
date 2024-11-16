/**
 * @fileoverview DEX Read Service
 *
 * Service for reading DEX contract states and calculating trade amounts.
 * Provides functions to query pool information, calculate swap amounts,
 * estimate multi-hop trades, and handle liquidity operations.
 */

import { createClient } from '@stacks/blockchain-api-client';
import { StacksNetwork } from '@stacks/network';
import {
  cvToValue,
  parseToCV,
  hexToCV,
  cvToHex,
  uintCV,
  tupleCV,
  ClarityValue,
  contractPrincipalCV,
  standardPrincipalCV,
} from '@stacks/transactions';

import { cache } from '../cache';
import { ContractService } from '../contract';

export enum DexProvider {
  CHARISMA = 'CHARISMA',
  VELAR = 'VELAR',
}

export interface DexConfig {
  address: string;
  coreContract: string;
  routerContract: string;
  path2Contract: string;
  libraryContract: string;
  shareFeeContract: string;
}

const DEX_CONFIGS: Record<DexProvider, DexConfig> = {
  [DexProvider.CHARISMA]: {
    address: 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS',
    coreContract: 'univ2-core',
    routerContract: 'univ2-router',
    path2Contract: 'univ2-path2',
    libraryContract: 'univ2-library',
    shareFeeContract: 'univ2-share-fee-to',
  },
  [DexProvider.VELAR]: {
    address: 'SP1Y5YSTAHZ88XYK1VPDH24GY0HPX5J4JECTMY4A1',
    coreContract: 'univ2-core',
    routerContract: 'univ2-router',
    path2Contract: 'univ2-path2',
    libraryContract: 'univ2-library',
    shareFeeContract: 'univ2-share-fee-to',
  },
};

// Existing interfaces remain the same
export interface PoolInfo {
  id: string;
  token0: string;
  token1: string;
  reserve0: bigint;
  reserve1: bigint;
  lpToken: string;
  totalSupply: bigint;
  swapFee: {
    numerator: number;
    denominator: number;
  };
  protocolFee: {
    numerator: number;
    denominator: number;
  };
  shareFee: {
    numerator: number;
    denominator: number;
  };
}

export interface SwapQuote {
  amountIn: bigint;
  amountOut: bigint;
  priceImpact: number;
  route: string[];
}

export interface LiquidityQuote {
  token0Amount: bigint;
  token1Amount: bigint;
  liquidityTokens: bigint;
  shareOfPool: number;
  priceImpact: number;
}

export interface RemoveLiquidityQuote {
  token0Amount: bigint;
  token1Amount: bigint;
  shareOfPool: number;
}

export enum DexReadErrorCode {
  POOL_NOT_FOUND = 'POOL_NOT_FOUND',
  INSUFFICIENT_LIQUIDITY = 'INSUFFICIENT_LIQUIDITY',
  INVALID_PATH = 'INVALID_PATH',
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_AMOUNTS = 'INVALID_AMOUNTS',
  MINIMUM_NOT_MET = 'MINIMUM_NOT_MET',
  PRICE_IMPACT_HIGH = 'PRICE_IMPACT_HIGH',
  ZERO_LIQUIDITY = 'ZERO_LIQUIDITY',
  INVALID_DEX = 'INVALID_DEX',
}

export class DexReadError extends Error {
  constructor(
    message: string,
    public code: DexReadErrorCode,
    public details?: unknown
  ) {
    super(message);
    this.name = 'DexReadError';
  }
}

/**
 * Service class for reading DEX contract states and calculating trade amounts
 */
export class MultiDexReadService {
  private client;
  private config: DexConfig;

  constructor(private readonly provider: DexProvider = DexProvider.CHARISMA) {
    this.config = DEX_CONFIGS[provider];
    if (!this.config) {
      throw new DexReadError(
        'Invalid DEX provider',
        DexReadErrorCode.INVALID_DEX,
        { provider }
      );
    }

    this.client = createClient({
      baseUrl: 'https://api.mainnet.hiro.so',
    });

    this.client.use({
      onRequest({ request }) {
        request.headers.set(
          'x-hiro-api-key',
          String(process.env.STACKS_API_KEY)
        );
        return request;
      },
    });
  }

  /**
   * Helper function to make read-only contract calls
   */
  private async callReadOnly(
    method: string,
    args: ClarityValue[] = [],
    contractName: string,
    contractAddress = this.config.address
  ): Promise<any> {
    try {
      const path = `/v2/contracts/call-read/${contractAddress}/${contractName}/${method}`;
      const hexArgs = args.map((arg) => cvToHex(arg));

      const key = `${this.provider}:${path}:${hexArgs.join(':')}`;
      const cachedResponse = await cache.get(key);
      if (cachedResponse) return cvToValue(hexToCV(cachedResponse as string));

      const response = await this.client.POST(path as any, {
        body: {
          sender: this.config.address,
          arguments: hexArgs,
        },
      });

      if (response.error) {
        throw new DexReadError(
          'Contract call failed',
          DexReadErrorCode.CONTRACT_ERROR,
          response.data
        );
      }

      await cache.set(key, response.data.result, 60);
      return cvToValue(hexToCV(response.data.result));
    } catch (error) {
      if (error instanceof DexReadError) throw error;
      console.error('Error calling read-only contract method:', error);
      throw new DexReadError(
        'Network request failed',
        DexReadErrorCode.NETWORK_ERROR,
        error
      );
    }
  }

  // #region Pool Information Methods

  /**
   * Gets the total number of pools in the DEX
   * @returns The total number of pools that have been created
   */
  async getNumberOfPools(): Promise<number> {
    try {
      const result = await this.callReadOnly(
        'get-nr-pools',
        [],
        this.config.coreContract
      );
      return Number(result);
    } catch (error) {
      if (error instanceof DexReadError) throw error;
      throw new DexReadError(
        'Failed to get number of pools',
        DexReadErrorCode.CONTRACT_ERROR,
        error
      );
    }
  }

  /**
   * Gets pool information by its ID
   * @param id Pool ID to look up
   * @returns Pool information including reserves and fees
   * @throws {DexReadError} If pool is not found or there's a contract error
   */
  async getPoolById(id: string | number): Promise<PoolInfo> {
    try {
      const result = await this.callReadOnly(
        'get-pool',
        [uintCV(Number(id))],
        this.config.coreContract
      );

      if (!result || !result.value) {
        throw new DexReadError(
          'Pool not found',
          DexReadErrorCode.POOL_NOT_FOUND,
          { id }
        );
      }

      const pool = result.value;
      return {
        id: id.toString(),
        token0: pool.token0.value,
        token1: pool.token1.value,
        reserve0: BigInt(pool.reserve0.value),
        reserve1: BigInt(pool.reserve1.value),
        lpToken: pool['lp-token'].value,
        totalSupply: await this.getPoolTotalSupply(pool['lp-token'].value),
        swapFee: {
          numerator: Number(pool['swap-fee'].value.num.value),
          denominator: Number(pool['swap-fee'].value.den.value),
        },
        protocolFee: {
          numerator: Number(pool['protocol-fee'].value.num.value),
          denominator: Number(pool['protocol-fee'].value.den.value),
        },
        shareFee: {
          numerator: Number(pool['share-fee'].value.num.value),
          denominator: Number(pool['share-fee'].value.den.value),
        },
      };
    } catch (error) {
      if (error instanceof DexReadError) throw error;
      throw new DexReadError(
        'Failed to get pool by ID',
        DexReadErrorCode.CONTRACT_ERROR,
        error
      );
    }
  }

  /**
   * Helper method to get pool ID from token pair
   * @param token0 First token's principal
   * @param token1 Second token's principal
   * @returns Pool ID if found
   * @private
   */
  private async getPoolId(token0: string, token1: string): Promise<string> {
    try {
      const [address0, name0] = token0.split('.');
      const [address1, name1] = token1.split('.');

      // Try direct order
      const result = await this.callReadOnly(
        'get-pool-id',
        [
          contractPrincipalCV(address0, name0),
          contractPrincipalCV(address1, name1),
        ],
        this.config.coreContract
      );

      if (result && result.value) {
        return result.value.toString();
      }

      // Try reverse order
      const reverseResult = await this.callReadOnly(
        'get-pool-id',
        [
          contractPrincipalCV(address1, name1),
          contractPrincipalCV(address0, name0),
        ],
        this.config.coreContract
      );

      if (reverseResult && reverseResult.value) {
        return reverseResult.value.toString();
      }

      throw new DexReadError(
        'Pool not found for token pair',
        DexReadErrorCode.POOL_NOT_FOUND,
        { token0, token1 }
      );
    } catch (error) {
      if (error instanceof DexReadError) throw error;

      throw new DexReadError(
        'Failed to get pool ID',
        DexReadErrorCode.CONTRACT_ERROR,
        error
      );
    }
  }

  /**
   * Gets detailed pool information for a pair of tokens
   * @param token0 Principal of the first token
   * @param token1 Principal of the second token
   * @returns Pool information including reserves and fees
   */
  /**
   * Gets detailed pool information for a pair of tokens
   * @param token0 Principal of the first token
   * @param token1 Principal of the second token
   * @returns Pool information including reserves and fees
   */
  async getPool(token0: string, token1: string): Promise<PoolInfo> {
    try {
      const poolId = await this.getPoolId(token0, token1);
      return await this.getPoolById(poolId);
    } catch (error) {
      if (error instanceof DexReadError) throw error;

      throw new DexReadError(
        'Failed to get pool information',
        DexReadErrorCode.CONTRACT_ERROR,
        error
      );
    }
  }

  /**
   * Helper method to get the total supply of LP tokens for a pool
   * @param lpTokenContract Principal of the LP token contract
   * @returns Total supply of LP tokens
   * @private
   */
  private async getPoolTotalSupply(lpTokenContract: string): Promise<bigint> {
    try {
      const [address, name] = lpTokenContract.split('.');

      const result = await this.callReadOnly(
        'get-total-supply',
        [],
        name,
        address
      );

      return BigInt(result.value);
    } catch (error) {
      throw new DexReadError(
        'Failed to get LP token total supply',
        DexReadErrorCode.CONTRACT_ERROR,
        error
      );
    }
  }

  /**
   * Batch fetches pool information for multiple token pairs
   * @param ids Array of pool ids
   * @returns Array of pool information
   */
  async getPools(ids: Array<string | number>): Promise<PoolInfo[]> {
    try {
      // Use Promise.all to fetch all pools in parallel
      const poolPromises = ids.map((id) =>
        this.getPoolById(id).catch((error) => {
          // If a specific pool is not found, we'll include null in the results
          if (error.code === DexReadErrorCode.POOL_NOT_FOUND) {
            return null;
          }
          throw error;
        })
      );

      const results = await Promise.all(poolPromises);

      // Filter out null results from non-existent pools
      return results.filter((pool): pool is PoolInfo => pool !== null);
    } catch (error) {
      if (error instanceof DexReadError) throw error;

      throw new DexReadError(
        'Failed to batch fetch pool information',
        DexReadErrorCode.CONTRACT_ERROR,
        error
      );
    }
  }

  // #endregion

  // #region Swap Calculation Methods

  /**
   * Calculates output amount for a direct swap
   * @param tokenIn Principal of the input token
   * @param tokenOut Principal of the output token
   * @param amountIn Amount of input token
   * @returns Swap quote with output amount and price impact
   */
  async getSwapQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint
  ): Promise<SwapQuote> {
    try {
      const pool = await this.getPool(tokenIn, tokenOut);
      const isToken0 = pool.token0 === tokenIn;
      const reserveIn = isToken0 ? pool.reserve0 : pool.reserve1;
      const reserveOut = isToken0 ? pool.reserve1 : pool.reserve0;

      const amountOut = await this.getAmountOut(
        amountIn,
        reserveIn,
        reserveOut,
        pool.swapFee
      );

      const priceImpact = this.calculatePriceImpact(
        amountIn,
        amountOut,
        reserveIn,
        reserveOut
      );

      return {
        amountIn,
        amountOut,
        priceImpact,
        route: [tokenIn, tokenOut],
      };
    } catch (error) {
      if (error instanceof DexReadError) throw error;
      throw new DexReadError(
        'Failed to get swap quote',
        DexReadErrorCode.CONTRACT_ERROR,
        error
      );
    }
  }

  /**
   * Calculates required input amount for desired output
   */
  async getSwapQuoteForExactOutput(
    tokenIn: string,
    tokenOut: string,
    amountOut: bigint
  ): Promise<SwapQuote> {
    try {
      const pool = await this.getPool(tokenIn, tokenOut);

      const isToken0 = pool.token0 === tokenIn;
      const reserveIn = isToken0 ? pool.reserve0 : pool.reserve1;
      const reserveOut = isToken0 ? pool.reserve1 : pool.reserve0;

      // Call get-amount-in to calculate required input
      const amountIn = await this.getAmountIn(
        amountOut,
        reserveIn,
        reserveOut,
        pool.swapFee
      );

      const priceImpact = this.calculatePriceImpact(
        amountIn,
        amountOut,
        reserveIn,
        reserveOut
      );

      return {
        amountIn,
        amountOut,
        priceImpact,
        route: [tokenIn, tokenOut],
      };
    } catch (error) {
      if (error instanceof DexReadError) throw error;

      throw new DexReadError(
        'Failed to get swap quote for exact output',
        DexReadErrorCode.CONTRACT_ERROR,
        error
      );
    }
  }

  /**
   * Calculates output amounts for multi-hop swaps
   */
  async getMultiHopQuote(path: string[], amountIn: bigint): Promise<SwapQuote> {
    try {
      if (path.length < 2) {
        throw new DexReadError(
          'Invalid path length',
          DexReadErrorCode.INVALID_PATH,
          { path }
        );
      }

      // For each pair in the path, calculate the output amount
      let currentAmountIn = amountIn;
      const amounts: bigint[] = [amountIn];
      let totalPriceImpact: number = 0;

      // Calculate each hop
      for (let i = 0; i < path.length - 1; i++) {
        const currentIn = path[i];
        const currentOut = path[i + 1];

        const quote = await this.getSwapQuote(
          currentIn,
          currentOut,
          currentAmountIn
        );

        currentAmountIn = quote.amountOut;
        amounts.push(currentAmountIn);
        totalPriceImpact += quote.priceImpact;
      }

      return {
        amountIn,
        amountOut: amounts[amounts.length - 1],
        priceImpact: totalPriceImpact,
        route: path,
      };
    } catch (error) {
      if (error instanceof DexReadError) throw error;

      throw new DexReadError(
        'Failed to get multi-hop quote',
        DexReadErrorCode.CONTRACT_ERROR,
        error
      );
    }
  }

  /**
   * Calculates required input amount for desired output in multi-hop
   */
  async getMultiHopQuoteForExactOutput(
    path: string[],
    amountOut: bigint
  ): Promise<SwapQuote> {
    try {
      if (path.length < 2) {
        throw new DexReadError(
          'Invalid path length',
          DexReadErrorCode.INVALID_PATH,
          { path }
        );
      }

      // Work backwards through the path
      let currentAmountOut = amountOut;
      const amounts: bigint[] = new Array(path.length);
      amounts[amounts.length - 1] = amountOut;
      let totalPriceImpact: number = 0;

      // Calculate each hop in reverse
      for (let i = path.length - 1; i > 0; i--) {
        const currentIn = path[i - 1];
        const currentOut = path[i];

        const quote = await this.getSwapQuoteForExactOutput(
          currentIn,
          currentOut,
          currentAmountOut
        );

        currentAmountOut = quote.amountIn;
        amounts[i - 1] = currentAmountOut;
        totalPriceImpact += quote.priceImpact;
      }

      return {
        amountIn: amounts[0],
        amountOut,
        priceImpact: totalPriceImpact,
        route: path,
      };
    } catch (error) {
      if (error instanceof DexReadError) throw error;

      throw new DexReadError(
        'Failed to get multi-hop quote for exact output',
        DexReadErrorCode.CONTRACT_ERROR,
        error
      );
    }
  }

  /**
   * Batch calculates quotes for multiple swaps
   */
  async batchGetQuotes(
    queries: Array<{
      path: string[];
      amountIn: bigint;
    }>
  ): Promise<SwapQuote[]> {
    try {
      const quotePromises = queries.map((query) =>
        this.getMultiHopQuote(query.path, query.amountIn)
      );

      return await Promise.all(quotePromises);
    } catch (error) {
      if (error instanceof DexReadError) throw error;

      throw new DexReadError(
        'Failed to batch get quotes',
        DexReadErrorCode.CONTRACT_ERROR,
        error
      );
    }
  }

  /**
   * Helper to calculate amount out based on constant product formula
   */
  private async getAmountOut(
    amountIn: bigint,
    reserveIn: bigint,
    reserveOut: bigint,
    swapFee: { numerator: number; denominator: number }
  ): Promise<bigint> {
    try {
      const result = await this.callReadOnly(
        'get-amount-out',
        [
          uintCV(Number(amountIn)),
          uintCV(Number(reserveIn)),
          uintCV(Number(reserveOut)),
          tupleCV({
            num: uintCV(swapFee.numerator),
            den: uintCV(swapFee.denominator),
          }),
        ],
        this.config.path2Contract
      );

      if (result.error) {
        throw new DexReadError(
          'Failed to calculate amount out',
          DexReadErrorCode.INSUFFICIENT_LIQUIDITY
        );
      }

      return BigInt(result);
    } catch (error) {
      if (error instanceof DexReadError) throw error;

      throw new DexReadError(
        'Failed to calculate amount out',
        DexReadErrorCode.CONTRACT_ERROR,
        error
      );
    }
  }

  /**
   * Helper to calculate required input amount
   */
  private async getAmountIn(
    amountOut: bigint,
    reserveIn: bigint,
    reserveOut: bigint,
    swapFee: { numerator: number; denominator: number }
  ): Promise<bigint> {
    try {
      const result = await this.callReadOnly(
        'get-amount-in',
        [
          uintCV(Number(amountOut)),
          uintCV(Number(reserveIn)),
          uintCV(Number(reserveOut)),
          tupleCV({
            num: uintCV(swapFee.numerator),
            den: uintCV(swapFee.denominator),
          }),
        ],
        this.config.libraryContract
      );

      if (result.error) {
        throw new DexReadError(
          'Failed to calculate amount in',
          DexReadErrorCode.INSUFFICIENT_LIQUIDITY
        );
      }

      return BigInt(result.value);
    } catch (error) {
      if (error instanceof DexReadError) throw error;

      throw new DexReadError(
        'Failed to calculate amount in',
        DexReadErrorCode.CONTRACT_ERROR,
        error
      );
    }
  }

  /**
   * Helper to calculate price impact of a swap
   */
  private calculatePriceImpact(
    amountIn: bigint,
    amountOut: bigint,
    reserveIn: bigint,
    reserveOut: bigint
  ): number {
    const exactQuote = Number(reserveOut) / Number(reserveIn);
    const actualPrice = Number(amountOut) / Number(amountIn);
    return Math.abs(((actualPrice - exactQuote) / exactQuote) * 100);
  }

  // #endregion

  // #region Liquidity Addition Methods

  /**
   * Get quote from router for adding liquidity
   */
  async getRouterQuote(
    poolId: string,
    desiredAmount0: bigint,
    desiredAmount1: bigint,
    minAmount0: bigint,
    minAmount1: bigint
  ): Promise<any> {
    return await this.callReadOnly(
      'quote',
      [
        uintCV(Number(poolId)),
        uintCV(Number(desiredAmount0)),
        uintCV(Number(desiredAmount1)),
        uintCV(Number(minAmount0)),
        uintCV(Number(minAmount1)),
      ],
      this.config.routerContract
    );
  }

  /**
   * Calculate optimal token amounts for adding liquidity
   * Based on router.add-liquidity-calc
   * @param poolId Pool ID
   * @param desiredAmount0 Desired amount of token0 to deposit
   * @param desiredAmount1 Desired amount of token1 to deposit
   * @param minAmount0 Minimum acceptable amount of token0
   * @param minAmount1 Minimum acceptable amount of token1
   */
  async getLiquidityQuote(
    poolId: string,
    desiredAmount0: bigint,
    desiredAmount1: bigint,
    minAmount0: bigint,
    minAmount1: bigint
  ): Promise<LiquidityQuote> {
    try {
      // Input validation
      if (
        desiredAmount0 <= 0n ||
        desiredAmount1 <= 0n ||
        minAmount0 < 0n ||
        minAmount1 < 0n
      ) {
        throw new DexReadError(
          'Invalid amounts',
          DexReadErrorCode.INVALID_AMOUNTS,
          { desiredAmount0, desiredAmount1, minAmount0, minAmount1 }
        );
      }

      // Get pool information first
      const pool = await this.getPoolById(poolId);

      // Call add-liquidity-calc from the router contract
      const result = await this.callReadOnly(
        'add-liquidity-calc',
        [
          uintCV(Number(poolId)),
          uintCV(Number(desiredAmount0)),
          uintCV(Number(desiredAmount1)),
          uintCV(Number(minAmount0)),
          uintCV(Number(minAmount1)),
        ],
        this.config.routerContract
      );

      // Extract optimal amounts from result
      const optimalAmount0 = BigInt(result.value.amt0.value);
      const optimalAmount1 = BigInt(result.value.amt1.value);

      // Verify minimums are met
      if (optimalAmount0 < minAmount0 || optimalAmount1 < minAmount1) {
        throw new DexReadError(
          'Calculated amounts below minimum',
          DexReadErrorCode.MINIMUM_NOT_MET,
          { optimalAmount0, optimalAmount1, minAmount0, minAmount1 }
        );
      }

      // Calculate liquidity tokens to be minted
      const liquidityTokens = await this.calculateLiquidityTokens(
        poolId,
        optimalAmount0,
        optimalAmount1
      );

      // Calculate share of pool after minting
      const shareOfPool = this.calculateShareOfPool(
        liquidityTokens,
        pool.totalSupply
      );

      // Calculate price impact
      const priceImpact = this.calculateLiquidityPriceImpact(
        optimalAmount0,
        optimalAmount1,
        pool.reserve0,
        pool.reserve1
      );

      return {
        token0Amount: optimalAmount0,
        token1Amount: optimalAmount1,
        liquidityTokens,
        shareOfPool,
        priceImpact,
      };
    } catch (error) {
      if (error instanceof DexReadError) throw error;

      throw new DexReadError(
        'Failed to get liquidity quote',
        DexReadErrorCode.CONTRACT_ERROR,
        error
      );
    }
  }

  /**
   * Calculates liquidity tokens to be minted
   * Based on Uniswap V2's mint calculation
   * @param poolId Pool ID
   * @param amount0 Amount of token0
   * @param amount1 Amount of token1
   */
  async calculateLiquidityTokens(
    poolId: string,
    amount0: bigint,
    amount1: bigint
  ): Promise<bigint> {
    try {
      // Get current pool state
      const pool = await this.getPoolById(poolId);

      // For first liquidity provision
      if (pool.totalSupply === 0n) {
        return this.sqrt(amount0 * amount1);
      }

      // Calculate based on proportion of existing liquidity
      const liquidity0 = (amount0 * pool.totalSupply) / pool.reserve0;
      const liquidity1 = (amount1 * pool.totalSupply) / pool.reserve1;

      // Return the smaller of the two calculated amounts
      return liquidity0 < liquidity1 ? liquidity0 : liquidity1;
    } catch (error) {
      if (error instanceof DexReadError) throw error;

      throw new DexReadError(
        'Failed to calculate liquidity tokens',
        DexReadErrorCode.CONTRACT_ERROR,
        error
      );
    }
  }

  /**
   * Batch calculates liquidity quotes for multiple pools
   * @param queries Array of liquidity queries
   */
  async batchGetLiquidityQuotes(
    queries: Array<{
      poolId: string;
      desiredAmount0: bigint;
      desiredAmount1: bigint;
      minAmount0: bigint;
      minAmount1: bigint;
    }>
  ): Promise<LiquidityQuote[]> {
    try {
      const quotePromises = queries.map((query) =>
        this.getLiquidityQuote(
          query.poolId,
          query.desiredAmount0,
          query.desiredAmount1,
          query.minAmount0,
          query.minAmount1
        ).catch((error) => {
          // If a specific quote fails, we'll include null in the results
          console.error(`Failed to get quote for pool ${query.poolId}:`, error);
          return null;
        })
      );

      const results = await Promise.all(quotePromises);

      // Filter out failed quotes
      return results.filter((quote): quote is LiquidityQuote => quote !== null);
    } catch (error) {
      if (error instanceof DexReadError) throw error;

      throw new DexReadError(
        'Failed to batch get liquidity quotes',
        DexReadErrorCode.CONTRACT_ERROR,
        error
      );
    }
  }

  /**
   * Helper to calculate share of pool after adding liquidity
   * @private
   */
  private calculateShareOfPool(
    liquidityTokens: bigint,
    totalSupply: bigint
  ): number {
    if (totalSupply === 0n) {
      return 100; // First liquidity provider gets 100% of the pool
    }

    // Calculate percentage with 6 decimal precision
    return (
      Number(
        (liquidityTokens * 100n * 1000000n) / (totalSupply + liquidityTokens)
      ) / 1000000
    );
  }

  /**
   * Helper to calculate price impact of adding liquidity
   * @private
   */
  private calculateLiquidityPriceImpact(
    amount0: bigint,
    amount1: bigint,
    reserve0: bigint,
    reserve1: bigint
  ): number {
    if (reserve0 === 0n || reserve1 === 0n) {
      return 0; // No price impact for first liquidity provision
    }

    // Calculate current price ratio
    const currentRatio = Number(reserve0) / Number(reserve1);

    // Calculate new ratio after adding liquidity
    const newRatio = Number(reserve0 + amount0) / Number(reserve1 + amount1);

    // Calculate percentage difference
    return Math.abs(((newRatio - currentRatio) / currentRatio) * 100);
  }

  // #endregion

  // #region Liquidity Removal Methods

  /**
   * Calculate expected token returns when removing liquidity
   * Based on router.remove-liquidity calculation
   * @param poolId Pool ID
   * @param liquidityTokens Amount of LP tokens to burn
   */
  async getRemoveLiquidityQuote(
    poolId: string,
    liquidityTokens: bigint
  ): Promise<RemoveLiquidityQuote> {
    try {
      // Input validation
      if (liquidityTokens <= 0n) {
        throw new DexReadError(
          'Invalid liquidity token amount',
          DexReadErrorCode.INVALID_AMOUNTS,
          { liquidityTokens }
        );
      }

      // Get pool information
      const pool = await this.getPoolById(poolId);

      // Verify pool has liquidity
      if (pool.totalSupply === 0n) {
        throw new DexReadError(
          'Pool has no liquidity',
          DexReadErrorCode.ZERO_LIQUIDITY,
          { poolId }
        );
      }

      // Verify user isn't trying to remove more than exists
      if (liquidityTokens > pool.totalSupply) {
        throw new DexReadError(
          'Insufficient liquidity tokens',
          DexReadErrorCode.INSUFFICIENT_LIQUIDITY,
          { liquidityTokens, totalSupply: pool.totalSupply }
        );
      }

      // Calculate the proportion of the pool being removed
      const shareOfPool = this.calculateRemoveShareOfPool(
        liquidityTokens,
        pool.totalSupply
      );

      // Calculate token amounts to be received
      const token0Amount = (pool.reserve0 * liquidityTokens) / pool.totalSupply;
      const token1Amount = (pool.reserve1 * liquidityTokens) / pool.totalSupply;

      // Verify calculated amounts are non-zero
      if (token0Amount === 0n || token1Amount === 0n) {
        throw new DexReadError(
          'Remove amount too small',
          DexReadErrorCode.INVALID_AMOUNTS,
          { token0Amount, token1Amount }
        );
      }

      return {
        token0Amount,
        token1Amount,
        shareOfPool,
      };
    } catch (error) {
      if (error instanceof DexReadError) throw error;

      throw new DexReadError(
        'Failed to get remove liquidity quote',
        DexReadErrorCode.CONTRACT_ERROR,
        error
      );
    }
  }

  /**
   * Gets all possible removal amounts for common percentage values
   * Useful for UI presentation of removal options
   * @param poolId Pool ID
   * @param totalLiquidity User's total LP token balance
   */
  async getRemoveLiquidityRangeQuotes(
    poolId: string,
    totalLiquidity: bigint
  ): Promise<Array<RemoveLiquidityQuote & { percentage: number }>> {
    try {
      // Common percentage values for liquidity removal
      const percentages = [25, 50, 75, 100];

      const quotes = await Promise.all(
        percentages.map(async (percentage) => {
          const liquidityTokens =
            (totalLiquidity * BigInt(percentage)) / BigInt(100);
          const quote = await this.getRemoveLiquidityQuote(
            poolId,
            liquidityTokens
          );
          return {
            ...quote,
            percentage,
          };
        })
      );

      return quotes;
    } catch (error) {
      if (error instanceof DexReadError) throw error;

      throw new DexReadError(
        'Failed to get range of removal quotes',
        DexReadErrorCode.CONTRACT_ERROR,
        error
      );
    }
  }

  /**
   * Batch calculates removal quotes for multiple pools
   */
  async batchGetRemoveLiquidityQuotes(
    queries: Array<{
      poolId: string;
      liquidityTokens: bigint;
    }>
  ): Promise<RemoveLiquidityQuote[]> {
    try {
      const quotePromises = queries.map((query) =>
        this.getRemoveLiquidityQuote(query.poolId, query.liquidityTokens).catch(
          (error) => {
            // If a specific quote fails, we'll include null in the results
            console.error(
              `Failed to get remove quote for pool ${query.poolId}:`,
              error
            );
            return null;
          }
        )
      );

      const results = await Promise.all(quotePromises);

      // Filter out failed quotes
      return results.filter(
        (quote): quote is RemoveLiquidityQuote => quote !== null
      );
    } catch (error) {
      if (error instanceof DexReadError) throw error;

      throw new DexReadError(
        'Failed to batch get remove liquidity quotes',
        DexReadErrorCode.CONTRACT_ERROR,
        error
      );
    }
  }

  /**
   * Helper to calculate percentage of pool being removed
   * @private
   */
  private calculateRemoveShareOfPool(
    liquidityTokens: bigint,
    totalSupply: bigint
  ): number {
    // Calculate percentage with 6 decimal precision
    return Number((liquidityTokens * 100n * 1000000n) / totalSupply) / 1000000;
  }

  // #endregion

  // #region Helper Methods

  /**
   * Helper to verify pool exists and has liquidity
   * @private
   */
  private async verifyPoolLiquidity(poolId: string): Promise<void> {
    const pool = await this.getPoolById(poolId);

    if (pool.totalSupply === 0n) {
      throw new DexReadError(
        'Pool has no liquidity',
        DexReadErrorCode.ZERO_LIQUIDITY,
        { poolId }
      );
    }

    if (pool.reserve0 === 0n || pool.reserve1 === 0n) {
      throw new DexReadError(
        'Pool has invalid reserves',
        DexReadErrorCode.INSUFFICIENT_LIQUIDITY,
        { reserve0: pool.reserve0, reserve1: pool.reserve1 }
      );
    }
  }

  /**
   * Helper function to calculate square root for liquidity calculations
   * @private
   */
  private sqrt(value: bigint): bigint {
    if (value < 0n) {
      throw new Error('square root of negative numbers is not supported');
    }

    if (value < 2n) {
      return value;
    }

    function newtonIteration(n: bigint, x0: bigint): bigint {
      const x1 = (n / x0 + x0) >> 1n;
      if (x0 === x1 || x0 === x1 - 1n) {
        return x0;
      }
      return newtonIteration(n, x1);
    }

    return newtonIteration(value, 1n);
  }

  // #endregion
}

// #region DEX WRITE SERVICE
export class DexWriteService {
  private readonly contractService: ContractService;
  private readonly dexReadService: MultiDexReadService;

  constructor(
    network: 'mainnet' | 'testnet' = 'mainnet',
    provider: DexProvider = DexProvider.CHARISMA
  ) {
    this.contractService = new ContractService(network);
    this.dexReadService = new MultiDexReadService(provider);
  }

  /**
   * Execute a token swap
   */
  async swap2({
    senderKey,
    tokenIn,
    tokenOut,
    amountIn,
    amountOutMin,
    shareFeeToAddress,
  }: {
    senderKey: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: bigint;
    amountOutMin: bigint;
    shareFeeToAddress: string;
  }) {
    const [tokenInAddress, tokenInName] = tokenIn.split('.');
    const [tokenOutAddress, tokenOutName] = tokenOut.split('.');
    const config = DEX_CONFIGS[DexProvider.CHARISMA];

    return this.contractService.makeContractCall({
      senderKey,
      contractAddress: config.address,
      contractName: 'univ2-path2',
      functionName: 'do-swap',
      functionArgs: [
        uintCV(amountIn),
        contractPrincipalCV(tokenInAddress, tokenInName),
        contractPrincipalCV(tokenOutAddress, tokenOutName),
        contractPrincipalCV(config.address, config.shareFeeContract),
      ],
    });
  }

  /**
   * Execute a multi-hop swap using path3
   */
  async swap3({
    senderKey,
    tokenA,
    tokenB,
    tokenC,
    amountIn,
    amountOutMin,
    shareFeeToAddress,
  }: {
    senderKey: string;
    tokenA: string;
    tokenB: string;
    tokenC: string;
    amountIn: bigint;
    amountOutMin: bigint;
    shareFeeToAddress: string;
  }) {
    const [tokenAAddress, tokenAName] = tokenA.split('.');
    const [tokenBAddress, tokenBName] = tokenB.split('.');
    const [tokenCAddress, tokenCName] = tokenC.split('.');
    const config = DEX_CONFIGS[DexProvider.CHARISMA];

    return this.contractService.makeContractCall({
      senderKey,
      contractAddress: config.address,
      contractName: 'univ2-path2',
      functionName: 'swap-3',
      functionArgs: [
        uintCV(amountIn),
        uintCV(amountOutMin),
        contractPrincipalCV(tokenAAddress, tokenAName),
        contractPrincipalCV(tokenBAddress, tokenBName),
        contractPrincipalCV(tokenCAddress, tokenCName),
        contractPrincipalCV(config.address, config.shareFeeContract),
      ],
    });
  }

  /**
   * Execute a multi-hop swap using path4
   */
  async swap4({
    senderKey,
    tokenA,
    tokenB,
    tokenC,
    tokenD,
    amountIn,
    amountOutMin,
    shareFeeToAddress,
  }: {
    senderKey: string;
    tokenA: string;
    tokenB: string;
    tokenC: string;
    tokenD: string;
    amountIn: bigint;
    amountOutMin: bigint;
    shareFeeToAddress: string;
  }) {
    const [tokenAAddress, tokenAName] = tokenA.split('.');
    const [tokenBAddress, tokenBName] = tokenB.split('.');
    const [tokenCAddress, tokenCName] = tokenC.split('.');
    const [tokenDAddress, tokenDName] = tokenD.split('.');
    const config = DEX_CONFIGS[DexProvider.CHARISMA];

    return this.contractService.makeContractCall({
      senderKey,
      contractAddress: config.address,
      contractName: 'univ2-path2',
      functionName: 'swap-4',
      functionArgs: [
        uintCV(amountIn),
        uintCV(amountOutMin),
        contractPrincipalCV(tokenAAddress, tokenAName),
        contractPrincipalCV(tokenBAddress, tokenBName),
        contractPrincipalCV(tokenCAddress, tokenCName),
        contractPrincipalCV(tokenDAddress, tokenDName),
        contractPrincipalCV(config.address, config.shareFeeContract),
      ],
    });
  }

  /**
   * Execute a multi-hop swap using path5
   */
  async swap5({
    senderKey,
    tokenA,
    tokenB,
    tokenC,
    tokenD,
    tokenE,
    amountIn,
    amountOutMin,
    shareFeeToAddress,
  }: {
    senderKey: string;
    tokenA: string;
    tokenB: string;
    tokenC: string;
    tokenD: string;
    tokenE: string;
    amountIn: bigint;
    amountOutMin: bigint;
    shareFeeToAddress: string;
  }) {
    const [tokenAAddress, tokenAName] = tokenA.split('.');
    const [tokenBAddress, tokenBName] = tokenB.split('.');
    const [tokenCAddress, tokenCName] = tokenC.split('.');
    const [tokenDAddress, tokenDName] = tokenD.split('.');
    const [tokenEAddress, tokenEName] = tokenE.split('.');
    const config = DEX_CONFIGS[DexProvider.CHARISMA];

    return this.contractService.makeContractCall({
      senderKey,
      contractAddress: config.address,
      contractName: 'univ2-path2',
      functionName: 'swap-5',
      functionArgs: [
        uintCV(amountIn),
        uintCV(amountOutMin),
        contractPrincipalCV(tokenAAddress, tokenAName),
        contractPrincipalCV(tokenBAddress, tokenBName),
        contractPrincipalCV(tokenCAddress, tokenCName),
        contractPrincipalCV(tokenDAddress, tokenDName),
        contractPrincipalCV(tokenEAddress, tokenEName),
        contractPrincipalCV(config.address, config.shareFeeContract),
      ],
    });
  }

  /**
   * Helper method for getting optimal swap path and executing trade
   */
  async swapWithOptimalPath({
    senderKey,
    tokenIn,
    tokenOut,
    amountIn,
    slippageTolerance = 0.005, // 0.5% default slippage
    shareFeeToAddress,
  }: {
    senderKey: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: bigint;
    slippageTolerance?: number;
    shareFeeToAddress: string;
  }) {
    try {
      // First get quote to determine optimal path
      const quote = await this.dexReadService.getSwapQuote(
        tokenIn,
        tokenOut,
        amountIn
      );

      // Calculate minimum amount out based on slippage tolerance
      const amountOutMin = BigInt(
        Math.floor(Number(quote.amountOut) * (1 - slippageTolerance))
      );

      // Execute swap based on path length
      switch (quote.route.length) {
        case 2:
          return this.swap2({
            senderKey,
            tokenIn: quote.route[0],
            tokenOut: quote.route[1],
            amountIn,
            amountOutMin,
            shareFeeToAddress,
          });
        case 3:
          return this.swap3({
            senderKey,
            tokenA: quote.route[0],
            tokenB: quote.route[1],
            tokenC: quote.route[2],
            amountIn,
            amountOutMin,
            shareFeeToAddress,
          });
        case 4:
          return this.swap4({
            senderKey,
            tokenA: quote.route[0],
            tokenB: quote.route[1],
            tokenC: quote.route[2],
            tokenD: quote.route[3],
            amountIn,
            amountOutMin,
            shareFeeToAddress,
          });
        case 5:
          return this.swap5({
            senderKey,
            tokenA: quote.route[0],
            tokenB: quote.route[1],
            tokenC: quote.route[2],
            tokenD: quote.route[3],
            tokenE: quote.route[4],
            amountIn,
            amountOutMin,
            shareFeeToAddress,
          });
        default:
          throw new DexReadError(
            'Invalid route length',
            DexReadErrorCode.INVALID_PATH,
            { routeLength: quote.route.length }
          );
      }
    } catch (error) {
      if (error instanceof DexReadError) throw error;
      throw new DexReadError(
        'Failed to execute optimal path swap',
        DexReadErrorCode.CONTRACT_ERROR,
        error
      );
    }
  }
}

// Example usage:
/*
const dexService = new DexWriteService('mainnet');

// Direct swap
const result = await dexService.swap({
  senderKey: 'privateKey',
  tokenIn: 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS.token-a',
  tokenOut: 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS.token-b',
  amountIn: 1000000n,
  amountOutMin: 950000n,
  shareFeeToAddress: 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS'
});

// Optimal path swap
const optimalResult = await dexService.swapWithOptimalPath({
  senderKey: 'privateKey',
  tokenIn: 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS.token-a',
  tokenOut: 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS.token-d',
  amountIn: 1000000n,
  slippageTolerance: 0.01, // 1% slippage
  shareFeeToAddress: 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS'
});
*/
