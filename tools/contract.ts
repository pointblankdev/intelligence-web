import {
  AnchorMode,
  PostConditionMode,
  ClarityValue,
  PostCondition,
} from '@stacks/transactions';
import { CoreTool } from 'ai';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';
import { ContractService } from '@/services/contract';
import { WalletService } from '@/services/wallet';

const walletService = new WalletService();
const contractService = new ContractService('mainnet');

// Define types for the response
interface ContractResponse {
  success: boolean;
  data?: {
    txId?: string;
    fee?: number;
    nonce?: number;
    rawTx?: string;
  };
  error?: string;
}

// Schema for contract calls
const contractParamsSchema = z.object({
  walletId: z
    .string()
    .describe('The ID of the wallet to use for the transaction'),

  accountIndex: z
    .number()
    .default(0)
    .describe('The account index to use within the wallet'),

  contractAddress: z.string().describe('The contract address to interact with'),

  contractName: z.string().describe('The name of the contract to call'),

  functionName: z
    .string()
    .describe('The name of the function to call in the contract'),

  functionArgs: z
    .array(z.any())
    .describe('The arguments to pass to the contract function'),

  postConditions: z
    .array(z.any())
    .optional()
    .describe('Optional post conditions for the transaction'),

  anchorMode: z
    .enum(['any', 'on_chain_only', 'off_chain_only'])
    .optional()
    .default('any')
    .describe('The anchor mode for the transaction'),

  postConditionMode: z
    .enum(['allow', 'deny'])
    .optional()
    .default('deny')
    .describe('The post condition mode for the transaction'),

  fee: z
    .number()
    .describe(
      'Fee amount for the transaction in microstacks. Use historical fee data for estimate and keep below 0.2 STX.'
    ),

  nonce: z.number().optional().describe('Optional nonce for the transaction'),

  network: z
    .enum(['mainnet', 'testnet'])
    .optional()
    .default('mainnet')
    .describe('The network to use for the transaction'),
});

type ContractParams = z.infer<typeof contractParamsSchema>;

export const name = 'Contract-Call';
export const contractCallTool: CoreTool<
  typeof contractParamsSchema,
  ContractResponse
> = {
  parameters: contractParamsSchema,
  description:
    'Executes Stacks smart contract calls with various options including standard calls, ' +
    'custom calls with post conditions, and fee estimation. All operations are secured by ' +
    'user session and return structured responses including transaction details or error information.',

  execute: async (
    args: ContractParams,
    { abortSignal }
  ): Promise<ContractResponse> => {
    try {
      // Check authentication
      const session = await auth();
      if (!session?.user?.id) {
        return {
          success: false,
          error: 'Authentication required. Please connect your wallet first.',
        };
      }

      const userId = session.user.id;

      // Get account and private key
      try {
        const account = await walletService.getAccount(
          args.walletId,
          userId,
          args.accountIndex
        );

        if (!account.stxPrivateKey) {
          return {
            success: false,
            error: 'No private key available for this account',
          };
        }

        // Prepare base transaction parameters
        const baseParams = {
          senderKey: account.stxPrivateKey,
          contractAddress: args.contractAddress,
          contractName: args.contractName,
          functionName: args.functionName,
          functionArgs: args.functionArgs as ClarityValue[],
          network: args.network,
          fee: args.fee,
          nonce: args.nonce,
        };

        const result = await contractService.makeContractCall(baseParams);
        return {
          success: true,
          data: {
            txId: result.txId,
            fee: result.fee,
            nonce: result.nonce,
            rawTx: result.rawTx,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to execute contract operation: ${(error as Error).message}`,
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

// Example usage:
/*
const contractCall = await contractTool.execute({
  operation: 'standard',
  walletId: 'wallet-123',
  contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  contractName: 'my-contract',
  functionName: 'my-function',
  functionArgs: [stringAsciiCV('arg1'), uintCV(123)],
  network: 'mainnet'
});
*/
