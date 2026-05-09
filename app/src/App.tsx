import { useState, useMemo, useCallback } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { SolflareWalletAdapter, PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ArrowRight, Lock, Layers, Zap, CheckCircle, XCircle, Info } from 'lucide-react';

import '@solana/wallet-adapter-react-ui/styles.css';
import { FreelanceContent } from './FreelanceContent';

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
  
  return useMemo(() => ({ toasts, show, remove }), [toasts, show, remove]);
}

// ── Helpers ───────────────────────────────────────────────────

function EscrowContent() {
  const toast = useToast();
  return (
    <>
      <ToastContainer toasts={toast.toasts} remove={toast.remove} />
      <FreelanceContent toast={toast} />
    </>
  );
}

function LandingPage({ onLaunch }: { onLaunch: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
      {/* Decorative background blobs */}
      <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(153,69,255,0.12) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(80px)', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(20,241,149,0.08) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(100px)', zIndex: 0 }} />
      
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12,
              background: 'linear-gradient(135deg, #9945FF, #7c2de0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={18} color="white" />
            </div>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Trust<span className="gradient-text">Layer</span></span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={onLaunch} className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.85rem' }}>
              Launch App
            </button>
          </div>
        </header>

        <main style={{ padding: '100px 0', textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', marginBottom: 24, padding: '6px 16px', background: 'rgba(153,69,255,0.1)', border: '1px solid rgba(153,69,255,0.2)', borderRadius: 100 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-light)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Built on Solana</span>
            </div>
            <h1 style={{ fontSize: '4.5rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 24, color: 'var(--text-primary)' }}>
              Trustless Gigs,<br />
              <span className="gradient-text">Reimagined.</span>
            </h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto 40px', lineHeight: 1.6 }}>
              Hire freelancers securely without centralized intermediaries. TrustLayer provides an immutable smart-contract escrow to guarantee payment upon milestone completion.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <button onClick={onLaunch} className="btn-primary" style={{ padding: '16px 32px', fontSize: '1rem', borderRadius: 12 }}>
                Enter App <ArrowRight size={18} style={{ marginLeft: 8 }} />
              </button>
              <a href="https://github.com/odingaval/trustlayer" target="_blank" rel="noopener noreferrer" style={{ padding: '16px 32px', fontSize: '1rem', borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                View Source
              </a>
            </div>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginTop: 100, textAlign: 'left' }}>
            {[
              { icon: <Lock size={24} color="var(--primary-light)" />, title: 'Zero Trust Needed', desc: 'Smart contracts ensure that trades execute atomically. If the trade criteria are not met, you can refund your assets at any time.' },
              { icon: <Zap size={24} color="var(--secondary)" />, title: 'Lightning Fast', desc: 'Leveraging the Solana network, TrustLayer executes your peer-to-peer swaps in a fraction of a second with incredibly low fees.' },
              { icon: <Layers size={24} color="var(--accent)" />, title: 'Permissionless', desc: 'No KYC, no sign-ups, and no middlemen. Simply connect your wallet and start creating or taking escrow trades immediately.' }
            ].map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 + (i * 0.1) }} className="glass" style={{ padding: 32 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>{f.title}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [isAppLaunched, setIsAppLaunched] = useState(false);

  // Use localnet for development; swap to WalletAdapterNetwork.Devnet for devnet
  const network = WalletAdapterNetwork.Devnet; // kept for type-check; endpoint overrides
  void network;
  const endpoint = 'http://127.0.0.1:8899'; // local validator

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {isAppLaunched
            ? <EscrowContent />
            : <LandingPage onLaunch={() => setIsAppLaunched(true)} />
          }
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
