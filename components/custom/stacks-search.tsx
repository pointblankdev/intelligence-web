import cx from 'classnames';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  FileCode,
  Hash,
  Box,
  User,
  Layers,
  ArrowRight,
  Clock,
  Check,
  XCircle,
  Search,
  Calendar,
  ChevronsUpDown,
  Wallet,
  Coins,
} from 'lucide-react';
import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Base Search Types
interface BaseResult {
  entity_id: string;
  entity_type: string;
  tx_data?: {
    tx_type: string;
    tx_id: string;
    canonical: boolean;
    block_hash: string;
    burn_block_time: number;
    block_height: number;
  };
  metadata?: any;
}

export interface SearchResult {
  found: boolean;
  result?: BaseResult;
  error?: string;
}

// Specific Response Types
export interface AddressSearchResult extends SearchResult {
  result: BaseResult & {
    entity_type: 'standard_address' | 'contract_address';
    metadata?: {
      balance: string;
      locked: string;
      unlock_height: number;
      nonce: number;
      balance_proof: string;
      tx_count: number;
    };
  };
}

export interface BlockSearchResult extends SearchResult {
  result: BaseResult & {
    entity_type: 'block_hash' | 'block_height';
    block_data: {
      canonical: boolean;
      hash: string;
      parent_block_hash: string;
      burn_block_time: number;
      burn_block_time_iso: string;
      burn_block_hash: string;
      burn_block_height: number;
      miner_txid: string;
      tx_count: number;
      height: number;
    };
  };
}

export interface TxSearchResult extends SearchResult {
  result: BaseResult & {
    entity_type: 'tx_id';
    metadata?: {
      tx_type: string;
      nonce: number;
      fee_rate: string;
      sender_address: string;
      sponsored: boolean;
      block_height: number;
      block_time: number;
      block_time_iso: string;
      tx_status: string;
      tx_result: {
        hex: string;
        repr: string;
      };
      events: any[];
    };
  };
}

export interface MempoolTxSearchResult extends SearchResult {
  result: BaseResult & {
    entity_type: 'mempool_tx_id';
    metadata?: {
      tx_type: string;
      nonce: number;
      fee_rate: string;
      sender_address: string;
      sponsored: boolean;
      receipt_time: number;
      receipt_time_iso: string;
      tx_status: 'pending';
    };
  };
}

// Search Result Types
interface BaseSearchResult {
  found: boolean;
  result: {
    entity_id: string;
    entity_type: string;
    tx_data: {
      tx_type: string;
      tx_id: string;
      canonical: boolean;
      block_hash: string;
      burn_block_time: number;
      block_height: number;
    };
    metadata?: any;
  };
  error?: string;
}

interface ContractMetadata {
  tx_id: string;
  nonce: number;
  fee_rate: string;
  sender_address: string;
  sponsored: boolean;
  canonical: boolean;
  tx_index: number;
  tx_status: string;
  tx_result: {
    hex: string;
    repr: string;
  };
  block_height: number;
  block_time: number;
  block_time_iso: string;
  burn_block_time: number;
  burn_block_time_iso: string;
  tx_type: string;
  smart_contract: {
    clarity_version: number;
    contract_id: string;
    source_code: string;
  };
}

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

// Contract Result Component
const ContractResult = ({
  data,
}: {
  data: {
    tx_data: BaseSearchResult['result']['tx_data'];
    metadata: ContractMetadata;
  };
}) => {
  const [isSourceExpanded, setIsSourceExpanded] = useState(false);
  const contractId = data.metadata.smart_contract.contract_id;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="p-6 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-800">
              <FileCode className="size-5 text-indigo-700 dark:text-indigo-300" />
            </div>
            <div>
              <h3 className="font-medium text-indigo-900 dark:text-indigo-100">
                {contractId}
              </h3>
              <p className="text-sm text-indigo-700/70 dark:text-indigo-300/70">
                Clarity v{data.metadata.smart_contract.clarity_version}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data.metadata.tx_status === 'success' && (
              <Check className="size-4 text-green-500" />
            )}
            <span className="text-sm text-indigo-600 dark:text-indigo-400">
              Block #{data.metadata.block_height}
            </span>
          </div>
        </div>

        <div className="grid gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Hash className="size-4 text-indigo-600 dark:text-indigo-400" />
            <span className="font-mono text-indigo-900 dark:text-indigo-100">
              {data.metadata.tx_id}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <User className="size-4 text-indigo-600 dark:text-indigo-400" />
            <span className="font-mono text-indigo-900 dark:text-indigo-100">
              {data.metadata.sender_address}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-indigo-900 dark:text-indigo-100">
              {new Date(data.metadata.block_time_iso).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Source Code */}
      <div className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <FileCode className="size-5" />
            <span className="font-medium">Source Code</span>
          </div>
          <button
            onClick={() => setIsSourceExpanded(!isSourceExpanded)}
            className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            {isSourceExpanded ? (
              <>
                <ChevronsUpDown className="size-4" />
                <span>Show Less</span>
              </>
            ) : (
              <>
                <ChevronsUpDown className="size-4" />
                <span>Show More</span>
              </>
            )}
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
              fontSize: '0.8rem',
              margin: 0,
              borderRadius: '0.5rem',
            }}
          >
            {data.metadata.smart_contract.source_code}
          </SyntaxHighlighter>
        </div>
      </div>

      {/* Additional Metadata */}
      <div className="p-6 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Fee Rate</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {parseInt(data.metadata.fee_rate).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Nonce</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {data.metadata.nonce.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">TX Index</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {data.metadata.tx_index.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Result</p>
            <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
              {data.metadata.tx_result.repr}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Address Result Component
const AddressResult = ({ data }: { data: AddressSearchResult['result'] }) => (
  <div className="p-6 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-800">
          <Wallet className="size-5 text-green-700 dark:text-green-300" />
        </div>
        <div>
          <h3 className="font-medium text-green-900 dark:text-green-100">
            {data.entity_type === 'contract_address'
              ? 'Contract Address'
              : 'Address'}
          </h3>
          <p className="text-sm font-mono text-green-700/70 dark:text-green-300/70">
            {data.entity_id}
          </p>
        </div>
      </div>
    </div>

    {data.metadata && (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        <div className="p-2 rounded-lg bg-green-100/50 dark:bg-green-800/50">
          <div className="flex items-center gap-2">
            <Coins className="size-4 text-green-600 dark:text-green-400" />
            <p className="text-green-700/70 dark:text-green-300/70">Balance</p>
          </div>
          <p className="font-medium text-green-900 dark:text-green-100">
            {(parseInt(data.metadata.balance) / 1000000).toFixed(2)} STX
          </p>
        </div>
        <div className="p-2 rounded-lg bg-green-100/50 dark:bg-green-800/50">
          <p className="text-green-700/70 dark:text-green-300/70">Total Sent</p>
          <p className="font-medium text-green-900 dark:text-green-100">
            {(parseInt(data.metadata.total_sent) / 1000000).toFixed(2)} STX
          </p>
        </div>
        <div className="p-2 rounded-lg bg-green-100/50 dark:bg-green-800/50">
          <p className="text-green-700/70 dark:text-green-300/70">
            Total Received
          </p>
          <p className="font-medium text-green-900 dark:text-green-100">
            {(parseInt(data.metadata.total_received) / 1000000).toFixed(2)} STX
          </p>
        </div>
      </div>
    )}
  </div>
);

// Block Result Component
const BlockResult = ({ data }: { data: BlockSearchResult['result'] }) => (
  <div className="p-6 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-800">
          <Layers className="size-5 text-blue-700 dark:text-blue-300" />
        </div>
        <div>
          <h3 className="font-medium text-blue-900 dark:text-blue-100">
            Block {data.block_data.height}
          </h3>
          <p className="text-sm text-blue-700/70 dark:text-blue-300/70">
            {new Date(data.block_data?.burn_block_time * 1000).toLocaleString()}
          </p>
        </div>
      </div>
      {data.block_data?.canonical && (
        <span className="text-sm text-blue-600 dark:text-blue-400">
          Canonical
        </span>
      )}
    </div>

    {data.block_data && (
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Hash className="size-4 text-blue-600 dark:text-blue-400" />
          <span className="font-mono text-blue-900 dark:text-blue-100">
            {data.block_data.hash}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ArrowRight className="size-4 text-blue-600 dark:text-blue-400" />
          <span className="font-mono text-blue-900 dark:text-blue-100">
            {data.block_data.parent_block_hash}
          </span>
        </div>
        <div className="mt-4 p-2 rounded-lg bg-blue-100/50 dark:bg-blue-800/50">
          <p className="text-blue-700/70 dark:text-blue-300/70">Block Height</p>
          <p className="font-mono text-sm text-blue-900 dark:text-blue-100">
            {data.block_data.height}
          </p>
        </div>
      </div>
    )}
  </div>
);

// Transaction Result Component
const TransactionResult = ({
  data,
}: {
  data: TxSearchResult['result'] | MempoolTxSearchResult['result'];
}) => {
  const isPending = data.entity_type === 'mempool_tx_id';
  const metadata = data.metadata;

  if (!metadata) return null;

  return (
    <div className="p-6 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-800">
            <ArrowRight className="size-5 text-purple-700 dark:text-purple-300" />
          </div>
          <div>
            <h3 className="font-medium text-purple-900 dark:text-purple-100">
              {metadata.tx_type}
            </h3>
            <p className="text-sm text-purple-700/70 dark:text-purple-300/70">
              {isPending
                ? new Date(metadata.receipt_time_iso).toLocaleString()
                : new Date(metadata.block_time_iso).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isPending && metadata.tx_status === 'success' && (
            <Check className="size-4 text-green-500" />
          )}
          {!isPending && metadata.tx_status === 'failed' && (
            <XCircle className="size-4 text-red-500" />
          )}
          {isPending && <Clock className="size-4 text-yellow-500" />}
          <span
            className={cx(
              'text-sm',
              !isPending &&
                metadata.tx_status === 'success' &&
                'text-green-600 dark:text-green-400',
              !isPending &&
                metadata.tx_status === 'failed' &&
                'text-red-600 dark:text-red-400',
              isPending && 'text-yellow-600 dark:text-yellow-400'
            )}
          >
            {metadata.tx_status.charAt(0).toUpperCase() +
              metadata.tx_status.slice(1)}
          </span>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Hash className="size-4 text-purple-600 dark:text-purple-400" />
          <span className="font-mono text-purple-900 dark:text-purple-100">
            {data.entity_id}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <User className="size-4 text-purple-600 dark:text-purple-400" />
          <span className="font-mono text-purple-900 dark:text-purple-100">
            {metadata.sender_address}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-purple-700/70 dark:text-purple-300/70">
            Fee Rate: {parseInt(metadata.fee_rate).toLocaleString()}
          </span>
          {metadata.sponsored && (
            <span className="text-purple-600 dark:text-purple-400">
              Sponsored
            </span>
          )}
        </div>
        {!isPending && 'tx_result' in metadata && (
          <div className="mt-4 p-2 rounded-lg bg-purple-100/50 dark:bg-purple-800/50">
            <p className="text-purple-700/70 dark:text-purple-300/70">Result</p>
            <p className="font-mono text-sm text-purple-900 dark:text-purple-100">
              {metadata.tx_result.repr}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Search Result component
export function SearchResult({ response }: { response?: SearchResult }) {
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

  if (!response.found || !response.result) {
    return (
      <div className="rounded-xl p-6 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300">
        <div className="flex items-center gap-2">
          <Search className="size-5" />
          <span>No results found</span>
        </div>
      </div>
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

  return (
    <motion.div
      className="flex flex-col gap-4 max-w-[800px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Contract Results */}
      {response.result.entity_type === 'contract_address' &&
        'smart_contract' in response.result.metadata && (
          <ContractResult
            data={{
              tx_data: response.result.tx_data!,
              metadata: response.result.metadata,
            }}
          />
        )}

      {/* Address Results */}
      {(response.result.entity_type === 'standard_address' ||
        (response.result.entity_type === 'contract_address' &&
          !('smart_contract' in response.result.metadata))) && (
        <AddressResult
          data={response.result as AddressSearchResult['result']}
        />
      )}

      {/* Block Results */}
      {(response.result.entity_type === 'block_hash' ||
        response.result.entity_type === 'block_height') && (
        <BlockResult data={response.result as BlockSearchResult['result']} />
      )}

      {/* Transaction Results */}
      {(response.result.entity_type === 'tx_id' ||
        response.result.entity_type === 'mempool_tx_id') && (
        <TransactionResult
          data={
            response.result as
              | TxSearchResult['result']
              | MempoolTxSearchResult['result']
          }
        />
      )}
    </motion.div>
  );
}
