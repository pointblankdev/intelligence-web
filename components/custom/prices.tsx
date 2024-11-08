import cx from 'classnames';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  RefreshCcw,
  Search,
  DollarSign,
  ArrowUpDown,
  Clock,
} from 'lucide-react';
import { useState, useEffect } from 'react';

import { Input } from '@/components/ui/input';

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

interface PriceData {
  symbol: string;
  price: number;
  isStale?: boolean;
  previousPrice?: number;
}

interface PricesResultProps {
  response?: {
    success: boolean;
    data?: {
      prices?: Record<string, number>;
      price?: number;
      isStale?: boolean;
    };
    error?: {
      code: string;
      message: string;
    };
  };
  onRefresh?: () => void;
}

export function PricesResult({ response, onRefresh }: PricesResultProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'symbol' | 'price'>('symbol');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [priceHistory, setPriceHistory] = useState<Record<string, number[]>>(
    {}
  );

  // Track price changes
  useEffect(() => {
    if (response?.success && response.data?.prices) {
      setPriceHistory((prev) => {
        const newHistory = { ...prev };
        Object.entries(response?.data?.prices!).forEach(([symbol, price]) => {
          newHistory[symbol] = [
            price,
            ...(prev[symbol] || []).slice(0, 9), // Keep last 10 prices
          ];
        });
        return newHistory;
      });
    }
  }, [response?.data?.prices]);

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

  if (!response.success) {
    return (
      <div className="rounded-xl p-6 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300">
        <div className="flex items-center gap-2">
          <AlertCircle className="size-5" />
          <span>
            Error: {response.error?.message || 'Failed to fetch prices'}
          </span>
        </div>
      </div>
    );
  }

  const prices = response.data?.prices || {};

  // Format price data
  let priceData: PriceData[] = Object.entries(prices).map(
    ([symbol, price]) => ({
      symbol,
      price,
      isStale: response.data?.isStale,
      previousPrice: priceHistory[symbol]?.[1],
    })
  );

  // Apply search filter
  if (searchTerm) {
    priceData = priceData.filter((item) =>
      item.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Apply sorting
  priceData.sort((a, b) => {
    const modifier = sortDirection === 'asc' ? 1 : -1;
    if (sortBy === 'symbol') {
      return a.symbol.localeCompare(b.symbol) * modifier;
    }
    return (a.price - b.price) * modifier;
  });

  return (
    <motion.div
      className="flex flex-col gap-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Search tokens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <button
          onClick={() => {
            setSortBy(sortBy === 'symbol' ? 'price' : 'symbol');
            setSortDirection('asc');
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-100 dark:bg-purple-900/20
                     text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/40"
        >
          <ArrowUpDown className="size-4" />
          Sort by {sortBy === 'symbol' ? 'Price' : 'Symbol'}
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

      {/* Price Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {priceData.map(({ symbol, price, isStale, previousPrice }) => {
          const priceChange = previousPrice ? price - previousPrice : 0;
          const priceChangePercent = previousPrice
            ? (priceChange / previousPrice) * 100
            : 0;

          return (
            <motion.div
              key={symbol}
              className={cx(
                'p-4 rounded-xl bg-white dark:bg-gray-800 border shadow-sm',
                isStale
                  ? 'border-yellow-200 dark:border-yellow-800'
                  : 'border-purple-200 dark:border-purple-800'
              )}
              layout
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {symbol}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <DollarSign className="size-4 text-gray-500" />
                    <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {price?.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6,
                      })}
                    </span>
                  </div>
                </div>
                {priceChange !== 0 && (
                  <div
                    className={cx(
                      'flex items-center gap-1 px-2 py-1 rounded-lg text-sm',
                      priceChange > 0
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                    )}
                  >
                    {priceChange > 0 ? (
                      <TrendingUp className="size-4" />
                    ) : (
                      <TrendingDown className="size-4" />
                    )}
                    <span>{Math.abs(priceChangePercent).toFixed(2)}%</span>
                  </div>
                )}
              </div>

              {isStale && (
                <div className="flex items-center gap-2 mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                  <Clock className="size-4" />
                  <span>Price may be stale</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

export default PricesResult;
