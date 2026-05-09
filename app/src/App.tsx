import { useState, useMemo, useEffect, useCallback } from 'react';
import { ConnectionProvider, WalletProvider, useWallet, useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { SolflareWalletAdapter, PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ArrowRight, Lock, RefreshCw, Layers, Zap, ExternalLink,
  Trash2, CheckCircle, XCircle, Info, ArrowRightLeft, ChevronRight, Wallet
} from 'lucide-react';

import idl from './trustlayer.json';
import type { Trustlayer } from './trustlayer';
import '@solana/wallet-adapter-react-ui/styles.css';

// ── Toast System ─────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType; }

let toastId = 0;
function ToastContainer({ toasts, remove }: { toasts: Toast[]; remove: (id: number) => void }) {
  return (
    <div className="toast-container">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`toast toast-${t.type}`}
            onClick={() => remove(t.id)}
            style={{ cursor: 'pointer' }}
          >
            {t.type === 'success' && <CheckCircle size={18} />}
            {t.type === 'error' && <XCircle size={18} />}
            {t.type === 'info' && <Info size={18} />}
            <span style={{ flex: 1, fontSize: '0.88rem' }}>{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId;
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);
  const remove = useCallback((id: number) => setToasts(p => p.filter(t => t.id !== id)), []);
  return { toasts, show, remove };
}

// ── Helpers ───────────────────────────────────────────────────
const short = (addr: string) => `${addr.slice(0, 4)}…${addr.slice(-4)}`;

// ── Main Content ──────────────────────────────────────────────
function EscrowContent() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const anchorWallet = useAnchorWallet();
  const toast = useToast();

  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [mintA, setMintA] = useState('');
  const [mintB, setMintB] = useState('');
  const [loading, setLoading] = useState(false);
  const [escrows, setEscrows] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  const program = useMemo(() => {
    const wallet = anchorWallet || (publicKey && signTransaction && signAllTransactions
      ? { publicKey, signTransaction, signAllTransactions } : null);
    if (!wallet || !connection) return null;
    try {
      const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' });
      return new Program(idl as any, provider) as Program<Trustlayer>;
    } catch (err) {
      console.error("Failed to initialize program:", err);
      return null;
    }
  }, [anchorWallet, connection, publicKey, signTransaction, signAllTransactions]);

  const fetchEscrows = useCallback(async () => {
    if (!program) return;
    setFetching(true);
    try {
      setEscrows(await program.account.escrow.all());
    } catch (err: any) {
      toast.show('Failed to fetch escrows: ' + (err?.message || err), 'error');
    } finally { setFetching(false); }
  }, [program]);

  useEffect(() => { if (program) fetchEscrows(); }, [program]);

  const handleMake = async () => {
    if (!program || !publicKey) return;
    if (!mintA || !mintB || !amountA || !amountB) {
      toast.show('Please fill in all fields.', 'error'); return;
    }
    setLoading(true);
    try {
      const mintAPK = new PublicKey(mintA);
      const mintBPK = new PublicKey(mintB);
      const [escrowPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('escrow'), publicKey.toBuffer(), mintAPK.toBuffer()], program.programId);
      const [vaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), escrowPDA.toBuffer()], program.programId);
      const makerTAA = getAssociatedTokenAddressSync(mintAPK, publicKey);
      await program.methods.make(new anchor.BN(amountA), new anchor.BN(amountB))
        .accounts({ maker: publicKey, mintA: mintAPK, mintB: mintBPK, makerTokenAccountA: makerTAA, escrow: escrowPDA, vault: vaultPDA } as any)
        .rpc();
      toast.show('Escrow created successfully!', 'success');
      setAmountA(''); setAmountB(''); setMintA(''); setMintB('');
      fetchEscrows();
    } catch (err: any) {
      toast.show('Failed: ' + (err?.message || err), 'error');
    } finally { setLoading(false); }
  };

  const handleTake = async (escrow: any) => {
    if (!program || !publicKey) return;
    const id = escrow.publicKey.toString();
    setProcessing(id);
    try {
      const { maker, mintA: mA, mintB: mB } = escrow.account;
      const [escrowPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('escrow'), maker.toBuffer(), mA.toBuffer()], program.programId);
      const [vaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), escrowPDA.toBuffer()], program.programId);
      await program.methods.take()
        .accounts({
          taker: publicKey, maker, mintA: mA, mintB: mB,
          takerTokenAccountA: getAssociatedTokenAddressSync(mA, publicKey),
          takerTokenAccountB: getAssociatedTokenAddressSync(mB, publicKey),
          makerTokenAccountB: getAssociatedTokenAddressSync(mB, maker),
          escrow: escrowPDA, vault: vaultPDA,
        } as any).rpc();
      toast.show('Trade completed!', 'success');
      fetchEscrows();
    } catch (err: any) {
      toast.show('Take failed: ' + (err?.message || err), 'error');
    } finally { setProcessing(null); }
  };

  const handleRefund = async (escrow: any) => {
    if (!program || !publicKey) return;
    const id = escrow.publicKey.toString();
    setProcessing(id);
    try {
      const { mintA: mA } = escrow.account;
      const [escrowPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('escrow'), publicKey.toBuffer(), mA.toBuffer()], program.programId);
      const [vaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), escrowPDA.toBuffer()], program.programId);
      await program.methods.refund()
        .accounts({ maker: publicKey, mintA: mA, makerTokenAccountA: getAssociatedTokenAddressSync(mA, publicKey), escrow: escrowPDA, vault: vaultPDA } as any)
        .rpc();
      toast.show('Escrow refunded successfully.', 'success');
      fetchEscrows();
    } catch (err: any) {
      toast.show('Refund failed: ' + (err?.message || err), 'error');
    } finally { setProcessing(null); }
  };

  const myEscrows = escrows.filter(e => e.account.maker.toString() === publicKey?.toString());
  const otherEscrows = escrows.filter(e => e.account.maker.toString() !== publicKey?.toString());

  return (
    <>
      <ToastContainer toasts={toast.toasts} remove={toast.remove} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', paddingBottom: 60 }}>

        {/* ── Header ── */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '28px 0 48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: 'linear-gradient(135deg, #9945FF, #7c2de0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(153,69,255,0.4)'
            }}>
              <Shield size={22} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
                Trust<span className="gradient-text">Layer</span>
              </h1>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>
                Solana Escrow Protocol
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {program && (
              <button
                onClick={fetchEscrows}
                disabled={fetching}
                className="btn-ghost"
                title="Refresh escrows"
                style={{ padding: '8px 10px' }}
              >
                <RefreshCw size={15} className={fetching ? 'spin' : ''} />
              </button>
            )}
            <WalletMultiButton />
          </div>
        </header>

        {/* ── Stats bar ── */}
        {program && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 36 }}
          >
            {[
              { label: 'Total Escrows', value: escrows.length, color: 'var(--primary-light)' },
              { label: 'Your Listings', value: myEscrows.length, color: 'var(--secondary)' },
              { label: 'Available Trades', value: otherEscrows.length, color: 'var(--accent)' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>{s.label}</p>
                <p style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{s.value}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Main Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24, alignItems: 'start' }}>

          {/* ── Left: Create Escrow ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="glass"
            style={{ padding: 28 }}
          >
            {/* Card header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(153,69,255,0.12)', border: '1px solid rgba(153,69,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock size={16} color="var(--primary-light)" />
              </div>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Create Escrow</h2>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Lock tokens for trustless swap</p>
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--border)', margin: '18px 0' }} />

            {!publicKey ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <Wallet size={36} color="var(--text-muted)" style={{ margin: '0 auto 16px', opacity: 0.4 }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
                  Connect your wallet to create an escrow
                </p>
                <WalletMultiButton />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* Token A section */}
                <div style={{ padding: 16, background: 'rgba(153,69,255,0.05)', border: '1px solid rgba(153,69,255,0.12)', borderRadius: 14 }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary-light)', marginBottom: 12 }}>
                    You Give
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label className="label">Mint Address</label>
                      <input type="text" placeholder="Token A mint address" value={mintA} onChange={e => setMintA(e.target.value)} className="mono" />
                    </div>
                    <div>
                      <label className="label">Amount</label>
                      <input type="number" placeholder="0" value={amountA} onChange={e => setAmountA(e.target.value)} min="0" />
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="exchange-arrow">
                    <ArrowRight size={14} />
                  </div>
                </div>

                {/* Token B section */}
                <div style={{ padding: 16, background: 'rgba(20,241,149,0.04)', border: '1px solid rgba(20,241,149,0.12)', borderRadius: 14 }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--secondary)', marginBottom: 12 }}>
                    You Receive
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label className="label">Mint Address</label>
                      <input type="text" placeholder="Token B mint address" value={mintB} onChange={e => setMintB(e.target.value)} className="mono" />
                    </div>
                    <div>
                      <label className="label">Amount</label>
                      <input type="number" placeholder="0" value={amountB} onChange={e => setAmountB(e.target.value)} min="0" />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleMake}
                  disabled={loading || !program}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
                >
                  {loading ? <RefreshCw size={16} className="spin" /> : <Zap size={16} />}
                  {loading ? 'Creating…' : !program ? 'Awaiting wallet…' : 'Create Escrow'}
                </button>

                {/* Wallet address */}
                <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Signed in as{' '}
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                    {short(publicKey.toString())}
                  </span>
                </p>
              </div>
            )}
          </motion.div>

          {/* ── Right: Active Trades ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="glass"
            style={{ padding: 28 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(20,241,149,0.1)', border: '1px solid rgba(20,241,149,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowRightLeft size={16} color="var(--secondary)" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Active Trades</h2>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Open escrows on-chain</p>
                </div>
              </div>
              {program && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="pulse-dot" />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Live</span>
                </div>
              )}
            </div>

            <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }} />

            {/* No wallet */}
            {!publicKey && (
              <div className="empty-state">
                <Shield size={48} />
                <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Wallet not connected</p>
                <p style={{ fontSize: '0.85rem' }}>Connect your wallet to view and interact with escrows</p>
                <WalletMultiButton />
              </div>
            )}

            {/* Awaiting program */}
            {publicKey && !program && (
              <div className="empty-state">
                <RefreshCw size={36} className="spin" style={{ opacity: 0.4 }} />
                <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Connecting to Protocol…</p>
                <p style={{ fontSize: '0.85rem' }}>Waiting for wallet authorization</p>
              </div>
            )}

            {/* Escrow list */}
            {program && (
              <AnimatePresence mode="popLayout">
                {fetching && escrows.length === 0 ? (
                  <div className="empty-state">
                    <RefreshCw size={32} className="spin" style={{ opacity: 0.3 }} />
                    <p style={{ fontSize: '0.85rem' }}>Loading escrows…</p>
                  </div>
                ) : escrows.length === 0 ? (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="empty-state">
                    <Layers size={48} />
                    <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No active escrows</p>
                    <p style={{ fontSize: '0.85rem' }}>Create one using the form on the left</p>
                  </motion.div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                    {escrows.map(escrow => {
                      const isOwn = escrow.account.maker.toString() === publicKey?.toString();
                      const pid = escrow.publicKey.toString();
                      const isProcessing = processing === pid;
                      return (
                        <motion.div
                          key={pid}
                          initial={{ opacity: 0, scale: 0.97 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="escrow-card"
                        >
                          {/* Card top */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
                                {short(pid)}
                              </span>
                              {isOwn && <span className="badge badge-primary">Yours</span>}
                            </div>
                            <a
                              href={`https://explorer.solana.com/address/${pid}?cluster=custom&customUrl=http://localhost:8899`}
                              target="_blank" rel="noopener noreferrer"
                              style={{ color: 'var(--text-muted)', display: 'flex', padding: 4, borderRadius: 6, transition: 'color 0.2s' }}
                              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                            >
                              <ExternalLink size={13} />
                            </a>
                          </div>

                          {/* Token exchange display */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--border)' }}>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 3 }}>Giving</p>
                              <p style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--primary-light)' }}>
                                {escrow.account.amount_a.toString()}
                                <span style={{ fontSize: '0.72rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>Tokens</span>
                              </p>
                            </div>
                            <ChevronRight size={16} color="var(--text-muted)" />
                            <div style={{ flex: 1, textAlign: 'right' }}>
                              <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 3 }}>Asking</p>
                              <p style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--secondary)' }}>
                                {escrow.account.amount_b.toString()}
                                <span style={{ fontSize: '0.72rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>Tokens</span>
                              </p>
                            </div>
                          </div>

                          {/* Maker info */}
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                            Maker:{' '}
                            <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                              {short(escrow.account.maker.toString())}
                            </span>
                          </p>

                          {/* Action */}
                          {isOwn ? (
                            <button
                              onClick={() => handleRefund(escrow)}
                              disabled={!!processing}
                              className="btn-danger"
                              style={{ width: '100%', justifyContent: 'center' }}
                            >
                              {isProcessing ? <RefreshCw size={14} className="spin" /> : <Trash2 size={14} />}
                              {isProcessing ? 'Cancelling…' : 'Cancel & Refund'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleTake(escrow)}
                              disabled={!!processing}
                              className="btn-success"
                              style={{ width: '100%', justifyContent: 'center' }}
                            >
                              {isProcessing ? <RefreshCw size={14} className="spin" /> : <Zap size={14} />}
                              {isProcessing ? 'Taking…' : 'Take Trade'}
                            </button>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </AnimatePresence>
            )}
          </motion.div>
        </div>

        {/* ── Footer ── */}
        <footer style={{ textAlign: 'center', padding: '48px 0 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
          <p>© 2026 TrustLayer Protocol · Built on Solana · Trustless · Permissionless</p>
        </footer>
      </div>
    </>
  );
}

export default function App() {
  const endpoint = 'http://127.0.0.1:8899';
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets}>
        <WalletModalProvider>
          <EscrowContent />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
