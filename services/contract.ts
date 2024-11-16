import 'server-only';
import { STACKS_MAINNET, STACKS_TESTNET, StacksNetwork } from '@stacks/network';
import {
  AnchorMode,
  broadcastTransaction,
  ClarityValue,
  makeContractCall,
  PostCondition,
  PostConditionMode,
} from '@stacks/transactions';

export interface ContractCallParams {
  senderKey: string;
  contractAddress: string;
  contractName: string;
  functionName: string;
  functionArgs: ClarityValue[];
  postConditions?: PostCondition[];
  anchorMode?: AnchorMode;
  postConditionMode?: PostConditionMode;
  network?: 'mainnet' | 'testnet';
  fee?: number;
  nonce?: number;
  sponsored?: boolean;
}

export interface TransactionResult {
  txId: string;
  fee?: number;
  nonce?: number;
  rawTx: string;
}

export class ContractService {
  private readonly defaultNetwork: StacksNetwork;

  constructor(network: 'mainnet' | 'testnet' = 'mainnet') {
    this.defaultNetwork =
      network === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET;
  }

  async makeContractCall(
    params: ContractCallParams
  ): Promise<TransactionResult> {
    try {
      const {
        senderKey,
        contractAddress,
        contractName,
        functionName,
        functionArgs,
        postConditions = [],
        anchorMode = AnchorMode.Any,
        postConditionMode = PostConditionMode.Deny,
        network = 'mainnet',
        fee,
        nonce,
      } = params;

      // Prepare network
      const networkInstance =
        network === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET;

      // Prepare contract call options
      const txOptions: any = {
        contractAddress,
        contractName,
        functionName,
        functionArgs,
        senderKey,
        network: networkInstance,
        postConditionMode,
        postConditions,
      };

      // Cap fees at 0.01 STX
      if (fee) txOptions.fee = Math.min(fee, 10000);
      if (nonce) txOptions.nonce = nonce;

      // Make contract call
      const transaction = await makeContractCall(txOptions);

      // Broadcast transaction
      const broadcastResponse = await broadcastTransaction({
        transaction,
        network: networkInstance,
      });

      if ('error' in broadcastResponse) {
        throw new Error(
          `Failed to broadcast transaction: ${broadcastResponse.error}: reason: ${broadcastResponse.reason}`
        );
      }

      // Return transaction details
      return {
        txId: broadcastResponse.txid,
        fee: Number(transaction.auth.spendingCondition.fee),
        nonce: Number(transaction.auth.spendingCondition.nonce),
        rawTx: transaction.serialize().toString(),
      };
    } catch (error) {
      console.error('Contract call failed:', error);
      throw error;
    }
  }
}
