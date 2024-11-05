import { CoreTool } from 'ai';
import { z } from 'zod';

import { TransactionService } from '@/services/stacks-api/transaction';

const transactionService = new TransactionService();

// Define response type with error handling
type TransactionResponse = {
  success: boolean;
  data?: any; // Keep as any since the return types vary significantly
  error?: string;
};

const transactionParamsSchema = z.object({
  operation: z
    .enum([
      'getRecentTransactions',
      'getTransaction',
      'getRawTransaction',
      'getMempoolTransactions',
      'getDroppedMempoolTransactions',
      'getMempoolStats',
      'getTransactionEvents',
      'getTransactionsByBlock',
      'getAddressTransactions',
      'getAddressTransactionEvents',
    ])
    .describe('The transaction operation to perform'),
  // Transaction identifiers
  txId: z
    .string()
    .optional()
    .describe('Transaction ID for specific transaction operations'),
  address: z
    .string()
    .optional()
    .describe('Stacks address for address-specific operations'),
  heightOrHash: z
    .string()
    .optional()
    .describe('Block height or hash for block-specific operations'),

  // Common parameters
  limit: z
    .number()
    .min(0)
    .max(50)
    .optional()
    .describe('Maximum number of results'),
  offset: z.number().min(0).optional().describe('Pagination offset'),
  unanchored: z
    .boolean()
    .optional()
    .describe('Include unanchored transactions'),

  // Filtering parameters
  type: z
    .array(
      z.enum([
        'coinbase',
        'token_transfer',
        'smart_contract',
        'contract_call',
        'poison_microblock',
        'tenure_change',
      ])
    )
    .optional()
    .describe('Transaction types to filter by'),

  // Event types
  eventType: z
    .array(
      z.enum([
        'smart_contract_log',
        'stx_lock',
        'stx_asset',
        'fungible_token_asset',
        'non_fungible_token_asset',
      ])
    )
    .optional()
    .describe('Event types to filter by'),

  // Sorting and ordering
  order: z.enum(['asc', 'desc']).optional(),
  sortBy: z.enum(['block_height', 'fee', 'burn_block_time']).optional(),
  orderBy: z.enum(['fee', 'age', 'size']).optional(),

  // Additional filters
  fromAddress: z.string().optional(),
  toAddress: z.string().optional(),
  startTime: z.number().optional(),
  endTime: z.number().optional(),
  contractId: z.string().optional(),
  functionName: z.string().optional(),
  nonce: z.number().optional(),
});

type TransactionParams = z.infer<typeof transactionParamsSchema>;

export const name = 'Stacks-API-Transaction';
export const transactionTool: CoreTool<
  typeof transactionParamsSchema,
  TransactionResponse
> = {
  parameters: transactionParamsSchema,
  description: `Query Stacks blockchain transactions. All operations return a structured response with 
success/error information.

Available operations:
- getRecentTransactions: Get recent transactions with filtering options
- getTransaction: Get details of a specific transaction
- getRawTransaction: Get raw transaction data
- getMempoolTransactions: Get pending transactions from mempool
- getDroppedMempoolTransactions: Get dropped mempool transactions
- getMempoolStats: Get mempool statistics
- getTransactionEvents: Get transaction events with filtering
- getTransactionsByBlock: Get transactions in a specific block
- getAddressTransactions: Get transactions for an address
- getAddressTransactionEvents: Get events for an address's transactions`,
  execute: async (
    args: TransactionParams,
    { abortSignal }
  ): Promise<TransactionResponse> => {
    try {
      switch (args.operation) {
        case 'getRecentTransactions':
          try {
            const data = await transactionService.getRecentTransactions({
              limit: args.limit,
              offset: args.offset,
              type: args.type,
              unanchored: args.unanchored,
              order: args.order,
              sort_by: args.sortBy,
              from_address: args.fromAddress,
              to_address: args.toAddress,
              start_time: args.startTime,
              end_time: args.endTime,
              contract_id: args.contractId,
              function_name: args.functionName,
              nonce: args.nonce,
            });
            return { success: true, data };
          } catch (error) {
            return {
              success: false,
              error: `Failed to fetch recent transactions: ${(error as Error).message}`,
            };
          }

        case 'getTransaction':
          if (!args.txId) {
            return {
              success: false,
              error:
                'Please provide a transaction ID to get transaction details',
            };
          }
          try {
            const data = await transactionService.getTransaction(args.txId, {
              event_limit: args.limit,
              event_offset: args.offset,
              unanchored: args.unanchored,
            });
            return { success: true, data };
          } catch (error) {
            return {
              success: false,
              error: `Failed to fetch transaction: ${(error as Error).message}`,
            };
          }

        case 'getRawTransaction':
          if (!args.txId) {
            return {
              success: false,
              error:
                'Please provide a transaction ID to get raw transaction data',
            };
          }
          try {
            const data = await transactionService.getRawTransaction(args.txId);
            return { success: true, data };
          } catch (error) {
            return {
              success: false,
              error: `Failed to fetch raw transaction: ${(error as Error).message}`,
            };
          }

        case 'getMempoolTransactions':
          try {
            const data = await transactionService.getMempoolTransactions({
              sender_address: args.fromAddress,
              recipient_address: args.toAddress,
              address: args.address,
              order_by: args.orderBy,
              order: args.order,
              unanchored: args.unanchored,
              limit: args.limit,
              offset: args.offset,
            });
            return { success: true, data };
          } catch (error) {
            return {
              success: false,
              error: `Failed to fetch mempool transactions: ${(error as Error).message}`,
            };
          }

        case 'getDroppedMempoolTransactions':
          try {
            const data = await transactionService.getDroppedMempoolTransactions(
              {
                limit: args.limit,
                offset: args.offset,
              }
            );
            return { success: true, data };
          } catch (error) {
            return {
              success: false,
              error: `Failed to fetch dropped mempool transactions: ${(error as Error).message}`,
            };
          }

        case 'getMempoolStats':
          try {
            const data = await transactionService.getMempoolStats();
            return { success: true, data };
          } catch (error) {
            return {
              success: false,
              error: `Failed to fetch mempool statistics: ${(error as Error).message}`,
            };
          }

        case 'getTransactionEvents':
          try {
            const data = await transactionService.getTransactionEvents({
              tx_id: args.txId,
              address: args.address,
              type: args.eventType,
              offset: args.offset,
              limit: args.limit,
            });
            return { success: true, data };
          } catch (error) {
            return {
              success: false,
              error: `Failed to fetch transaction events: ${(error as Error).message}`,
            };
          }

        case 'getTransactionsByBlock':
          if (!args.heightOrHash) {
            return {
              success: false,
              error:
                'Please provide a block height or hash to get transactions',
            };
          }
          try {
            const data = await transactionService.getTransactionsByBlock(
              args.heightOrHash,
              {
                limit: args.limit,
                offset: args.offset,
              }
            );
            return { success: true, data };
          } catch (error) {
            return {
              success: false,
              error: `Failed to fetch block transactions: ${(error as Error).message}`,
            };
          }

        case 'getAddressTransactions':
          if (!args.address) {
            return {
              success: false,
              error: 'Please provide an address to get its transactions',
            };
          }
          try {
            const data = await transactionService.getAddressTransactions(
              args.address,
              {
                limit: args.limit,
                offset: args.offset,
              }
            );
            return { success: true, data };
          } catch (error) {
            return {
              success: false,
              error: `Failed to fetch address transactions: ${(error as Error).message}`,
            };
          }

        case 'getAddressTransactionEvents':
          if (!args.address || !args.txId) {
            return {
              success: false,
              error:
                'Please provide both an address and transaction ID to get transaction events',
            };
          }
          try {
            const data = await transactionService.getAddressTransactionEvents(
              args.address,
              args.txId,
              {
                limit: args.limit,
                offset: args.offset,
              }
            );
            return { success: true, data };
          } catch (error) {
            return {
              success: false,
              error: `Failed to fetch address transaction events: ${(error as Error).message}`,
            };
          }

        default:
          return {
            success: false,
            error: 'Invalid operation requested',
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
