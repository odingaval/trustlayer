import { useState, useMemo } from 'react';
import { ConnectionProvider, WalletProvider, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { motion } from 'framer-motion';
import { Shield, ArrowRightLeft, Lock, RefreshCw, Layers, Zap } from 'lucide-react';

// Import IDL
import idl from './trustlayer.json';
import type { Trustlayer } from './trustlayer';

import '@solana/wallet-adapter-react-ui/styles.css';


function EscrowContent() {
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [mintA, setMintA] = useState('');
  const [mintB, setMintB] = useState('');
  const [loading, setLoading] = useState(false);

  const connection = new Connection("http://127.0.0.1:8899", 'confirmed');
  
  const program = useMemo(() => {
    if (anchorWallet) {
      const provider = new AnchorProvider(connection, anchorWallet, { preflightCommitment: 'confirmed' });
      return new Program(idl as any, provider) as Program<Trustlayer>;
    }
    return null;
  }, [anchorWallet]);

  const handleMake = async () => {
    if (!program || !publicKey) return;
    setLoading(true);
    try {
      // Note: In a real app, we'd derive PDAs and check ATAs here
      // This is a simplified version for the UI demonstration
      console.log("Creating escrow...");
      // Logic for derivation and RPC call would go here
      await new Promise(r => setTimeout(r, 2000)); // Simulate
      alert("Escrow created successfully! (Simulation)");
    } catch (err) {
      console.error(err);
      alert("Failed to create escrow");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <header className="flex justify-between items-center mb-16">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-primary to-purple-600 rounded-2xl shadow-lg shadow-primary/20">
            <Shield className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Trust<span className="gradient-text">Layer</span>
          </h1>
        </div>
        <WalletMultiButton />
      </header>

      <main>
        <section className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-extrabold mb-6"
          >
            Secure Your <span className="gradient-text">Assets</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-text-secondary max-w-2xl mx-auto"
          >
            The next generation of trustless escrow protocols on Solana. 
            Fast, secure, and fully decentralized.
          </motion.p>
        </section>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="glass p-8 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Zap size={120} />
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Lock className="text-primary" />
              </div>
              <h3 className="text-2xl font-bold">Create Escrow</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-text-secondary">Token to Offer (Mint A)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Address..." 
                  value={mintA}
                  onChange={(e) => setMintA(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-text-secondary">Token to Receive (Mint B)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Address..." 
                  value={mintB}
                  onChange={(e) => setMintB(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-text-secondary">Amount A</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    placeholder="0.00" 
                    value={amountA}
                    onChange={(e) => setAmountA(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-text-secondary">Amount B</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    placeholder="0.00" 
                    value={amountB}
                    onChange={(e) => setAmountB(e.target.value)}
                  />
                </div>
              </div>
              <button 
                onClick={handleMake}
                disabled={!publicKey || loading}
                className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="animate-spin" /> : <Lock size={18} />}
                {publicKey ? "Lock Assets" : "Connect Wallet First"}
              </button>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="glass p-8 flex flex-col"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-secondary/10 rounded-xl">
                <ArrowRightLeft className="text-secondary" />
              </div>
              <h3 className="text-2xl font-bold">Active Trades</h3>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
              <Layers size={48} className="text-text-secondary opacity-20" />
              <p className="text-text-secondary">No active escrows found for your wallet.</p>
              <button className="text-primary font-semibold hover:underline">Browse Public Trades</button>
            </div>
          </motion.div>
        </div>

        <footer className="text-center text-text-secondary text-sm pb-12">
          <p>© 2026 TrustLayer Protocol. Built on Solana.</p>
        </footer>
      </main>
    </div>
  );
}

export default function App() {
  const endpoint = "http://127.0.0.1:8899";
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <EscrowContent />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
