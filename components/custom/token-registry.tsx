import cx from 'classnames';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Coins,
  ChevronsUpDown,
  GitBranch,
  Shield,
  DollarSign,
  Tag,
  Check,
  Copy,
  ExternalLink,
  Info,
  Terminal,
  Link2,
  CheckCircle2,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import EnrichedTokenDisplay from './enriched-token';

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

// Copyable Text Component
const CopyableText = ({ text, label }: { text: string; label: string }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 text-sm group">
      <span className="text-purple-700 dark:text-purple-300">{label}:</span>
      <span className="text-purple-900 dark:text-purple-100 font-mono text-xs">
        {text}
      </span>
      <button
        onClick={copyToClipboard}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? (
          <Check className="size-4 text-green-500" />
        ) : (
          <Copy className="size-4 text-purple-600 dark:text-purple-400" />
        )}
      </button>
    </div>
  );
};

// Operation Result Displays
const RegisterTokenResult = ({ data }: { data: any }) => (
  <div className="rounded-xl p-6 bg-green-100 dark:bg-green-900/20">
    <div className="flex items-center gap-3">
      <div className="size-12 rounded-lg bg-green-200 dark:bg-green-800 flex items-center justify-center">
        <Coins className="size-6 text-green-700 dark:text-green-300" />
      </div>
      <div>
        <h3 className="text-lg font-medium text-green-900 dark:text-green-100">
          Token Registered Successfully
        </h3>
        <CopyableText text={data.contractId} label="Contract" />
      </div>
    </div>
  </div>
);

const RegisterSymbolResult = ({ data }: { data: any }) => (
  <div className="rounded-xl p-6 bg-purple-100 dark:bg-purple-900/20">
    <div className="flex items-center gap-3">
      <div className="size-12 rounded-lg bg-purple-200 dark:bg-purple-800 flex items-center justify-center">
        <Tag className="size-6 text-purple-700 dark:text-purple-300" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-medium text-purple-900 dark:text-purple-100">
          Symbol Registration
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-purple-700 dark:text-purple-300">
            ${data.symbol}
          </span>
          {data.registered ? (
            <CheckCircle2 className="size-4 text-green-500" />
          ) : (
            <AlertCircle className="size-4 text-yellow-500" />
          )}
        </div>
        {data.conflict && (
          <div className="text-sm text-yellow-600 dark:text-yellow-400">
            Symbol already registered. Use force=true to override.
          </div>
        )}
      </div>
    </div>
  </div>
);

const RegisterLpTokenResult = ({ data }: { data: any }) => (
  <div className="rounded-xl p-6 bg-blue-100 dark:bg-blue-900/20">
    <div className="flex items-center gap-3">
      <div className="size-12 rounded-lg bg-blue-200 dark:bg-blue-800 flex items-center justify-center">
        <Link2 className="size-6 text-blue-700 dark:text-blue-300" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100">
          LP Token Registered
        </h3>
        <div className="space-y-1">
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <span className="font-medium">DEX:</span> {data.lpInfo.dex}
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <span className="font-medium">Pool:</span> {data.lpInfo.poolId}
          </div>
          <div className="flex flex-col">
            <CopyableText text={data.lpInfo.token0} label="Token0" />
            <CopyableText text={data.lpInfo.token1} label="Token1" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ResolveSymbolResult = ({ data }: { data: any }) => (
  <div className="rounded-xl p-6 bg-indigo-100 dark:bg-indigo-900/20">
    <div className="flex items-center gap-3">
      <div className="size-12 rounded-lg bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center">
        <Tag className="size-6 text-indigo-700 dark:text-indigo-300" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-medium text-indigo-900 dark:text-indigo-100">
          Symbol Resolution
        </h3>
        <div className="text-indigo-700 dark:text-indigo-300">
          Symbol: ${data.symbol}
        </div>
        {data.contractId ? (
          <CopyableText text={data.contractId} label="Contract" />
        ) : (
          <div className="text-sm text-yellow-600 dark:text-yellow-400">
            No contract found for symbol
          </div>
        )}
      </div>
    </div>
  </div>
);

const UpdateMetadataResult = ({ data }: { data: any }) => (
  <div className="rounded-xl p-6 bg-teal-100 dark:bg-teal-900/20">
    <div className="flex items-center gap-3">
      <div className="size-12 rounded-lg bg-teal-200 dark:bg-teal-800 flex items-center justify-center min-w-12">
        <Info className="size-6 text-teal-700 dark:text-teal-300" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-teal-900 dark:text-teal-100">
          Metadata Updated
        </h3>
        <CopyableText text={data.contractId} label="Contract" />
        <div className="rounded text-sm">
          <pre className="text-xs font-mono text-wrap">
            {JSON.stringify(data.metadata, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  </div>
);

const UpdateAuditResult = ({ data }: { data: any }) => (
  <div className="rounded-xl p-6 bg-emerald-100 dark:bg-emerald-900/20">
    <div className="flex items-center gap-3">
      <div className="size-12 rounded-lg bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center">
        <Shield className="size-6 text-emerald-700 dark:text-emerald-300" />
      </div>
      <div>
        <h3 className="text-lg font-medium text-emerald-900 dark:text-emerald-100">
          Audit Updated
        </h3>
        <CopyableText text={data.contractId} label="Contract" />
      </div>
    </div>
  </div>
);

const UpdatePriceResult = ({ data }: { data: any }) => (
  <div className="rounded-xl p-6 bg-cyan-100 dark:bg-cyan-900/20">
    <div className="flex items-center gap-3">
      <div className="size-12 rounded-lg bg-cyan-200 dark:bg-cyan-800 flex items-center justify-center">
        <DollarSign className="size-6 text-cyan-700 dark:text-cyan-300" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-medium text-cyan-900 dark:text-cyan-100">
          Price Updated
        </h3>
        <div className="text-cyan-700 dark:text-cyan-300">
          <span className="font-medium">Symbol:</span> ${data.symbol}
        </div>
        <div className="text-cyan-700 dark:text-cyan-300">
          <span className="font-medium">Price:</span> $
          {data.price.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6,
          })}
        </div>
      </div>
    </div>
  </div>
);

const CleanupResult = ({ data }: { data: any }) => (
  <div className="rounded-xl p-6 bg-violet-100 dark:bg-violet-900/20">
    <div className="flex items-center gap-3">
      <div className="size-12 rounded-lg bg-violet-200 dark:bg-violet-800 flex items-center justify-center">
        <CheckCircle2 className="size-6 text-violet-700 dark:text-violet-300" />
      </div>
      <div>
        <h3 className="text-lg font-medium text-violet-900 dark:text-violet-100">
          Registry Cleanup Complete
        </h3>
        <div className="text-sm text-violet-700 dark:text-violet-300">
          Registry maintenance operations completed successfully
        </div>
      </div>
    </div>
  </div>
);

// Token Details Component
const TokenDetails = ({ token }: { token: any }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="p-6 rounded-lg bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800 shadow-sm">
      <div className="flex flex-col gap-4">
        {/* Header Section */}
        <div className="flex justify-between items-start">
          <div className="flex gap-4">
            <div className="size-24 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
              <Coins className="size-8 text-purple-500" />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-medium text-purple-900 dark:text-purple-100">
                {token.metadata?.symbol || 'Unknown Token'}
              </h3>
              {token.metadata?.name && (
                <div className="flex items-center gap-2">
                  <Tag className="size-4 text-purple-700 dark:text-purple-300" />
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    {token.metadata.name}
                  </span>
                </div>
              )}
              {token.metadata?.decimals !== undefined && (
                <div className="text-sm text-purple-600 dark:text-purple-400">
                  {token.metadata.decimals} decimals
                </div>
              )}
              {token.stats?.interactions !== undefined && (
                <div className="text-sm text-purple-600 dark:text-purple-400">
                  {token.stats.interactions.toLocaleString()} interactions
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {token.price !== undefined && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                <DollarSign className="size-4 text-purple-700 dark:text-purple-300" />
                <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                  $
                  {token?.price?.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6,
                  })}
                </span>
              </div>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-100"
            >
              <ChevronsUpDown className="size-4" />
              <span>{isExpanded ? 'Show Less' : 'Show More'}</span>
            </button>
          </div>
        </div>

        {/* Expanded Content */}
        <div className={cx('space-y-4', !isExpanded && 'hidden')}>
          {/* Contract Info */}
          <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 space-y-2">
            <CopyableText text={token.contractId} label="Contract" />
          </div>

          {/* Metadata Section */}
          {token.metadata && (
            <div className="space-y-2">
              {token.metadata.website && (
                <a
                  href={token.metadata.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:underline"
                >
                  <ExternalLink className="size-4" />
                  Website
                </a>
              )}
              {token.metadata.description && (
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  {token.metadata.description}
                </p>
              )}
            </div>
          )}

          {/* Audit Status */}
          {token.audit && (
            <div className="flex items-center gap-2 text-sm">
              <Shield
                className={cx(
                  'size-4',
                  token.audit.status === 'verified'
                    ? 'text-green-500'
                    : token.audit.status === 'pending'
                      ? 'text-yellow-500'
                      : 'text-red-500'
                )}
              />
              <span className="text-purple-700 dark:text-purple-300">
                Audit Status: {token.audit.status}
              </span>
              {token.audit.lastChecked && (
                <span className="text-purple-600 dark:text-purple-400">
                  (Last checked:{' '}
                  {new Date(token.audit.lastChecked).toLocaleDateString()})
                </span>
              )}
            </div>
          )}

          {/* LP Info */}
          {token.lpInfo && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <GitBranch className="size-4 text-purple-700 dark:text-purple-300" />
                <span className="text-purple-900 dark:text-purple-100">
                  LP Pool
                </span>
              </div>
              <div className="pl-6 text-sm space-y-1">
                <div className="text-purple-700 dark:text-purple-300">
                  <span className="font-medium">DEX:</span> {token.lpInfo.dex}
                </div>
                <CopyableText text={token.lpInfo.poolId} label="Pool" />
                <CopyableText text={token.lpInfo.token0} label="Token0" />
                <CopyableText text={token.lpInfo.token1} label="Token1" />
              </div>
            </div>
          )}

          {/* Pools */}
          {token.pools?.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <GitBranch className="size-4 text-purple-700 dark:text-purple-300" />
                <span className="text-purple-900 dark:text-purple-100">
                  Pool Relationships
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pl-6">
                {token.pools.map((pool: string, index: number) => (
                  <div
                    key={index}
                    className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/50 
                             text-purple-700 dark:text-purple-300 text-sm font-mono"
                  >
                    {pool}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Last Seen */}
          {token.stats?.lastSeen && (
            <div className="text-sm text-purple-600 dark:text-purple-400">
              Last seen: {new Date(token.stats.lastSeen).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Result Component
export function TokenRegistryResult({
  response,
  operation,
}: {
  response?: {
    success: boolean;
    data?: any;
    error?: string;
    operation?: string;
  };
  operation?: string;
}) {
  if (!response) {
    return (
      <motion.div
        className="flex flex-col gap-4 max-w-[800px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Skeleton className="h-[200px] w-full rounded-xl" />
      </motion.div>
    );
  }

  if (!response.success) {
    return (
      <div className="rounded-xl p-6 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300">
        <div className="flex items-center gap-2">
          <AlertCircle className="size-5" />
          <span>
            Error: {response.error || 'Failed to fetch registry data'}
          </span>
        </div>
      </div>
    );
  }

  // Handle operation-specific results
  if (response && !response.data.tokens) {
    switch (operation) {
      case 'getTokenInfo':
        return <EnrichedTokenDisplay token={response.data} />;
      case 'registerToken':
        return <RegisterTokenResult data={response.data} />;
      case 'registerSymbol':
        return <RegisterSymbolResult data={response.data} />;
      case 'registerLpToken':
        return <RegisterLpTokenResult data={response.data} />;
      case 'resolveSymbol':
        return <ResolveSymbolResult data={response.data} />;
      case 'updateMetadata':
        return <UpdateMetadataResult data={response.data} />;
      case 'updateAudit':
        return <UpdateAuditResult data={response.data} />;
      case 'updatePrice':
        return <UpdatePriceResult data={response.data} />;
      case 'cleanup':
        return <CleanupResult data={response.data} />;
      default:
        // Fallback for unknown operations
        return (
          <div className="rounded-xl p-6 bg-gray-100 dark:bg-gray-900/50">
            <div className="flex items-start gap-2">
              <Terminal className="size-5 mt-1" />
              <div className="space-y-2">
                <div className="text-gray-900 dark:text-gray-100">
                  Operation Result:
                </div>
                <pre className="p-2 rounded text-xs font-mono overflow-x-auto text-wrap">
                  {JSON.stringify(response.data, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        );
    }
  }

  // Handle empty registry
  if (!response.data?.tokens?.length) {
    return (
      <div className="rounded-xl p-6 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300">
        <div className="flex items-center gap-2">
          <Info className="size-5" />
          <span>No tokens found in registry</span>
        </div>
      </div>
    );
  }

  // Display token list
  return (
    <motion.div
      className="flex flex-col gap-4 max-w-[800px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {response.data.tokens.map((token: any) => (
        <TokenDetails key={token.contractId} token={token} />
      ))}
    </motion.div>
  );
}

export default TokenRegistryResult;
