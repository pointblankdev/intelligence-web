import { streamText } from 'ai';
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
    const { fullStream } = await streamText({
      model: customModel('claude-3-5-sonnet-20241022'),
      system: `You are an expert Stacks blockchain analyst. You will examine recent transactions to identify new token contracts and smart contracts that should be added to the registry.
               You will use the provided tools to investigate contracts and register them if they are valid token or important smart contracts.`,
      messages: [
        {
          role: 'user',
          content: `Analyze 5 recent transactions to find new contracts. 
          For one potential contract:
          1. Check if it exists in the registry using Token-Registry tool
          2. If not found, get the contract info using Stacks-API-Contract tool
          3. Verify if it's a valid token using SIP010-Token tool
          4. Register valid tokens using Token-Registry tool with all available metadata
          
          Look for:
          - New token deployments
          - LP token deployments
          - Important protocol contracts
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

    let discoveryResult = '';
    // Process the streaming response
    for await (const delta of fullStream) {
      if (delta.type === 'text-delta') {
        discoveryResult += delta.textDelta;
        console.log(delta.textDelta);
      }
    }

    // Parse and validate the final result
    try {
      const result = JSON.parse(discoveryResult);
      if (!result.discovered || !Array.isArray(result.discovered)) {
        throw new Error('Invalid discovery result format');
      }

      // Return discovery results and registered contracts
      return NextResponse.json({
        success: true,
        data: {
          discovered: result.discovered,
        },
      });
    } catch (error) {
      console.error('Discovery result parse error:', error);
      return errorResponse('Failed to parse discovery results', 500);
    }
  } catch (error) {
    console.error('Token discovery error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500
    );
  }
}
