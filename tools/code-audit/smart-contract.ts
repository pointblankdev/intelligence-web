import { kv } from '@vercel/kv';
import { CoreTool, streamText, StreamingTextResponse, StreamData } from 'ai';
import { z } from 'zod';

import { customModel } from '@/ai';
import { ContractService } from '@/services/stacks-api/contract';

// Arcana-specific metrics interface
interface ArcanaMetrics {
  alignment: number; // 0-9
  qualityScore: number; // 0-10000
  circulatingSupply: number;
  metadataUri: string;
}

// Token interfaces
interface FungibleToken {
  name: string;
  symbol: string;
  decimals: number;
  tokenIdentifier: string;
  isTransferable: boolean;
  isMintable: boolean;
  isBurnable: boolean;
  totalSupply?: string;
  maxSupply?: string;
  arcana?: ArcanaMetrics;
}

interface ContractAudit {
  contractId: string;
  deploymentInfo: {
    blockHeight: number;
    txId: string;
    clarityVersion: number | null;
  };
  fungibleTokens: FungibleToken[];
  nonFungibleTokens: {
    name: string;
    assetIdentifier: string;
    isMintable: boolean;
    isTransferable: boolean;
    totalSupply?: string;
    arcana?: ArcanaMetrics;
  }[];
  publicFunctions: {
    name: string;
    access: 'public' | 'read_only';
    args: { name: string; type: string }[];
    outputs: { type: string };
  }[];
  traits: {
    name: string;
    isImplemented: boolean;
    missingFunctions?: string[];
  }[];
  variables: {
    name: string;
    type: string;
    access: 'public' | 'private';
    constant: boolean;
    currentValue?: string;
  }[];
  maps: {
    name: string;
    keyType: string;
    valueType: string;
    description: string;
  }[];
  arcanaRecommendation: ArcanaMetrics;
  permissions: {
    canMint: boolean;
    canBurn: boolean;
    hasAdminFunctions: boolean;
    hasEmergencyFunctions: boolean;
    hasPauseFunctionality: boolean;
  };
  security: {
    hasRoleBasedAccess: boolean;
    hasOwnershipControl: boolean;
    hasTimelock: boolean;
    hasFlashLoanPrevention: boolean;
  };
  analysis: {
    riskLevel: 'low' | 'medium' | 'high';
    warnings: string[];
    recommendations: string[];
  };
}

// Cache constants
const CACHE_KEY_PREFIX = 'contract-audit:';
const CACHE_DURATION = 60 * 60 * 24 * 365; // 1 year in seconds

// Response type
type ContractAuditResponse = {
  success: boolean;
  data?: ContractAudit;
  error?: string;
  cached?: boolean;
};

// Input parameters schema
const contractAuditParamsSchema = z.object({
  contractId: z
    .string()
    .regex(/^[A-Z0-9]+\.[A-Za-z0-9-_]+$/)
    .describe('Contract identifier in format: <address>.<contract-name>'),
  forceRefresh: z
    .boolean()
    .optional()
    .default(false)
    .describe('Force refresh the audit cache only when asked'),
});

// Initialize services
const contractService = new ContractService();

// Main tool implementation
export const name = 'Contract-Audit';
export const contractAuditTool: CoreTool<
  typeof contractAuditParamsSchema,
  ContractAuditResponse
> = {
  parameters: contractAuditParamsSchema,
  description:
    'Performs a comprehensive audit of a Clarity smart contract with Arcana metrics analysis',

  execute: async (args) => {
    console.log(args);
    try {
      const cacheKey = `${CACHE_KEY_PREFIX}${args.contractId}`;

      // Check cache first
      if (!args.forceRefresh) {
        const cached = await kv.get<ContractAudit>(cacheKey);
        if (cached) {
          return {
            success: true,
            data: cached,
            cached: true,
          };
        }
      }

      const contract = await contractService.getContractInfo(args.contractId);

      // Stream the analysis using Claude
      const { fullStream } = await streamText({
        model: customModel('claude-3-5-sonnet-20241022'),
        system: `You are an expert Clarity smart contract auditor with deep understanding of the common Stacks smart contract attack vectors.
                You will analyze contracts and provide detailed security audits in JSON format.`,
        messages: [
          {
            role: 'user',
            content: `Analyze this Clarity smart contract and provide a comprehensive security audit report in JSON format.
            Pay special attention to:
            1. Fungible tokens and their tokenIdentifiers
            2. Data variables and maps defined in the contract
            3. Current values that would need to be stored in Arcana contract
            4. Recommended Arcana metrics based on contract analysis
            5. Alignment Classification: A classification for each smart contract, providing a framework 
               to understand its nature, intent, and potential impact. Alignments are represented by 
               uint values from 0 to 9, where:
            
                0 = Undefined
          
                1 = Lawful Constructive: Contracts with strong principles aimed at creating value within defined rules.
                  Examples: Transparent governance protocols, Audited lending platforms, Verified charity distribution contracts
          
                2 = Neutral Constructive: Contracts that create value with more flexible methods.
                  Examples: Adaptive yield optimization protocols, Community-driven grant distribution contracts
          
                3 = Chaotic Constructive: Contracts promoting individual freedom while aiming to create value.
                  Examples: Decentralized identity management contracts, Privacy-preserving transaction protocols
          
                4 = Lawful Neutral: Contracts with strict adherence to predefined rules, prioritizing consistency.
                  Examples: Algorithmic stablecoin contracts, Automated market maker contracts, Trustless escrow contracts
          
                5 = True Neutral: Contracts that function without bias, simply enabling interactions.
                  Examples: Basic token swap contracts, Cross-chain bridge contracts, Oracle data feed contracts
          
                6 = Chaotic Neutral: Contracts allowing high degrees of freedom and unpredictability.
                  Examples: Experimental DeFi protocol contracts, Permissionless liquidity pool contracts
          
                7 = Lawful Extractive: Contracts that operate within system rules but extract disproportionate value.
                  Examples: High-fee transaction protocols, Rent-seeking governance contracts
          
                8 = Neutral Extractive: Contracts designed for value extraction without explicit harmful intent.
                  Examples: Aggressive yield farming contracts, Frontrunning MEV bot contracts
          
                9 = Chaotic Extractive: Contracts designed primarily for exploitation or harm.
                  Examples: Rug pull contracts, Wallet drainer contracts, Ponzi scheme contracts

            Contract source:
            ${contract.source_code}

            The response should be valid JSON with this structure with no other text or comments:
            {
              "fungibleTokens": [{
                "name": string,
                "symbol": string,
                "decimals": number,
                "tokenIdentifier": string,
                "isTransferable": boolean,
                "isMintable": boolean,
                "isBurnable": boolean,
                "totalSupply": string?,
                "maxSupply": string?,
              }],
              "variables": [{
                "name": string,
                "type": string,
                "access": "public" | "private",
                "constant": boolean,
                "currentValue": string?
              }],
              "maps": [{
                "name": string,
                "keyType": string, 
                "valueType": string,
                "description": string
              }],
              "arcanaRecommendation": {
                "alignment": number (0-9),
                "reasoning": string
              }
            }`,
          },
        ],
        maxTokens: 4000,
      });

      let auditResult = '';

      // Process the stream
      for await (const delta of fullStream) {
        const { type } = delta;
        if (type === 'text-delta') {
          const { textDelta } = delta;
          auditResult += textDelta;
        }
      }

      console.log('Contract audit result:', auditResult);

      // Parse and combine the results
      const audit: ContractAudit = {
        contractId: args.contractId,
        deploymentInfo: {
          blockHeight: contract.block_height,
          txId: contract.tx_id,
          clarityVersion: contract.clarity_version,
        },
        ...JSON.parse(auditResult),
      };

      // Cache the results
      await kv.set(cacheKey, audit, {
        ex: CACHE_DURATION,
      });

      return {
        success: true,
        data: audit,
      };
    } catch (error) {
      console.error('Contract audit error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'An unknown error occurred',
      };
    }
  },
};

export default contractAuditTool;
