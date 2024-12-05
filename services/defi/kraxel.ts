import { PriceError, PriceErrorCode } from './errors';

// Raw data interfaces
interface RawTokenInfo {
  contractAddress: string;
  lastUpdated: string;
  name: string;
  symbol: string;
  decimals: string | number;
  totalSupply: string;
  tokenUri: string | null;
}

interface RawPool {
  poolId: number | string;
  lpToken: string;
  reserve0: string;
  reserve1: string;
  symbol: string;
  token0: string;
  token1: string;
  source: string;
  lastUpdated: string;
  token0Info?: RawTokenInfo;
  token1Info?: RawTokenInfo;
  token0Price: string;
  token1Price: string;
  reserve0Value: string;
  reserve1Value: string;
  TVL: string;
}

// Price API interfaces
interface TokenPrice {
  token: string;
  price: number;
  lastUpdated: string;
}

interface PricesResponse {
  timestamp: string;
  count: number;
  prices: TokenPrice[];
}

interface SinglePriceResponse {
  timestamp: string;
  price: TokenPrice;
}

// Normalized interfaces
interface TokenInfo {
  contractAddress: string;
  lastUpdated: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  tokenUri?: string;
}

interface Pool {
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
}

type PoolsArray = Pool[];

// Default values for missing data
const DEFAULT_TOKEN_INFO: TokenInfo = {
  contractAddress: '',
  lastUpdated: new Date().toISOString(),
  name: 'Unknown Token',
  symbol: 'UNKNOWN',
  decimals: 6,
  totalSupply: 0,
};

// Normalization functions
function normalizeTokenInfo(rawInfo?: RawTokenInfo): TokenInfo {
  if (!rawInfo) return DEFAULT_TOKEN_INFO;

  return {
    contractAddress: rawInfo.contractAddress || '',
    lastUpdated: rawInfo.lastUpdated || new Date().toISOString(),
    name: rawInfo.name || 'Unknown Token',
    symbol: rawInfo.symbol || 'UNKNOWN',
    decimals: Number(rawInfo.decimals || 6),
    totalSupply: Number(rawInfo.totalSupply || 0),
    tokenUri: rawInfo.tokenUri || '',
  };
}

function normalizePool(rawPool: RawPool): Pool {
  return {
    poolId: Number(rawPool.poolId),
    lpToken: rawPool.lpToken,
    reserve0: rawPool.reserve0,
    reserve1: rawPool.reserve1,
    reserve0ConvertUsd: rawPool.reserve0Value,
    reserve1ConvertUsd: rawPool.reserve1Value,
    token0Price: rawPool.token0Price || '0',
    token1Price: rawPool.token1Price || '0',
    symbol: rawPool.symbol,
    token0: rawPool.token0,
    token1: rawPool.token1,
    source: rawPool.source,
    lastUpdated: rawPool.lastUpdated,
    token0Info: normalizeTokenInfo(rawPool.token0Info),
    token1Info: normalizeTokenInfo(rawPool.token1Info),
  };
}

export class KraxelService {
  private static instance: KraxelService;
  private priceCache: Map<string, { price: number; timestamp: string }> =
    new Map();
  private lastPricesFetch: string | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor(
    private readonly apiUrl: string,
    private readonly fetchOptions: RequestInit = {}
  ) {}

  public static getInstance(apiUrl: string): KraxelService {
    if (!KraxelService.instance) {
      KraxelService.instance = new KraxelService(apiUrl);
    }
    return KraxelService.instance;
  }

  private isCacheValid(): boolean {
    if (!this.lastPricesFetch) return false;
    const now = new Date().getTime();
    const lastFetch = new Date(this.lastPricesFetch).getTime();
    return now - lastFetch < this.CACHE_DURATION;
  }

  private async fetchWithErrorHandling(url: string): Promise<Response> {
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
        'Failed to fetch data',
        PriceErrorCode.FETCH_FAILED,
        response.status
      );
    }

    return response;
  }

  public async getPriceById(tokenId: string): Promise<number> {
    try {
      // Check cache first
      const cachedPrice = this.priceCache.get(tokenId);
      if (cachedPrice && this.isCacheValid()) {
        return cachedPrice.price;
      }

      const response = await this.fetchWithErrorHandling(
        `${this.apiUrl}/prices/${encodeURIComponent(tokenId)}`
      );

      const data: SinglePriceResponse = await response.json();

      // Update cache
      this.priceCache.set(tokenId, {
        price: data.price.price,
        timestamp: data.timestamp,
      });

      return data.price.price;
    } catch (error) {
      if (error instanceof PriceError) {
        throw error;
      }

      throw new PriceError(
        'Failed to fetch price by ID',
        PriceErrorCode.FETCH_FAILED,
        500
      );
    }
  }

  public async getPrice(token: string): Promise<string> {
    try {
      // First try to get price directly by ID
      try {
        const price = await this.getPriceById(token);
        return price.toString();
      } catch (error) {
        // If not found, continue with other methods
        if (
          !(
            error instanceof PriceError &&
            error.code === PriceErrorCode.NOT_FOUND
          )
        ) {
          throw error;
        }
      }

      // Then try the bulk prices endpoint
      const prices = await this.getAllPrices();
      if (prices[token]) {
        return prices[token].toString();
      }

      // Finally, fall back to pool-based price
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
        'Price not found for token',
        PriceErrorCode.NOT_FOUND,
        404
      );
    } catch (error) {
      if (error instanceof PriceError) {
        throw error;
      }

      throw new PriceError(
        'Failed to get price',
        PriceErrorCode.FETCH_FAILED,
        500
      );
    }
  }

  public async getPrices(tokens: string[]): Promise<Record<string, string>> {
    const prices: Record<string, string> = {};

    for (const token of tokens) {
      try {
        // Try to get individual price first
        const price = await this.getPriceById(token);
        prices[token] = price.toString();
      } catch (error) {
        // If individual price fetch fails, try bulk endpoint
        try {
          prices[token] = await this.getPrice(token);
        } catch (priceError) {
          prices[token] = '0';
        }
      }
    }

    return prices;
  }

  public async getAllPrices(): Promise<Record<string, number>> {
    if (this.isCacheValid()) {
      const cachedPrices: Record<string, number> = {};
      this.priceCache.forEach((value, key) => {
        cachedPrices[key] = value.price;
      });
      return cachedPrices;
    }

    try {
      const response = await this.fetchWithErrorHandling(
        `${this.apiUrl}/prices`
      );
      const data: PricesResponse = await response.json();
      const prices: Record<string, number> = {};

      // Update cache
      this.priceCache.clear();
      this.lastPricesFetch = data.timestamp;

      data.prices.forEach((tokenPrice) => {
        prices[tokenPrice.token] = tokenPrice.price;
        this.priceCache.set(tokenPrice.token, {
          price: tokenPrice.price,
          timestamp: tokenPrice.lastUpdated,
        });
      });

      return prices;
    } catch (error) {
      if (error instanceof PriceError) {
        throw error;
      }

      throw new PriceError(
        'Failed to fetch prices',
        PriceErrorCode.NETWORK_ERROR,
        500
      );
    }
  }

  public async getAllPools(): Promise<PoolsArray> {
    const rawPools = await this.fetchPools();
    return rawPools.map(normalizePool);
  }

  private async fetchPools(): Promise<RawPool[]> {
    try {
      const response = await this.fetchWithErrorHandling(
        `${this.apiUrl}/pools`
      );
      const result = await response.json();
      return result.pools;
    } catch (error) {
      throw new PriceError(
        'Failed to fetch pools',
        PriceErrorCode.NETWORK_ERROR
      );
    }
  }
}
