import cx from 'classnames';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  FileCode,
  Hash,
  User,
  Calendar,
  ChevronsUpDown,
  Code,
  CheckCircle2,
  XCircle,
  SearchCode,
  Code2,
  Box,
} from 'lucide-react';
import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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

// Contract Info Display
const ContractInfo = ({ contract }: { contract: any }) => {
  const [isSourceExpanded, setIsSourceExpanded] = useState(false);

  return (
    <div className="p-6 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-800">
            <FileCode className="size-5 text-blue-700 dark:text-blue-300" />
          </div>
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-100">
              {contract.contractId || contract.contract_id}
            </h3>
            <p className="text-sm text-blue-700/70 dark:text-blue-300/70">
              {contract.source_code ? 'Source Available' : 'Basic Info'}
            </p>
          </div>
        </div>
        {contract.canonical && (
          <div className="flex items-center gap-2" title="Canonical">
            {contract.canonical ? (
              <CheckCircle2 className="size-4 text-green-500" />
            ) : (
              <XCircle className="size-4 text-red-500" />
            )}
          </div>
        )}
      </div>

      {/* Contract Source Code */}
      {contract.source_code && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Source Code
            </span>
            <button
              onClick={() => setIsSourceExpanded(!isSourceExpanded)}
              className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-100"
            >
              <ChevronsUpDown className="size-4" />
              <span>{isSourceExpanded ? 'Show Less' : 'Show More'}</span>
            </button>
          </div>
          <div
            className={cx(
              'rounded-lg overflow-hidden transition-all duration-500',
              !isSourceExpanded && 'max-h-[200px]'
            )}
          >
            <SyntaxHighlighter
              language="lisp"
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: '1rem',
                borderRadius: '0.5rem',
              }}
            >
              {contract.source_code}
            </SyntaxHighlighter>
          </div>
        </div>
      )}

      {/* Contract Events */}
      {contract.events && contract.events.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
            Recent Events
          </h4>
          <div className="space-y-2">
            {contract.events.map((event: any, index: number) => (
              <div
                key={index}
                className="p-2 rounded-lg bg-blue-100/50 dark:bg-blue-800/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-900 dark:text-blue-100">
                    {event.event_type}
                  </span>
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    #{event.block_height}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contract Traits */}
      {contract.traits && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
            Implemented Traits
          </h4>
          <div className="flex flex-wrap gap-2">
            {contract.traits.map((trait: string, index: number) => (
              <span
                key={index}
                className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300"
              >
                {trait}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Main Result Component
export function ContractResult({
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
          <span>
            Error: {response.error || 'Failed to fetch contract information'}
          </span>
        </div>
      </div>
    );
  }

  if (!response.data) {
    return (
      <div className="rounded-xl p-6 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300">
        <div className="flex items-center gap-2">
          <SearchCode className="size-5" />
          <span>No contract information found</span>
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
      {/* Contract Info */}
      {response.data && <ContractInfo contract={response.data} />}

      {/* Contract Events */}
      {response.data.events && (
        <div className="rounded-xl p-6 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
          <h3 className="font-medium text-purple-900 dark:text-purple-100 mb-4">
            Contract Events
          </h3>
          <div className="space-y-2">
            {response.data.events.map((event: any, index: number) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-purple-100/50 dark:bg-purple-800/50"
              >
                {/* Event details */}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                    {event.event_type}
                  </span>
                  <span className="text-xs text-purple-600 dark:text-purple-400">
                    Block #{event.block_height}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contract Status */}
      {response.data.status && (
        <div className="rounded-xl p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <Box className="size-5 text-green-700 dark:text-green-300" />
            <span className="font-medium text-green-900 dark:text-green-100">
              Contract Status: {response.data.status}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default ContractResult;
