import { CoreTool } from 'ai';
import { z } from 'zod';

import { Sip10Service } from '@/services/sips/sip10';
import { tokenRegistry } from '@/services/sips/token-registry';
import { ContractAudit } from '@/tools/code-audit/schema';

// Create service instance
const sip10Service = new Sip10Service();

const tokenRegistryParamsSchema = z
  .object({
    operation: z
      .enum([
        // Discovery
        'registerToken',
        'registerSymbol',
        'registerLpToken',
        'addPoolForToken',

        // Removal
        'removeContract',
        'unregisterLpToken',
        'removePoolForToken',

        // Queries
        'getTokenInfo',
        'resolveSymbol',
        'getLpTokens',

        // List Operations
        'listAll',
        'listSymbols',
        'listMetadata',
        'listLpTokens',
        'listAudits',
        'listPools',
        'listPrices',

        // Updates
        'refreshMetadata',
        'updateMetadata',
        'updateAudit',
        'updatePrice',

        // Maintenance
        'cleanup',

        // Batch Operations
        'registerCompleteLP',
      ])
      .describe('Registry operation to perform'),

    // Token identification
    contractId: z.string().optional().describe('Contract principal'),
    symbol: z.string().optional().describe('Token symbol'),

    // Pool data
    poolId: z.string().optional().describe('Pool identifier'),

    // Operation data
    metadata: z.record(z.any()).optional().describe('Token metadata'),
    audit: z.any().optional().describe('Contract audit results'),
    price: z.number().optional().describe('Token price'),

    // LP token info
    lpInfo: z
      .object({
        dex: z.string(),
        poolId: z.string(),
        token0: z.string(),
        token1: z.string(),
      })
      .optional()
      .describe('LP token information'),

    lpRegistration: z
      .object({
        lpContract: z.string().describe('LP token contract ID'),
        token0: z.object({
          contract: z.string().describe('First token contract ID'),
          symbol: z.string().describe('First token symbol'),
        }),
        token1: z.object({
          contract: z.string().describe('Second token contract ID'),
          symbol: z.string().describe('Second token symbol'),
        }),
        dex: z.enum(['CHARISMA', 'VELAR']).describe('DEX provider'),
        poolId: z.string().describe('Pool ID from the DEX'),
      })
      .optional(),

    // Force operations
    force: z.boolean().optional().default(false),
  })
  .describe('Token registry parameters');

export type RegistryResponse = {
  success: boolean;
  data?: any;
  error?: string;
};

export const tokenRegistryTool: CoreTool<
  typeof tokenRegistryParamsSchema,
  RegistryResponse
> = {
  parameters: tokenRegistryParamsSchema,
  description: `Token registry for tracking relationships between contracts, LP tokens, pools, and metadata, and looking up tokens by symbol.

Required Data Formats:
- contractId format: "SP2...<contract_address>.<token_name>"
- symbol: case-sensitive string identifier
- poolId: string identifier from DEX
- lpInfo: { dex: "charisma", poolId: string, token0: contractId, token1: contractId }

Entity Relationships:
1. Base Tokens
   - Must be registered first: registerToken(contractId)
   - Can have one symbol mapping: registerSymbol(contractId, symbol)
   - Can participate in multiple pools: addPoolForToken(contractId, poolId)
   - Store metadata from SIP10 tool

2. LP Tokens
   - Must register base token first: registerToken(lpContractId)
   - Then register LP data: registerLpToken(lpContractId, lpInfo)
   - LP info must include both token contracts and pool
   - token0 and token1 must be registered first
   - Always register pool relationships for both tokens

3. Pool Relationships
   - Add pool to both tokens when creating LP token
   - Pool must exist in DEX before registration
   - Both tokens must be registered first
   - Token order matters (token0 < token1)

Operation Order for New LP Token:
1. Register both underlying tokens if not exists
2. Register LP token contract
3. Create LP token info with both underlying tokens
4. Add pool relationships to both tokens
5. Update metadata if available

Operation Order for New Pool:
1. Verify both tokens exist
2. Add pool to both token records
3. Register LP token if exists
4. Update price data if available

Common Patterns:
1. Token Discovery:
   getTokenInfo -> registerToken -> registerSymbol -> updateMetadata

2. LP Token Creation:
   registerToken (token0) ->
   registerToken (token1) ->
   registerToken (lpToken) ->
   registerLpToken ->
   addPoolForToken (token0) ->
   addPoolForToken (token1)

3. Pool Addition:
   getTokenInfo (token0) ->
   getTokenInfo (token1) ->
   addPoolForToken (token0) ->
   addPoolForToken (token1) ->
   registerLpToken (if exists)

4. Data Updates:
   getTokenInfo ->
   updateMetadata ->
   updatePrice (if symbol exists)

Validation Rules:
1. Always verify token existence before operations
2. Ensure both tokens exist before LP registration
3. Pool relationships must be bidirectional
4. Symbols must be registered for price updates
5. LP tokens must reference valid pool and tokens
6. Contract IDs must match chain format
7. Force flag required for symbol reassignment
8. Pool IDs must be valid DEX references`,

  execute: async (args) => {
    try {
      switch (args.operation) {
        case 'registerCompleteLP': {
          if (!args.lpRegistration) {
            return {
              success: false,
              error: 'LP registration data required',
            };
          }

          const { lpContract, token0, token1, dex, poolId } =
            args.lpRegistration;

          // Track all registration results
          const results = {
            contracts: {} as Record<string, boolean>,
            symbols: {} as Record<string, boolean>,
            pool: {} as Record<string, boolean>,
            lpToken: false,
            metadata: {} as Record<string, boolean>,
          };

          // 1. Fetch metadata for all tokens
          const [token0Metadata, token1Metadata, lpMetadata] =
            await Promise.all([
              sip10Service.getTokenUriAndMetadata(
                token0.contract.split('.')[0],
                token0.contract.split('.')[1]
              ),
              sip10Service.getTokenUriAndMetadata(
                token1.contract.split('.')[0],
                token1.contract.split('.')[1]
              ),
              sip10Service.getTokenUriAndMetadata(
                lpContract.split('.')[0],
                lpContract.split('.')[1]
              ),
            ]);

          // 2. Register all three contracts and their metadata
          for (const { contract, metadata } of [
            { contract: lpContract, metadata: lpMetadata },
            { contract: token0.contract, metadata: token0Metadata },
            { contract: token1.contract, metadata: token1Metadata },
          ]) {
            await tokenRegistry.addContract(contract);
            await tokenRegistry.setMetadata(contract, metadata);
            results.contracts[contract] = true;
            results.metadata[contract] = true;
          }

          // 3. Register both base token symbols
          const symbolResults = await Promise.all([
            tokenRegistry.registerSymbol(token0.symbol, token0.contract, false),
            tokenRegistry.registerSymbol(token1.symbol, token1.contract, false),
          ]);
          results.symbols[token0.symbol] = symbolResults[0];
          results.symbols[token1.symbol] = symbolResults[1];

          // 4. Create LP token info
          const lpInfo = {
            dex,
            poolId,
            token0: token0.contract,
            token1: token1.contract,
          };

          // 5. Register LP token with pool info
          await tokenRegistry.registerLpToken(lpContract, lpInfo);
          results.lpToken = true;

          // 6. Add pool relationships for both base tokens
          for (const contract of [token0.contract, token1.contract]) {
            await tokenRegistry.addPoolForToken(contract, poolId);
            results.pool[contract] = true;
          }

          // 7. Get complete token info for all registered entities
          const [lpTokenInfo, token0Info, token1Info] = await Promise.all([
            tokenRegistry.getEnrichedToken(lpContract),
            tokenRegistry.getEnrichedToken(token0.contract),
            tokenRegistry.getEnrichedToken(token1.contract),
          ]);

          return {
            success: true,
            data: {
              registrationResults: results,
              lpToken: {
                info: lpTokenInfo,
                metadata: lpMetadata,
              },
              baseTokens: {
                token0: {
                  info: token0Info,
                  metadata: token0Metadata,
                },
                token1: {
                  info: token1Info,
                  metadata: token1Metadata,
                },
              },
              pool: {
                dex,
                id: poolId,
              },
            },
          };
        }

        case 'registerToken': {
          if (!args.contractId) {
            return {
              success: false,
              error: 'Contract ID required',
            };
          }

          await tokenRegistry.addContract(args.contractId);

          // If metadata provided, store it
          if (args.metadata) {
            await tokenRegistry.setMetadata(args.contractId, args.metadata);
          }

          return {
            success: true,
            data: {
              contractId: args.contractId,
              registered: true,
            },
          };
        }

        case 'removeContract': {
          if (!args.contractId) {
            return {
              success: false,
              error: 'Contract ID required',
            };
          }

          await tokenRegistry.removeContract(args.contractId);

          return {
            success: true,
            data: {
              contractId: args.contractId,
              removed: true,
            },
          };
        }

        case 'unregisterLpToken': {
          if (!args.contractId || !args.lpInfo) {
            return {
              success: false,
              error: 'Contract ID and LP info required',
            };
          }

          await tokenRegistry.unregisterLpToken(args.contractId, args.lpInfo);

          return {
            success: true,
            data: {
              contractId: args.contractId,
              unregistered: true,
            },
          };
        }

        case 'removePoolForToken': {
          if (!args.contractId || !args.poolId) {
            return {
              success: false,
              error: 'Contract ID and pool ID required',
            };
          }

          await tokenRegistry.removePoolForToken(args.contractId, args.poolId);

          return {
            success: true,
            data: {
              contractId: args.contractId,
              poolId: args.poolId,
              removed: true,
            },
          };
        }

        case 'addPoolForToken': {
          if (!args.contractId || !args.poolId) {
            return {
              success: false,
              error: 'Contract ID and pool ID required',
            };
          }

          await tokenRegistry.addPoolForToken(args.contractId, args.poolId);

          return {
            success: true,
            data: {
              contractId: args.contractId,
              poolId: args.poolId,
              added: true,
            },
          };
        }

        case 'registerSymbol': {
          if (!args.symbol || !args.contractId) {
            return {
              success: false,
              error: 'Symbol and contract ID required',
            };
          }

          const success = await tokenRegistry.registerSymbol(
            args.symbol,
            args.contractId,
            args.force
          );

          return {
            success: true,
            data: {
              symbol: args.symbol,
              registered: success,
              conflict: !success && !args.force,
            },
          };
        }

        case 'registerLpToken': {
          if (!args.contractId || !args.lpInfo) {
            return {
              success: false,
              error: 'Contract ID and LP info required',
            };
          }

          await tokenRegistry.registerLpToken(args.contractId, args.lpInfo);

          return {
            success: true,
            data: {
              contractId: args.contractId,
              lpInfo: args.lpInfo,
            },
          };
        }

        case 'getTokenInfo': {
          if (!args.contractId) {
            return {
              success: false,
              error: 'Contract ID required',
            };
          }

          const tokenInfo = await tokenRegistry.getEnrichedToken(
            args.contractId
          );

          return {
            success: true,
            data: tokenInfo,
          };
        }

        case 'resolveSymbol': {
          if (!args.symbol) {
            return {
              success: false,
              error: 'Symbol required',
            };
          }

          const contractId = await tokenRegistry.getContractBySymbol(
            args.symbol
          );

          return {
            success: true,
            data: {
              symbol: args.symbol,
              contractId,
            },
          };
        }

        case 'refreshMetadata': {
          if (!args.contractId) {
            return {
              success: false,
              error: 'Contract ID required',
            };
          }

          const { uri, metadata } = await sip10Service.getTokenUriAndMetadata(
            args.contractId.split('.')[0],
            args.contractId.split('.')[1]
          );
          await tokenRegistry.setMetadata(args.contractId, {
            symbol: args.contractId.split('.')[1],
            name: args.contractId.split('.')[1],
            ...metadata,
            uri,
          });

          return {
            success: true,
            data: {
              contractId: args.contractId,
              metadata: args.metadata,
            },
          };
        }

        case 'updateMetadata': {
          if (!args.contractId || !args.metadata) {
            return {
              success: false,
              error: 'Contract ID and metadata required',
            };
          }

          await tokenRegistry.setMetadata(args.contractId, args.metadata);

          return {
            success: true,
            data: {
              contractId: args.contractId,
              metadata: args.metadata,
            },
          };
        }

        case 'updateAudit': {
          if (!args.contractId || !args.audit) {
            return {
              success: false,
              error: 'Contract ID and audit required',
            };
          }

          await tokenRegistry.setAudit(
            args.contractId,
            args.audit as ContractAudit
          );

          return {
            success: true,
            data: {
              contractId: args.contractId,
              updated: true,
            },
          };
        }

        case 'updatePrice': {
          if (!args.symbol || typeof args.price !== 'number') {
            return {
              success: false,
              error: 'Symbol and price required',
            };
          }

          await tokenRegistry.updatePrice(args.symbol, args.price);

          return {
            success: true,
            data: {
              symbol: args.symbol,
              price: args.price,
            },
          };
        }

        case 'cleanup': {
          await tokenRegistry.cleanup();
          return {
            success: true,
            data: {
              cleaned: true,
            },
          };
        }

        // New list operations
        case 'listAll': {
          const tokens = await tokenRegistry.listAllEnrichedTokens();
          return {
            success: true,
            data: { tokens },
          };
        }

        case 'listSymbols': {
          const symbols = await tokenRegistry.listAllSymbols();
          return {
            success: true,
            data: { symbols },
          };
        }

        case 'listMetadata': {
          const metadata = await tokenRegistry.listAllMetadata();
          return {
            success: true,
            data: { metadata },
          };
        }

        case 'listLpTokens': {
          const lpTokens = await tokenRegistry.listAllLpTokens();
          return {
            success: true,
            data: { lpTokens },
          };
        }

        case 'listAudits': {
          const audits = await tokenRegistry.listAllAudits();
          return {
            success: true,
            data: { audits },
          };
        }

        case 'listPools': {
          const pools = await tokenRegistry.listAllPools();
          return {
            success: true,
            data: { pools },
          };
        }

        case 'listPrices': {
          const prices = await tokenRegistry.getAllPrices();
          return {
            success: true,
            data: { prices },
          };
        }

        case 'registerToken': {
          if (!args.contractId) {
            return {
              success: false,
              error: 'Contract ID required',
            };
          }

          await tokenRegistry.addContract(args.contractId);

          if (args.metadata) {
            await tokenRegistry.setMetadata(args.contractId, args.metadata);
          }

          return {
            success: true,
            data: {
              contractId: args.contractId,
              registered: true,
            },
          };
        }

        case 'registerSymbol': {
          if (!args.symbol || !args.contractId) {
            return {
              success: false,
              error: 'Symbol and contract ID required',
            };
          }

          const success = await tokenRegistry.registerSymbol(
            args.symbol,
            args.contractId,
            args.force
          );

          return {
            success: true,
            data: {
              symbol: args.symbol,
              registered: success,
              conflict: !success && !args.force,
            },
          };
        }

        case 'registerLpToken': {
          if (!args.contractId || !args.lpInfo) {
            return {
              success: false,
              error: 'Contract ID and LP info required',
            };
          }

          await tokenRegistry.registerLpToken(args.contractId, args.lpInfo);

          return {
            success: true,
            data: {
              contractId: args.contractId,
              lpInfo: args.lpInfo,
            },
          };
        }

        case 'getTokenInfo': {
          if (!args.contractId) {
            return {
              success: false,
              error: 'Contract ID required',
            };
          }

          const tokenInfo = await tokenRegistry.getEnrichedToken(
            args.contractId
          );

          return {
            success: true,
            data: tokenInfo,
          };
        }

        case 'resolveSymbol': {
          if (!args.symbol) {
            return {
              success: false,
              error: 'Symbol required',
            };
          }

          const contractId = await tokenRegistry.getContractBySymbol(
            args.symbol
          );

          return {
            success: true,
            data: {
              symbol: args.symbol,
              contractId,
            },
          };
        }

        case 'updateMetadata': {
          if (!args.contractId || !args.metadata) {
            return {
              success: false,
              error: 'Contract ID and metadata required',
            };
          }

          await tokenRegistry.setMetadata(args.contractId, args.metadata);

          return {
            success: true,
            data: {
              contractId: args.contractId,
              metadata: args.metadata,
            },
          };
        }

        case 'updateAudit': {
          if (!args.contractId || !args.audit) {
            return {
              success: false,
              error: 'Contract ID and audit required',
            };
          }

          await tokenRegistry.setAudit(
            args.contractId,
            args.audit as ContractAudit
          );

          return {
            success: true,
            data: {
              contractId: args.contractId,
              updated: true,
            },
          };
        }

        case 'updatePrice': {
          if (!args.symbol || typeof args.price !== 'number') {
            return {
              success: false,
              error: 'Symbol and price required',
            };
          }

          await tokenRegistry.updatePrice(args.symbol, args.price);

          return {
            success: true,
            data: {
              symbol: args.symbol,
              price: args.price,
            },
          };
        }

        case 'cleanup': {
          await tokenRegistry.cleanup();
          return {
            success: true,
            data: {
              cleaned: true,
            },
          };
        }

        default:
          return {
            success: false,
            error: 'Invalid operation',
          };
      }
    } catch (error) {
      console.error('Token registry error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
};

export default tokenRegistryTool;
