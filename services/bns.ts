import { BaseStacksService } from './stacks-api';

interface BnsNamesResponse {
  names: string[];
}

export interface BnsNameInfo {
  address: string;
  blockchain: string;
  expire_block?: number;
  grace_period?: number;
  last_txid: string;
  resolver?: string;
  status: string;
  zonefile: string;
  zonefile_hash: string;
}

export class BnsService extends BaseStacksService {
  async getNamesForAddress(address: string): Promise<string[]> {
    return this.handleRequest(
      this.client
        .GET('/v1/addresses/{blockchain}/{address}', {
          params: {
            path: {
              blockchain: 'stacks',
              address,
            },
          },
        })
        .then(({ data }) => (data as BnsNamesResponse).names)
    );
  }

  async getNameInfo(name: string): Promise<BnsNameInfo> {
    return this.handleRequest(
      this.client
        .GET('/v1/names/{name}', {
          params: {
            path: { name },
          },
        })
        .then(({ data }) => data as BnsNameInfo)
    );
  }
}

// Export a factory function that uses the global service
export function createBnsService(): BnsService {
  return new BnsService();
}
