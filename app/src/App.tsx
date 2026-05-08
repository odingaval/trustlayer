import { useState, useMemo, useEffect } from 'react';
import { ConnectionProvider, WalletProvider, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ArrowRightLeft, Lock, RefreshCw, Layers, Zap, ExternalLink, Trash2 } from 'lucide-react';

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
  const [escrows, setEscrows] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);


  const connection = new Connection("http://127.0.0.1:8899", 'confirmed');
  
  const program = useMemo(() => {
    if (anchorWallet) {
      const provider = new AnchorProvider(connection, anchorWallet, { preflightCommitment: 'confirmed' });
      return new Program(idl as any, provider) as Program<Trustlayer>;
    }
    return null;
  }, [anchorWallet]);

  const fetchEscrows = async () => {
    if (!program) return;
    setFetching(true);
    try {
      const accounts = await program.account.escrow.all();
      setEscrows(accounts);
    } catch (err) {
      console.error("Error fetching escrows:", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (program) {
      fetchEscrows();
    }
  }, [program]);

  const handleMake = async () => {
    if (!program || !publicKey) return;
    setLoading(true);
    try {
      const mintAPubkey = new PublicKey(mintA);
      const mintBPubkey = new PublicKey(mintB);
      const amountABN = new anchor.BN(amountA);
      const amountBBN = new anchor.BN(amountB);

      const [escrowPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), publicKey.toBuffer(), mintAPubkey.toBuffer()],
        program.programId
      );

      const [vaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), escrowPDA.toBuffer()],
        program.programId
      );

      const makerTokenAccountA = getAssociatedTokenAddressSync(
        mintAPubkey,
        publicKey
      );

      await program.methods
        .make(amountABN, amountBBN)
        .accounts({
          maker: publicKey,
          mintA: mintAPubkey,
          mintB: mintBPubkey,
          makerTokenAccountA: makerTokenAccountA,
          escrow: escrowPDA,
          vault: vaultPDA,
        } as any)
        .rpc();

      alert("Escrow created successfully!");
      setAmountA('');
      setAmountB('');
      setMintA('');
      setMintB('');
      fetchEscrows();
    } catch (err: any) {
      console.error(err);
      alert("Failed to create escrow: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleTake = async (escrow: any) => {
    if (!program || !publicKey) return;
    const id = escrow.publicKey.toString();
    setProcessing(id);
    try {
      const { maker, mintA, mintB } = escrow.account;
      
      const [escrowPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), maker.toBuffer(), mintA.toBuffer()],
        program.programId
      );

      const [vaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), escrowPDA.toBuffer()],
        program.programId
      );

      const takerTokenAccountA = getAssociatedTokenAddressSync(mintA, publicKey);
      const takerTokenAccountB = getAssociatedTokenAddressSync(mintB, publicKey);
      const makerTokenAccountB = getAssociatedTokenAddressSync(mintB, maker);

      await program.methods
        .take()
        .accounts({
          taker: publicKey,
          maker: maker,
          mintA: mintA,
          mintB: mintB,
          takerTokenAccountA: takerTokenAccountA,
          takerTokenAccountB: takerTokenAccountB,
          makerTokenAccountB: makerTokenAccountB,
          escrow: escrowPDA,
          vault: vaultPDA,
        } as any)
        .rpc();

      alert("Trade completed!");
      fetchEscrows();
    } catch (err: any) {
      console.error(err);
      alert("Failed to take trade: " + (err.message || err));
    } finally {
      setProcessing(null);
    }
  };

  const handleRefund = async (escrow: any) => {
    if (!program || !publicKey) return;
    const id = escrow.publicKey.toString();
    setProcessing(id);
    try {
      const { mintA } = escrow.account;
      
      const [escrowPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), publicKey.toBuffer(), mintA.toBuffer()],
        program.programId
      );

      const [vaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), escrowPDA.toBuffer()],
        program.programId
      );

      const makerTokenAccountA = getAssociatedTokenAddressSync(mintA, publicKey);

      await program.methods
        .refund()
        .accounts({
          maker: publicKey,
          mintA: mintA,
          makerTokenAccountA: makerTokenAccountA,
          escrow: escrowPDA,
          vault: vaultPDA,
        } as any)
        .rpc();

      alert("Escrow refunded!");
      fetchEscrows();
    } catch (err: any) {
      console.error(err);
      alert("Failed to refund: " + (err.message || err));
    } finally {
      setProcessing(null);
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
        <div className="flex items-center gap-4">
          <button 
            onClick={fetchEscrows}
            disabled={fetching}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${fetching ? 'animate-spin' : ''}`} />
          </button>
          <WalletMultiButton />
        </div>
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
            className="lg:col-span-7 glass p-8 flex flex-col min-h-[500px]"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-secondary/10 rounded-xl">
                  <ArrowRightLeft className="text-secondary" />
                </div>
                <h3 className="text-2xl font-bold">Active Trades</h3>
              </div>
              <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-mono text-text-secondary">
                {escrows.length} Total
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              <AnimatePresence mode="popLayout">
                {escrows.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center text-center p-12 space-y-4"
                  >
                    <Layers size={48} className="text-text-secondary opacity-20" />
                    <p className="text-text-secondary">No active escrows found on-chain.</p>
                  </motion.div>
                ) : (
                  escrows.map((escrow) => (
                    <motion.div
                      key={escrow.publicKey.toString()}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/30 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-text-secondary bg-white/5 px-2 py-1 rounded">
                            {escrow.publicKey.toString().slice(0, 4)}...{escrow.publicKey.toString().slice(-4)}
                          </span>
                          {escrow.account.maker.toString() === publicKey?.toString() && (
                            <span className="text-[10px] uppercase tracking-wider font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                              Your Trade
                            </span>
                          )}
                        </div>
                        <a 
                          href={`https://explorer.solana.com/address/${escrow.publicKey.toString()}?cluster=custom&customUrl=http://localhost:8899`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white/10 rounded-lg"
                        >
                          <ExternalLink size={14} className="text-text-secondary" />
                        </a>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-[10px] uppercase text-text-secondary font-bold mb-1">Giving</p>
                          <p className="text-lg font-bold truncate">
                            {escrow.account.amountA.toString()} <span className="text-xs text-text-secondary font-normal">Tokens</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase text-text-secondary font-bold mb-1">Asking for</p>
                          <p className="text-lg font-bold text-secondary truncate">
                            {escrow.account.amountB.toString()} <span className="text-xs text-text-secondary font-normal">Tokens</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {escrow.account.maker.toString() === publicKey?.toString() ? (
                          <button 
                            onClick={() => handleRefund(escrow)}
                            disabled={!!processing}
                            className="flex-1 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                          >
                            {processing === escrow.publicKey.toString() ? <RefreshCw className="animate-spin w-4 h-4" /> : <Trash2 size={16} />}
                            Cancel & Refund
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleTake(escrow)}
                            disabled={!!processing}
                            className="flex-1 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-black text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                          >
                            {processing === escrow.publicKey.toString() ? <RefreshCw className="animate-spin w-4 h-4" /> : null}
                            Take Trade
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
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
