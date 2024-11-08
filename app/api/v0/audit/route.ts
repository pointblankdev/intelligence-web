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

    body.forceRefresh = false; // Default to false

    // Execute contract audit tool operation
    const result = await contractAuditTool.execute!(body, {});

    // Set cache duration based on forceRefresh parameter
    const cacheDuration = body.forceRefresh ? 60 : 3600; // 1 minute vs 1 hour

    // Return response with appropriate status
    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
      headers: {
        'Cache-Control': result.success
          ? `public, max-age=${cacheDuration}, stale-while-revalidate=${cacheDuration * 2}` // Cache successful responses
          : 'no-store', // Don't cache errors
      },
    });
  } catch (error) {
    console.error('Contract Audit API Error:', error);
    return errorResponse('Internal server error', 500);
  }
}

// Optional: Add HEAD method for health checks
export async function HEAD() {
  return new Response(null, { status: 200 });
}

// Configure route options
export const dynamic = 'force-dynamic'; // Ensure route isn't statically optimized
export const runtime = 'nodejs'; // Use Node.js runtime for better stability with Vercel KV

// Cache revalidation config
export const revalidate = 3600; // Revalidate cache every hour

// CORS configuration if needed
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Add OPTIONS method for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}