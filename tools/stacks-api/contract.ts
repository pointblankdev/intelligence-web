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

// Define a response type that includes potential error information
type ContractResponse = {
  success: boolean;
  data?:
    | SmartContract
    | ContractEventsResponse
    | ContractsByTraitResponse
    | ContractStatusMap
    | ContractStatus
    | boolean;
  error?: string;
};

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
    .describe('The contract operation to perform'),
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

export const name = 'Stacks-API-Contract';
export const contractTool: CoreTool<
  typeof contractParamsSchema,
  ContractResponse
> = {
  parameters: contractParamsSchema,
  description: `Interact with smart contracts on the Stacks blockchain. All operations return a structured response 
with success/error information.

Available operations:
- getContractInfo: Get detailed information about a specific contract including its source code and ABI
- getContractEvents: Get events emitted by a contract
- getContractsByTrait: Find contracts implementing a specific trait
- getContractsStatus: Check deployment status of multiple contracts
- getContractStatus: Check deployment status of a single contract
- isContractDeployed: Simple check if a contract is deployed

Pagination is available for operations that return lists (limit max: 50).`,
  execute: async (
    args: ContractParams,
    { abortSignal }
  ): Promise<ContractResponse> => {
    try {
      const { operation } = args;

      switch (operation) {
        case 'getContractInfo':
          if (!args.contractId) {
            return {
              success: false,
              error: 'Please provide a contract ID to get contract information',
            };
          }
          try {
            const info = await contractService.getContractInfo(args.contractId);
            return { success: true, data: info };
          } catch (error) {
            return {
              success: false,
              error: `Failed to retrieve contract info: ${(error as Error).message}`,
            };
          }

        case 'getContractEvents':
          if (!args.contractId) {
            return {
              success: false,
              error: 'Please provide a contract ID to get contract events',
            };
          }
          try {
            const events = await contractService.getContractEvents(
              args.contractId,
              args.limit,
              args.offset
            );
            return { success: true, data: events };
          } catch (error) {
            return {
              success: false,
              error: `Failed to retrieve contract events: ${(error as Error).message}`,
            };
          }

        case 'getContractsByTrait':
          if (!args.traitAbi) {
            return {
              success: false,
              error: 'Please provide a trait ABI to search for contracts',
            };
          }
          try {
            const contracts = await contractService.getContractsByTrait(
              args.traitAbi,
              args.limit,
              args.offset
            );
            return { success: true, data: contracts };
          } catch (error) {
            return {
              success: false,
              error: `Failed to find contracts by trait: ${(error as Error).message}`,
            };
          }

        case 'getContractsStatus':
          if (!args.contractIds?.length) {
            return {
              success: false,
              error:
                'Please provide an array of contract IDs to check their status',
            };
          }
          try {
            const statuses = await contractService.getContractsStatus(
              args.contractIds
            );
            return { success: true, data: statuses };
          } catch (error) {
            return {
              success: false,
              error: `Failed to retrieve contract statuses: ${(error as Error).message}`,
            };
          }

        case 'getContractStatus':
          if (!args.contractId) {
            return {
              success: false,
              error: 'Please provide a contract ID to check its status',
            };
          }
          try {
            const status = await contractService.getContractStatus(
              args.contractId
            );
            return { success: true, data: status };
          } catch (error) {
            return {
              success: false,
              error: `Failed to retrieve contract status: ${(error as Error).message}`,
            };
          }

        case 'isContractDeployed':
          if (!args.contractId) {
            return {
              success: false,
              error: 'Please provide a contract ID to check if it is deployed',
            };
          }
          try {
            const isDeployed = await contractService.isContractDeployed(
              args.contractId
            );
            return { success: true, data: isDeployed };
          } catch (error) {
            return {
              success: false,
              error: `Failed to check contract deployment: ${(error as Error).message}`,
            };
          }

        default:
          return {
            success: false,
            error: 'Invalid contract operation requested',
          };
      }
    } catch (error) {
      return {
        success: false,
        error: `An unexpected error occurred: ${(error as Error).message}`,
      };
    }
  },
};
