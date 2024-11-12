import { createClient } from '@stacks/blockchain-api-client';
import {
  cvToValue,
  cvToHex,
  hexToCV,
  principalCV,
  uintCV,
  ClarityValue,
} from '@stacks/transactions';

import { cache } from '../cache';

/**
 * Interface for NFT listing information
 */
export interface ListingInfo {
  price: bigint;
  commission: bigint;
  owner: string;
  royaltyAddress: string;
  royaltyPercent: bigint;
}

/**
 * Service class for interacting with NFT marketplace contract's read-only functions
 */
export class MarketplaceService {
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
   * Helper function to check for contract errors
   */
  private checkContractError(result: any): void {
    switch (result.value) {
      case '1':
        throw new Error('Payment failed');
      case '2':
        throw new Error('Transfer failed');
      case '3':
        throw new Error('Not allowed');
      case '4':
        throw new Error('Duplicate entry');
      case '5':
        throw new Error('Listing not found');
      case '6':
        throw new Error('Commission or price too low');
      case '7':
        throw new Error('Listings frozen');
      case '8':
        throw new Error('Commission payment failed');
      case '9':
        throw new Error('Royalty payment failed');
      case '10':
        throw new Error('Contract not authorized');
      default:
    }
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

    await cache.set(key, response.data.result, 10);
    return cvToValue(hexToCV(response.data.result));
  }

  /**
   * Get listing information for a specific NFT
   */
  async getListing(
    marketplaceAddress: string,
    marketplaceContract: string,
    nftContract: string,
    tokenId: number
  ): Promise<ListingInfo> {
    const result = await this.callReadOnly(
      'get-listing',
      [principalCV(nftContract), uintCV(tokenId)],
      marketplaceAddress,
      marketplaceContract
    );

    this.checkContractError(result);

    return {
      price: BigInt(result.value.price.value),
      commission: BigInt(result.value.commission.value),
      owner: result.value.owner.value,
      royaltyAddress: result.value['royalty-address'].value,
      royaltyPercent: BigInt(result.value['royalty-percent'].value),
    };
  }

  /**
   * Get royalty percentage for a contract
   */
  async getRoyaltyAmount(
    marketplaceAddress: string,
    marketplaceContract: string,
    nftContract: string
  ): Promise<bigint> {
    const result = await this.callReadOnly(
      'get-royalty-amount',
      [principalCV(nftContract)],
      marketplaceAddress,
      marketplaceContract
    );

    return BigInt(result);
  }

  /**
   * Batch fetch listing information for multiple NFTs
   */
  async batchGetListings(
    queries: Array<{
      marketplaceAddress: string;
      marketplaceContract: string;
      nftContract: string;
      tokenId: number;
    }>
  ): Promise<(ListingInfo | null)[]> {
    const listingPromises = queries.map((query) =>
      this.getListing(
        query.marketplaceAddress,
        query.marketplaceContract,
        query.nftContract,
        query.tokenId
      ).catch(() => null)
    );

    return await Promise.all(listingPromises);
  }
}
