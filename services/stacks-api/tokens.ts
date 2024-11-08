import { cache } from '../cache';

import { BaseStacksService } from '.';

// Response type definitions
export interface FtMetadataResponse {
  name?: string;
  symbol?: string;
  decimals?: number;
  total_supply?: string;
  token_uri?: string;
  description?: string;
  image_uri?: string;
  image_thumbnail_uri?: string;
  image_canonical_uri?: string;
  tx_id: string;
  sender_address: string;
  asset_identifier: string;
  metadata?: Metadata;
}

export interface PaginatedFtBasicMetadataResponse {
  limit: number;
  offset: number;
  total: number;
  results: FtBasicMetadataResponse[];
}

export interface FtBasicMetadataResponse {
  name?: string;
  symbol?: string;
  decimals?: number;
  total_supply?: string;
  token_uri?: string;
  description?: string;
  image_uri?: string;
  image_thumbnail_uri?: string;
  image_canonical_uri?: string;
  tx_id: string;
  sender_address: string;
  contract_principal: string;
}

export interface Metadata {
  sip: number;
  name?: string;
  description?: string;
  image?: string;
  cached_image?: string;
  cached_thumbnail_image?: string;
  attributes?: MetadataAttribute[];
  properties?: MetadataProperties;
  localization?: MetadataLocalization;
}

export interface MetadataAttribute {
  trait_type: string;
  display_type?: string;
  value: Record<string, unknown>;
}

export interface MetadataProperties {
  [key: string]: Record<string, unknown>;
}

export interface MetadataLocalization {
  uri: string;
  default: string;
  locales: string[];
}

// Service options type
export interface MetadataQueryOptions {
  name?: string;
  symbol?: string;
  address?: string;
  offset?: number;
  limit?: number;
  order_by?: string;
  order?: 'asc' | 'desc';
}

export class MetadataService extends BaseStacksService {
  /**
   * Get metadata for a specific fungible token
   * @param principal Contract principal in format: <address>.<contract-name>
   * @param locale Optional localization parameter
   */
  async getFungibleTokenMetadata(
    principal: string,
    locale?: string
  ): Promise<FtMetadataResponse> {
    const key = `/metadata/v1/ft/${principal}:${locale || 'default'}`;
    const cachedResponse = await cache.get(key);
    if (cachedResponse) return cachedResponse as FtMetadataResponse;

    return this.handleRequest(
      this.client
        .GET('/metadata/v1/ft/{principal}' as any, {
          params: {
            path: { principal },
            query: locale ? { locale } : undefined,
          },
        })
        .then(({ data }) => {
          cache.set(key, data);
          return data as FtMetadataResponse;
        })
    );
  }

  /**
   * List fungible tokens with optional filtering
   * @param options Query options for filtering and pagination
   */
  async listFungibleTokens(
    options: MetadataQueryOptions = {}
  ): Promise<PaginatedFtBasicMetadataResponse> {
    const queryParams = new URLSearchParams();

    // Add optional parameters if they exist
    if (options.name) queryParams.append('name', options.name);
    if (options.symbol) queryParams.append('symbol', options.symbol);
    if (options.address) queryParams.append('address', options.address);
    if (options.offset !== undefined)
      queryParams.append('offset', options.offset.toString());
    if (options.limit !== undefined)
      queryParams.append('limit', Math.min(options.limit, 60).toString());
    if (options.order_by) queryParams.append('order_by', options.order_by);
    if (options.order) queryParams.append('order', options.order);

    const key = `/metadata/v1/ft?${queryParams.toString()}`;
    const cachedResponse = await cache.get(key);
    if (cachedResponse)
      return cachedResponse as PaginatedFtBasicMetadataResponse;

    return this.handleRequest(
      this.client
        .GET('/metadata/v1/ft' as any, {
          params: {
            query: options,
          },
        })
        .then(({ data }) => {
          cache.set(key, data);
          return data as PaginatedFtBasicMetadataResponse;
        })
    );
  }

  /**
   * Helper method to get all metadata for multiple tokens
   * @param principals Array of contract principals
   */
  async batchGetTokenMetadata(
    principals: string[]
  ): Promise<Array<FtMetadataResponse | null>> {
    const metadataPromises = principals.map((principal) =>
      this.getFungibleTokenMetadata(principal).catch(() => null)
    );

    return Promise.all(metadataPromises);
  }

  /**
   * Helper method to search tokens by symbol
   */
  async findTokensBySymbol(
    symbol: string,
    limit: number = 10
  ): Promise<FtBasicMetadataResponse[]> {
    const response = await this.listFungibleTokens({
      symbol,
      limit,
      order_by: 'symbol',
      order: 'asc',
    });
    return response.results;
  }

  /**
   * Helper method to get metadata for tokens from a specific contract
   */
  async getTokensByContract(
    address: string,
    limit: number = 20
  ): Promise<FtBasicMetadataResponse[]> {
    const response = await this.listFungibleTokens({
      address,
      limit,
      order_by: 'name',
      order: 'asc',
    });
    return response.results;
  }
}

// Export a factory function
export function createMetadataService(): MetadataService {
  return new MetadataService();
}
