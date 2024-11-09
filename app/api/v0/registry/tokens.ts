import { NextRequest, NextResponse } from 'next/server';

import { tokenRegistryTool } from '@/tools/sips/token-registry';

// Error response helper
const errorResponse = (message: string, status: number = 400) => {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
};

// Validate allowed operations
const LIST_OPERATIONS = [
  'getTokenInfo',
  'resolveSymbol',
  'getLpTokens',
  'listAll',
  'listSymbols',
  'listMetadata',
  'listLpTokens',
  'listAudits',
  'listPools',
  'listPrices',
] as const;

type ListOperation = (typeof LIST_OPERATIONS)[number];

// Type guard for operations
const isListOperation = (operation: string): operation is ListOperation => {
  return LIST_OPERATIONS.includes(operation as ListOperation);
};

// Required parameters for each operation
const REQUIRED_PARAMS: Record<ListOperation, string[]> = {
  getTokenInfo: ['contractId'],
  resolveSymbol: ['symbol'],
  getLpTokens: ['contractId'],
  listAll: [],
  listSymbols: [],
  listMetadata: [],
  listLpTokens: [],
  listAudits: [],
  listPools: [],
  listPrices: [],
};

export async function POST(req: NextRequest) {
  try {
    // Validate content type
    const contentType = req.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return errorResponse('Content-Type must be application/json', 415);
    }

    // Parse request body
    let body: { operation: ListOperation; [key: string]: any };
    try {
      body = await req.json();
    } catch (e) {
      return errorResponse('Invalid JSON payload', 400);
    }

    // Validate operation
    if (!body.operation) {
      return errorResponse('operation is required', 400);
    }

    if (!isListOperation(body.operation)) {
      return errorResponse(
        `Invalid operation. Must be one of: ${LIST_OPERATIONS.join(', ')}`,
        400
      );
    }

    // Validate required parameters for the operation
    const requiredParams = REQUIRED_PARAMS[body.operation];
    for (const param of requiredParams) {
      if (!body[param]) {
        return errorResponse(`${param} is required for ${body.operation}`, 400);
      }
    }

    // Ensure 'force' property is present
    body.force = body.force ?? false;

    // Ensure 'operation' property is present
    const requestBody = {
      ...body,
      force: body.force,
    };

    // Execute token registry operation
    const result = await tokenRegistryTool.execute!(requestBody, {});

    // Return response with appropriate status
    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    console.error('Token Registry API Error:', error);
    return errorResponse('Internal server error', 500);
  }
}
