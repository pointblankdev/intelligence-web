import { Coins, CreditCard, Info, BarChart3, File } from 'lucide-react';
import React from 'react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';

const formatNumber = (value: string) => {
  const num = parseFloat(value);
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toFixed(2);
};

interface Sip10Response {
  success: boolean;
  data?: {
    tokenInfo?: {
      name: string;
      symbol: string;
      decimals: number;
      totalSupply: string;
    };
    tokensInfo?: Array<{
      name: string;
      symbol: string;
      decimals: number;
      totalSupply: string;
    }>;
    name?: string;
    symbol?: string;
    decimals?: number;
    totalSupply?: string;
    balance?: string;
    balances?: Record<string, string>;
    tokenUri?: string;
    metadata?: any;
  };
  error?: string;
}

interface Sip10DisplayProps {
  operation?: string;
  response?: Sip10Response;
  loading?: boolean;
}

const TokenInfoSkeleton = () => (
  <Card className="w-full max-w-md animate-pulse">
    <CardHeader className="flex flex-row items-center gap-4">
      <div className="size-8 rounded-full bg-blue-800" />
      <div className="space-y-2">
        <div className="h-6 w-32 bg-blue-800 rounded" />
        <div className="h-4 w-20 bg-blue-900 rounded" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="h-4 w-20 bg-blue-900 rounded" />
          <div className="h-8 w-24 bg-blue-800 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-16 bg-blue-900 rounded" />
          <div className="h-8 w-16 bg-blue-800 rounded" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const BalanceSkeleton = () => (
  <Card className="w-full max-w-md animate-pulse">
    <CardHeader className="flex flex-row items-center gap-4">
      <div className="size-8 rounded-full bg-green-800" />
      <div className="h-6 w-32 bg-green-800 rounded" />
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <div className="h-4 w-28 bg-green-900 rounded" />
        <div className="h-10 w-36 bg-green-800 rounded" />
      </div>
    </CardContent>
  </Card>
);

const BatchTokensSkeleton = () => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {[1, 2, 3].map((i) => (
      <Card key={i} className="animate-pulse">
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="size-8 rounded-full bg-blue-800" />
          <div className="space-y-2">
            <div className="h-6 w-28 bg-blue-800 rounded" />
            <div className="h-4 w-16 bg-blue-900 rounded" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-4 w-20 bg-blue-900 rounded" />
              <div className="h-6 w-24 bg-blue-800 rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-16 bg-blue-900 rounded" />
              <div className="h-6 w-16 bg-blue-800 rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

const BatchBalancesSkeleton = () => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {[1, 2, 3].map((i) => (
      <Card key={i} className="animate-pulse">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="size-6 rounded-full bg-green-800" />
            <div className="h-6 w-24 bg-green-800 rounded" />
          </div>
          <div className="h-3 w-48 bg-green-900 rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 w-16 bg-green-900 rounded" />
            <div className="h-8 w-28 bg-green-800 rounded" />
            <div className="h-3 w-40 bg-green-900 rounded" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

const MetadataSkeleton = () => (
  <Card className="w-full max-w-md animate-pulse">
    <CardHeader className="flex flex-row items-center gap-4">
      <div className="size-8 rounded-full bg-purple-800" />
      <div className="h-6 w-32 bg-purple-800 rounded" />
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-4 w-20 bg-purple-900 rounded" />
          <div className="h-6 w-full bg-purple-800 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-20 bg-purple-900 rounded" />
          <div className="h-32 w-full bg-purple-800 rounded" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function Sip10Display({
  operation,
  response,
  loading = false,
}: Sip10DisplayProps) {
  if (loading) {
    switch (operation) {
      case 'getTokenInfo':
      case 'getName':
      case 'getSymbol':
      case 'getDecimals':
      case 'getTotalSupply':
        return <TokenInfoSkeleton />;
      case 'getBalance':
        return <BalanceSkeleton />;
      case 'batchGetTokenInfo':
        return <BatchTokensSkeleton />;
      case 'batchGetBalances':
        return <BatchBalancesSkeleton />;
      case 'getTokenUri':
      case 'getTokenUriAndMetadata':
        return <MetadataSkeleton />;
      default:
        return <TokenInfoSkeleton />;
    }
  }

  if (!response?.success || !response?.data) {
    return <pre>{JSON.stringify(response, null, 2)}</pre>;
  }

  const { data } = response;

  switch (operation) {
    case 'getTokenInfo':
    case 'getName':
    case 'getSymbol':
    case 'getDecimals':
    case 'getTotalSupply': {
      const tokenInfo = data.tokenInfo || {
        name: data.name || '',
        symbol: data.symbol || '',
        decimals: data.decimals || 0,
        totalSupply: data.totalSupply || '0',
      };

      return (
        <Card className="w-full max-w-md bg-gradient-to-br from-blue-900 to-indigo-900">
          <CardHeader className="flex flex-row items-center gap-4">
            <Coins className="size-8 text-blue-600" />
            <div>
              <CardTitle>{tokenInfo.name || 'Token Info'}</CardTitle>
              {tokenInfo.symbol && (
                <span className="text-sm text-gray-500">
                  {tokenInfo.symbol}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-sm text-gray-500">Total Supply</span>
                <p className="text-2xl font-semibold">
                  {formatNumber(tokenInfo.totalSupply)}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-gray-500">Decimals</span>
                <p className="text-2xl font-semibold">{tokenInfo.decimals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    case 'getBalance': {
      return (
        <Card className="w-full max-w-md bg-gradient-to-br from-green-900 to-emerald-900">
          <CardHeader className="flex flex-row items-center gap-4">
            <CreditCard className="size-8 text-green-600" />
            <CardTitle>Token Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <span className="text-sm text-gray-500">Available Balance</span>
              <p className="text-3xl font-semibold">
                {formatNumber(data.balance || '0')}
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    case 'batchGetTokenInfo': {
      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.tokensInfo?.map((token, index) => (
            <Card
              key={index}
              className="bg-gradient-to-br from-blue-50 to-indigo-50"
            >
              <CardHeader className="flex flex-row items-center gap-4">
                <BarChart3 className="size-8 text-blue-600" />
                <div>
                  <CardTitle>{token.name}</CardTitle>
                  <span className="text-sm text-gray-500">{token.symbol}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-500">Total Supply</span>
                    <p className="text-xl font-semibold">
                      {formatNumber(token.totalSupply)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Decimals</span>
                    <p className="text-xl font-semibold">{token.decimals}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    case 'batchGetBalances': {
      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(data.balances || {}).map(([key, balance], index) => {
            const [contractAddress, contractName, ownerAddress] =
              key.split('.');
            return (
              <Card
                key={index}
                className="bg-gradient-to-br from-green-900 to-emerald-900"
              >
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CreditCard className="size-6 text-green-600" />
                    <CardTitle className="text-lg">{contractName}</CardTitle>
                  </div>
                  <span className="text-xs text-gray-500 truncate">
                    {contractAddress}
                  </span>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <span className="text-sm text-gray-500">Balance</span>
                    <p className="text-2xl font-semibold">
                      {formatNumber(balance)}
                    </p>
                    <span className="text-xs text-gray-500 truncate block">
                      Owner: {ownerAddress}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      );
    }

    case 'getTokenUri':
    case 'getTokenUriAndMetadata': {
      return (
        <Card className="w-full max-w-md bg-gradient-to-br from-purple-900 to-pink-900">
          <CardHeader className="flex flex-row items-center gap-4">
            <File className="size-8 text-purple-600" />
            <CardTitle>Token Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.tokenUri && (
                <div className="space-y-1">
                  <span className="text-sm text-gray-500">Token URI</span>
                  <p className="text-sm font-mono break-all">{data.tokenUri}</p>
                </div>
              )}
              {data.metadata && (
                <div className="space-y-1">
                  <span className="text-sm text-gray-500">Metadata</span>
                  <pre className="text-sm bg-black/20 p-3 rounded-lg overflow-auto max-h-64">
                    {JSON.stringify(data.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    default:
      return (
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-gray-600">
              <Info size={24} />
              <span>Unknown operation type</span>
            </div>
          </CardContent>
        </Card>
      );
  }
}
