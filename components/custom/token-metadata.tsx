import cx from 'classnames';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Coins,
  ChevronsUpDown,
  Image as ImageIcon,
  Link,
  Info,
  Hash,
  User,
  FileText,
  Globe,
  Tag,
  Box,
  Check,
  Copy,
  ExternalLink,
} from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { toast } from 'sonner';

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

// Token Image Component
const TokenImage = ({
  src,
  alt,
  size = 96,
}: {
  src?: string;
  alt: string;
  size?: number;
}) => {
  if (!src) return null;

  return (
    <div className="relative rounded-lg overflow-hidden">
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="object-cover"
      />
    </div>
  );
};

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

// Token Metadata Display Component
const TokenMetadata = ({ token }: { token: any }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const imageUrl =
    token.image_canonical_uri ||
    token.image_uri ||
    token.metadata?.image ||
    token.image;

  return (
    <div className="p-6 rounded-lg bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800 shadow-sm">
      <div className="flex flex-col gap-4">
        {/* Header Section */}
        <div className="flex justify-between items-start">
          <div className="flex gap-4">
            {/* Token Image */}
            {imageUrl ? (
              <TokenImage src={imageUrl} alt={token.name || 'Token'} />
            ) : (
              <div className="size-24 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                <Coins className="size-8 text-purple-500" />
              </div>
            )}

            {/* Basic Token Info */}
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-medium text-purple-900 dark:text-purple-100">
                {token.name || 'Unknown Token'}
              </h3>
              {token.symbol && (
                <div className="flex items-center gap-2">
                  <Tag className="size-4 text-purple-700 dark:text-purple-300" />
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    ${token.symbol}
                  </span>
                </div>
              )}
              {token.decimals !== undefined && (
                <div className="text-sm text-purple-600 dark:text-purple-400">
                  {token.decimals} decimals
                </div>
              )}
              {token.total_supply && (
                <div className="text-sm text-purple-600 dark:text-purple-400">
                  Supply: {Number(token.total_supply).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-100"
          >
            <ChevronsUpDown className="size-4" />
            <span>{isExpanded ? 'Show Less' : 'Show More'}</span>
          </button>
        </div>

        {/* Expanded Content */}
        <div className={cx('space-y-4', !isExpanded && 'hidden')}>
          {/* Contract Info */}
          <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 space-y-2">
            <CopyableText
              text={token.contract_principal || token.asset_identifier}
              label="Contract"
            />
            {token.sender_address && (
              <CopyableText text={token.sender_address} label="Sender" />
            )}
            {token.tx_id && (
              <CopyableText text={token.tx_id} label="Transaction" />
            )}
          </div>

          {/* Description */}
          {token.description && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-purple-700 dark:text-purple-300" />
                <span className="font-medium text-purple-900 dark:text-purple-100">
                  Description
                </span>
              </div>
              <p className="text-sm text-purple-700 dark:text-purple-300 pl-6">
                {token.description}
              </p>
            </div>
          )}

          {/* Links */}
          {(token.token_uri || token.metadata?.external_url) && (
            <div className="flex flex-wrap gap-4">
              {token.token_uri && (
                <a
                  href={token.token_uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:underline"
                >
                  <Link className="size-4" />
                  Token URI
                  <ExternalLink className="size-3" />
                </a>
              )}
              {token.metadata?.external_url && (
                <a
                  href={token.metadata.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:underline"
                >
                  <Globe className="size-4" />
                  Website
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          )}

          {/* Attributes */}
          {token.metadata?.attributes?.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Tag className="size-4 text-purple-700 dark:text-purple-300" />
                <span className="font-medium text-purple-900 dark:text-purple-100">
                  Attributes
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pl-6">
                {token.metadata.attributes.map((attr: any, index: number) => (
                  <div
                    key={index}
                    className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/50 
                             text-purple-700 dark:text-purple-300 text-sm"
                  >
                    <span className="font-medium">{attr.trait_type}:</span>{' '}
                    <span>{String(attr.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Localization */}
          {token.metadata?.localization && (
            <div className="pl-6">
              <div className="flex items-center gap-2 text-sm">
                <Globe className="size-4 text-purple-700 dark:text-purple-300" />
                <span className="text-purple-900 dark:text-purple-100">
                  Available in: {token.metadata.localization.locales.join(', ')}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Result Component
export function MetadataResult({
  response,
}: {
  response?: { success: boolean; data?: any; error?: string };
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
          <span>Error: {response.error || 'Failed to fetch metadata'}</span>
        </div>
      </div>
    );
  }

  if (!response.data) {
    return (
      <div className="rounded-xl p-6 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300">
        <div className="flex items-center gap-2">
          <Info className="size-5" />
          <span>No metadata found</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col gap-4 max-w-[800px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Single Token Result */}
      {!Array.isArray(response.data) && !response.data.results && (
        <TokenMetadata token={response.data} />
      )}

      {/* Array of Tokens Result */}
      {Array.isArray(response.data) && (
        <div className="space-y-4">
          {response.data.map(
            (token, index) =>
              token && <TokenMetadata key={index} token={token} />
          )}
        </div>
      )}

      {/* Paginated Results */}
      {response.data.results && (
        <div className="space-y-4">
          <div className="text-sm text-purple-700 dark:text-purple-300">
            Showing {response.data.results.length} of {response.data.total}{' '}
            tokens
          </div>
          {response.data.results.map((token: any, index: number) => (
            <TokenMetadata key={index} token={token} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default MetadataResult;
