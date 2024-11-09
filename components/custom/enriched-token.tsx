import cx from 'classnames';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Coins,
  Code,
  ChevronsUpDown,
  GitBranch,
  Shield,
  DollarSign,
  Tag,
  Box,
  Check,
  Copy,
  ExternalLink,
  Terminal,
  Link2,
  FileText,
  Database,
  Key,
  Book,
  RefreshCw,
  Scale,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

// Helper Components
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

const Section = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-purple-700 dark:text-purple-300" />
      <h3 className="font-medium text-purple-900 dark:text-purple-100">
        {title}
      </h3>
    </div>
    <div className="pl-6 space-y-2">{children}</div>
  </div>
);

// Main Component
export const EnrichedTokenDisplay = ({ token }: { token: any }) => {
  const [expandedSections, setExpandedSections] = useState<string[]>(['basic']);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  return (
    <div className="p-6 rounded-lg bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800 shadow-sm">
      <div className="flex flex-col gap-6">
        {/* Basic Info */}
        <div className="flex justify-between">
          <div className="flex gap-4">
            <div className="size-16 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
              <Coins className="size-8 text-purple-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                {token.metadata?.name || 'Unknown Token'}
              </h2>
              <CopyableText text={token.contractId} label="Contract" />
            </div>
          </div>
          {token.price !== null && (
            <div className="px-4 py-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
              <div className="flex items-center gap-2">
                <DollarSign className="size-4 text-purple-700 dark:text-purple-300" />
                <span className="font-medium text-purple-900 dark:text-purple-100">
                  ${token.price?.toFixed(6)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Metadata */}
        <Section title="Token Metadata" icon={FileText}>
          {token.metadata && (
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-purple-700 dark:text-purple-300">
                <span className="font-medium">Symbol:</span>{' '}
                {token.metadata.symbol}
              </div>
              {token.metadata.decimals !== undefined && (
                <div className="text-sm text-purple-700 dark:text-purple-300">
                  <span className="font-medium">Decimals:</span>{' '}
                  {token.metadata.decimals}
                </div>
              )}
            </div>
          )}
        </Section>

        {/* Audit Info */}
        {token.audit && (
          <Section title="Contract Audit" icon={Shield}>
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 space-y-3">
              {/* Deployment */}
              {token.audit.deploymentInfo && (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-purple-800 dark:text-purple-200">
                    Deployment
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-purple-700 dark:text-purple-300">
                      Block Height: {token.audit.deploymentInfo.blockHeight}
                    </div>
                    <div className="text-purple-700 dark:text-purple-300">
                      Clarity Version:{' '}
                      {token.audit.deploymentInfo.clarityVersion || 'N/A'}
                    </div>
                    <CopyableText
                      text={token.audit.deploymentInfo.txId}
                      label="Tx"
                    />
                  </div>
                </div>
              )}

              {/* FT Info */}
              {token.audit.fungibleTokens?.length > 0 && (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-purple-800 dark:text-purple-200">
                    Token Properties
                  </div>
                  {token.audit.fungibleTokens.map((ft: any, i: number) => (
                    <div key={i} className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-purple-700 dark:text-purple-300">
                        <Scale className="size-3 inline mr-1" />
                        {ft.isMintable ? 'Mintable' : 'Fixed Supply'}
                      </div>
                      <div className="text-purple-700 dark:text-purple-300">
                        <Key className="size-3 inline mr-1" />
                        {ft.isTransferable
                          ? 'Transferable'
                          : 'Non-Transferable'}
                      </div>
                      {ft.totalSupply && (
                        <div className="text-purple-700 dark:text-purple-300">
                          <Database className="size-3 inline mr-1" />
                          Total Supply:{' '}
                          {Number(ft.totalSupply).toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Contract Code */}
              {token.audit.arcanaRecommendation && (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-purple-800 dark:text-purple-200">
                    Code Analysis
                  </div>
                  <div className="text-sm text-purple-700 dark:text-purple-300">
                    {token.audit.arcanaRecommendation.reasoning}
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Pool Relationships */}
        {(token.pools?.length > 0 || token.lpInfo) && (
          <Section title="Liquidity" icon={GitBranch}>
            {/* LP Token Info */}
            {token.lpInfo && (
              <div className="mb-3">
                <div className="text-sm text-purple-700 dark:text-purple-300">
                  <span className="font-medium">DEX:</span> {token.lpInfo.dex}
                </div>
                <CopyableText text={token.lpInfo.poolId} label="Pool" />
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <CopyableText text={token.lpInfo.token0} label="Token0" />
                  <CopyableText text={token.lpInfo.token1} label="Token1" />
                </div>
              </div>
            )}

            {/* Related Pools */}
            {token.pools?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {token.pools.map((pool: any, i: number) => (
                  <div
                    key={i}
                    className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/50 
                             text-purple-700 dark:text-purple-300 text-sm"
                  >
                    Pool {pool}
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* Stats */}
        {token.stats && (
          <Section title="Statistics" icon={Terminal}>
            <div className="grid grid-cols-2 gap-2 text-sm text-purple-700 dark:text-purple-300">
              <div>
                <RefreshCw className="size-3 inline mr-1" />
                {token.stats.interactions} interactions
              </div>
              {token.stats.lastSeen && (
                <div>
                  <Book className="size-3 inline mr-1" />
                  Last seen: {new Date(token.stats.lastSeen).toLocaleString()}
                </div>
              )}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
};

export default EnrichedTokenDisplay;
