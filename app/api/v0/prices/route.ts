import { NextRequest, NextResponse } from 'next/server';

import { pricesTool } from '@/tools/defi/prices';

// Types
interface PriceRequest {
  operation: 'getPrice' | 'getPrices' | 'getAllPrices' | 'getAllPools';
  token?: string;
  tokens?: string[];
}

// Cache configuration
const CACHE_NAME = 'defi-prices-cache';
const CACHE_REVALIDATION_TIME = 30; // seconds

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

// Generate cache key based on request body
const generateCacheKey = (body: PriceRequest): string => {
  switch (body.operation) {
    case 'getPrice':
      return `price-${body.token}`;
    case 'getPrices':
      return `prices-${body.tokens?.sort().join('-')}`;
    case 'getAllPrices':
      return 'all-prices';
    case 'getAllPools':
      return 'all-pools';
    default:
      return '';
  }
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate request
    validateRequest(body);

    // Generate cache key
    const cacheKey = generateCacheKey(body);

    // Set cache control headers
    const headers = {
      'Cache-Control': `max-age=${CACHE_REVALIDATION_TIME}`,
    };

    // Try to get cached response
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(new Request(cacheKey));

    if (cachedResponse) {
      const cachedData = await cachedResponse.json();
      const cachedTime = new Date(cachedData.timestamp).getTime();
      const now = Date.now();

      // Check if cache is still valid
      if (now - cachedTime < CACHE_REVALIDATION_TIME * 1000) {
        return new NextResponse(JSON.stringify(cachedData), {
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
        });
      }
    }

    // Execute price operations
    const result = await pricesTool.execute!(body, {});

    // Add timestamp to successful responses
    if (result.success) {
      result.timestamp = new Date().toISOString();
    }

    // Create response
    const response = NextResponse.json(result, {
      status: result.success ? 200 : 400,
      headers,
    });

    // Store in cache if successful
    if (result.success) {
      await cache.put(
        new Request(cacheKey),
        new Response(JSON.stringify(result), {
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    }

    return response;
  } catch (error) {
    console.error('DeFi API Error:', error);

    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }

    return errorResponse('Internal server error', 500);
  }
}
