import cx from 'classnames';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeftRight,
  ArrowDownUp,
  Coins,
  Activity,
  PlusCircle,
  MinusCircle,
  BarChart3,
  Percent,
} from 'lucide-react';

// Types for the arbitrage tool
export interface Liquidity {
  token: {
    id: string;
  };
  reserve: number;
}

export interface LiquidityPool {
  id: string;
  liquidityA: Liquidity;
  liquidityB: Liquidity;
}

export interface RateData {
  rateAB?: number;
  rateBA?: number;
  rateA?: number;
  rateB?: number;
}

export interface ArbitrageResponse {
  success: boolean;
  data?: RateData;
  error?: string;
  liquidityPools?: LiquidityPool[];
}

// Helper functions
const formatRate = (rate?: number) => {
  if (rate === undefined) return 'N/A';
  return rate.toFixed(6);
};

const formatReserve = (reserve: number) => {
  if (reserve >= 1_000_000) return `${(reserve / 1_000_000).toFixed(2)}M`;
  if (reserve >= 1_000) return `${(reserve / 1_000).toFixed(2)}K`;
  return reserve.toFixed(2);
};

// Skeleton Components
const Skeleton = ({ className }: { className?: string }) => (
  <div
    className={cx(
      'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700',
      'bg-[length:200%_100%] rounded',
      className
    )}
  />
);

// Swap Rate Card
const SwapRateCard = ({ rates }: { rates?: RateData }) => {
  if (!rates)
    return (
      <div
        className={cx(
          'rounded-2xl p-4 bg-gradient-to-br from-blue-500/5 to-purple-500/5',
          'dark:from-blue-500/10 dark:to-purple-500/10',
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
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="p-2 rounded-lg bg-blue-500/5 dark:bg-blue-500/10"
            >
              <Skeleton className="w-16 h-4 mb-1" />
              <Skeleton className="w-24 h-5" />
            </div>
          ))}
        </div>
      </div>
    );

  return (
    <div
      className={cx(
        'rounded-2xl p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10',
        'dark:from-blue-500/20 dark:to-purple-500/20',
        'border border-blue-100 dark:border-blue-900'
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-500/10 dark:bg-blue-500/20">
            <ArrowLeftRight className="size-5 text-blue-700 dark:text-blue-300" />
          </div>
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-100">
              Swap Rates
            </h3>
            <p className="text-xs text-blue-700/70 dark:text-blue-300/70">
              Both directions
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="p-2 rounded-lg bg-blue-500/5 dark:bg-blue-500/10">
          <div className="flex items-center gap-2">
            <ArrowDownUp className="size-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs text-blue-700/70 dark:text-blue-300/70">
              Forward Rate (A→B)
            </span>
          </div>
          <p className="font-mono text-blue-900 dark:text-blue-100">
            {formatRate(rates.rateAB)}
          </p>
        </div>

        <div className="p-2 rounded-lg bg-blue-500/5 dark:bg-blue-500/10">
          <div className="flex items-center gap-2">
            <ArrowDownUp className="size-4 text-blue-600 dark:text-blue-400 rotate-180" />
            <span className="text-xs text-blue-700/70 dark:text-blue-300/70">
              Reverse Rate (B→A)
            </span>
          </div>
          <p className="font-mono text-blue-900 dark:text-blue-100">
            {formatRate(rates.rateBA)}
          </p>
        </div>
      </div>
    </div>
  );
};

// Pool Rates Card
const PoolRatesCard = ({
  rates,
  type = 'mint',
}: {
  rates?: RateData;
  type?: 'mint' | 'burn';
}) => {
  if (!rates)
    return (
      <div
        className={cx(
          'rounded-2xl p-4 bg-gradient-to-br from-emerald-500/5 to-teal-500/5',
          'dark:from-emerald-500/10 dark:to-teal-500/10',
          'border border-emerald-100/50 dark:border-emerald-900/50'
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
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="p-2 rounded-lg bg-emerald-500/5 dark:bg-emerald-500/10"
            >
              <Skeleton className="w-16 h-4 mb-1" />
              <Skeleton className="w-24 h-5" />
            </div>
          ))}
        </div>
      </div>
    );

  return (
    <div
      className={cx(
        'rounded-2xl p-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/10',
        'dark:from-emerald-500/20 dark:to-teal-500/20',
        'border border-emerald-100 dark:border-emerald-900'
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20">
            {type === 'mint' ? (
              <PlusCircle className="size-5 text-emerald-700 dark:text-emerald-300" />
            ) : (
              <MinusCircle className="size-5 text-emerald-700 dark:text-emerald-300" />
            )}
          </div>
          <div>
            <h3 className="font-medium text-emerald-900 dark:text-emerald-100">
              {type === 'mint' ? 'Mint Rates' : 'Burn Rates'}
            </h3>
            <p className="text-xs text-emerald-700/70 dark:text-emerald-300/70">
              {type === 'mint' ? 'Adding Liquidity' : 'Removing Liquidity'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="p-2 rounded-lg bg-emerald-500/5 dark:bg-emerald-500/10">
          <div className="flex items-center gap-2">
            <Coins className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs text-emerald-700/70 dark:text-emerald-300/70">
              Token A Rate
            </span>
          </div>
          <p className="font-mono text-emerald-900 dark:text-emerald-100">
            {formatRate(rates.rateA)}
          </p>
        </div>

        <div className="p-2 rounded-lg bg-emerald-500/5 dark:bg-emerald-500/10">
          <div className="flex items-center gap-2">
            <Coins className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs text-emerald-700/70 dark:text-emerald-300/70">
              Token B Rate
            </span>
          </div>
          <p className="font-mono text-emerald-900 dark:text-emerald-100">
            {formatRate(rates.rateB)}
          </p>
        </div>
      </div>
    </div>
  );
};

// Pool Card
const PoolCard = ({ pool }: { pool?: LiquidityPool }) => {
  if (!pool)
    return (
      <div
        className={cx(
          'rounded-2xl p-4 bg-gradient-to-br from-violet-500/5 to-indigo-500/5',
          'dark:from-violet-500/10 dark:to-indigo-500/10',
          'border border-violet-100/50 dark:border-violet-900/50'
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
              className="p-2 rounded-lg bg-violet-500/5 dark:bg-violet-500/10"
            >
              <Skeleton className="w-16 h-4 mb-1" />
              <Skeleton className="w-32 h-5 mb-1" />
              <Skeleton className="w-20 h-4" />
            </div>
          ))}
        </div>
      </div>
    );

  return (
    <div
      className={cx(
        'rounded-2xl p-4 bg-gradient-to-br from-violet-500/10 to-indigo-500/10',
        'dark:from-violet-500/20 dark:to-indigo-500/20',
        'border border-violet-100 dark:border-violet-900'
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-violet-500/10 dark:bg-violet-500/20">
            <Activity className="size-5 text-violet-700 dark:text-violet-300" />
          </div>
          <div>
            <h3 className="font-medium text-violet-900 dark:text-violet-100">
              Pool #{pool.id}
            </h3>
            <p className="text-xs text-violet-700/70 dark:text-violet-300/70">
              Liquidity Pool
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="p-2 rounded-lg bg-violet-500/5 dark:bg-violet-500/10">
          <p className="text-xs text-violet-700/70 dark:text-violet-300/70">
            Token A
          </p>
          <p className="font-mono text-violet-900 dark:text-violet-100 truncate">
            {pool.liquidityA.token.id}
          </p>
          <p className="text-xs mt-1 font-medium text-violet-700 dark:text-violet-300">
            Reserve: {formatReserve(pool.liquidityA.reserve)}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-violet-500/5 dark:bg-violet-500/10">
          <p className="text-xs text-violet-700/70 dark:text-violet-300/70">
            Token B
          </p>
          <p className="font-mono text-violet-900 dark:text-violet-100 truncate">
            {pool.liquidityB.token.id}
          </p>
          <p className="text-xs mt-1 font-medium text-violet-700 dark:text-violet-300">
            Reserve: {formatReserve(pool.liquidityB.reserve)}
          </p>
        </div>
      </div>
    </div>
  );
};

// Main component
export function ArbitrageInfo({ response }: { response?: ArbitrageResponse }) {
  if (!response) {
    return (
      <motion.div
        className="flex flex-col gap-3 max-w-[500px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <SwapRateCard />
        <PoolRatesCard />
        <PoolCard />
      </motion.div>
    );
  }

  if (!response.success) {
    return (
      <div className="rounded-2xl p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300">
        <div className="flex items-center gap-2">
          <AlertCircle className="size-5" />
          <span>
            Error: {response.error || 'Failed to load arbitrage information'}
          </span>
        </div>
      </div>
    );
  }

  if (response.liquidityPools) {
    /* Show pool information if available */
    return (
      <div className="space-y-3">
        {response.liquidityPools?.map((pool) => (
          <PoolCard key={pool.id} pool={pool} />
        ))}
      </div>
    );
  }

  if (response.data)
    return (
      <motion.div
        className="flex flex-col gap-3 max-w-[500px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Show swap rates if they exist */}
        {(response.data.rateAB !== undefined ||
          response.data.rateBA !== undefined) && (
          <SwapRateCard rates={response.data} />
        )}

        {/* Show mint rates if they exist */}
        {(response.data.rateA !== undefined ||
          response.data.rateB !== undefined) && (
          <PoolRatesCard
            rates={response.data}
            type={response.data.rateA !== undefined ? 'mint' : 'burn'}
          />
        )}

        {/* Show when graph is initialized but no data requested yet */}
        {!response.data && !response.liquidityPools && response.success && (
          <div
            className={cx(
              'rounded-2xl p-4 bg-gradient-to-br from-gray-500/10 to-slate-500/10',
              'dark:from-gray-500/20 dark:to-slate-500/20',
              'border border-gray-100 dark:border-gray-900'
            )}
          >
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gray-500/10 dark:bg-gray-500/20">
                <BarChart3 className="size-5 text-gray-700 dark:text-gray-300" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                  Graph Initialized
                </h3>
                <p className="text-sm text-gray-700/70 dark:text-gray-300/70">
                  Ready for rate calculations
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
}

// Example usage component showing different states
export function ArbitrageExample() {
  return (
    <div className="space-y-6">
      {/* Loading state */}
      <div>
        <h2 className="text-lg font-medium mb-2">Loading State</h2>
        <ArbitrageInfo />
      </div>

      {/* Error state */}
      <div>
        <h2 className="text-lg font-medium mb-2">Error State</h2>
        <ArbitrageInfo
          response={{
            success: false,
            error: 'Failed to initialize graph',
          }}
        />
      </div>

      {/* Initialized state */}
      <div>
        <h2 className="text-lg font-medium mb-2">Initialized State</h2>
        <ArbitrageInfo
          response={{
            success: true,
          }}
        />
      </div>

      {/* Swap rates example */}
      <div>
        <h2 className="text-lg font-medium mb-2">Swap Rates</h2>
        <ArbitrageInfo
          response={{
            success: true,
            data: {
              rateAB: 1.2345,
              rateBA: 0.8123,
            },
          }}
        />
      </div>

      {/* Mint rates example */}
      <div>
        <h2 className="text-lg font-medium mb-2">Mint Rates</h2>
        <ArbitrageInfo
          response={{
            success: true,
            data: {
              rateA: 0.4567,
              rateB: 0.789,
            },
          }}
        />
      </div>

      {/* Pool information example */}
      <div>
        <h2 className="text-lg font-medium mb-2">Pool Information</h2>
        <ArbitrageInfo
          response={{
            success: true,
            liquidityPools: [
              {
                id: '1',
                liquidityA: {
                  token: { id: 'TOKEN-A' },
                  reserve: 1000000,
                },
                liquidityB: {
                  token: { id: 'TOKEN-B' },
                  reserve: 500000,
                },
              },
              {
                id: '2',
                liquidityA: {
                  token: { id: 'TOKEN-B' },
                  reserve: 750000,
                },
                liquidityB: {
                  token: { id: 'TOKEN-C' },
                  reserve: 250000,
                },
              },
            ],
          }}
        />
      </div>

      {/* Combined example */}
      <div>
        <h2 className="text-lg font-medium mb-2">Combined Information</h2>
        <ArbitrageInfo
          response={{
            success: true,
            data: {
              rateAB: 1.2345,
              rateBA: 0.8123,
              rateA: 0.4567,
              rateB: 0.789,
            },
            liquidityPools: [
              {
                id: '1',
                liquidityA: {
                  token: { id: 'TOKEN-A' },
                  reserve: 1000000,
                },
                liquidityB: {
                  token: { id: 'TOKEN-B' },
                  reserve: 500000,
                },
              },
            ],
          }}
        />
      </div>
    </div>
  );
}
