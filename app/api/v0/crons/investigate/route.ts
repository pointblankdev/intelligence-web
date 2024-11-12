import { streamText, generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

import { customModel } from '@/ai';
import { sip10Tool } from '@/tools/sips/sip10';
import { tokenRegistryTool } from '@/tools/sips/token-registry';
import { contractTool } from '@/tools/stacks-api/contract';
import { transactionTool } from '@/tools/stacks-api/transaction';

// Helper for error responses
const errorResponse = (message: string, status: number = 400) => {
  return NextResponse.json({ success: false, error: message }, { status });
};

export async function GET(req: NextRequest) {
  try {
    if (
      req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ success: false, error: 'Unauthorized' });
    }
    // Stream the discovery process using Claude
    const response = await generateText({
      model: customModel('claude-3-5-haiku-20241022'),
      system: `You are an expert Stacks blockchain analyst. You will examine recent transactions to identify new token contracts and smart contracts that should be added to the registry.
               You will use the provided tools to investigate contracts and register them if they are valid token or important smart contracts.`,
      messages: [
        {
          role: 'user',
          content: `Analyze 5 recent transactions to find new contracts to add to the registry. 
          Do not add contracts that are already in the registry.
          `,
        },
      ],
      maxSteps: 5,
      experimental_activeTools: [
        'Token-Registry',
        'Stacks-API-Contract',
        'Stacks-API-Transaction',
        'SIP010-Token',
      ],
      tools: {
        'Token-Registry': tokenRegistryTool,
        'Stacks-API-Contract': contractTool,
        'Stacks-API-Transaction': transactionTool,
        'SIP010-Token': sip10Tool,
      },
      maxTokens: 1000,
    });

    return NextResponse.json({
      success: true,
      data: {
        response,
      },
    });
  } catch (error) {
    console.error('Token discovery error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500
    );
  }
}
