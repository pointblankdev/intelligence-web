import { createClient } from '@stacks/blockchain-api-client';

export class BaseStacksService {
  protected client;
  protected baseUrl: string;

  constructor(
    config: {
      baseUrl?: string;
      apiKey?: string;
    } = {}
  ) {
    this.baseUrl = config.baseUrl || 'https://api.mainnet.hiro.so';
    this.client = createClient({ baseUrl: this.baseUrl });

    if (config.apiKey) {
      this.client.use({
        onRequest({ request }) {
          request.headers.set(
            'x-hiro-api-key',
            config.apiKey || process.env.STACKS_API_KEY!
          );
          return request;
        },
      });
    }
  }

  // Shared helper method for building URLs
  protected buildUrl(
    path: string,
    queryParams: Record<string, string | number> = {}
  ): string {
    const url = new URL(path, this.baseUrl);
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
    return url.toString();
  }

  // Shared error handling wrapper
  protected async handleRequest<T>(request: Promise<T>): Promise<T> {
    try {
      return await request;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Stacks API Error: ${error.message}`);
      }
      throw error;
    }
  }
}

// Global singleton instance for shared configuration
let globalStacksService: BaseStacksService | null = null;

export function initializeStacksService(config?: {
  baseUrl?: string;
  apiKey?: string;
}): void {
  globalStacksService = new BaseStacksService(config);
}

export function getStacksService(): BaseStacksService {
  if (!globalStacksService) {
    globalStacksService = new BaseStacksService();
  }
  return globalStacksService;
}
