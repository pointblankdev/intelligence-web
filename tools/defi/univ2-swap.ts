import { CoreTool } from 'ai';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';
import { DexProvider, DexWriteService } from '@/services/defi/univ2-dex';
import { WalletService } from '@/services/wallet';

interface SwapTransactionData {
  txId: string;
  fee?: string;
  nonce?: string;
  rawTx: string;
}

interface SwapToolResponse {
  success: boolean;
  transaction?: SwapTransactionData;
  error?: string;
}

const swapParamsSchema = z.object({
  dex: z
    .enum(['CHARISMA', 'VELAR'])
    .default('CHARISMA')
    .describe('The DEX provider to use for swap execution.'),

  network: z
    .enum(['mainnet', 'testnet'])
    .default('mainnet')
    .describe('The network to execute the swap on.'),

  operation: z
    .enum([
      'swap', // Direct swap between two tokens
      'swap3', // Three-token path swap
      'swap4', // Four-token path swap
      'swap5', // Five-token path swap
      'optimalSwap', // Automatically find and use best path
    ])
    .describe('The type of swap to execute.'),

  // Required for all swaps
  senderKey: z.string().describe('Private key for transaction signing.'),

  shareFeeToAddress: z
    .string()
    .describe('Address to receive share of fees from the swap.'),

  // For direct swaps and optimal swaps
  tokenIn: z
    .string()
    .optional()
    .describe(
      'The contract address of the token being sold (for direct and optimal swaps).'
    ),

  tokenOut: z
    .string()
    .optional()
    .describe(
      'The contract address of the token being bought (for direct and optimal swaps).'
    ),

  // For multi-hop swaps
  path: z
    .array(z.string())
    .optional()
    .describe(
      'Ordered array of token addresses for multi-hop swaps (required for swap3/4/5).'
    ),

  // Amount parameters
  amountIn: z
    .string()
    .describe('The amount of input tokens as a string (represents a BigInt).'),

  amountOutMin: z
    .string()
    .optional()
    .describe(
      'Minimum amount of output tokens to accept (required except for optimalSwap).'
    ),

  slippageTolerance: z
    .number()
    .default(0.1)
    .describe(
      'Slippage tolerance as decimal (e.g., 0.1 for 10%). Used for optimal swaps.'
    ),
});

export const name = 'DEX-Swap';
export const swapTool: CoreTool<typeof swapParamsSchema, SwapToolResponse> = {
  parameters: swapParamsSchema,
  description: `
    Execute token swaps on Uniswap V2-style DEXes (Charisma and Velar).
    Supports direct swaps, multi-hop routing, and automatic path optimization.

    Operation Types:
    - swap: Direct token-to-token swap
    - swap3: Three-token path swap (A->B->C)
    - swap4: Four-token path swap (A->B->C->D)
    - swap5: Five-token path swap (A->B->C->D->E)
    - optimalSwap: Automatically finds and executes best path

    Security Requirements:
    1. Valid private key with sufficient token allowance
    2. Slippage protection via amountOutMin or slippageTolerance
    3. Valid share fee recipient address
    4. Authentication required for all operations

    Parameter Guidelines:
    1. Token addresses must be fully qualified: "SP2...<address>.<token-name>"
    2. Amounts must be passed as strings to handle BigInt values
    3. Path arrays must contain valid, connected token pairs
    4. SlippageTolerance is only used for optimalSwap operations

    Example Path Format:
    ["SP2.token-a", "SP2.token-b", "SP2.token-c"]
  `,

  execute: async (
    args: z.infer<typeof swapParamsSchema>,
    { abortSignal }
  ): Promise<SwapToolResponse> => {
    try {
      // Verify authentication
      const session = await auth();
      if (!session?.user?.id) {
        return {
          success: false,
          error: 'Authentication required for swap execution',
        };
      }

      // const walletService = new WalletService();
      // const userId = session.user.id;
      // const wallets = await walletService.getWalletsByUserId(userId);

      const writeService = new DexWriteService(
        args.network,
        args.dex as DexProvider
      );

      // Validate operation-specific parameters
      switch (args.operation) {
        case 'swap': {
          if (!args.tokenIn || !args.tokenOut || !args.amountOutMin) {
            return {
              success: false,
              error:
                'tokenIn, tokenOut, and amountOutMin required for direct swaps',
            };
          }

          const result = await writeService.swap2({
            senderKey: args.senderKey,
            tokenIn: args.tokenIn,
            tokenOut: args.tokenOut,
            amountIn: BigInt(args.amountIn),
            amountOutMin: BigInt(args.amountOutMin),
            shareFeeToAddress: args.shareFeeToAddress,
          });

          return {
            success: true,
            transaction: formatTransaction(result),
          };
        }

        case 'swap3': {
          if (!args.path || args.path.length !== 3 || !args.amountOutMin) {
            return {
              success: false,
              error: 'Valid 3-token path and amountOutMin required for swap3',
            };
          }

          const result = await writeService.swap3({
            senderKey: args.senderKey,
            tokenA: args.path[0],
            tokenB: args.path[1],
            tokenC: args.path[2],
            amountIn: BigInt(args.amountIn),
            amountOutMin: BigInt(args.amountOutMin),
            shareFeeToAddress: args.shareFeeToAddress,
          });

          return {
            success: true,
            transaction: formatTransaction(result),
          };
        }

        case 'swap4': {
          if (!args.path || args.path.length !== 4 || !args.amountOutMin) {
            return {
              success: false,
              error: 'Valid 4-token path and amountOutMin required for swap4',
            };
          }

          const result = await writeService.swap4({
            senderKey: args.senderKey,
            tokenA: args.path[0],
            tokenB: args.path[1],
            tokenC: args.path[2],
            tokenD: args.path[3],
            amountIn: BigInt(args.amountIn),
            amountOutMin: BigInt(args.amountOutMin),
            shareFeeToAddress: args.shareFeeToAddress,
          });

          return {
            success: true,
            transaction: formatTransaction(result),
          };
        }

        case 'swap5': {
          if (!args.path || args.path.length !== 5 || !args.amountOutMin) {
            return {
              success: false,
              error: 'Valid 5-token path and amountOutMin required for swap5',
            };
          }

          const result = await writeService.swap5({
            senderKey: args.senderKey,
            tokenA: args.path[0],
            tokenB: args.path[1],
            tokenC: args.path[2],
            tokenD: args.path[3],
            tokenE: args.path[4],
            amountIn: BigInt(args.amountIn),
            amountOutMin: BigInt(args.amountOutMin),
            shareFeeToAddress: args.shareFeeToAddress,
          });

          return {
            success: true,
            transaction: formatTransaction(result),
          };
        }

        case 'optimalSwap': {
          if (!args.tokenIn || !args.tokenOut) {
            return {
              success: false,
              error: 'tokenIn and tokenOut required for optimal swap',
            };
          }

          const result = await writeService.swapWithOptimalPath({
            senderKey: args.senderKey,
            tokenIn: args.tokenIn,
            tokenOut: args.tokenOut,
            amountIn: BigInt(args.amountIn),
            slippageTolerance: args.slippageTolerance,
            shareFeeToAddress: args.shareFeeToAddress,
          });

          return {
            success: true,
            transaction: formatTransaction(result),
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
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
};

function formatTransaction(tx: any): SwapTransactionData {
  return {
    txId: tx.txId,
    fee: tx.fee?.toString(),
    nonce: tx.nonce?.toString(),
    rawTx: tx.rawTx,
  };
}

export default swapTool;
