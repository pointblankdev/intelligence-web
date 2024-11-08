import { createClient } from '@stacks/blockchain-api-client';
import {
  cvToValue,
  cvToHex,
  hexToCV,
  principalCV,
  ClarityValue,
} from '@stacks/transactions';

import { cache } from '../cache';

/**
 * Standard token metadata interface following common NFT metadata schema
 * Can be extended based on your specific needs
 */
export interface TokenMetadata {
  name?: string;
  description?: string;
  image?: string;
  external_url?: string;
  animation_url?: string;
  background_color?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
  }>;
  [key: string]: any; // Allow for additional properties
}

/**
 * Interface for standard SIP010 token information
 */
export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint | string;
  tokenUri?: string;
  metadata?: TokenMetadata;
}

/**
 * Error codes for SIP010 operations
 */
export enum Sip10ErrorCode {
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  INVALID_TOKEN = 'INVALID_TOKEN',
  METADATA_ERROR = 'METADATA_ERROR',
}

/**
 * Custom error class for SIP010 operations
 */
export class Sip10Error extends Error {
  constructor(
    message: string,
    public code: Sip10ErrorCode,
    public details?: unknown
  ) {
    super(message);
    this.name = 'Sip10Error';
  }
}

/**
 * Service class for interacting with SIP010-compliant fungible tokens
 */
export class Sip10Service {
  private client;

  constructor() {
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
    contractAddress: string,
    contractName: string
  ): Promise<any> {
    try {
      const path = `/v2/contracts/call-read/${contractAddress}/${contractName}/${method}`;
      const hexArgs = args.map((arg) => cvToHex(arg));

      const key = `${path}:${hexArgs.join(':')}`;
      const cachedResponse = await cache.get(key);
      if (cachedResponse) return cvToValue(hexToCV(cachedResponse as string));

      const response = await this.client.POST(path as any, {
        body: {
          sender: contractAddress,
          arguments: hexArgs,
        },
      });

      if (response.error) {
        throw new Sip10Error(
          'Contract call failed',
          Sip10ErrorCode.CONTRACT_ERROR,
          response.data
        );
      }

      await cache.set(key, response.data.result);
      return cvToValue(hexToCV(response.data.result));
    } catch (error) {
      if (error instanceof Sip10Error) throw error;

      throw new Sip10Error(
        'Network request failed',
        Sip10ErrorCode.NETWORK_ERROR,
        error
      );
    }
  }

  /**
   * Fetch metadata from token URI
   * @private
   */
  private async fetchMetadata(uri: string): Promise<TokenMetadata | undefined> {
    try {
      // Try to get from cache first
      const cacheKey = `metadata:${uri}`;
      const cachedMetadata = await cache.get(cacheKey);
      if (cachedMetadata) return cachedMetadata;

      // If URI is IPFS, convert to HTTP gateway URL
      const url = uri.startsWith('ipfs://')
        ? `https://ipfs.io/ipfs/${uri.slice(7)}`
        : uri;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const metadata = await response.json();

      // Cache the metadata
      await cache.set(cacheKey, metadata, 36000); // Cache for 10 hours

      return metadata;
    } catch (error) {
      console.error('Failed to fetch metadata:', error);
      return undefined;
    }
  }

  /**
   * Get complete token information including name, symbol, decimals, etc.
   */
  async getTokenInfo(
    contractAddress: string,
    contractName: string
  ): Promise<TokenInfo> {
    try {
      const [name, symbol, decimals, totalSupply, tokenUri] = await Promise.all(
        [
          this.getName(contractAddress, contractName),
          this.getSymbol(contractAddress, contractName),
          this.getDecimals(contractAddress, contractName),
          this.getTotalSupply(contractAddress, contractName),
          this.getTokenUri(contractAddress, contractName),
        ]
      );

      // Fetch metadata if token URI exists
      const metadata = tokenUri
        ? await this.fetchMetadata(tokenUri)
        : undefined;

      return {
        name,
        symbol,
        decimals,
        totalSupply,
        tokenUri,
        metadata,
      };
    } catch (error) {
      throw new Sip10Error(
        'Failed to get token info',
        Sip10ErrorCode.CONTRACT_ERROR,
        error
      );
    }
  }

  /**
   * Get token name
   */
  async getName(
    contractAddress: string,
    contractName: string
  ): Promise<string> {
    const result = await this.callReadOnly(
      'get-name',
      [],
      contractAddress,
      contractName
    );

    if (!result?.value) {
      throw new Sip10Error(
        'Invalid name response',
        Sip10ErrorCode.INVALID_RESPONSE
      );
    }

    return result.value;
  }

  /**
   * Get token symbol
   */
  async getSymbol(
    contractAddress: string,
    contractName: string
  ): Promise<string> {
    const result = await this.callReadOnly(
      'get-symbol',
      [],
      contractAddress,
      contractName
    );

    if (!result?.value) {
      throw new Sip10Error(
        'Invalid symbol response',
        Sip10ErrorCode.INVALID_RESPONSE
      );
    }

    return result.value;
  }

  /**
   * Get token decimals
   */
  async getDecimals(
    contractAddress: string,
    contractName: string
  ): Promise<number> {
    const result = await this.callReadOnly(
      'get-decimals',
      [],
      contractAddress,
      contractName
    );

    if (!result?.value) {
      throw new Sip10Error(
        'Invalid decimals response',
        Sip10ErrorCode.INVALID_RESPONSE
      );
    }

    return Number(result.value);
  }

  /**
   * Get token balance for an address
   */
  async getBalance(
    contractAddress: string,
    contractName: string,
    ownerAddress: string
  ): Promise<bigint> {
    const result = await this.callReadOnly(
      'get-balance',
      [principalCV(ownerAddress)],
      contractAddress,
      contractName
    );

    if (!result?.value) {
      throw new Sip10Error(
        'Invalid balance response',
        Sip10ErrorCode.INVALID_RESPONSE
      );
    }

    return BigInt(result.value);
  }

  /**
   * Get total token supply
   */
  async getTotalSupply(
    contractAddress: string,
    contractName: string
  ): Promise<bigint> {
    const result = await this.callReadOnly(
      'get-total-supply',
      [],
      contractAddress,
      contractName
    );

    if (!result?.value) {
      throw new Sip10Error(
        'Invalid total supply response',
        Sip10ErrorCode.INVALID_RESPONSE
      );
    }

    return BigInt(result.value);
  }

  /**
   * Get token URI
   */
  async getTokenUri(
    contractAddress: string,
    contractName: string
  ): Promise<string | undefined> {
    const result = await this.callReadOnly(
      'get-token-uri',
      [],
      contractAddress,
      contractName
    );

    // Token URI is optional in SIP010
    return result?.value?.value || undefined;
  }

  /**
   * Get token URI and metadata if available
   */
  async getTokenUriAndMetadata(
    contractAddress: string,
    contractName: string
  ): Promise<{ uri?: string; metadata?: TokenMetadata }> {
    try {
      const uri = await this.getTokenUri(contractAddress, contractName);
      if (!uri) return {};

      const metadata = await this.fetchMetadata(uri);
      return { uri, metadata };
    } catch (error) {
      throw new Sip10Error(
        'Failed to get token URI and metadata',
        Sip10ErrorCode.METADATA_ERROR,
        error
      );
    }
  }

  /**
   * Batch fetch token information with metadata for multiple tokens
   */
  async batchGetTokenInfo(
    tokens: Array<{ contractAddress: string; contractName: string }>
  ): Promise<(TokenInfo | null)[]> {
    try {
      const infoPromises = tokens.map((token) =>
        this.getTokenInfo(token.contractAddress, token.contractName).catch(
          (error) => {
            console.error(
              `Failed to get info for token ${token.contractAddress}.${token.contractName}:`,
              error
            );
            return null;
          }
        )
      );

      return await Promise.all(infoPromises);
    } catch (error) {
      throw new Sip10Error(
        'Failed to batch get token info',
        Sip10ErrorCode.CONTRACT_ERROR,
        error
      );
    }
  }

  /**
   * Batch fetch token balances for multiple tokens and owners
   */
  async batchGetBalances(
    queries: Array<{
      contractAddress: string;
      contractName: string;
      ownerAddress: string;
    }>
  ): Promise<(bigint | null)[]> {
    try {
      const balancePromises = queries.map((query) =>
        this.getBalance(
          query.contractAddress,
          query.contractName,
          query.ownerAddress
        ).catch((error) => {
          console.error(
            `Failed to get balance for ${query.contractAddress}.${query.contractName}:`,
            error
          );
          return null;
        })
      );

      return await Promise.all(balancePromises);
    } catch (error) {
      throw new Sip10Error(
        'Failed to batch get balances',
        Sip10ErrorCode.CONTRACT_ERROR,
        error
      );
    }
  }
}
