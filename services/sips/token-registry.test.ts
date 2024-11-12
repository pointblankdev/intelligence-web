import { kv } from '@vercel/kv';
import { describe, test } from 'vitest';

import { TokenRegistryService } from './token-registry';

describe('Token Registry Data Explorer', () => {
  const service = new TokenRegistryService();

  test('Print all stored data', async () => {
    console.log('\n=== Token Registry Data Explorer ===\n');

    // // Known Contracts
    // const contracts = await service.getKnownContracts();
    // console.log('Known Contracts:', contracts);

    // // Symbols
    // const symbols = await service.listAllSymbols();
    // console.log('\nRegistered Symbols:', symbols);

    // // Metadata
    // const metadata = await service.listAllMetadata();
    // console.log('\nStored Metadata:');
    // metadata.forEach(({ uri, metadata }) => {
    //   console.log(`\nURI: ${uri}`);
    //   console.log('Metadata:', metadata);
    // });

    // Audits
    const audits = await service.listAllAudits();
    console.log('\nContract Audits:');
    audits.forEach(({ contractId, audit }) => {
      console.log(`\nContract: ${contractId}`);
      console.log('Audit:', audit);
    });

    // // LP Tokens
    // const lpTokens = await service.listAllLpTokens();
    // console.log('\nLP Tokens:', lpTokens);

    // // Pool Relationships
    // const pools = await service.listAllPools();
    // console.log('\nPool Relationships:', pools);

    // // Prices
    // const prices = await service.getAllPrices();
    // console.log('\nToken Prices:', prices);

    // // Stats
    // const stats = await service.listAllStats();
    // console.log('\nToken Stats:', stats);

    // // Raw KV Data
    // console.log('\n=== Raw KV Data ===\n');

    // // Get all keys
    // const allKeys = await kv.keys('*');
    // console.log('All KV Keys:', allKeys);

    // // Print data for each key pattern
    // const patterns = [
    //   'tokens:contracts',
    //   'tokens:by-symbol:*',
    //   'metadata:*',
    //   'contract-audit:*',
    //   'tokens:lp-tokens',
    //   'tokens:lp:*',
    //   'tokens:pools:*',
    //   'tokens:prices',
    //   'tokens:last-seen:*',
    //   'tokens:interactions:*',
    // ];

    // for (const pattern of patterns) {
    //   const keys = await kv.keys(pattern);
    //   if (keys.length > 0) {
    //     console.log(`\nPattern: ${pattern}`);
    //     for (const key of keys) {
    //       const value = await kv.get(key);
    //       console.log(`${key}:`, value);
    //     }
    //   }
    // }

    // // Enriched Token Data
    // console.log('\n=== Enriched Token Data ===\n');
    // const enrichedTokens = await service.listAllEnrichedTokens();
    // enrichedTokens.forEach((token) => {
    //   console.log(`\nContract: ${token.contractId}`);
    //   console.log('Enriched Data:', token);
    // });
  });

  test('Print stats summary', async () => {
    console.log('\n=== Registry Stats Summary ===\n');

    const [
      contractCount,
      symbolCount,
      metadataCount,
      auditCount,
      lpTokenCount,
      poolCount,
    ] = await Promise.all([
      service.getKnownContracts().then((c) => c.length),
      service.listAllSymbols().then((s) => s.length),
      service.listAllMetadata().then((m) => m.length),
      service.listAllAudits().then((a) => a.length),
      service.listAllLpTokens().then((l) => l.length),
      service.listAllPools().then((p) => p.length),
    ]);

    console.log('Summary Counts:');
    console.log('- Known Contracts:', contractCount);
    console.log('- Registered Symbols:', symbolCount);
    console.log('- Stored Metadata:', metadataCount);
    console.log('- Contract Audits:', auditCount);
    console.log('- LP Tokens:', lpTokenCount);
    console.log('- Pool Relationships:', poolCount);

    // Get interaction stats
    const stats = await service.listAllStats();
    const totalInteractions = stats.reduce(
      (sum, stat) => sum + stat.interactions,
      0
    );
    const activeInLast24h = stats.filter(
      (stat) =>
        stat.lastSeen && Date.now() - stat.lastSeen < 24 * 60 * 60 * 1000
    ).length;
    const activeInLast7d = stats.filter(
      (stat) =>
        stat.lastSeen && Date.now() - stat.lastSeen < 7 * 24 * 60 * 60 * 1000
    ).length;

    console.log('\nActivity Stats:');
    console.log('- Total Interactions:', totalInteractions);
    console.log('- Active in last 24h:', activeInLast24h);
    console.log('- Active in last 7d:', activeInLast7d);
  });
});
