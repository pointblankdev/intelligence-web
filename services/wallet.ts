import 'server-only';
import { GAIA_URL } from '@stacks/common';
import { decryptMnemonic, encryptMnemonic } from '@stacks/encryption';
import { STACKS_MAINNET } from '@stacks/network';
import {
  Account,
  generateNewAccount,
  generateWallet,
  randomSeedPhrase,
  restoreWalletAccounts,
  Wallet,
} from '@stacks/wallet-sdk';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { generateSlug } from 'random-word-slugs';

import { user, wallet, WalletMetadata } from '@/db/schema';

const client = postgres(`${process.env.POSTGRES_URL!}?sslmode=require`);
const db = drizzle(client);

export class WalletService {
  private async decryptSeedPhrase(encryptedSeed: string) {
    return decryptMnemonic(
      new Uint8Array(Buffer.from(encryptedSeed, 'base64')),
      String(process.env.ENCRYPTION_KEY)
    );
  }

  private async encryptSeedPhrase(seedPhrase: string) {
    return Buffer.from(
      await encryptMnemonic(seedPhrase, String(process.env.ENCRYPTION_KEY))
    ).toString('base64');
  }

  private generateWalletName(): string {
    return generateSlug(2, { format: 'title' });
  }

  private async getStacksWallet(
    walletId: string,
    userId: string
  ): Promise<Wallet> {
    const walletMetadata = await this.getWallet(walletId, userId);
    const seedPhrase = await this.decryptSeedPhrase(
      walletMetadata.encryptedSeed
    );
    const baseWallet = await generateWallet({
      secretKey: seedPhrase,
      password: String(process.env.ENCRYPTION_KEY),
    });
    const restoredWallet = await restoreWalletAccounts({
      wallet: baseWallet,
      gaiaHubUrl: GAIA_URL,
      network: STACKS_MAINNET,
    });
    return restoredWallet;
  }

  async createNewWallet(userId: string): Promise<WalletMetadata> {
    try {
      // Verify user exists
      const [userExists] = await db
        .select()
        .from(user)
        .where(eq(user.id, userId));

      if (!userExists) {
        throw new Error('User not found');
      }

      // Generate new seed phrase
      const seedPhrase = randomSeedPhrase();
      const name = this.generateWalletName();

      // Validate wallet can be generated
      await generateWallet({
        secretKey: seedPhrase,
        password: String(process.env.ENCRYPTION_KEY),
      });

      // Create wallet record
      const [newWallet] = await db
        .insert(wallet)
        .values({
          name,
          userId,
          encryptedSeed: await this.encryptSeedPhrase(seedPhrase),
          metadata: {
            network: STACKS_MAINNET,
            type: 'generated',
          },
        })
        .returning();

      return newWallet;
    } catch (error) {
      console.error('Failed to create new wallet:', error);
      throw error;
    }
  }

  async importWallet({
    userId,
    seedPhrase,
  }: {
    userId: string;
    seedPhrase: string;
  }): Promise<WalletMetadata> {
    try {
      // Verify user exists
      const [userExists] = await db
        .select()
        .from(user)
        .where(eq(user.id, userId));

      if (!userExists) {
        throw new Error('User not found');
      }

      // Validate the seed phrase
      await generateWallet({
        secretKey: seedPhrase,
        password: String(process.env.ENCRYPTION_KEY),
      });

      const name = this.generateWalletName();

      // Create wallet record
      const [newWallet] = await db
        .insert(wallet)
        .values({
          name,
          userId,
          encryptedSeed: await this.encryptSeedPhrase(seedPhrase),
          metadata: {
            network: STACKS_MAINNET,
            type: 'imported',
          },
        })
        .returning();

      return newWallet;
    } catch (error) {
      console.error('Failed to import wallet:', error);
      throw error;
    }
  }

  async getWallet(walletId: string, userId: string): Promise<WalletMetadata> {
    try {
      const [foundWallet] = await db
        .select()
        .from(wallet)
        .where(and(eq(wallet.id, walletId), eq(wallet.userId, userId)));

      if (!foundWallet) {
        throw new Error('Wallet not found or unauthorized');
      }

      return foundWallet;
    } catch (error) {
      console.error('Failed to get wallet:', error);
      throw error;
    }
  }

  async getWalletsByUserId(userId: string): Promise<Array<WalletMetadata>> {
    try {
      return await db
        .select()
        .from(wallet)
        .where(eq(wallet.userId, userId))
        .orderBy(wallet.lastActive);
    } catch (error) {
      console.error('Failed to get wallets for user:', error);
      throw error;
    }
  }

  async updateWallet(
    walletId: string,
    userId: string,
    updates: Partial<Pick<WalletMetadata, 'metadata'>>
  ): Promise<WalletMetadata> {
    try {
      const [foundWallet] = await db
        .select()
        .from(wallet)
        .where(and(eq(wallet.id, walletId), eq(wallet.userId, userId)));

      if (!foundWallet) {
        throw new Error('Wallet not found or unauthorized');
      }

      const [updated] = await db
        .update(wallet)
        .set({
          ...updates,
          lastActive: new Date(),
          metadata: {
            ...(foundWallet.metadata || {}),
            ...(updates.metadata || {}),
          },
        })
        .where(eq(wallet.id, walletId))
        .returning();

      return updated;
    } catch (error) {
      console.error('Failed to update wallet:', error);
      throw error;
    }
  }

  async deleteWallet(walletId: string, userId: string): Promise<void> {
    try {
      const [foundWallet] = await db
        .select()
        .from(wallet)
        .where(and(eq(wallet.id, walletId), eq(wallet.userId, userId)));

      if (!foundWallet) {
        throw new Error('Wallet not found or unauthorized');
      }

      await db.delete(wallet).where(eq(wallet.id, walletId));
    } catch (error) {
      console.error('Failed to delete wallet:', error);
      throw error;
    }
  }

  // New account-related methods
  async listAccounts(
    walletId: string,
    userId: string,
    indexRange = 5
  ): Promise<Account[]> {
    try {
      const stacksWallet = await this.getStacksWallet(walletId, userId);

      return stacksWallet.accounts.slice(0, indexRange);
    } catch (error) {
      console.error('Failed to list accounts:', error);
      throw error;
    }
  }

  async getAccount(
    walletId: string,
    userId: string,
    accountIndex: number
  ): Promise<Account> {
    try {
      const stacksWallet = await this.getStacksWallet(walletId, userId);

      const account = stacksWallet.accounts[accountIndex];

      return account;
    } catch (error) {
      console.error('Failed to get account:', error);
      throw error;
    }
  }

  async createNextAccount(walletId: string, userId: string): Promise<Account> {
    try {
      const stacksWallet = await this.getStacksWallet(walletId, userId);

      // Create the new account
      const walletWithNewAccount = generateNewAccount(stacksWallet);

      // not supported yet
      throw new Error('More than one account is not supported');

      return walletWithNewAccount.accounts[
        walletWithNewAccount.accounts.length - 1
      ];
    } catch (error) {
      console.error('Failed to create next account:', error);
      throw error;
    }
  }

  async signMessage(
    walletId: string,
    userId: string,
    accountIndex: number,
    message: string
  ): Promise<string> {
    try {
      const account = await this.getAccount(walletId, userId, accountIndex);
      // Implement message signing using account.stxPrivateKey
      throw new Error('Message signing not implemented');
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw error;
    }
  }
}
