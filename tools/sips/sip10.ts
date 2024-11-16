import { CoreTool } from 'ai';
import { z } from 'zod';

import { Sip10Service, TokenInfo } from '@/services/sips/sip10';

// Define response type
type Sip10Response = {
  success: boolean;
  data?: {
    tokenInfo?: TokenInfo;
    tokensInfo?: TokenInfo[];
    name?: string;
    symbol?: string;
    decimals?: number;
    totalSupply?: string;
    balance?: string;
    balances?: Record<string, string>;
    tokenUri?: string;
    metadata?: any;
  };
  error?: string;
};

// Define operation parameters schema
const sip10ParamsSchema = z.object({
  operation: z
    .enum([
      'getTokenInfo',
      'batchGetTokenInfo',
      'getName',
      'getSymbol',
      'getDecimals',
      'getBalance',
      'batchGetBalances',
      'getTotalSupply',
      'getTokenUri',
      'getTokenUriAndMetadata',
    ])
    .describe('The SIP010 token operation to perform'),

  contractAddress: z
    .string()
    .describe('The contract address of the token')
    .optional(),

  contractName: z
    .string()
    .describe('The contract name of the token')
    .optional(),

  ownerAddress: z
    .string()
    .describe('The address to check balance for')
    .optional(),

  tokens: z
    .array(
      z.object({
        contractAddress: z.string(),
        contractName: z.string(),
      })
    )
    .describe('Array of tokens for batch operations')
    .optional(),

  balanceQueries: z
    .array(
      z.object({
        contractAddress: z.string(),
        contractName: z.string(),
        ownerAddress: z.string(),
      })
    )
    .describe('Array of balance queries for batch operations')
    .optional(),
});

// Create service instance
const sip10Service = new Sip10Service();

export const name = 'SIP010-Token';
export const sip10Tool: CoreTool<typeof sip10ParamsSchema, Sip10Response> = {
  parameters: sip10ParamsSchema,
  description:
    'Interacts with SIP010-compliant fungible tokens on the Stacks blockchain. ' +
    'Provides functionality to query token information, balances, and metadata. ' +
    'Supports both single and batch operations for efficient data retrieval.' +
    'After using this tool, check the token registry and update the data there.',

  execute: async (
    args: z.infer<typeof sip10ParamsSchema>
  ): Promise<Sip10Response> => {
    try {
      switch (args.operation) {
        case 'getTokenInfo': {
          if (!args.contractAddress || !args.contractName) {
            return {
              success: false,
              error: 'Contract address and name are required for getTokenInfo',
            };
          }

          const tokenInfo = await sip10Service.getTokenInfo(
            args.contractAddress,
            args.contractName
          );

          return {
            success: true,
            data: {
              tokenInfo: {
                ...tokenInfo,
                totalSupply: tokenInfo.totalSupply.toString(),
              },
            },
          };
        }

        case 'batchGetTokenInfo': {
          if (!args.tokens?.length) {
            return {
              success: false,
              error: 'Token array is required for batch token info',
            };
          }

          const tokensInfo = await sip10Service.batchGetTokenInfo(args.tokens);
          console.log(tokensInfo);
          return {
            success: true,
            data: {
              tokensInfo: tokensInfo
                .filter((info): info is TokenInfo => info !== null)
                .map((info) => ({
                  ...info,
                  totalSupply: info.totalSupply.toString(),
                })),
            },
          };
        }

        case 'getName': {
          if (!args.contractAddress || !args.contractName) {
            return {
              success: false,
              error: 'Contract address and name are required for getName',
            };
          }

          const name = await sip10Service.getName(
            args.contractAddress,
            args.contractName
          );

          return {
            success: true,
            data: { name },
          };
        }

        case 'getSymbol': {
          if (!args.contractAddress || !args.contractName) {
            return {
              success: false,
              error: 'Contract address and name are required for getSymbol',
            };
          }

          const symbol = await sip10Service.getSymbol(
            args.contractAddress,
            args.contractName
          );

          return {
            success: true,
            data: { symbol },
          };
        }

        case 'getDecimals': {
          if (!args.contractAddress || !args.contractName) {
            return {
              success: false,
              error: 'Contract address and name are required for getDecimals',
            };
          }

          const decimals = await sip10Service.getDecimals(
            args.contractAddress,
            args.contractName
          );

          return {
            success: true,
            data: { decimals },
          };
        }

        case 'getBalance': {
          if (
            !args.contractAddress ||
            !args.contractName ||
            !args.ownerAddress
          ) {
            return {
              success: false,
              error:
                'Contract address, name, and owner address are required for getBalance',
            };
          }

          const balance = await sip10Service.getBalance(
            args.contractAddress,
            args.contractName,
            args.ownerAddress
          );

          return {
            success: true,
            data: { balance: balance.toString() },
          };
        }

        case 'batchGetBalances': {
          if (!args.balanceQueries?.length) {
            return {
              success: false,
              error:
                'Balance queries array is required for batch balance check',
            };
          }

          const balances = await sip10Service.batchGetBalances(
            args.balanceQueries
          );

          const balanceMap = args.balanceQueries.reduce(
            (acc, query, index) => {
              const balance = balances[index];
              if (balance !== null) {
                const key = `${query.contractAddress}.${query.contractName}.${query.ownerAddress}`;
                acc[key] = balance.toString();
              }
              return acc;
            },
            {} as Record<string, string>
          );

          return {
            success: true,
            data: { balances: balanceMap },
          };
        }

        case 'getTotalSupply': {
          if (!args.contractAddress || !args.contractName) {
            return {
              success: false,
              error:
                'Contract address and name are required for getTotalSupply',
            };
          }

          const totalSupply = await sip10Service.getTotalSupply(
            args.contractAddress,
            args.contractName
          );

          return {
            success: true,
            data: { totalSupply: totalSupply.toString() },
          };
        }

        case 'getTokenUri': {
          if (!args.contractAddress || !args.contractName) {
            return {
              success: false,
              error: 'Contract address and name are required for getTokenUri',
            };
          }

          const tokenUri = await sip10Service.getTokenUri(
            args.contractAddress,
            args.contractName
          );

          return {
            success: true,
            data: { tokenUri },
          };
        }

        case 'getTokenUriAndMetadata': {
          if (!args.contractAddress || !args.contractName) {
            return {
              success: false,
              error:
                'Contract address and name are required for getTokenUriAndMetadata',
            };
          }

          const { uri, metadata } = await sip10Service.getTokenUriAndMetadata(
            args.contractAddress,
            args.contractName
          );

          return {
            success: true,
            data: {
              tokenUri: uri,
              metadata,
            },
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

export default sip10Tool;
