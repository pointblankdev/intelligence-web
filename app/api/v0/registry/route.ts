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
