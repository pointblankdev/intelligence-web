import { CoreTool } from 'ai';
import { z } from 'zod';

import {
  ContractService,
  SmartContract,
  ContractEventsResponse,
  ContractsByTraitResponse,
  ContractStatus,
  ContractStatusMap,
} from '@/services/stacks-api/contract';

const contractService = new ContractService();

const contractParamsSchema = z.object({
  operation: z
    .enum([
      'getContractInfo',
      'getContractEvents',
      'getContractsByTrait',
      'getContractsStatus',
      'getContractStatus',
      'isContractDeployed',
    ])
    .describe('The contract operation to perform.'),
  contractId: z
    .string()
    .optional()
    .describe(
      'Contract identifier (<address>.<name>) for single contract operations'
    ),
  contractIds: z
    .array(z.string())
    .optional()
    .describe('Array of contract identifiers for bulk status check'),
  traitAbi: z
    .string()
    .optional()
    .describe('JSON ABI of the trait for contract search'),
  limit: z
    .number()
    .min(0)
    .max(50)
    .optional()
    .default(20)
    .describe('Maximum number of results to return'),
  offset: z
    .number()
    .min(0)
    .optional()
    .default(0)
    .describe('Offset for pagination'),
});

type ContractParams = z.infer<typeof contractParamsSchema>;
type ContractToolResponse =
  | SmartContract
  | ContractEventsResponse
  | ContractsByTraitResponse
  | ContractStatusMap
  | ContractStatus
  | boolean;

export const name = 'Stacks-API-Contract';
export const contractTool: CoreTool<
  typeof contractParamsSchema,
  ContractToolResponse
> = {
  parameters: contractParamsSchema,
  description: `Interact with smart contracts on the Stacks blockchain.
Available operations:
- getContractInfo: Get detailed information about a specific contract including its source code and ABI (useful for finding similar contracts with getContractsByTrait)
- getContractEvents: Get events emitted by a contract
- getContractsByTrait: Find contracts implementing a specific trait (traits are a block of ABI code matching between contracts)
- getContractsStatus: Check deployment status of multiple contracts
- getContractStatus: Check deployment status of a single contract
- isContractDeployed: Simple check if a contract is deployed

Pagination is available for operations that return lists (limit max: 50).`,
  execute: async (
    args: ContractParams,
    { abortSignal }
  ): Promise<ContractToolResponse> => {
    try {
      const { operation } = args;

      switch (operation) {
        case 'getContractInfo':
          if (!args.contractId) {
            throw new Error('Contract ID required for getContractInfo');
          }
          return await contractService.getContractInfo(args.contractId);

        case 'getContractEvents':
          if (!args.contractId) {
            throw new Error('Contract ID required for getContractEvents');
          }
          return await contractService.getContractEvents(
            args.contractId,
            args.limit,
            args.offset
          );

        case 'getContractsByTrait':
          if (!args.traitAbi) {
            throw new Error('Trait ABI required for getContractsByTrait');
          }
          return await contractService.getContractsByTrait(
            args.traitAbi,
            args.limit,
            args.offset
          );

        case 'getContractsStatus':
          if (!args.contractIds?.length) {
            throw new Error('Contract IDs required for getContractsStatus');
          }
          return await contractService.getContractsStatus(args.contractIds);

        case 'getContractStatus':
          if (!args.contractId) {
            throw new Error('Contract ID required for getContractStatus');
          }
          return await contractService.getContractStatus(args.contractId);

        case 'isContractDeployed':
          if (!args.contractId) {
            throw new Error('Contract ID required for isContractDeployed');
          }
          return await contractService.isContractDeployed(args.contractId);

        default:
          throw new Error('Invalid contract operation');
      }
    } catch (error) {
      throw new Error(`Contract operation failed: ${(error as Error).message}`);
    }
  },
};
