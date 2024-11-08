import { NextRequest, NextResponse } from 'next/server';

import { contractAuditTool } from '@/tools/code-audit/smart-contract';

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

    body.forceRefresh = true; // Default to false

    // Execute contract audit tool operation
    const result = await contractAuditTool.execute!(body, {});

    // Set cache duration based on forceRefresh parameter
    const cacheDuration = body.forceRefresh ? 60 : 3600; // 1 minute vs 1 hour

    // Return response with appropriate status
    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    console.error('Contract Audit API Error:', error);
    return errorResponse('Internal server error', 500);
  }
}
