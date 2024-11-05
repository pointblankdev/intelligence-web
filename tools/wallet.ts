import { CoreTool } from 'ai';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';
import { WalletMetadata } from '@/db/schema';
import { Account, WalletService } from '@/services/wallet';

const walletService = new WalletService();

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
    .describe('The wallet or account operation to perform.'),
  walletId: z
    .string()
    .optional()
    .describe('The ID of the wallet (required for wallet/account operations).'),
  accountIndex: z
    .number()
    .optional()
    .describe(
      'The account index for specific account retrieval (required for getAccount).'
    ),
  seedPhrase: z
    .string()
    .optional()
    .describe(
      'The seed phrase for importing an existing wallet (required for import operation).'
    ),
  metadata: z
    .record(z.any())
    .optional()
    .describe(
      'Additional metadata for the wallet (optional for update operation).'
    ),
  indexRange: z
    .number()
    .default(5)
    .describe('Range for listing accounts (optional for listAccounts).'),
});

type WalletParams = z.infer<typeof walletParamsSchema>;

export const name = 'Stacks-Wallet';
export const walletTool: CoreTool<
  typeof walletParamsSchema,
  | WalletMetadata
  | Array<WalletMetadata>
  | Account
  | Array<Account>
  | string
  | void
> = {
  parameters: walletParamsSchema,
  description:
    'Manages user wallets and accounts for blockchain interactions. Can create or import wallets, manage accounts.',
  execute: async (
    args: WalletParams,
    { abortSignal }
  ): Promise<
    | WalletMetadata
    | Array<WalletMetadata>
    | Account
    | Array<Account>
    | string
    | void
  > => {
    try {
      const session = await auth();
      if (!session?.user?.id) {
        throw new Error(
          'Unauthorized: Must be logged in to perform wallet/account operations'
        );
      }

      const userId = session.user.id;

      switch (args.operation) {
        case 'create':
          return await walletService.createNewWallet(userId);

        case 'import':
          if (!args.seedPhrase) {
            throw new Error('Seed phrase required for wallet import');
          }
          return await walletService.importWallet({
            userId,
            seedPhrase: args.seedPhrase,
          });

        case 'get':
          if (!args.walletId) {
            throw new Error('Wallet ID required for get operation');
          }
          return await walletService.getWallet(args.walletId, userId);

        case 'list':
          return await walletService.getWalletsByUserId(userId);

        case 'update':
          if (!args.walletId) {
            throw new Error('Wallet ID required for update operation');
          }
          return await walletService.updateWallet(args.walletId, userId, {
            metadata: args.metadata,
          });

        case 'delete':
          if (!args.walletId) {
            throw new Error('Wallet ID required for delete operation');
          }
          await walletService.deleteWallet(args.walletId, userId);
          return;

        case 'listWallets':
          return await walletService.getWalletsByUserId(userId);

        case 'getAccounts':
          if (!args.walletId) {
            throw new Error(
              'Please specify which wallet you want to view accounts for'
            );
          }
          return await walletService.listAccounts(args.walletId, userId);

        case 'getAccount':
          if (!args.walletId || args.accountIndex === undefined) {
            throw new Error(
              'Please specify both the wallet and which account number you want to view'
            );
          }
          return await walletService.getAccount(
            args.walletId,
            userId,
            args.accountIndex
          );

        default:
          throw new Error('Invalid operation');
      }
    } catch (error) {
      throw new Error(
        `Wallet/account operation failed: ${(error as Error).message}`
      );
    }
  },
};
