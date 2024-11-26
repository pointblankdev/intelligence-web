import { fetcher } from '@/lib/utils';

import { PriceError, PriceErrorCode } from './errors';

type TokenInfo = {
  contractAddress: string;
  lastUpdated: string;
  name: {
    type: string;
    value: string;
  };
  symbol: {
    type: string;
    value: string;
  };
  decimals: {
    type: string;
    value: string;
  };
  totalSupply: {
    type: string;
    value: string;
  };
  tokenUri?: {
    type: string;
    value: {
      type: string;
      value: string;
    };
  };
};

type Pool = {
  poolId: number;
  lpToken: string;
  reserve0: string;
  reserve1: string;
  reserve0ConvertUsd: string;
  reserve1ConvertUsd: string;
  token0Price: string;
  token1Price: string;
  symbol: string;
  token0: string;
  token1: string;
  source: string;
  lastUpdated: string;
  token0Info: TokenInfo;
  token1Info: TokenInfo;
};

type PoolsArray = Pool[];

export class KraxelService {
  private static instance: KraxelService;

  constructor(
    private readonly apiUrl: string,
    private readonly fetchOptions: RequestInit = {}
  ) {}

  /**
   * Get singleton instance
   */
  public static getInstance(apiUrl: string): KraxelService {
    if (!KraxelService.instance) {
      KraxelService.instance = new KraxelService(apiUrl);
    }
    return KraxelService.instance;
  }

  /**
   * Get price for a specific token
   */
  public async getPrice(token: string): Promise<string> {
    const pools = await this.getAllPools();

    const pool0 = pools.find(
      (p) => Number(p.token0Price) != 0 && token == p.token0
    );
    if (pool0) return pool0.token0Price;

    const pool1 = pools.find(
      (p) => Number(p.token1Price) != 0 && token == p.token1
    );
    if (pool1) return pool1.token1Price;

    throw new PriceError(
      'Failed to get price',
      PriceErrorCode.FETCH_FAILED,
      500
    );
  }

  /**
   * Get all available token prices
   */
  public async getAllPools(): Promise<PoolsArray> {
    return await this.fetchPools();
  }

  /**
   * Get all available token prices
   */
  public async getPrices(tokens: string[]): Promise<Record<string, string>> {
    const prices: Record<string, string> = {};

    for (const token of tokens) {
      prices[token] = await this.getPrice(token);
    }

    return prices;
  }

  /**
   * Fetch prices & pools data with retry logic
   */
  private async fetchPools(): Promise<PoolsArray> {
    let lastError: Error | null = null;

    try {
      const url = `${this.apiUrl}/pools`;
      const response = await fetch(url, {
        ...this.fetchOptions,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.fetchOptions.headers,
        },
      });

      if (response.status === 429) {
        throw new PriceError(
          'Rate limit exceeded',
          PriceErrorCode.RATE_LIMITED,
          response.status
        );
      }

      if (!response.ok) {
        throw new PriceError(
          'Failed to fetch prices',
          PriceErrorCode.FETCH_FAILED,
          response.status
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      lastError = error as Error;

      // Don't retry on rate limit
      if (
        error instanceof PriceError &&
        error.code === PriceErrorCode.RATE_LIMITED
      ) {
        throw error;
      }
    }

    // If we get here, all retries failed
    throw (
      lastError ||
      new PriceError(
        'Failed to fetch prices after retries',
        PriceErrorCode.NETWORK_ERROR
      )
    );
  }
}
