import { CoreTool } from 'ai';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';
import { WalletMetadata } from '@/db/schema';
import { Account, WalletService } from '@/services/wallet';

const walletService = new WalletService();

// Define a response type that includes potential error information
type WalletResponse = {
  success: boolean;
  data?: WalletMetadata | Array<WalletMetadata> | Account | Array<Account>;
  error?: string;
};

const walletParamsSchema = z.object({
  operation: z
    .enum([
      'create',
      'import',
      'get',
      'list',
      'update',
      'delete',
      'listAccounts',
      'getAccount',
      'listWallets',
      'getAccounts',
    ])
    .describe('The wallet or account operation to perform'),
  walletId: z
    .string()
    .optional()
    .describe(
      'The ID of the wallet (required for wallet/account operations except listWallets)'
    ),
  accountIndex: z
    .number()
    .optional()
    .describe(
      'The account index for specific account retrieval (required for getAccount)'
    ),
  seedPhrase: z
    .string()
    .optional()
    .describe(
      'The seed phrase for importing an existing wallet (required for import operation)'
    ),
  metadata: z
    .record(z.any())
    .optional()
    .describe(
      'Additional metadata for the wallet (optional for update operation)'
    ),
  indexRange: z
    .number()
    .default(5)
    .describe('Range for listing accounts (optional for listAccounts)'),
});

type WalletParams = z.infer<typeof walletParamsSchema>;

export const name = 'Stacks-Wallet';
export const walletTool: CoreTool<typeof walletParamsSchema, WalletResponse> = {
  parameters: walletParamsSchema,
  description:
    'Manages user wallets and accounts for blockchain interactions. Can create or import wallets, ' +
    'list wallets for current user, and manage accounts within wallets. All operations are secured by ' +
    'user session and return structured responses including success/error information.',
  execute: async (
    args: WalletParams,
    { abortSignal }
  ): Promise<WalletResponse> => {
    try {
      const session = await auth();
      if (!session?.user?.id) {
        return {
          success: false,
          error:
            'You need to be logged in to perform wallet operations. Please connect your wallet first.',
        };
      }

      const userId = session.user.id;

      switch (args.operation) {
        case 'create':
          try {
            const wallet = await walletService.createNewWallet(userId);
            return { success: true, data: wallet };
          } catch (error) {
            return {
              success: false,
              error: `Failed to create new wallet: ${(error as Error).message}`,
            };
          }

        case 'import':
          if (!args.seedPhrase) {
            return {
              success: false,
              error: 'Please provide a seed phrase to import your wallet',
            };
          }
          try {
            const wallet = await walletService.importWallet({
              userId,
              seedPhrase: args.seedPhrase,
            });
            return { success: true, data: wallet };
          } catch (error) {
            return {
              success: false,
              error: `Failed to import wallet: ${(error as Error).message}`,
            };
          }

        case 'get':
        case 'listWallets':
        case 'list':
          try {
            const wallets = await walletService.getWalletsByUserId(userId);
            return { success: true, data: wallets };
          } catch (error) {
            return {
              success: false,
              error: 'Unable to retrieve your wallets. Please try again later.',
            };
          }

        case 'update':
          if (!args.walletId) {
            return {
              success: false,
              error: 'Please specify which wallet you want to update',
            };
          }
          try {
            const updated = await walletService.updateWallet(
              args.walletId,
              userId,
              {
                metadata: args.metadata,
              }
            );
            return { success: true, data: updated };
          } catch (error) {
            return {
              success: false,
              error: `Failed to update wallet: ${(error as Error).message}`,
            };
          }

        case 'delete':
          if (!args.walletId) {
            return {
              success: false,
              error: 'Please specify which wallet you want to delete',
            };
          }
          try {
            await walletService.deleteWallet(args.walletId, userId);
            return { success: true };
          } catch (error) {
            return {
              success: false,
              error: `Failed to delete wallet: ${(error as Error).message}`,
            };
          }

        case 'listAccounts':
        case 'getAccounts':
          if (!args.walletId) {
            return {
              success: false,
              error:
                'Please specify which wallet you want to view accounts for',
            };
          }
          try {
            const accounts = await walletService.listAccounts(
              args.walletId,
              userId,
              args.indexRange
            );
            return { success: true, data: accounts };
          } catch (error) {
            return {
              success: false,
              error: `Unable to retrieve accounts: ${(error as Error).message}`,
            };
          }

        case 'getAccount':
          if (!args.walletId || args.accountIndex === undefined) {
            return {
              success: false,
              error:
                'Please specify both the wallet and which account number you want to view',
            };
          }
          try {
            const account = await walletService.getAccount(
              args.walletId,
              userId,
              args.accountIndex
            );
            return { success: true, data: account };
          } catch (error) {
            return {
              success: false,
              error: `Unable to retrieve account: ${(error as Error).message}`,
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
