import cx from 'classnames';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  FileCode,
  List,
  MapPin,
  Database,
  ChevronsUpDown,
  Code2,
  GaugeCircle,
  BookOpen,
  Atom,
  Box,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { ContractAudit } from '@/tools/code-audit/schema';

// Skeleton for loading state
const Skeleton = ({ className }: { className?: string }) => (
  <div
    className={cx(
      'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700',
      'bg-[length:200%_100%] rounded',
      className
    )}
  />
);

// Function section component
const FunctionSection = ({
  functions,
  title,
  icon: Icon,
}: {
  functions: any[];
  title: string;
  icon: any;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return functions?.length > 0 ? (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-blue-700 dark:text-blue-300" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {title} ({functions.length})
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-100"
        >
          <ChevronsUpDown className="size-4" />
          <span>{isExpanded ? 'Show Less' : 'Show More'}</span>
        </button>
      </div>
      <div
        className={cx(
          'space-y-2',
          !isExpanded && 'max-h-[200px] overflow-hidden'
        )}
      >
        {functions?.map((fn, index) => (
          <div
            key={index}
            className="p-3 rounded-lg bg-blue-100/50 dark:bg-blue-800/50"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-medium text-blue-900 dark:text-blue-100">
                {fn.name}
              </span>
              {fn.costEstimate && (
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  Cost: {fn.costEstimate.runtime || 'N/A'}
                </span>
              )}
            </div>
            {fn.description && (
              <p className="text-sm text-blue-700/70 dark:text-blue-300/70 mb-2">
                {fn.description}
              </p>
            )}
            {fn.parameters?.length > 0 && (
              <div className="text-sm">
                <span className="text-blue-600 dark:text-blue-400">
                  Parameters:{' '}
                </span>
                {fn.parameters.map((param: any, i: number) => (
                  <span key={i} className="text-blue-700 dark:text-blue-300">
                    {param.name}: {param.type}
                    {i < fn.parameters.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  ) : null;
};

// Token component
const TokenSection = ({ tokens }: { tokens: any[] }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return tokens.length > 0 ? (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <Atom className="size-4 text-blue-700 dark:text-blue-300" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            Fungible Tokens ({tokens.length})
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-100"
        >
          <ChevronsUpDown className="size-4" />
          <span>{isExpanded ? 'Show Less' : 'Show More'}</span>
        </button>
      </div>
      <div
        className={cx(
          'space-y-2',
          !isExpanded && 'max-h-[200px] overflow-hidden'
        )}
      >
        {tokens.map((token, index) => (
          <div
            key={index}
            className="p-3 rounded-lg bg-blue-100/50 dark:bg-blue-800/50"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-medium text-blue-900 dark:text-blue-100">
                {token.symbol}
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-400">
                {token.decimals} decimals
              </span>
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <div>Name: {token.name}</div>
              <div>Identifier: {token.tokenIdentifier}</div>
              <div className="flex gap-2 mt-1">
                {token.isTransferable && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-blue-200 dark:bg-blue-700">
                    Transferable
                  </span>
                )}
                {token.isMintable && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-blue-200 dark:bg-blue-700">
                    Mintable
                  </span>
                )}
                {token.isBurnable && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-blue-200 dark:bg-blue-700">
                    Burnable
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  ) : null;
};

// Main Result Component
export function ContractAuditResult({
  response,
}: {
  response?: { success: boolean; data?: any; error?: string; cached?: boolean };
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

  if (response.error) {
    return (
      <div className="rounded-xl p-6 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300">
        <div className="flex items-center gap-2">
          <AlertCircle className="size-5" />
          <span>Error: {response.error || 'Failed to audit contract'}</span>
        </div>
      </div>
    );
  }

  const { data } = response;

  return (
    <motion.div
      className="flex flex-col gap-4 max-w-[800px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="p-6 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        {/* Contract Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-800">
            <FileCode className="size-5 text-blue-700 dark:text-blue-300" />
          </div>
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-100">
              {data.contractId}
            </h3>
            <p className="text-sm text-blue-700/70 dark:text-blue-300/70">
              Block #{data.deploymentInfo.blockHeight}
            </p>
          </div>
        </div>

        {/* Arcana Score */}
        <div className="mb-4 p-4 rounded-lg bg-blue-100/50 dark:bg-blue-800/50">
          <div className="flex items-center gap-2 mb-2">
            <GaugeCircle className="size-5 text-blue-700 dark:text-blue-300" />
            <span className="font-medium text-blue-900 dark:text-blue-100">
              Alignment Score: {data.arcanaRecommendation.alignment}
            </span>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {data.arcanaRecommendation.reasoning}
          </p>
        </div>

        {/* Tokens */}
        <TokenSection tokens={data.fungibleTokens} />

        {/* Functions */}
        <FunctionSection
          functions={data.readOnlyFunctions}
          title="Read-Only Functions"
          icon={BookOpen}
        />
        <FunctionSection
          functions={data.publicFunctions}
          title="Public Functions"
          icon={Lock}
        />

        {/* Variables and Maps */}
        {data.variables.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="size-4 text-blue-700 dark:text-blue-300" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Variables ({data.variables.length})
              </span>
            </div>
            <div className="space-y-1">
              {data.variables.map((v: any, i: number) => (
                <div
                  key={i}
                  className="text-sm text-blue-700 dark:text-blue-300"
                >
                  {v.name}: {v.type} ({v.access})
                  {v.currentValue.startsWith('https://') ? (
                    <Link
                      href={v.currentValue}
                      className="text-blue-600 dark:text-blue-400 underline ml-1"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {v.currentValue}
                    </Link>
                  ) : (
                    ` = ${v.currentValue}`
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {data.maps.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="size-4 text-blue-700 dark:text-blue-300" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Maps ({data.maps.length})
              </span>
            </div>
            <div className="space-y-2">
              {data.maps.map((m: any, i: number) => (
                <div
                  key={i}
                  className="p-2 rounded-lg bg-blue-100/50 dark:bg-blue-800/50 text-sm text-blue-700 dark:text-blue-300"
                >
                  <div className="font-medium">{m.name}</div>
                  <div>
                    Key: {m.keyType}, Value: {m.valueType}
                  </div>
                  <div className="text-xs">{m.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default ContractAuditResult;
