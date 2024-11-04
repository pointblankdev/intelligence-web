import { CoreTool } from 'ai';
import { z } from 'zod';

import { BnsNameInfo, BnsService } from '@/services/bns';

const bnsService = new BnsService();

const bnsParamsSchema = z.object({
  operation: z
    .enum(['getNamesForAddress', 'getNameInfo'])
    .describe('The BNS operation to perform.'),
  address: z
    .string()
    .optional()
    .describe(
      'The Stacks address to look up BNS names for (required for getNamesForAddress).'
    ),
  name: z
    .string()
    .optional()
    .describe(
      'The BNS name to look up information for (required for getNameInfo).'
    ),
});

type BnsParams = z.infer<typeof bnsParamsSchema>;

export const name = 'bns';
export const bnsTool: CoreTool<typeof bnsParamsSchema, string[] | BnsNameInfo> =
  {
    parameters: bnsParamsSchema,
    description: `Query the Stacks Bitcoin Naming Service (BNS).
Available operations:
- getNamesForAddress: Get all BNS names owned by a Stacks address
- getNameInfo: Get detailed information about a specific BNS name`,
    execute: async (
      args: BnsParams,
      { abortSignal }
    ): Promise<string[] | BnsNameInfo> => {
      try {
        switch (args.operation) {
          case 'getNamesForAddress':
            if (!args.address) {
              throw new Error(
                'Address required for getNamesForAddress operation'
              );
            }
            return await bnsService.getNamesForAddress(args.address);

          case 'getNameInfo':
            if (!args.name) {
              throw new Error('Name required for getNameInfo operation');
            }
            return await bnsService.getNameInfo(args.name);

          default:
            throw new Error('Invalid BNS operation');
        }
      } catch (error) {
        throw new Error(`BNS operation failed: ${(error as Error).message}`);
      }
    },
  };
