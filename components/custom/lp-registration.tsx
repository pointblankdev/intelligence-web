import { cx } from 'class-variance-authority';
import { motion } from 'framer-motion';
import {
  FileText,
  Atom,
  Link as LinkIcon,
  Database,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

const StatusBadge = ({ success }: { success: boolean }) => (
  <div
    className={cx(
      'flex items-center gap-1 text-xs rounded-full px-2 py-0.5',
      success
        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
        : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
    )}
  >
    {success ? (
      <CheckCircle2 className="size-3" />
    ) : (
      <AlertCircle className="size-3" />
    )}
    {success ? 'Success' : 'Failed'}
  </div>
);

const TokenMetadata = ({
  metadata,
  contractId,
}: {
  metadata: any;
  contractId: string;
}) => (
  <div className="p-4 rounded-lg bg-blue-100/50 dark:bg-blue-800/50">
    <div className="flex items-center justify-between mb-2">
      <span className="font-medium text-blue-900 dark:text-blue-100">
        {contractId}
      </span>
      <StatusBadge success={true} />
    </div>
    {metadata?.uri && (
      <div className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-1">
        <LinkIcon className="size-3" />
        <Link href={metadata.uri} className="hover:underline" target="_blank">
          {metadata.uri}
        </Link>
      </div>
    )}
    {metadata?.metadata && Object.keys(metadata.metadata).length > 0 && (
      <div className="mt-2 space-y-1">
        {Object.entries(metadata.metadata).map(([key, value]) => (
          <div key={key} className="text-sm text-blue-700 dark:text-blue-300">
            <span className="font-medium">{key}:</span> {String(value)}
          </div>
        ))}
      </div>
    )}
  </div>
);

export default function LpRegistrationResult({
  response,
}: {
  response?: { success: boolean; data?: any; error?: string };
}) {
  if (!response) {
    return (
      <div className="animate-pulse h-48 w-full bg-blue-100 dark:bg-blue-900/20 rounded-xl" />
    );
  }

  if (response.error) {
    return (
      <div className="rounded-xl p-6 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300">
        <div className="flex items-center gap-2">
          <AlertCircle className="size-5" />
          <span>Error: {response.error}</span>
        </div>
      </div>
    );
  }

  const { data } = response;
  const { registrationResults, lpToken, baseTokens, pool } = data;

  return (
    <motion.div
      className="flex flex-col gap-4 max-w-[800px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="p-6 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-800">
            <Atom className="size-5 text-blue-700 dark:text-blue-300" />
          </div>
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-100">
              LP Token Registration
            </h3>
            <p className="text-sm text-blue-700/70 dark:text-blue-300/70">
              DEX: {pool.dex} - Pool #{pool.id}
            </p>
          </div>
        </div>

        {/* Registration Results Summary */}
        <div className="mb-4 p-4 rounded-lg bg-blue-100/50 dark:bg-blue-800/50">
          <div className="flex items-center gap-2 mb-2">
            <Database className="size-4 text-blue-700 dark:text-blue-300" />
            <span className="font-medium text-blue-900 dark:text-blue-100">
              Registration Summary
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm text-blue-700 dark:text-blue-300">
            <div>
              Contracts Registered:{' '}
              {Object.keys(registrationResults.contracts).length}
            </div>
            <div>
              Symbols Registered:{' '}
              {Object.keys(registrationResults.symbols).length}
            </div>
            <div>
              Pool Relationships: {Object.keys(registrationResults.pool).length}
            </div>
            <div>
              LP Token Status:{' '}
              {registrationResults.lpToken ? 'Registered' : 'Failed'}
            </div>
          </div>
        </div>

        {/* LP Token Section */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="size-4 text-blue-700 dark:text-blue-300" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              LP Token
            </span>
          </div>
          <TokenMetadata
            metadata={lpToken.metadata}
            contractId={lpToken.info.contractId}
          />
        </div>

        {/* Base Tokens Section */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Atom className="size-4 text-blue-700 dark:text-blue-300" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Base Tokens
            </span>
          </div>
          <div className="space-y-2">
            <TokenMetadata
              metadata={baseTokens.token0.metadata}
              contractId={baseTokens.token0.info.contractId}
            />
            <TokenMetadata
              metadata={baseTokens.token1.metadata}
              contractId={baseTokens.token1.info.contractId}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
