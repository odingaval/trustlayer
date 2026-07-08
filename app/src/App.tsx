import { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ArrowRight, Lock, Layers, Zap, CheckCircle, XCircle, Info, Loader2 } from 'lucide-react';

import LandingPage from './LandingPage';

import '@solana/wallet-adapter-react-ui/styles.css';

// Lazy load the heavy Solana content and its providers
const SolanaWrapper = lazy(() => import('./SolanaWrapper'));

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

function EscrowContent({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  return (
    <>
      <ToastContainer toasts={toast.toasts} remove={toast.remove} />
      <Suspense fallback={
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 20 }}>
          <Loader2 size={40} className="spin" color="var(--primary)" />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Initializing Secure Layers...</p>
        </div>
      }>
        <SolanaWrapper toast={toast} onBack={onBack} />
      </Suspense>
    </>
  );
}



export default function App() {
  const [isAppLaunched, setIsAppLaunched] = useState(false);

  return (
    <>
      {isAppLaunched
        ? <EscrowContent onBack={() => setIsAppLaunched(false)} />
        : <LandingPage onLaunch={() => setIsAppLaunched(true)} />
      }
    </>
  );
}
