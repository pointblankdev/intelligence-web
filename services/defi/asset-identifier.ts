import { kv } from '@vercel/kv';

import { ContractService } from '../stacks-api/contract';

const contractService = new ContractService();

// The pattern now allows for any second argument after the token identifier
const tokenPattern =
  /\(define-fungible-token\s+([A-Za-z][A-Za-z0-9-]*)\s*(?:[^)\s]+)?\)/;

export async function auditToken(contractId: string): Promise<any> {
  console.log('Auditing:', contractId);

  const { source_code } = await contractService.getContractInfo(contractId);
  const match = tokenPattern.exec(source_code);
  const identifier = match && match[1] ? match[1] : null;

  console.log('Token Identifier:', identifier);

  const audit = {
    fungibleTokens: [{ tokenIdentifier: identifier }],
    timestamp: Date.now(),
  };

  await kv.set(`contract-audit:${contractId}`, audit);
  return audit;
}
