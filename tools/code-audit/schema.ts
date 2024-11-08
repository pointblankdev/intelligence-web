import { z } from 'zod';

const fungibleTokenSchema = z.object({
  name: z.string().describe('Token name'),
  symbol: z.string().describe('Token symbol'),
  decimals: z.number().min(0).max(18).describe('Number of decimal places'),
  tokenIdentifier: z.string().describe('Token identifier string'),
  isTransferable: z.boolean().describe('Whether token can be transferred'),
  isMintable: z.boolean().describe('Whether new tokens can be minted'),
  isBurnable: z.boolean().describe('Whether tokens can be burned'),
  isLpToken: z.boolean().describe('Whether this is a liquidity pool token'),
  totalSupply: z
    .string()
    .nullable()
    .optional()
    .describe('Current total supply'),
  maxSupply: z
    .string()
    .nullable()
    .optional()
    .describe('Maximum possible supply'),
});

const variableSchema = z.object({
  name: z.string().describe('Variable name'),
  type: z.string().describe('Clarity type'),
  access: z.enum(['public', 'private']).describe('Variable access type'),
  constant: z.boolean().describe('Whether variable is constant'),
  currentValue: z
    .string()
    .nullable()
    .optional()
    .describe('Current value if available'),
});

const mapSchema = z.object({
  name: z.string().describe('Map name'),
  keyType: z.string().describe('Clarity type of map keys'),
  valueType: z.string().describe('Clarity type of map values'),
  description: z.string().describe('Map description and purpose'),
});

// New schema for function parameters
const functionParameterSchema = z.object({
  name: z.string().describe('Parameter name'),
  type: z.string().describe('Clarity type of parameter'),
  description: z.string().optional().describe('Parameter description'),
});

// New schema for function responses
const functionResponseSchema = z.object({
  type: z.string().describe('Clarity return type'),
  description: z.string().optional().describe('Response description'),
});

// Schema for both public and read-only functions
const functionSchema = z.object({
  name: z.string().describe('Function name'),
  description: z.string().optional().describe('Function description'),
  parameters: z
    .array(functionParameterSchema)
    .optional()
    .describe('Function parameters'),
  response: functionResponseSchema.describe('Function return value'),
  access: z.enum(['public', 'read-only']).describe('Function access type'),
  costEstimate: z
    .object({
      runtime: z.number().optional(),
      read_count: z.number().optional(),
      write_count: z.number().optional(),
    })
    .optional()
    .describe('Estimated cost of function execution'),
});

const arcanaRecommendationSchema = z.object({
  alignment: z
    .number()
    .min(0)
    .max(9)
    .describe('Alignment score (0-9) indicating contract intent and behavior'),
  reasoning: z
    .string()
    .describe('Explanation for the alignment classification'),
});

// Update the audit response schema to include functions
const auditResponseSchema = z.object({
  fungibleTokens: z
    .array(fungibleTokenSchema)
    .describe('Fungible tokens defined in the contract'),
  variables: z
    .array(variableSchema)
    .describe('Variables defined in the contract'),
  maps: z.array(mapSchema).describe('Maps defined in the contract'),
  readOnlyFunctions: z
    .array(
      functionSchema.extend({
        access: z.literal('read-only'),
      })
    )
    .describe('Read-only functions in the contract'),
  publicFunctions: z
    .array(
      functionSchema.extend({
        access: z.literal('public'),
      })
    )
    .describe('Public functions in the contract'),
  arcanaRecommendation: arcanaRecommendationSchema.describe(
    'Recommended Arcana metrics'
  ),
});

export const contractAuditSchema = z.object({
  contractId: z
    .string()
    .regex(/^[A-Z0-9]+\.[A-Za-z0-9-_]+$/)
    .describe('Contract identifier'),
  deploymentInfo: z.object({
    blockHeight: z.number(),
    txId: z.string(),
    clarityVersion: z.number().nullable(),
  }),
  ...auditResponseSchema.shape,
});

// Type inference
export type ArcanaRecommendation = z.infer<typeof arcanaRecommendationSchema>;
export type FungibleToken = z.infer<typeof fungibleTokenSchema>;
export type ContractVariable = z.infer<typeof variableSchema>;
export type ContractMap = z.infer<typeof mapSchema>;
export type AuditResponse = z.infer<typeof auditResponseSchema>;
export type ContractAudit = z.infer<typeof contractAuditSchema>;
export type FunctionParameter = z.infer<typeof functionParameterSchema>;
export type FunctionResponse = z.infer<typeof functionResponseSchema>;
export type ContractFunction = z.infer<typeof functionSchema>;

// Validation helpers
export function validateAuditResponse(data: unknown): AuditResponse {
  return auditResponseSchema.parse(data);
}

export function validateContractAudit(data: unknown): ContractAudit {
  return contractAuditSchema.parse(data);
}

export function safeValidateAuditResponse(data: unknown) {
  return auditResponseSchema.safeParse(data);
}

export function safeValidateContractAudit(data: unknown) {
  return contractAuditSchema.safeParse(data);
}

// Export everything for use in other files
export const schemas = {
  fungibleToken: fungibleTokenSchema,
  variable: variableSchema,
  map: mapSchema,
  arcanaRecommendation: arcanaRecommendationSchema,
  auditResponse: auditResponseSchema,
  contractAudit: contractAuditSchema,
  function: functionSchema,
  functionParameter: functionParameterSchema,
  functionResponse: functionResponseSchema,
};
