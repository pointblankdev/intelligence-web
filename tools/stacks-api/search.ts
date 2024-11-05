import { CoreTool } from 'ai';
import { z } from 'zod';

import {
  StacksSearchService,
  SearchResult,
  AddressSearchResult,
  BlockSearchResult,
  ContractSearchResult,
  TxSearchResult,
  MempoolTxSearchResult,
  NotFoundResult,
} from '@/services/stacks-api/search';

const searchService = new StacksSearchService();

const searchParamsSchema = z.object({
  operation: z
    .enum([
      'search',
      'searchAddress',
      'searchBlock',
      'searchContract',
      'searchTransaction',
    ])
    .describe('The search operation to perform.'),
  id: z.string().describe('The hash, address, or ID to search for.'),
  includeMetadata: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to include detailed metadata in the response.'),
});

type SearchParams = z.infer<typeof searchParamsSchema>;
type SearchToolResponse =
  | SearchResult
  | AddressSearchResult
  | BlockSearchResult
  | ContractSearchResult
  | (TxSearchResult | MempoolTxSearchResult)
  | NotFoundResult;

export const name = 'Stacks-API-Search';
export const searchTool: CoreTool<
  typeof searchParamsSchema,
  SearchToolResponse
> = {
  parameters: searchParamsSchema,
  description: `Search the Stacks blockchain for various entities.
Available operations:
- search: Generic search that returns any matching entity
- searchAddress: Search specifically for an address
- searchBlock: Search specifically for a block
- searchContract: Search specifically for a contract
- searchTransaction: Search specifically for a transaction (including mempool)

Set includeMetadata to true to get additional details about the found entity.`,
  execute: async (
    args: SearchParams,
    { abortSignal }
  ): Promise<SearchToolResponse> => {
    try {
      const { operation, id, includeMetadata } = args;

      switch (operation) {
        case 'search':
          return await searchService.search(id, includeMetadata);

        case 'searchAddress':
          return await searchService.searchAddress(id, includeMetadata);

        case 'searchBlock':
          return await searchService.searchBlock(id, includeMetadata);

        case 'searchContract':
          return await searchService.searchContract(id, includeMetadata);

        case 'searchTransaction':
          return await searchService.searchTransaction(id, includeMetadata);

        default:
          throw new Error('Invalid search operation');
      }
    } catch (error) {
      throw new Error(`Search operation failed: ${(error as Error).message}`);
    }
  },
};
