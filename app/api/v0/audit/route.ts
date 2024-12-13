import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';

import { auditToken } from '@/services/defi/asset-identifier';

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

export async function POST(req: NextRequest) {
  try {
    // Validate content type
    console.log('executing audit tool from api');
    const contentType = req.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return errorResponse('Content-Type must be application/json', 415);
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return errorResponse('Invalid JSON payload', 400);
    }

    // Validate required fields
    if (!body.contractId) {
      return errorResponse('contractId is required', 400);
    }

    // Execute contract audit tool operation
    const result = await auditToken(body.contractId);
    await kv.set(`contract-audit:${body.contractId}`, {
      ...result,
      timestamp: Date.now(),
    });

    // Return response with appropriate status
    return NextResponse.json(result, {
      status: 200,
    });
  } catch (error) {
    console.error('Contract Audit API Error:', error);
    return errorResponse('Internal server error', 500);
  }
}
