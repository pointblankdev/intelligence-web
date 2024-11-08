import { NextRequest, NextResponse } from 'next/server';

import { sip10Tool } from '@/tools/sips/sip10';

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

    // Execute SIP010 tool operation
    const result = await sip10Tool.execute!(body, {});
    console.log(result);

    // Return response with appropriate status
    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    console.error('SIP010 API Error:', error);

    return errorResponse('Internal server error', 500);
  }
}
