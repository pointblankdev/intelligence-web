import { kv } from '@vercel/kv';

import { ContractAudit } from '@/tools/code-audit/schema';

import { StacksSearchService } from '../stacks-api/search';

export interface LpTokenInfo {
  dex: 'charisma' | string;
  poolId: string;
  token0: string;
  token1: string;
}

export class TokenRegistryService {
  /**
   * Token Contract Management
   */
  async addContract(contractId: string): Promise<void> {
    await kv.sadd('tokens:contracts', contractId);
    await this.updateLastSeen(contractId);
  }

  async removeContract(contractId: string): Promise<void> {
    await kv.srem('tokens:contracts', contractId);
    await this.updateLastSeen(contractId);
  }

  async getKnownContracts(): Promise<string[]> {
    return kv.smembers('tokens:contracts');
  }

  async isKnownContract(contractId: string): Promise<boolean> {
    return Boolean(await kv.sismember('tokens:contracts', contractId));
  }

  /**
   * Symbol Registry Management
   */
  async registerSymbol(
    symbol: string,
    contractId: string,
    force: boolean = false
  ): Promise<boolean> {
    const key = `tokens:by-symbol:${symbol}`;
    const existing = await kv.get<string>(key);

    if (!existing || force) {
      await kv.set(key, contractId);
      return true;
    }
    return false;
  }

  async getContractBySymbol(symbol: string): Promise<string | null> {
    return kv.get(`tokens:by-symbol:${symbol}`);
  }

  async listAllSymbols(): Promise<
    Array<{ symbol: string; contractId: string }>
  > {
    // Get all keys matching the symbol pattern
    const keys = await kv.keys('tokens:by-symbol:*');
    if (keys.length === 0) return [];

    // Get all values in parallel
    const values = await Promise.all(keys.map((key) => kv.get<string>(key)));

    // Map to symbol objects
    return keys
      .map((key, i) => ({
        symbol: key.replace('tokens:by-symbol:', ''),
        contractId: values[i] || '',
      }))
      .filter((item) => item.contractId);
  }

  /**
   * Metadata Management
   */
  async setMetadata(contractId: string, metadata: any): Promise<void> {
    const existingMetadata = await this.getMetadata(contractId);
    let newMetadata = metadata;
    if (metadata.metadata) newMetadata = metadata.metadata;
    await kv.set(`metadata:${contractId}`, {
      ...existingMetadata,
      ...newMetadata,
      lastUpdated: Date.now(),
    });
  }

  async getMetadata(contractId: string): Promise<any | null> {
    return kv.get(`metadata:${contractId}`);
  }

  async listAllMetadata(): Promise<Array<{ uri: string; metadata: any }>> {
    const keys = await kv.keys('metadata:*');
    if (keys.length === 0) return [];

    const values = await Promise.all(keys.map((key) => kv.get(key)));

    return keys
      .map((key, i) => ({
        uri: key.replace('metadata:', ''),
        metadata: values[i],
      }))
      .filter((item) => item.metadata);
  }

  /**
   * Contract Audit Management
   */
  async setAudit(contractAddress: string, audit: ContractAudit): Promise<void> {
    await kv.set(`contract-audit:${contractAddress}`, {
      ...audit,
      timestamp: Date.now(),
    });
  }

  async getAudit(contractAddress: string): Promise<ContractAudit | null> {
    return kv.get(`contract-audit:${contractAddress}`);
  }

  async listAllAudits(): Promise<
    Array<{ contractId: string; audit: ContractAudit }>
  > {
    const keys = await kv.keys('contract-audit:*');
    if (keys.length === 0) return [];

    const values = await Promise.all(
      keys.map((key) => kv.get<ContractAudit>(key))
    );

    return keys
      .map((key, i) => ({
        contractId: key.replace('contract-audit:', ''),
        audit: values[i]!,
      }))
      .filter((item) => item.audit);
  }

  /**
   * LP Token Management
   */
  async registerLpToken(lpToken: string, info: LpTokenInfo): Promise<void> {
    await Promise.all([
      kv.sadd('tokens:lp-tokens', lpToken),
      kv.set(`tokens:lp:${lpToken}`, info),
    ]);
  }

  async unregisterLpToken(lpToken: string, info: LpTokenInfo): Promise<void> {
    await Promise.all([
      kv.srem('tokens:lp-tokens', lpToken),
      kv.del(`tokens:lp:${lpToken}`),
    ]);
  }

  async getLpTokenInfo(lpToken: string): Promise<LpTokenInfo | null> {
    return kv.get(`tokens:lp:${lpToken}`);
  }

  async isLpToken(contractId: string): Promise<boolean> {
    return Boolean(await kv.sismember('tokens:lp-tokens', contractId));
  }

  async listAllLpTokens(): Promise<
    Array<{ lpToken: string; info: LpTokenInfo }>
  > {
    const lpTokens = await kv.smembers('tokens:lp-tokens');
    if (lpTokens.length === 0) return [];

    const infos = await Promise.all(
      lpTokens.map((token) => this.getLpTokenInfo(token))
    );

    return lpTokens
      .map((token, i) => ({
        lpToken: token,
        info: infos[i]!,
      }))
      .filter((item) => item.info);
  }

  /**
   * Pool Relationship Management
   */
  async addPoolForToken(token: string, poolId: string): Promise<void> {
    await kv.sadd(`tokens:pools:${token}`, poolId);
  }

  async removePoolForToken(token: string, poolId: string): Promise<void> {
    await kv.srem(`tokens:pools:${token}`, poolId);
  }

  async getTokenPools(token: string): Promise<string[]> {
    return kv.smembers(`tokens:pools:${token}`);
  }

  async listAllPools(): Promise<Array<{ token: string; pools: string[] }>> {
    const tokens = await this.getKnownContracts();
    if (tokens.length === 0) return [];

    const poolsPerToken = await Promise.all(
      tokens.map((token) => this.getTokenPools(token))
    );

    return tokens
      .map((token, i) => ({
        token,
        pools: poolsPerToken[i],
      }))
      .filter((item) => item.pools.length > 0);
  }

  /**
   * Price Management
   */
  async updatePrice(symbol: string, price: number): Promise<void> {
    await kv.hset('tokens:prices', { [symbol]: price });
  }

  async getPrice(symbol: string): Promise<number | null> {
    return kv.hget('tokens:prices', symbol);
  }

  async getAllPrices(): Promise<Record<string, number>> {
    return (await kv.hgetall('tokens:prices')) || {};
  }

  /**
   * Stats Management
   */
  async listAllStats(): Promise<
    Array<{
      contractId: string;
      lastSeen: number | null;
      interactions: number;
    }>
  > {
    const contracts = await this.getKnownContracts();
    if (contracts.length === 0) return [];

    const stats = await Promise.all(
      contracts.map(async (contractId) => ({
        contractId,
        lastSeen: await this.getLastSeen(contractId),
        interactions: await this.getInteractionCount(contractId),
      }))
    );

    return stats;
  }

  /**
   * Interaction Tracking
   */
  private async updateLastSeen(contractId: string): Promise<void> {
    await Promise.all([
      kv.set(`tokens:last-seen:${contractId}`, Date.now()),
      kv.incr(`tokens:interactions:${contractId}`),
    ]);
  }

  async getLastSeen(contractId: string): Promise<number | null> {
    return kv.get(`tokens:last-seen:${contractId}`);
  }

  async getInteractionCount(contractId: string): Promise<number> {
    return (await kv.get(`tokens:interactions:${contractId}`)) || 0;
  }

  /**
   * Aggregation Methods
   */
  async getEnrichedToken(contractId: string) {
    const [metadata, audit, lpInfo, pools, lastSeen, interactions] =
      await Promise.all([
        this.getMetadata(contractId),
        this.getAudit(contractId),
        this.getLpTokenInfo(contractId),
        this.getTokenPools(contractId),
        this.getLastSeen(contractId),
        this.getInteractionCount(contractId),
      ]);

    let price = null;
    if (metadata?.symbol) {
      price = await this.getPrice(metadata.symbol);
    }

    return {
      contractId,
      metadata,
      audit,
      lpInfo,
      pools,
      price,
      stats: {
        lastSeen,
        interactions,
      },
    };
  }

  async listAllEnrichedTokens(): Promise<any[]> {
    const contracts = await this.getKnownContracts();
    return this.batchGetEnrichedTokens(contracts);
  }

  /**
   * Batch Operations
   */
  async batchGetEnrichedTokens(contractIds: string[]) {
    return Promise.all(contractIds.map((id) => this.getEnrichedToken(id)));
  }

  /**
   * Maintenance Methods
   */
  async cleanup(maxAge: number = 30 * 24 * 60 * 60 * 1000) {
    const contracts = await this.getKnownContracts();
    const now = Date.now();

    for (const contractId of contracts) {
      console.log(`Validating contract existance: ${contractId}`);
      const search = new StacksSearchService();
      const result = await search.searchContract(contractId);

      const lastSeen = await this.getLastSeen(contractId);
      if (!result.found)
        if (lastSeen && now - lastSeen > maxAge) {
          console.log(`Could clean up stale contract: ${contractId}`);
          const search = new StacksSearchService();
          search.searchContract(contractId, true);
        }
    }
  }
}

// Export singleton instance
export const tokenRegistry = new TokenRegistryService();
