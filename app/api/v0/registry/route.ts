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

export async function POST(req: NextRequest) {
  try {
    // Validate content type
    const contentType = req.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return errorResponse('Content-Type must be application/json', 415);
    }

    const body = await req.json();

    // Execute token registry operation
    const result = await tokenRegistryTool.execute!(body, {});

    // Return response with appropriate status
    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    console.error('Token Registry API Error:', error);
    return errorResponse('Internal server error', 500);
  }
}
