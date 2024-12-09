import { kv } from '@vercel/kv';
import { describe, test, expect } from 'vitest';

import { auditToken } from './asset-identifier';
import { TokenRegistryService } from '../sips/token-registry';

describe('Token Auditing', () => {
  test('audit 10 unaudited tokens', async () => {
    // Get all tokens using the TokenService
    const tokenService = new TokenRegistryService();
    const tokens = await tokenService.listAllEnrichedTokens();

    // Get existing audits
    const existingAudits = await kv.keys('contract-audit:*');

    // Filter out tokens that already have audits
    const unauditedTokens = tokens.filter(
      (token) =>
        !existingAudits.some(
          (audit) => audit === `contract-audit:${token.contractId}`
        )
    );

    console.log(`Found ${unauditedTokens.length} unaudited tokens`);

    // Take first 10 unaudited tokens
    const tokensToAudit = unauditedTokens.slice(0, 10);

    // Audit each token and collect results
    const results = await Promise.all(
      tokensToAudit.map(async (token) => {
        try {
          const result = await auditToken(token.contractId);
          return {
            contractId: token.contractId,
            status: 'success',
            result,
          };
        } catch (error) {
          return {
            contractId: token.contractId,
            status: 'error',
          };
        }
      })
    );

    // Log results
    console.log('\nAudit Results:');
    results.forEach((result) => {
      if (result.status === 'success') {
        console.log(
          `✓ ${result.contractId}: ${result.result.fungibleTokens[0].tokenIdentifier}`
        );
      } else {
        console.log(`✗ ${result.contractId}: ${result.status}`);
      }
    });

    // Assertions
    expect(results).toHaveLength(10);
    expect(results.some((r) => r.status === 'success')).toBe(true);

    // Check that audits were stored in KV
    const successfulAudits = results.filter((r) => r.status === 'success');
    for (const audit of successfulAudits) {
      const storedAudit = await kv.get(`contract-audit:${audit.contractId}`);
      expect(storedAudit).toBeDefined();
    }
  }, 100000);
});
