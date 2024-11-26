import { motion } from 'framer-motion';
import { Wallet, Blocks } from 'lucide-react';

const features = [
  {
    title: 'Hosted Wallets',
    description:
      'Create Stacks wallets and view your balances, send transactions, and swap tokens',
  },
  {
    title: 'Smart Contracts',
    description:
      'Explore and interact with Stacks smart contracts, from DeFi protocols to NFT marketplaces',
  },
  {
    title: 'Transaction Analytics',
    description:
      'Track your transactions, monitor contract calls, and view detailed execution information',
  },
  {
    title: 'Real-time Monitoring',
    description:
      'Inspect the mempool for pending transactions and watch network activity in real-time',
  },
];

export const Overview = () => {
  return (
    <motion.div
      key="overview"
      className="max-w-6xl mx-auto md:mt-20"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="rounded-xl p-8 flex flex-col gap-8 leading-relaxed text-center max-w-5xl bg-gradient-to-b from-primary/10 to-primary/5">
        <div className="flex flex-row justify-center gap-4 items-center">
          <Blocks className="w-8 h-8 text-primary" />
          <span className="text-2xl">×</span>
          <Wallet className="w-8 h-8 text-primary" />
        </div>

        <h2 className="text-2xl font-bold text-primary">
          Hello, I&apos;m your Bitcoin AI-assistant.
        </h2>

        <p className="text-lg">
          A comprehensive tool for exploring the Stacks blockchain, monitoring
          transactions, and interacting with smart contracts. Get detailed
          insights into your wallet activity and the broader Stacks ecosystem.
        </p>

        {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          {features.map((feature, index) => (
            <div key={index} className="p-4 rounded-lg bg-primary/5">
              <h3 className="font-bold mb-2">{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div> */}

        <p className="text-sm text-muted-foreground">
          Start exploring and interacting with the Stacks blockchain.
        </p>
      </div>
    </motion.div>
  );
};
