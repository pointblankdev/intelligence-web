import { NextRequest, NextResponse } from 'next/server';

import { dexTool } from '@/tools/defi/univ2-dex';

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    body.dex = 'VELAR';

    // Execute using the existing tool
    const result = await dexTool.execute!(body, {});

    // Return response with appropriate status
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('DEX API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
