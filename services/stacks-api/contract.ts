import { BaseStacksService } from '.';

// Response type definitions
interface SmartContract {
  tx_id: string;
  canonical: boolean;
  contract_id: string;
  block_height: number;
  clarity_version: number | null;
  source_code: string;
  abi: string | null;
}

interface ContractEvent {
  tx_id: string;
  event_index: number;
  event_type: string;
  contract_log?: {
    contract_id: string;
    topic: string;
    value: any;
  };
  asset?: {
    asset_event_type: string;
    asset_id: string;
    sender: string;
    recipient: string;
    amount: string;
  };
  stx_lock_event?: {
    locked_amount: string;
    unlock_height: number;
    locked_address: string;
  };
  block_height: number;
}

interface ContractEventsResponse {
  limit: number;
  offset: number;
  results: ContractEvent[];
}

interface ContractsByTraitResponse {
  limit: number;
  offset: number;
  results: SmartContract[];
}

interface ContractStatus {
  is_deployed: boolean;
  block_height?: number;
  tx_id?: string;
  error?: string;
}

type ContractStatusMap = Record<string, ContractStatus>;

export class ContractService extends BaseStacksService {
  /**
   * Get contract details by ID
   * @param contractId Contract identifier formatted as <contract_address>.<contract_name>
   */
  async getContractInfo(contractId: string): Promise<SmartContract> {
    return this.handleRequest(
      this.client
        .GET('/extended/v1/contract/{contract_id}', {
          params: {
            path: { contract_id: contractId },
          },
        })
        .then(({ data }) => data as SmartContract)
    );
  }

  /**
   * Get contract events
   * @param contractId Contract identifier
   * @param limit Maximum number of events to fetch (max 50)
   * @param offset Result offset for pagination
   */
  async getContractEvents(
    contractId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ContractEventsResponse> {
    return this.handleRequest(
      this.client
        .GET('/extended/v1/contract/{contract_id}/events', {
          params: {
            path: { contract_id: contractId },
            query: {
              limit: Math.min(limit, 50),
              offset,
            },
          },
        })
        .then(({ data }) => data as ContractEventsResponse)
    );
  }

  /**
   * Get contracts by trait
   * @param traitAbi JSON ABI of the trait
   * @param limit Maximum number of contracts to fetch (max 50)
   * @param offset Result offset for pagination
   */
  async getContractsByTrait(
    traitAbi: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ContractsByTraitResponse> {
    return this.handleRequest(
      this.client
        .GET('/extended/v1/contract/by_trait', {
          params: {
            query: {
              trait_abi: traitAbi,
              limit: Math.min(limit, 50),
              offset,
            },
          },
        })
        .then(({ data }) => data as ContractsByTraitResponse)
    );
  }

  /**
   * Get deployment status of multiple contracts
   * @param contractIds Array of contract identifiers
   */
  async getContractsStatus(contractIds: string[]): Promise<ContractStatusMap> {
    return this.handleRequest(
      this.client
        .GET('/extended/v2/smart-contracts/status', {
          params: {
            query: {
              contract_id: contractIds,
            },
          },
        })
        .then(({ data }) => data as unknown as ContractStatusMap)
    );
  }

  /**
   * Helper: Get single contract status
   * @param contractId Contract identifier
   */
  async getContractStatus(contractId: string): Promise<ContractStatus> {
    const result = await this.getContractsStatus([contractId]);
    return (
      result[contractId] || {
        is_deployed: false,
        error: 'Contract not found',
      }
    );
  }

  /**
   * Helper: Check if a contract is deployed
   * @param contractId Contract identifier
   */
  async isContractDeployed(contractId: string): Promise<boolean> {
    const status = await this.getContractStatus(contractId);
    return status.is_deployed;
  }
}

// Export a factory function
export function createContractService(): ContractService {
  return new ContractService();
}

// Export types for use in other services/tools
export type {
  SmartContract,
  ContractEvent,
  ContractEventsResponse,
  ContractsByTraitResponse,
  ContractStatus,
  ContractStatusMap,
};
