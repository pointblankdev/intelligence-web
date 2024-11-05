import cx from 'classnames';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRightLeft,
  BarChart2,
  Clock,
  Code2,
  CreditCard,
  ExternalLink,
  FileCode,
  Hash,
  Lock,
  Send,
  Settings,
  ShieldAlert,
  Wallet,
} from 'lucide-react';

// Core transaction types
interface PostCondition {
  principal: {
    type_id: string;
    address: string;
    contract_name?: string;
  };
  condition_code: string;
  amount: string;
  type: string;
  asset?: {
    asset_name: string;
    contract_address: string;
    contract_name: string;
  };
}

interface ContractCall {
  contract_id: string;
  function_name: string;
  function_signature: string;
  function_args: Array<{
    hex: string;
    repr: string;
    name: string;
    type: string;
  }>;
}

interface Transaction {
  tx_id: string;
  nonce: number;
  fee_rate: string;
  sender_address: string;
  sponsored: boolean;
  post_condition_mode: string;
  post_conditions: PostCondition[];
  anchor_mode: string;
  tx_status: string;
  receipt_time?: number;
  receipt_time_iso?: string;
  tx_type: string;
  contract_call?: ContractCall;
}

// Different response types
interface MempoolStats {
  tx_count: number;
  byte_size: number;
  dropped_tx_count: number;
}

interface PaginatedResponse<T> {
  limit: number;
  offset: number;
  total: number;
  results: T[];
}

type TransactionResponse = {
  success: boolean;
  data?: Transaction | PaginatedResponse<Transaction> | MempoolStats | string; // For raw transactions
  error?: string;
};

const shortenAddress = (address?: string) => {
  if (!address) return 'Unknown';
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const StatusBadge = ({ status }: { status?: string }) => (
  <div
    className={cx('px-2 py-0.5 rounded-full text-xs font-medium', {
      'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300':
        status === 'pending',
      'bg-green-500/20 text-green-700 dark:text-green-300':
        status === 'success',
      'bg-red-500/20 text-red-700 dark:text-red-300': status === 'failed',
      'bg-slate-500/20 text-slate-700 dark:text-slate-300': !status,
    })}
  >
    {status || 'unknown'}
  </div>
);

const PostConditionItem = ({ condition }: { condition: PostCondition }) => (
  <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
    <Lock className="size-4 text-slate-500" />
    <span className="font-mono">
      {condition.amount} {condition.asset?.asset_name || 'STX'}
    </span>
    <span className="text-slate-500">via</span>
    <span className="font-mono truncate">
      {shortenAddress(condition.principal.address)}
    </span>
  </div>
);

const FunctionArg = ({
  arg,
}: {
  arg: { name: string; repr: string; type: string };
}) => (
  <div className="flex flex-col gap-1 p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
    <div className="flex items-center gap-2">
      <code className="text-xs text-purple-600 dark:text-purple-400">
        {arg.name}
      </code>
      <span className="text-xs text-slate-500">{arg.type}</span>
    </div>
    <code className="text-sm font-mono truncate" title={arg.repr}>
      {arg.repr.length > 50 ? `${arg.repr.slice(0, 47)}...` : arg.repr}
    </code>
  </div>
);

const RawTransaction = ({ data }: { data: string }) => (
  <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-4 overflow-x-auto">
    <pre className="text-sm font-mono whitespace-pre-wrap">{data}</pre>
  </div>
);

const MempoolStatsView = ({ stats }: { stats: MempoolStats }) => (
  <div className="grid grid-cols-3 gap-4">
    <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="size-4 text-blue-500" />
        <span className="text-sm font-medium">Transactions</span>
      </div>
      <span className="text-2xl font-bold">{stats.tx_count}</span>
    </div>
    <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800">
      <div className="flex items-center gap-2 mb-2">
        <BarChart2 className="size-4 text-green-500" />
        <span className="text-sm font-medium">Size</span>
      </div>
      <span className="text-2xl font-bold">
        {(stats.byte_size / 1024).toFixed(2)} KB
      </span>
    </div>
    <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800">
      <div className="flex items-center gap-2 mb-2">
        <Hash className="size-4 text-red-500" />
        <span className="text-sm font-medium">Dropped</span>
      </div>
      <span className="text-2xl font-bold">{stats.dropped_tx_count}</span>
    </div>
  </div>
);

const TransactionInfo = ({ tx }: { tx: Transaction }) => {
  return (
    <motion.div
      className="w-full max-w-2xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {tx.tx_type === 'contract_call' ? (
                <FileCode className="size-5 text-blue-500" />
              ) : (
                <Send className="size-5 text-green-500" />
              )}
              <h3 className="font-mono text-sm">{shortenAddress(tx.tx_id)}</h3>
            </div>
            <StatusBadge status={tx.tx_status} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-slate-400" />
              <span>
                {tx.receipt_time_iso
                  ? format(new Date(tx.receipt_time_iso), 'MMM d, HH:mm:ss')
                  : 'Pending'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="size-4 text-slate-400" />
              <span>{parseInt(tx.fee_rate).toLocaleString()} μSTX</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-slate-400" />
              <span>Nonce: {tx.nonce}</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-slate-400" />
              <span>{tx.post_condition_mode}</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Addresses */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
            <Wallet className="size-4 text-slate-400" />
            <span className="font-mono text-sm">
              {shortenAddress(tx.sender_address)}
            </span>
            <ArrowRightLeft className="size-4 text-slate-400" />
            <span className="font-mono text-sm">
              {shortenAddress(tx.contract_call?.contract_id)}
            </span>
          </div>

          {/* Contract Call */}
          {tx.tx_type === 'contract_call' && tx.contract_call && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Settings className="size-4" />
                <span>{tx.contract_call.function_name}</span>
              </div>

              <div className="pl-6 space-y-2">
                {tx.contract_call.function_args.slice(0, 3).map((arg, i) => (
                  <FunctionArg key={i} arg={arg} />
                ))}
                {tx.contract_call.function_args.length > 3 && (
                  <div className="text-sm text-slate-500">
                    +{tx.contract_call.function_args.length - 3} more arguments
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Post Conditions */}
          {tx.post_conditions?.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Lock className="size-4" />
                <span>Post Conditions</span>
              </div>

              <div className="pl-6 space-y-2">
                {tx.post_conditions.slice(0, 3).map((condition, i) => (
                  <PostConditionItem key={i} condition={condition} />
                ))}
                {tx.post_conditions.length > 3 && (
                  <div className="text-sm text-slate-500">
                    +{tx.post_conditions.length - 3} more conditions
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export function TransactionDisplay({
  response,
}: {
  response: TransactionResponse;
}) {
  if (!response.success || !response.data) {
    return (
      <div className="rounded-2xl p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300">
        <div className="flex items-center gap-2">
          <Activity className="size-5" />
          <span>
            Error: {response.error || 'Failed to load transaction data'}
          </span>
        </div>
      </div>
    );
  }

  // Handle raw transaction data
  if (typeof response.data === 'string') {
    return <RawTransaction data={response.data} />;
  }

  // Handle mempool stats
  if ('tx_count' in response.data) {
    return <MempoolStatsView stats={response.data} />;
  }

  // Handle paginated transaction list
  if ('results' in response.data) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Showing {response.data.results.length} of {response.data.total}{' '}
            transactions
          </span>
          <span>{format(new Date(), 'MMM d, HH:mm:ss')}</span>
        </div>

        <div className="space-y-4">
          {response.data.results.map((tx) => (
            <TransactionInfo key={tx.tx_id} tx={tx} />
          ))}
        </div>
      </div>
    );
  }

  // Handle single transaction
  return <TransactionInfo tx={response.data} />;
}
