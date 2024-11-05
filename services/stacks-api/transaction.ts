import { BaseStacksService } from '.';

export class TransactionService extends BaseStacksService {
  /**
   * Get recent transactions
   */
  async getRecentTransactions(
    params: {
      limit?: number;
      offset?: number;
      type?:
        | (
            | 'coinbase'
            | 'token_transfer'
            | 'smart_contract'
            | 'contract_call'
            | 'poison_microblock'
            | 'tenure_change'
          )[]
        | undefined;
      unanchored?: boolean;
      order?: 'asc' | 'desc' | undefined;
      sort_by?: 'block_height' | 'fee' | 'burn_block_time' | undefined;
      from_address?: string;
      to_address?: string;
      start_time?: number;
      end_time?: number;
      contract_id?: string;
      function_name?: string;
      nonce?: number;
    } = {}
  ) {
    return this.handleRequest(
      this.client
        .GET('/extended/v1/tx/', {
          params: { query: params },
        })
        .then(({ data }) => data)
    );
  }

  /**
   * Get transaction details by ID
   */
  async getTransaction(
    txId: string,
    params: {
      event_limit?: number;
      event_offset?: number;
      unanchored?: boolean;
    } = {}
  ) {
    return this.handleRequest(
      this.client
        .GET('/extended/v1/tx/{tx_id}', {
          params: {
            path: { tx_id: txId },
            query: params,
          },
        })
        .then(({ data }) => data)
    );
  }

  /**
   * Get raw transaction data
   */
  async getRawTransaction(txId: string) {
    return this.handleRequest(
      this.client
        .GET('/extended/v1/tx/{tx_id}/raw', {
          params: {
            path: { tx_id: txId },
          },
        })
        .then(({ data }) => data?.raw_tx)
    );
  }

  /**
   * Get mempool transactions
   */
  async getMempoolTransactions(
    params: {
      sender_address?: string;
      recipient_address?: string;
      address?: string;
      order_by?: 'fee' | 'age' | 'size' | undefined;
      order?: 'asc' | 'desc' | undefined;
      unanchored?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    return this.handleRequest(
      this.client
        .GET('/extended/v1/tx/mempool', {
          params: { query: params },
        })
        .then(({ data }) => data)
    );
  }

  /**
   * Get dropped mempool transactions
   */
  async getDroppedMempoolTransactions(
    params: {
      limit?: number;
      offset?: number;
    } = {}
  ) {
    return this.handleRequest(
      this.client
        .GET('/extended/v1/tx/mempool/dropped', {
          params: { query: params },
        })
        .then(({ data }) => data)
    );
  }

  /**
   * Get mempool statistics
   */
  async getMempoolStats() {
    return this.handleRequest(
      this.client.GET('/extended/v1/tx/mempool/stats').then(({ data }) => data)
    );
  }

  /**
   * Get transaction events
   */
  async getTransactionEvents(
    params: {
      tx_id?: string;
      address?: string;
      type?:
        | (
            | 'smart_contract_log'
            | 'stx_lock'
            | 'stx_asset'
            | 'fungible_token_asset'
            | 'non_fungible_token_asset'
          )[]
        | undefined;
      offset?: number;
      limit?: number;
    } = {}
  ) {
    return this.handleRequest(
      this.client
        .GET('/extended/v1/tx/events', {
          params: { query: params },
        })
        .then(({ data }) => ({
          limit: data?.limit,
          offset: data?.offset,
          events: data?.events,
        }))
    );
  }

  /**
   * Get transactions by block
   */
  async getTransactionsByBlock(
    heightOrHash: string | number,
    params: {
      limit?: number;
      offset?: number;
    } = {}
  ) {
    return this.handleRequest(
      this.client
        .GET('/extended/v2/blocks/{height_or_hash}/transactions', {
          params: {
            path: { height_or_hash: String(heightOrHash) },
            query: params,
          },
        })
        .then(({ data }) => data)
    );
  }

  /**
   * Get address transactions
   */
  async getAddressTransactions(
    address: string,
    params: {
      limit?: number;
      offset?: number;
    } = {}
  ) {
    return this.handleRequest(
      this.client
        .GET('/extended/v2/addresses/{address}/transactions', {
          params: {
            path: { address },
            query: params,
          },
        })
        .then(({ data }) => data)
    );
  }

  /**
   * Get address transaction events
   */
  async getAddressTransactionEvents(
    address: string,
    txId: string,
    params: {
      limit?: number;
      offset?: number;
    } = {}
  ) {
    return this.handleRequest(
      this.client
        .GET('/extended/v2/addresses/{address}/transactions/{tx_id}/events', {
          params: {
            path: { address, tx_id: txId },
            query: params,
          },
        })
        .then(({ data }) => data)
    );
  }
}

// Export a factory function
export function createTransactionService(): TransactionService {
  return new TransactionService();
}
