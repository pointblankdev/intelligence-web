import cx from 'classnames';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Search,
  ArrowUpDown,
  RefreshCcw,
  Droplets,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Info,
  DollarSign,
  ArrowDownUp,
  Database,
  Coins,
} from 'lucide-react';
import { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BetterTooltip } from '@/components/ui/tooltip';

// Helper components
const Skeleton = ({ className }: { className?: string }) => (
  <div
    className={cx(
      'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700',
      'bg-[length:200%_100%] rounded',
      className
    )}
  />
);

// Interfaces
interface TokenInfo {
  contractAddress: string;
  lastUpdated: string;
  name: string | { type: string; value: string };
  symbol: string | { type: string; value: string };
  decimals: number | { type: string; value: string };
  totalSupply: number | { type: string; value: string };
  tokenUri: string | { type: string; value: { type: string; value: string } };
}

interface Pool {
  poolId: number;
  lpToken: string;
  reserve0: string;
  reserve1: string;
  reserve0ConvertUsd: string;
  reserve1ConvertUsd: string;
  token0Price: string;
  token1Price: string;
  symbol: string;
  token0: string;
  token1: string;
  source: string;
  lastUpdated: string;
  token0Info: TokenInfo;
  token1Info: TokenInfo;
}

interface Price {
  token: string;
  price: number;
  lastUpdated: string;
}

interface DashboardProps {
  response?: {
    success: boolean;
    data?: {
      pools?: Pool[];
      prices?: Record<string, number | string>;
      price?: number | string;
      error?: {
        code: string;
        message: string;
      };
    };
    timestamp?: string;
  };
  onRefresh?: () => void;
}

export function DefiDashboard({ response, onRefresh }: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'symbol' | 'value'>('value');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [priceHistory, setPriceHistory] = useState<Record<string, number[]>>(
    {}
  );

  const getSymbolFromTokenInfo = (info: TokenInfo) => {
    return typeof info.symbol === 'string' ? info.symbol : info.symbol.value;
  };

  // Normalization functions
  const normalizePoolData = (pools: Pool[]) => {
    return pools.map((pool) => ({
      ...pool,
      totalValue:
        parseFloat(pool.reserve0ConvertUsd) +
        parseFloat(pool.reserve1ConvertUsd),
      token0Symbol: getSymbolFromTokenInfo(pool.token0Info),
      token1Symbol: getSymbolFromTokenInfo(pool.token1Info),
    }));
  };

  const normalizePriceData = (prices: Record<string, number | string>) => {
    return Object.entries(prices).map(([token, price]) => ({
      token,
      price: typeof price === 'string' ? parseFloat(price) : price,
      lastUpdated: response?.timestamp || new Date().toISOString(),
    }));
  };

  // Loading state
  if (!response) {
    return (
      <motion.div
        className="flex flex-col gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </motion.div>
    );
  }

  // Error state
  if (!response.success || response.data?.error) {
    return (
      <div className="rounded-xl p-6 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300">
        <div className="flex items-center gap-2">
          <AlertCircle className="size-5" />
          <span>
            Error: {response.data?.error?.message || 'Failed to fetch data'}
          </span>
        </div>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const getSourceColor = (source: string): string => {
    const colors: { [key: string]: string } = {
      charisma: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      velar: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    };
    return (
      colors[source.toLowerCase()] ||
      'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    );
  };

  const isStale = (lastUpdated: string) => {
    return (
      new Date().getTime() - new Date(lastUpdated).getTime() > 5 * 60 * 1000
    );
  };

  // Determine data type and render appropriate view
  const renderContent = () => {
    if (response.data?.pools) {
      const normalizedPools = normalizePoolData(response.data.pools);
      const totalLiquidity = normalizedPools.reduce(
        (acc, pool) => acc + pool.totalValue,
        0
      );
      const uniqueSources = [
        ...new Set(normalizedPools.map((pool) => pool.source)),
      ];

      const filteredPools = normalizedPools
        .filter(
          (pool) =>
            pool.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
            pool.token0Symbol
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            pool.token1Symbol.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
          const modifier = sortDirection === 'asc' ? 1 : -1;
          if (sortField === 'symbol') {
            return a.symbol.localeCompare(b.symbol) * modifier;
          }
          return (a.totalValue - b.totalValue) * modifier;
        });

      return (
        <>
          {/* Header Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Total Liquidity
                  </div>
                  <div className="text-2xl font-bold">
                    ${formatNumber(totalLiquidity)}
                  </div>
                </div>
                <DollarSign className="size-8 text-green-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Active Pools
                  </div>
                  <div className="text-2xl font-bold">
                    {filteredPools.length}
                  </div>
                </div>
                <Database className="size-8 text-blue-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Sources
                  </div>
                  <div className="flex gap-2">
                    {uniqueSources.map((source) => (
                      <Badge
                        key={source}
                        variant="secondary"
                        className={getSourceColor(source)}
                      >
                        {source}
                      </Badge>
                    ))}
                  </div>
                </div>
                <BarChart3 className="size-8 text-yellow-500" />
              </div>
            </Card>
          </div>

          {/* Pool Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredPools.map((pool) => (
              <Card key={pool.lpToken} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium">{pool.symbol}</h3>
                      <Badge className={getSourceColor(pool.source)}>
                        {pool.source}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Coins className="size-4 text-blue-500" />
                      <span className="text-xl font-bold">
                        ${formatNumber(pool.totalValue)}
                      </span>
                    </div>
                  </div>
                  {isStale(pool.lastUpdated) && (
                    <BetterTooltip content="Data may be stale">
                      <Clock className="size-5 text-yellow-500" />
                    </BetterTooltip>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div>{pool.token0Symbol}</div>
                      <ArrowDownUp className="size-3 text-gray-500" />
                      <div>{pool.token1Symbol}</div>
                    </div>
                    <div className="text-right text-gray-600 dark:text-gray-400">
                      <div>
                        Reserve 0: $
                        {formatNumber(parseFloat(pool.reserve0ConvertUsd))}
                      </div>
                      <div>
                        Reserve 1: $
                        {formatNumber(parseFloat(pool.reserve1ConvertUsd))}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      );
    }

    if (response.data?.prices || response.data?.price) {
      const prices =
        response.data.prices ||
        (response.data.price ? { ['unknown']: response.data.price } : {});
      const normalizedPrices = normalizePriceData(prices);

      const filteredPrices = normalizedPrices
        .filter((price) =>
          price.token.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
          const modifier = sortDirection === 'asc' ? 1 : -1;
          if (sortField === 'symbol') {
            return a.token.localeCompare(b.token) * modifier;
          }
          return (a.price - b.price) * modifier;
        });

      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredPrices.map((price) => (
            <Card key={price.token} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium">
                    {price.token.split('.').pop()}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <DollarSign className="size-4 text-green-500" />
                    <span className="text-xl font-bold">
                      ${price.price.toFixed(6)}
                    </span>
                  </div>
                </div>
                {isStale(price.lastUpdated) && (
                  <BetterTooltip content="Data may be stale">
                    <Clock className="size-5 text-yellow-500" />
                  </BetterTooltip>
                )}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Last Updated: {new Date(price.lastUpdated).toLocaleString()}
              </div>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <div className="rounded-xl p-6 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300">
        <div className="flex items-center gap-2">
          <Info className="size-5" />
          <span>No data available</span>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <button
          onClick={() => {
            setSortField(sortField === 'symbol' ? 'value' : 'symbol');
            setSortDirection('asc');
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/20 
                     text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/40"
        >
          <ArrowUpDown className="size-4" />
          Sort by {sortField === 'symbol' ? 'Value' : 'Symbol'}
        </button>
        <button
          onClick={() =>
            setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')
          }
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-100 dark:bg-purple-900/20 
                     text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/40"
        >
          <ArrowUpDown className="size-4" />
          {sortDirection === 'desc' ? 'Descending' : 'Ascending'}
        </button>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/20 
                       text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/40"
          >
            <RefreshCcw className="size-4" />
            Refresh
          </button>
        )}
      </div>

      {/* Main Content */}
      {renderContent()}
    </motion.div>
  );
}

export default DefiDashboard;
