import { cache } from '../cache';

import { BaseStacksService } from '.';

// Search result type definitions
export interface AddressSearchResult {
  found: true;
  result: {
    entity_type: 'standard_address';
    entity_id: string;
    metadata?: {
      // Address specific metadata
      balance: string;
      nonce: number;
      tx_count: number;
    };
  };
}

export interface BlockSearchResult {
  found: true;
  result: {
    entity_type: 'block';
    entity_id: string;
    metadata?: {
      // Block specific metadata
      block_height: number;
      index_block_hash: string;
      parent_block_hash: string;
      burn_block_time: number;
      burn_block_height: number;
    };
  };
}

export interface ContractSearchResult {
  found: true;
  result: {
    entity_type: 'contract_address';
    entity_id: string;
    metadata?: {
      // Contract specific metadata
      tx_id: string;
      block_height: number;
      contract_name: string;
      source_code: string;
    };
  };
}

export interface TxSearchResult {
  found: true;
  result: {
    entity_type: 'tx';
    entity_id: string;
    metadata?: {
      // Transaction specific metadata
      block_height: number;
      tx_index: number;
      tx_status: string;
      tx_type: string;
      fee_rate: string;
      sender_address: string;
      nonce: number;
    };
  };
}

export interface MempoolTxSearchResult {
  found: true;
  result: {
    entity_type: 'mempool_tx';
    entity_id: string;
    metadata?: {
      // Mempool transaction specific metadata
      receipt_time: number;
      receipt_block_height: number;
      tx_type: string;
      fee_rate: string;
      sender_address: string;
      nonce: number;
    };
  };
}

export interface NotFoundResult {
  found: false;
  result: {
    error: string;
  };
}

export type SearchResult =
  | AddressSearchResult
  | BlockSearchResult
  | ContractSearchResult
  | TxSearchResult
  | MempoolTxSearchResult
  | NotFoundResult;

export class StacksSearchService extends BaseStacksService {
  /**
   * Search for blocks, transactions, contracts, or accounts by hash/ID
   * @param id Hash string or address to search for
   * @param includeMetadata Whether to include detailed metadata in the response
   */
  async search(
    id: string,
    includeMetadata: boolean = false
  ): Promise<SearchResult> {
    const key = `/extended/v1/search/${id}:${includeMetadata}`;
    const cachedResponse = await cache.get(key);
    if (cachedResponse) return cachedResponse as SearchResult;

    return this.handleRequest(
      this.client
        .GET('/extended/v1/search/{id}', {
          params: {
            path: { id },
            query: {
              include_metadata: includeMetadata,
            },
          },
        })
        .then(({ data }) => {
          if (!data?.found) {
            return {
              found: false,
              result: {
                error: `No entity found with ID: ${id}`,
              },
            } as NotFoundResult;
          }
          cache.set(key, data);
          return data as SearchResult;
        })
    );
  }

  /**
   * Helper method to search and cast to specific type if found
   */
  private async searchWithType<T extends { result: { entity_type: string } }>(
    id: string,
    includeMetadata: boolean = false,
    entityType: T['result']['entity_type']
  ): Promise<T | NotFoundResult> {
    const result = await this.search(id, includeMetadata);
    if (result.found && result.result.entity_type === entityType) {
      return result as any;
    }
    return result as NotFoundResult;
  }

  /**
   * Search specifically for an address
   */
  async searchAddress(
    address: string,
    includeMetadata: boolean = false
  ): Promise<AddressSearchResult | NotFoundResult> {
    return this.searchWithType<AddressSearchResult>(
      address,
      includeMetadata,
      'standard_address'
    );
  }

  /**
   * Search specifically for a block
   */
  async searchBlock(
    blockHash: string,
    includeMetadata: boolean = false
  ): Promise<BlockSearchResult | NotFoundResult> {
    return this.searchWithType<BlockSearchResult>(
      blockHash,
      includeMetadata,
      'block'
    );
  }

  /**
   * Search specifically for a contract
   */
  async searchContract(
    contractId: string,
    includeMetadata: boolean = false
  ): Promise<ContractSearchResult | NotFoundResult> {
    return this.searchWithType<ContractSearchResult>(
      contractId,
      includeMetadata,
      'contract_address'
    );
  }

  /**
   * Search specifically for a transaction (including mempool)
   */
  async searchTransaction(
    txId: string,
    includeMetadata: boolean = false
  ): Promise<TxSearchResult | MempoolTxSearchResult | NotFoundResult> {
    const result = await this.search(txId, includeMetadata);
    if (
      result.found &&
      (result.result.entity_type === 'tx' ||
        result.result.entity_type === 'mempool_tx')
    ) {
      return result as TxSearchResult | MempoolTxSearchResult;
    }
    return result as NotFoundResult;
  }
}

// Export a factory function
export function createSearchService(): StacksSearchService {
  return new StacksSearchService();
}
