import { NextRequest, NextResponse } from 'next/server';

import { pricesTool } from '@/tools/defi/prices';

// Types
interface PriceRequest {
  operation: 'getPrice' | 'getPrices' | 'getAllPrices' | 'getAllPools';
  token?: string;
  tokens?: string[];
}

// Error response helper
const errorResponse = (message: string, status: number = 400) => {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code: 'ERROR',
      },
    },
    { status }
  );
};

// Validation helper
const validateRequest = (body: PriceRequest) => {
  if (!body.operation) {
    throw new Error('Operation is required');
  }

  switch (body.operation) {
    case 'getPrice':
      if (!body.token) {
        throw new Error('Token identifier is required for getPrice operation');
      }
      break;
    case 'getPrices':
      if (!body.tokens?.length) {
        throw new Error(
          'Token identifiers array is required for getPrices operation'
        );
      }
      break;
    case 'getAllPrices':
    case 'getAllPools':
      // No additional validation needed
      break;
    default:
      throw new Error('Invalid operation');
  }
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate request
    validateRequest(body);

    // Execute price operations
    const result = await pricesTool.execute!(body, {});

    // Add timestamp to successful responses
    if (result.success) {
      result.timestamp = new Date().toISOString();
    }

    // Return response with appropriate status
    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    console.error('DeFi API Error:', error);

    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }

    return errorResponse('Internal server error', 500);
  }
}
