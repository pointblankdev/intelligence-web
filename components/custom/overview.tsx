import { motion } from 'framer-motion';
import Link from 'next/link';
import { GiSpellBook, GiWallet } from 'react-icons/gi'; // Using game-themed icons

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
          <GiSpellBook className="w-8 h-8 text-primary" />
          <span className="text-2xl">×</span>
          <GiWallet className="w-8 h-8 text-primary" />
        </div>

        <h2 className="text-2xl font-bold text-primary">
          Welcome to Your Blockchain Adventure
        </h2>

        <p className="text-lg">
          Charisma Explore transforms your Stacks journey into an immersive
          adventure where your wallet becomes your character, your tokens become
          your inventory, and the blockchain becomes your world to explore.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="p-4 rounded-lg bg-primary/5">
            <h3 className="font-bold mb-2">Your Character</h3>
            <p>
              Your Stacks wallet is your digital avatar, carrying your tokens
              and NFTs as powerful artifacts
            </p>
          </div>

          <div className="p-4 rounded-lg bg-primary/5">
            <h3 className="font-bold mb-2">The World</h3>
            <p>
              Smart contracts form the landscape, while DEXs and marketplaces
              become bustling trading posts
            </p>
          </div>

          <div className="p-4 rounded-lg bg-primary/5">
            <h3 className="font-bold mb-2">Your Actions</h3>
            <p>
              Every transaction is an interaction with this world, leaving your
              mark on the blockchain
            </p>
          </div>

          <div className="p-4 rounded-lg bg-primary/5">
            <h3 className="font-bold mb-2">Live Activity</h3>
            <p>
              Watch the mempool come alive as other adventurers interact with
              the world in real-time
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Begin your journey by connecting your wallet, and our AI Dungeon
          Master will guide you through a personalized adventure in the world of
          Stacks.
        </p>

        {/* <div className="text-sm text-muted-foreground">
          <Link
            href="https://docs.charisma.xyz"
            target="_blank"
            className="font-medium underline underline-offset-4 hover:text-primary"
          >
            Read the Chronicles
          </Link>
          <span className="mx-2">•</span>
          <Link
            href="https://github.com/charisma-xyz/explore"
            target="_blank"
            className="font-medium underline underline-offset-4 hover:text-primary"
          >
            View the Sourcebook
          </Link>
        </div> */}
      </div>
    </motion.div>
  );
};
