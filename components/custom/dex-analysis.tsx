import cx from 'classnames';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Droplet,
  ArrowRightLeft,
  Wallet,
  BarChart3,
  Percent,
  Scale,
  Coins,
} from 'lucide-react';

// Types for DEX data
export interface PoolData {
  id: string;
  token0: string;
  token1: string;
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  swapFee: {
    numerator: number;
    denominator: number;
  };
}

export interface SwapQuoteData {
  path: string[];
  amountIn: string;
  amountOut: string;
  priceImpact: number;
}

export interface LiquidityData {
  poolId: string;
  token0Amount: string;
  token1Amount: string;
  liquidityTokens: string;
  shareOfPool: number;
  priceImpact?: number;
}

export interface RemovalQuoteData {
  token0Amount: string;
  token1Amount: string;
  shareOfPool: number;
  percentage?: number;
}

export interface DexToolResponse {
  success: boolean;
  data?: {
    numberOfPools?: number;
    pool?: PoolData;
    pools?: PoolData[];
    swapQuote?: SwapQuoteData;
    swapQuotes?: SwapQuoteData[];
    liquidityQuote?: LiquidityData;
    liquidityQuotes?: LiquidityData[];
    removalQuote?: RemovalQuoteData;
    removalQuotes?: RemovalQuoteData[];
  };
  error?: string;
}

// Skeleton component for loading states
const Skeleton = ({ className }: { className?: string }) => (
  <div
    className={cx(
      'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700',
      'bg-[length:200%_100%] rounded',
      className
    )}
  />
);

// Helper function to format large numbers
const formatAmount = (amount: string) => {
  const num = parseFloat(amount);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  return num.toFixed(2);
};

// Pool Card and Skeleton
const PoolCardSkeleton = () => (
  <div
    className={cx(
      'rounded-2xl p-4 bg-gradient-to-br from-blue-500/5 to-indigo-500/5',
      'dark:from-blue-500/10 dark:to-indigo-500/10',
      'border border-blue-100/50 dark:border-blue-900/50'
    )}
  >
    <div className="flex justify-between items-start mb-3">
      <div className="flex items-center gap-2">
        <Skeleton className="w-9 h-9 rounded-lg" />
        <div>
          <Skeleton className="w-24 h-5 mb-1" />
          <Skeleton className="w-16 h-4" />
        </div>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-2">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="p-2 rounded-lg bg-blue-500/5 dark:bg-blue-500/10"
        >
          <Skeleton className="w-16 h-4 mb-1" />
          <Skeleton className="w-32 h-5 mb-1" />
          <Skeleton className="w-20 h-4" />
        </div>
      ))}
    </div>
  </div>
);

// Pool Information Card
const PoolCard = ({ pool }: { pool?: PoolData }) => {
  if (!pool) return <PoolCardSkeleton />;
  return (
    <div
      className={cx(
        'rounded-2xl p-4 bg-gradient-to-br from-blue-500/10 to-indigo-500/10',
        'dark:from-blue-500/20 dark:to-indigo-500/20',
        'border border-blue-100 dark:border-blue-900'
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-500/10 dark:bg-blue-500/20">
            <Droplet className="size-5 text-blue-700 dark:text-blue-300" />
          </div>
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-100">
              Pool #{pool.id}
            </h3>
            <p className="text-xs text-blue-700/70 dark:text-blue-300/70">
              Fee: {pool.swapFee.numerator} / {pool.swapFee.denominator}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Coins className="size-4 text-blue-600 dark:text-blue-400" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="p-2 rounded-lg bg-blue-500/5 dark:bg-blue-500/10">
          <p className="text-xs text-blue-700/70 dark:text-blue-300/70">
            Token 0
          </p>
          <p className="font-mono text-blue-900 dark:text-blue-100 truncate">
            {pool.token0.split('.')[1]}
          </p>
          <p className="text-xs mt-1 font-medium text-blue-700 dark:text-blue-300">
            Reserve: {formatAmount(pool.reserve0)}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-blue-500/5 dark:bg-blue-500/10">
          <p className="text-xs text-blue-700/70 dark:text-blue-300/70">
            Token 1
          </p>
          <p className="font-mono text-blue-900 dark:text-blue-100 truncate">
            {pool.token1.split('.')[1]}
          </p>
          <p className="text-xs mt-1 font-medium text-blue-700 dark:text-blue-300">
            Reserve: {formatAmount(pool.reserve1)}
          </p>
        </div>
      </div>
    </div>
  );
};

// Swap Quote Card and Skeleton
const SwapQuoteCardSkeleton = () => (
  <div
    className={cx(
      'rounded-2xl p-4 bg-gradient-to-br from-green-500/5 to-emerald-500/5',
      'dark:from-green-500/10 dark:to-emerald-500/10',
      'border border-green-100/50 dark:border-green-900/50'
    )}
  >
    <div className="flex justify-between items-start mb-3">
      <div className="flex items-center gap-2">
        <Skeleton className="w-9 h-9 rounded-lg" />
        <div>
          <Skeleton className="w-24 h-5 mb-1" />
          <Skeleton className="w-16 h-4" />
        </div>
      </div>
      <Skeleton className="w-20 h-6 rounded-full" />
    </div>

    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="p-2 rounded-lg bg-green-500/5 dark:bg-green-500/10"
        >
          <Skeleton className="w-16 h-4 mb-1" />
          <Skeleton className="w-28 h-5" />
        </div>
      ))}
    </div>
  </div>
);

const SwapQuoteCard = ({ quote }: { quote?: SwapQuoteData }) => {
  if (!quote) return <SwapQuoteCardSkeleton />;

  return (
    <div
      className={cx(
        'rounded-2xl p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10',
        'dark:from-green-500/20 dark:to-emerald-500/20',
        'border border-green-100 dark:border-green-900'
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-green-500/10 dark:bg-green-500/20">
            <ArrowRightLeft className="size-5 text-green-700 dark:text-green-300" />
          </div>
          <div>
            <h3 className="font-medium text-green-900 dark:text-green-100">
              Swap Quote
            </h3>
            <p className="text-xs text-green-700/70 dark:text-green-300/70">
              {quote.path.length} Hop{quote.path.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Percent className="size-4 text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-700 dark:text-green-300">
            {quote.priceImpact.toFixed(2)}% Impact
          </span>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="p-2 rounded-lg bg-green-500/5 dark:bg-green-500/10">
          <p className="text-xs text-green-700/70 dark:text-green-300/70">
            Amount In
          </p>
          <p className="font-medium text-green-900 dark:text-green-100">
            {formatAmount(quote.amountIn)}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-green-500/5 dark:bg-green-500/10">
          <p className="text-xs text-green-700/70 dark:text-green-300/70">
            Amount Out
          </p>
          <p className="font-medium text-green-900 dark:text-green-100">
            {formatAmount(quote.amountOut)}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-green-500/5 dark:bg-green-500/10">
          <p className="text-xs text-green-700/70 dark:text-green-300/70">
            Route
          </p>
          <p className="font-mono text-xs text-green-900 dark:text-green-100">
            {quote.path.join(' → ')}
          </p>
        </div>
      </div>
    </div>
  );
};

// Liquidity Quote Card and Skeleton
const LiquidityQuoteCardSkeleton = () => (
  <div
    className={cx(
      'rounded-2xl p-4 bg-gradient-to-br from-purple-500/5 to-pink-500/5',
      'dark:from-purple-500/10 dark:to-pink-500/10',
      'border border-purple-100/50 dark:border-purple-900/50'
    )}
  >
    <div className="flex justify-between items-start mb-3">
      <div className="flex items-center gap-2">
        <Skeleton className="w-9 h-9 rounded-lg" />
        <div>
          <Skeleton className="w-24 h-5 mb-1" />
          <Skeleton className="w-16 h-4" />
        </div>
      </div>
      <Skeleton className="w-24 h-6 rounded-full" />
    </div>

    <div className="grid grid-cols-2 gap-2 mb-2">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="p-2 rounded-lg bg-purple-500/5 dark:bg-purple-500/10"
        >
          <Skeleton className="w-16 h-4 mb-1" />
          <Skeleton className="w-24 h-5" />
        </div>
      ))}
    </div>

    <div className="p-2 rounded-lg bg-purple-500/5 dark:bg-purple-500/10">
      <Skeleton className="w-16 h-4 mb-1" />
      <Skeleton className="w-32 h-5" />
    </div>
  </div>
);

const LiquidityQuoteCard = ({ quote }: { quote?: LiquidityData }) => {
  if (!quote) return <LiquidityQuoteCardSkeleton />;

  return (
    <div
      className={cx(
        'rounded-2xl p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10',
        'dark:from-purple-500/20 dark:to-pink-500/20',
        'border border-purple-100 dark:border-purple-900'
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-purple-500/10 dark:bg-purple-500/20">
            <Scale className="size-5 text-purple-700 dark:text-purple-300" />
          </div>
          <div>
            <h3 className="font-medium text-purple-900 dark:text-purple-100">
              Liquidity Quote
            </h3>
            <p className="text-xs text-purple-700/70 dark:text-purple-300/70">
              Pool #{quote.poolId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <BarChart3 className="size-4 text-purple-600 dark:text-purple-400" />
          <span className="text-sm text-purple-700 dark:text-purple-300">
            {quote.shareOfPool.toFixed(2)}% Share
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="p-2 rounded-lg bg-purple-500/5 dark:bg-purple-500/10">
          <p className="text-xs text-purple-700/70 dark:text-purple-300/70">
            Token 0
          </p>
          <p className="font-medium text-purple-900 dark:text-purple-100">
            {formatAmount(quote.token0Amount)}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-purple-500/5 dark:bg-purple-500/10">
          <p className="text-xs text-purple-700/70 dark:text-purple-300/70">
            Token 1
          </p>
          <p className="font-medium text-purple-900 dark:text-purple-100">
            {formatAmount(quote.token1Amount)}
          </p>
        </div>
      </div>

      <div className="mt-2 p-2 rounded-lg bg-purple-500/5 dark:bg-purple-500/10">
        <p className="text-xs text-purple-700/70 dark:text-purple-300/70">
          LP Tokens
        </p>
        <p className="font-medium text-purple-900 dark:text-purple-100">
          {formatAmount(quote.liquidityTokens)}
        </p>
      </div>
    </div>
  );
};

// Removal Quote Card and Skeleton
const RemovalQuoteCardSkeleton = () => (
  <div
    className={cx(
      'rounded-2xl p-4 bg-gradient-to-br from-amber-500/5 to-orange-500/5',
      'dark:from-amber-500/10 dark:to-orange-500/10',
      'border border-amber-100/50 dark:border-amber-900/50'
    )}
  >
    <div className="flex justify-between items-start mb-3">
      <div className="flex items-center gap-2">
        <Skeleton className="w-9 h-9 rounded-lg" />
        <div>
          <Skeleton className="w-24 h-5 mb-1" />
          <Skeleton className="w-16 h-4" />
        </div>
      </div>
      <Skeleton className="w-20 h-6 rounded-full" />
    </div>

    <div className="grid grid-cols-2 gap-2">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="p-2 rounded-lg bg-amber-500/5 dark:bg-amber-500/10"
        >
          <Skeleton className="w-16 h-4 mb-1" />
          <Skeleton className="w-24 h-5" />
        </div>
      ))}
    </div>
  </div>
);

const RemovalQuoteCard = ({ quote }: { quote?: RemovalQuoteData }) => {
  if (!quote) return <RemovalQuoteCardSkeleton />;

  return (
    <div
      className={cx(
        'rounded-2xl p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10',
        'dark:from-amber-500/20 dark:to-orange-500/20',
        'border border-amber-100 dark:border-amber-900'
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-500/10 dark:bg-amber-500/20">
            <Wallet className="size-5 text-amber-700 dark:text-amber-300" />
          </div>
          <div>
            <h3 className="font-medium text-amber-900 dark:text-amber-100">
              Removal Quote
            </h3>
            <p className="text-xs text-amber-700/70 dark:text-amber-300/70">
              {quote.shareOfPool.toFixed(2)}% of Pool
            </p>
          </div>
        </div>
        {quote.percentage && (
          <div className="flex items-center gap-1">
            <Percent className="size-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm text-amber-700 dark:text-amber-300">
              {quote.percentage}% Removal
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="p-2 rounded-lg bg-amber-500/5 dark:bg-amber-500/10">
          <p className="text-xs text-amber-700/70 dark:text-amber-300/70">
            Token 0
          </p>
          <p className="font-medium text-amber-900 dark:text-amber-100">
            {formatAmount(quote.token0Amount)}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-amber-500/5 dark:bg-amber-500/10">
          <p className="text-xs text-amber-700/70 dark:text-amber-300/70">
            Token 1
          </p>
          <p className="font-medium text-amber-900 dark:text-amber-100">
            {formatAmount(quote.token1Amount)}
          </p>
        </div>
      </div>
    </div>
  );
};

// Main component with loading states
export function DexInfo({ response }: { response?: DexToolResponse }) {
  if (!response) {
    return (
      <motion.div
        className="flex flex-col gap-3 max-w-[500px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <PoolCardSkeleton />
        {/* <SwapQuoteCardSkeleton />
        <LiquidityQuoteCardSkeleton />
        <RemovalQuoteCardSkeleton /> */}
      </motion.div>
    );
  }
  if (!response.success || !response.data) {
    return (
      <div className="rounded-2xl p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300">
        <div className="flex items-center gap-2">
          <AlertCircle className="size-5" />
          <span>
            Error: {response.error || 'Failed to load DEX information'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col gap-3 max-w-[500px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {response.data.pool && <PoolCard pool={response.data.pool} />}
      {response.data.pools?.map((pool) => (
        <PoolCard key={pool.id} pool={pool} />
      ))}

      {response.data.swapQuote && (
        <SwapQuoteCard quote={response.data.swapQuote} />
      )}
      {response.data.swapQuotes?.map((quote, index) => (
        <SwapQuoteCard key={index} quote={quote} />
      ))}

      {response.data.liquidityQuote && (
        <LiquidityQuoteCard quote={response.data.liquidityQuote} />
      )}
      {response.data.liquidityQuotes?.map((quote, index) => (
        <LiquidityQuoteCard key={index} quote={quote} />
      ))}

      {response.data.removalQuote && (
        <RemovalQuoteCard quote={response.data.removalQuote} />
      )}
      {response.data.removalQuotes?.map((quote, index) => (
        <RemovalQuoteCard key={index} quote={quote} />
      ))}

      {response.data.numberOfPools !== undefined && (
        <div
          className={cx(
            'rounded-2xl p-4 bg-gradient-to-br from-slate-500/10 to-gray-500/10',
            'dark:from-slate-500/20 dark:to-gray-500/20',
            'border border-slate-100 dark:border-slate-900'
          )}
        >
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-slate-500/10 dark:bg-slate-500/20">
              <BarChart3 className="size-5 text-slate-700 dark:text-slate-300" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900 dark:text-slate-100">
                Total Pools
              </h3>
              <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                {response.data.numberOfPools}
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
