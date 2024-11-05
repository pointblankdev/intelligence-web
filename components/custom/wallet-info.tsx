import cx from 'classnames';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  Wallet,
  AlertCircle,
  Network,
  Key,
  ShieldCheck,
  Hash,
  User,
} from 'lucide-react';

interface WalletMetadata {
  id: string;
  name: string;
  userId: string;
  encryptedSeed: string;
  metadata: {
    network: {
      chainId: number;
      transactionVersion: number;
      peerNetworkId: number;
      magicBytes: string;
      bootAddress: string;
      addressVersion: {
        singleSig: number;
        multiSig: number;
      };
      client: {
        baseUrl: string;
      };
    };
    type: string;
  };
  lastActive: string;
  createdAt: string;
}

interface Account {
  stxPrivateKey: string;
  dataPrivateKey: string;
  appsKey: string;
  salt: string;
  index: number;
  stxAddress: string;
}

interface WalletResponse {
  success: boolean;
  data?: WalletMetadata | WalletMetadata[] | Account | Account[];
  error?: string;
}

// Helper function to mask sensitive data
const maskSensitiveData = (data: string) => {
  if (data.length < 8) return '••••••';
  return `${data.slice(0, 4)}...${data.slice(-4)}`;
};

// Component to render account information
const AccountCard = ({ account }: { account: Account }) => (
  <div
    className={cx(
      'rounded-2xl p-4 bg-gradient-to-br from-emerald-500/10 to-blue-500/10',
      'dark:from-emerald-500/20 dark:to-blue-500/20',
      'border border-emerald-100 dark:border-emerald-900'
    )}
  >
    <div className="flex justify-between items-start mb-3">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20">
          <User className="size-5 text-emerald-700 dark:text-emerald-300" />
        </div>
        <div>
          <h3 className="font-medium text-emerald-900 dark:text-emerald-100">
            Account {account.index}
          </h3>
          <p className="text-xs font-mono text-emerald-700/70 dark:text-emerald-300/70">
            {maskSensitiveData(account.stxAddress)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
      </div>
    </div>

    <div className="grid grid-cols-1 gap-2 text-sm">
      <div className="p-2 rounded-lg bg-emerald-500/5 dark:bg-emerald-500/10">
        <div className="flex items-center gap-2">
          <Key className="size-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs text-emerald-700/70 dark:text-emerald-300/70">
            STX Private Key
          </span>
        </div>
        <p className="font-mono text-emerald-900 dark:text-emerald-100">
          {maskSensitiveData(account.stxPrivateKey)}
        </p>
      </div>

      <div className="p-2 rounded-lg bg-emerald-500/5 dark:bg-emerald-500/10">
        <div className="flex items-center gap-2">
          <Hash className="size-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs text-emerald-700/70 dark:text-emerald-300/70">
            Address
          </span>
        </div>
        <p className="font-mono text-emerald-900 dark:text-emerald-100 break-all">
          {account.stxAddress}
        </p>
      </div>
    </div>
  </div>
);

// Component to render wallet information
const WalletCard = ({ wallet }: { wallet: WalletMetadata }) => (
  <div
    className={cx(
      'rounded-2xl p-4 bg-gradient-to-br from-purple-500/10 to-blue-500/10',
      'dark:from-purple-500/20 dark:to-blue-500/20',
      'border border-purple-100 dark:border-purple-900'
    )}
  >
    <div className="flex justify-between items-start mb-3">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-purple-500/10 dark:bg-purple-500/20">
          <Wallet className="size-5 text-purple-700 dark:text-purple-300" />
        </div>
        <div>
          <h3 className="font-medium text-purple-900 dark:text-purple-100">
            {wallet.name}
          </h3>
          <p className="text-xs text-purple-700/70 dark:text-purple-300/70">
            Created {format(new Date(wallet.createdAt), 'MMM d, yyyy')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 text-sm">
        <Network className="size-4" />
        <span className="text-purple-700 dark:text-purple-300">
          {wallet.metadata.network.chainId === 1 ? 'Mainnet' : 'Testnet'}
        </span>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-2 text-sm">
      <div className="p-2 rounded-lg bg-purple-500/5 dark:bg-purple-500/10">
        <p className="text-xs text-purple-700/70 dark:text-purple-300/70">
          Last Active
        </p>
        <p className="text-purple-900 dark:text-purple-100">
          {format(new Date(wallet.lastActive), 'MMM d, h:mma')}
        </p>
      </div>
      <div className="p-2 rounded-lg bg-purple-500/5 dark:bg-purple-500/10">
        <p className="text-xs text-purple-700/70 dark:text-purple-300/70">
          Type
        </p>
        <p className="capitalize text-purple-900 dark:text-purple-100">
          {wallet.metadata.type}
        </p>
      </div>
    </div>
  </div>
);

export function WalletInfo({ response }: { response: WalletResponse }) {
  if (!response.success || !response.data) {
    return (
      <div className="rounded-2xl p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300">
        <div className="flex items-center gap-2">
          <AlertCircle className="size-5" />
          <span>
            Error: {response.error || 'Failed to load wallet information'}
          </span>
        </div>
      </div>
    );
  }

  const data = Array.isArray(response.data) ? response.data : [response.data];
  const isAccount = 'stxAddress' in data[0];

  return (
    <motion.div
      className="flex flex-col gap-3 max-w-[500px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {data.map((item, index) => (
        <div
          key={
            isAccount
              ? (item as Account).stxAddress
              : (item as WalletMetadata).id
          }
        >
          {isAccount ? (
            <AccountCard account={item as Account} />
          ) : (
            <WalletCard wallet={item as WalletMetadata} />
          )}
        </div>
      ))}
    </motion.div>
  );
}
