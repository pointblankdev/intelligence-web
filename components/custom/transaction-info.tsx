import cx from 'classnames';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowRightLeft,
  BarChart2,
  ChevronDown,
  Clock,
  Code2,
  CreditCard,
  FileCode,
  Hash,
  Lock,
  Send,
  Settings,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';

// Core transaction types

interface Events {
  stx: {
    transfer: number;
    mint: number;
    burn: number;
  };
  ft: {
    transfer: number;
    mint: number;
    burn: number;
  };
  nft: {
    transfer: number;
    mint: number;
    burn: number;
  };
}

interface TransactionSummary {
  tx: Transaction;
  stx_sent: string;
  stx_received: string;
  events: Events;
}

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
  function_args: any[];
}

interface TransactionResult {
  hex: string;
  repr: string;
}

interface Transaction {
  anchor_mode: string;
  block_hash: string;
  block_height: number;
  block_time: number;
  block_time_iso: string;
  burn_block_height: number;
  burn_block_time: number;
  burn_block_time_iso: string;
  canonical: boolean;
  contract_call: ContractCall;
  event_count: number;
  events?: any[];
  execution_cost_read_count: number;
  execution_cost_read_length: number;
  execution_cost_runtime: number;
  execution_cost_write_count: number;
  execution_cost_write_length: number;
  fee_rate: string;
  is_unanchored: boolean;
  microblock_canonical: boolean;
  microblock_hash: string;
  microblock_sequence: number;
  nonce: number;
  parent_block_hash: string;
  parent_burn_block_time: number;
  parent_burn_block_time_iso: string;
  post_condition_mode: string;
  post_conditions: any[];
  sender_address: string;
  sponsored: boolean;
  tx_id: string;
  tx_index: number;
  tx_result: TransactionResult;
  tx_status: string;
  tx_type: string;
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

// Add interface for mempool pending transactions
interface MempoolTransaction {
  anchor_mode: string;
  contract_call?: ContractCall;
  fee_rate: string;
  nonce: number;
  post_condition_mode: string;
  post_conditions: any[];
  receipt_time: number;
  receipt_time_iso: string;
  sender_address: string;
  sponsored: boolean;
  tx_id: string;
  tx_status: string;
  tx_type: string;
}

// Helper function to determine if a transaction is a mempool transaction
const isMempoolTransaction = (tx: any): tx is MempoolTransaction => {
  return 'receipt_time' in tx && !('block_time' in tx);
};

const shortenAddress = (address?: string) => {
  if (!address) return 'Unknown';
  if (address.length < 72) return address;
  return `${address.slice(0, 4)}...${address.slice(-33)}`;
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
    <span className="font-mono truncate whitespace-nowrap">
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
    <code
      className="text-sm font-mono truncate whitespace-nowrap"
      title={arg.repr}
    >
      {arg.repr.length > 72 ? `${arg.repr.slice(0, 70)}...` : arg.repr}
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

const getTransactionType = (tx: Transaction) => {
  if (tx.tx_type === 'contract_call') {
    return tx.contract_call?.function_name;
  }
  if (tx.tx_type === 'token_transfer') {
    return 'Transfer';
  }
  return tx.tx_type;
};

const getContractInfo = (tx: Transaction) => {
  if (tx.tx_type === 'contract_call') {
    return shortenAddress(tx.contract_call?.contract_id);
  }
  return null;
};

const AssetMovements = ({ summary }: { summary: TransactionSummary }) => {
  const hasSTX = summary.stx_sent !== '0' || summary.stx_received !== '0';
  const hasFT =
    summary.events.ft.transfer > 0 ||
    summary.events.ft.mint > 0 ||
    summary.events.ft.burn > 0;
  const hasNFT =
    summary.events.nft.transfer > 0 ||
    summary.events.nft.mint > 0 ||
    summary.events.nft.burn > 0;

  if (!hasSTX && !hasFT && !hasNFT) return null;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {summary.stx_received !== '0' && (
        <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/10 text-green-700 dark:text-green-300 font-medium">
          +{parseInt(summary.stx_received).toLocaleString()} µSTX
        </span>
      )}
      {summary.stx_sent !== '0' && parseInt(summary.stx_sent) > 1000000 && (
        <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/10 text-red-700 dark:text-red-300 font-medium">
          -{parseInt(summary.stx_sent).toLocaleString()} µSTX
        </span>
      )}
      {hasFT && (
        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 font-medium">
          {[
            summary.events.ft.transfer > 0
              ? `${summary.events.ft.transfer} transfers`
              : null,
            summary.events.ft.mint > 0
              ? `${summary.events.ft.mint} mints`
              : null,
            summary.events.ft.burn > 0
              ? `${summary.events.ft.burn} burns`
              : null,
          ]
            .filter(Boolean)
            .join(', ')}
        </span>
      )}
      {hasNFT && (
        <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 font-medium">
          {[
            summary.events.nft.transfer > 0
              ? `${summary.events.nft.transfer} NFTs`
              : null,
            summary.events.nft.mint > 0
              ? `${summary.events.nft.mint} mints`
              : null,
            summary.events.nft.burn > 0
              ? `${summary.events.nft.burn} burns`
              : null,
          ]
            .filter(Boolean)
            .join(', ')}
        </span>
      )}
    </div>
  );
};

// Modified AccordionTransaction component to handle pending transactions
const AccordionTransaction = ({ tx: summary }: { tx: TransactionSummary }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isPending =
    isMempoolTransaction(summary.tx) || summary.tx.tx_status === 'pending';

  const hasExpandableContent =
    summary.tx.tx_type === 'contract_call' &&
    summary.tx.contract_call &&
    (summary.tx.contract_call.function_args.length > 0 ||
      summary.tx.post_conditions.length > 0);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (hasExpandableContent) {
      setIsExpanded(!isExpanded);
    }
  };

  const contractInfo = getContractInfo(summary.tx);
  const timeValue = isMempoolTransaction(summary.tx)
    ? summary.tx.receipt_time_iso
    : summary.tx.block_time_iso;

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <button
          onClick={handleClick}
          className={cx(
            'w-full bg-gradient-to-r from-slate-50 to-slate-100',
            'dark:from-slate-900 dark:to-slate-800',
            'p-4 border-b border-slate-200 dark:border-slate-800',
            {
              'hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors':
                hasExpandableContent,
              'border-b-0 rounded-b-xl': !isExpanded,
              'cursor-default': !hasExpandableContent,
            }
          )}
        >
          {/* Top Row - TX Info */}
          <div className="flex items-start justify-between w-full mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                {summary.tx.tx_type === 'contract_call' ? (
                  <FileCode className="size-4 text-blue-500" />
                ) : (
                  <Send className="size-4 text-green-500" />
                )}
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <h3 className="font-medium text-sm">
                  {getTransactionType(summary.tx)}
                </h3>
                {contractInfo && (
                  <p className="text-xs font-mono text-slate-500 whitespace-nowrap">
                    {contractInfo}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={summary.tx.tx_status} />
              {hasExpandableContent && (
                <ChevronDown
                  className={cx('size-4 transition-transform', {
                    'transform rotate-180': isExpanded,
                  })}
                />
              )}
            </div>
          </div>

          {/* Bottom Row - Time and Assets */}
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between text-sm text-left">
            <div className="flex items-center gap-2 text-slate-500">
              <Clock className="size-4" />
              <span>
                {summary.tx.block_time_iso
                  ? format(
                      new Date(summary.tx.block_time_iso),
                      'MMM d, HH:mm:ss'
                    )
                  : 'Pending'}
              </span>
            </div>
            <AssetMovements summary={summary} />
          </div>
        </button>

        {hasExpandableContent && (
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-4 space-y-4 border-t border-slate-200 dark:border-slate-800">
                  {/* Contract Details */}
                  {summary.tx.tx_type === 'contract_call' &&
                    summary.tx.contract_call && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Settings className="size-4" />
                          <span>{summary.tx.contract_call.contract_id}</span>
                        </div>
                        <div className="pl-6">
                          <code className="text-sm bg-slate-100 dark:bg-slate-800 rounded px-2 py-1">
                            {summary.tx.contract_call.function_name}
                          </code>
                        </div>

                        <div className="pl-6 space-y-2 mt-2">
                          {summary.tx.contract_call.function_args.map(
                            (arg, i) => (
                              <FunctionArg key={i} arg={arg} />
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Post Conditions */}
                  {summary.tx.post_conditions?.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Lock className="size-4" />
                        <span>Post Conditions</span>
                      </div>

                      <div className="pl-6 space-y-2 w-full">
                        {summary.tx.post_conditions.map((condition, i) => (
                          <PostConditionItem key={i} condition={condition} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
};
// Modified helper function to compute events, now handling mempool transactions
const computeEvents = (tx: Transaction | MempoolTransaction): Events => {
  const events: Events = {
    stx: { transfer: 0, mint: 0, burn: 0 },
    ft: { transfer: 0, mint: 0, burn: 0 },
    nft: { transfer: 0, mint: 0, burn: 0 },
  };

  // For mempool transactions, we can only estimate based on the contract call
  // and post conditions since events haven't occurred yet
  if (isMempoolTransaction(tx)) {
    // Analyze post conditions to predict potential events
    tx.post_conditions.forEach((condition: any) => {
      if (condition.type === 'stx') {
        events.stx.transfer++;
      } else if (condition.type === 'fungible') {
        events.ft.transfer++;
      } else if (condition.type === 'non_fungible') {
        events.nft.transfer++;
      }
    });
    return events;
  }

  // For confirmed transactions, use the existing logic
  (tx as Transaction).events?.forEach((event: any) => {
    if (event.type === 'stx_transfer') {
      events.stx.transfer++;
    } else if (event.type === 'ft_transfer') {
      events.ft.transfer++;
    } else if (event.type === 'ft_mint') {
      events.ft.mint++;
    } else if (event.type === 'ft_burn') {
      events.ft.burn++;
    } else if (event.type === 'nft_transfer') {
      events.nft.transfer++;
    } else if (event.type === 'nft_mint') {
      events.nft.mint++;
    } else if (event.type === 'nft_burn') {
      events.nft.burn++;
    }
  });

  return events;
};

// Modified helper function to compute STX movements, now handling mempool transactions
const computeSTXMovements = (
  tx: Transaction | MempoolTransaction
): { sent: string; received: string } => {
  let sent = '0';
  let received = '0';

  // Always count the fee rate as sent
  sent = tx.fee_rate;

  if (isMempoolTransaction(tx)) {
    // For mempool transactions, analyze post conditions
    tx.post_conditions.forEach((condition: any) => {
      if (condition.type === 'stx') {
        if (condition.principal.address === tx.sender_address) {
          sent = (BigInt(sent) + BigInt(condition.amount)).toString();
        } else {
          received = (BigInt(received) + BigInt(condition.amount)).toString();
        }
      }
    });
    return { sent, received };
  }

  // For confirmed transactions, use the existing logic
  const confirmedTx = tx as Transaction;
  if (confirmedTx.tx_type === 'token_transfer') {
    sent = confirmedTx.fee_rate;
  }

  confirmedTx.events?.forEach((event: any) => {
    if (event.type === 'stx_transfer') {
      if (event.sender === confirmedTx.sender_address) {
        sent = (BigInt(sent) + BigInt(event.amount)).toString();
      }
      if (event.recipient === confirmedTx.sender_address) {
        received = (BigInt(received) + BigInt(event.amount)).toString();
      }
    }
  });

  return { sent, received };
};

// Modified function to create a TransactionSummary from either a Transaction or MempoolTransaction
const createTransactionSummary = (
  tx: Transaction | MempoolTransaction
): TransactionSummary => {
  const events = computeEvents(tx);
  const { sent, received } = computeSTXMovements(tx);

  return {
    tx: tx as Transaction, // Type assertion needed since TransactionSummary expects Transaction
    stx_sent: sent,
    stx_received: received,
    events,
  };
};

// Modified TransactionDisplay to handle the transformation
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

  console.log(response.data);

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

        <div className="space-y-2">
          {response.data.results.map((tx) => (
            <AccordionTransaction
              key={tx.tx_id}
              tx={createTransactionSummary(tx)}
            />
          ))}
        </div>
      </div>
    );
  }

  // Handle single transaction
  return <AccordionTransaction tx={createTransactionSummary(response.data)} />;
}
