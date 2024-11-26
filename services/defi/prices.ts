import { PriceError, PriceErrorCode } from './errors';

export interface TokenPrice {
  symbol: string;
  price: number;
  updatedAt: number;
}

export class PricesService {
  private static instance: PricesService;
  private cache: Map<string, TokenPrice> = new Map();
  private lastFetchTime: number = 0;
  private fetchPromise: Promise<void> | null = null;

  // Cache constants
  private readonly CACHE_DURATION = 60 * 1000; // 1 minute
  private readonly RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  constructor(
    private readonly apiUrl: string,
    private readonly fetchOptions: RequestInit = {}
  ) {}

  /**
   * Get singleton instance
   */
  public static getInstance(apiUrl: string): PricesService {
    if (!PricesService.instance) {
      PricesService.instance = new PricesService(apiUrl);
    }
    return PricesService.instance;
  }

  /**
   * Get price for a specific token
   */
  public async getPrice(symbol: string): Promise<number> {
    await this.ensurePricesUpdated();
    const price = this.cache.get(symbol);
    return price?.price ?? 0;
  }

  /**
   * Get prices for multiple tokens
   */
  public async getPrices(symbols: string[]): Promise<Record<string, number>> {
    await this.ensurePricesUpdated();
    return symbols.reduce(
      (acc, symbol) => {
        acc[symbol] = this.cache.get(symbol)?.price ?? 0;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  /**
   * Get all available token prices
   */
  public async getAllPrices(): Promise<Record<string, number>> {
    await this.ensurePricesUpdated();
    const prices: Record<string, number> = {};
    this.cache.forEach((value, key) => {
      prices[key] = value.price;
    });
    return prices;
  }

  /**
   * Check if a specific price is stale
   */
  public isPriceStale(symbol: string): boolean {
    const price = this.cache.get(symbol);
    if (!price) return true;
    return Date.now() - price.updatedAt > this.CACHE_DURATION;
  }

  /**
   * Force refresh all prices
   */
  public async refreshPrices(): Promise<void> {
    await this.fetchPrices(true);
  }

  /**
   * Ensure prices are up to date
   */
  private async ensurePricesUpdated(): Promise<void> {
    const now = Date.now();
    if (now - this.lastFetchTime > this.CACHE_DURATION) {
      await this.fetchPrices();
    }
  }

  /**
   * Fetch prices from API with retry logic
   */
  private async fetchPrices(force: boolean = false): Promise<void> {
    // If already fetching, wait for that promise
    if (this.fetchPromise) {
      await this.fetchPromise;
      return;
    }

    // Check if cache is still valid
    if (!force && Date.now() - this.lastFetchTime < this.CACHE_DURATION) {
      return;
    }

    this.fetchPromise = this.fetchPricesWithRetry();

    try {
      await this.fetchPromise;
    } finally {
      this.fetchPromise = null;
    }
  }

  /**
   * Fetch prices with retry logic
   */
  private async fetchPricesWithRetry(): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.RETRY_ATTEMPTS; attempt++) {
      try {
        const response = await fetch(`${this.apiUrl}/prices`, {
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

        if (!result.success || !result.data) {
          throw new PriceError(
            'Invalid response format',
            PriceErrorCode.INVALID_RESPONSE,
            response.status,
            result
          );
        }

        // Update cache
        const now = Date.now();
        Object.entries(result.data).forEach(([symbol, value]) => {
          this.cache.set(symbol, {
            symbol,
            price: Number(value),
            updatedAt: now,
          });
        });

        this.lastFetchTime = now;
        return;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on rate limit
        if (
          error instanceof PriceError &&
          error.code === PriceErrorCode.RATE_LIMITED
        ) {
          throw error;
        }

        // Wait before retrying
        if (attempt < this.RETRY_ATTEMPTS - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.RETRY_DELAY * Math.pow(2, attempt))
          );
        }
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

  /**
   * Fetch fresh pool data from API
   */
  public async getPoolData() {
    try {
      const response = await fetch(`${this.apiUrl}/pools?ai=true`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pool data');
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching pool data:', error);
      throw error;
    }
  }
}
