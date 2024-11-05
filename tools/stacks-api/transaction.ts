import { CoreTool } from 'ai';
import { z } from 'zod';

import { TransactionService } from '@/services/stacks-api/transaction';

const transactionService = new TransactionService();

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
    .describe('The transaction operation to perform.'),
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
export const transactionTool: CoreTool<typeof transactionParamsSchema, any> = {
  parameters: transactionParamsSchema,
  description: `Query Stacks blockchain transactions.
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
- getAddressTransactionEvents: Get events for an address's transaction`,
  execute: async (args: TransactionParams, { abortSignal }): Promise<any> => {
    try {
      switch (args.operation) {
        case 'getRecentTransactions':
          return await transactionService.getRecentTransactions({
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

        case 'getTransaction':
          if (!args.txId) {
            throw new Error('Transaction ID required');
          }
          return await transactionService.getTransaction(args.txId, {
            event_limit: args.limit,
            event_offset: args.offset,
            unanchored: args.unanchored,
          });

        case 'getRawTransaction':
          if (!args.txId) {
            throw new Error('Transaction ID required');
          }
          return await transactionService.getRawTransaction(args.txId);

        case 'getMempoolTransactions':
          return await transactionService.getMempoolTransactions({
            sender_address: args.fromAddress,
            recipient_address: args.toAddress,
            address: args.address,
            order_by: args.orderBy,
            order: args.order,
            unanchored: args.unanchored,
            limit: args.limit,
            offset: args.offset,
          });

        case 'getDroppedMempoolTransactions':
          return await transactionService.getDroppedMempoolTransactions({
            limit: args.limit,
            offset: args.offset,
          });

        case 'getMempoolStats':
          return await transactionService.getMempoolStats();

        case 'getTransactionEvents':
          return await transactionService.getTransactionEvents({
            tx_id: args.txId,
            address: args.address,
            type: args.eventType,
            offset: args.offset,
            limit: args.limit,
          });

        case 'getTransactionsByBlock':
          if (!args.heightOrHash) {
            throw new Error('Block height or hash required');
          }
          return await transactionService.getTransactionsByBlock(
            args.heightOrHash,
            {
              limit: args.limit,
              offset: args.offset,
            }
          );

        case 'getAddressTransactions':
          if (!args.address) {
            throw new Error('Address required');
          }
          return await transactionService.getAddressTransactions(args.address, {
            limit: args.limit,
            offset: args.offset,
          });

        case 'getAddressTransactionEvents':
          if (!args.address || !args.txId) {
            throw new Error('Address and transaction ID required');
          }
          return await transactionService.getAddressTransactionEvents(
            args.address,
            args.txId,
            {
              limit: args.limit,
              offset: args.offset,
            }
          );

        default:
          throw new Error('Invalid operation');
      }
    } catch (error) {
      throw new Error(
        `Transaction operation failed: ${(error as Error).message}`
      );
    }
  },
};
