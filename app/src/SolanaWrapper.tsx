import { useMemo, Suspense, lazy } from 'react';
import { Buffer } from 'buffer';

// Ensure Buffer is global before ANY other Solana imports
window.Buffer = window.Buffer || Buffer;
window.global = window.global || window;
window.process = window.process || { env: {} };

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { Loader2, AlertCircle } from 'lucide-react';

// Even lazier load for the actual dashboard content
const FreelanceContent = lazy(() => import('./FreelanceContent').then(m => ({ default: m.FreelanceContent })));

export default function SolanaWrapper({ toast }: { toast: any }) {
  // Use Devnet for testing as it's more reliable for handshake verification
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);
  
  // Use standard discovery (empty array) for better compatibility with modern wallets
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Suspense fallback={
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 20 }}>
              <Loader2 size={40} className="spin" color="var(--primary)" />
              <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Establishing Secure Link...</p>
            </div>
          }>
            <ErrorBoundary>
              <FreelanceContent toast={toast} />
            </ErrorBoundary>
          </Suspense>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

// Simple internal Error Boundary to catch Solana-specific crashes
import React from 'react';
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 40, textAlign: 'center' }}>
          <AlertCircle size={48} color="#ef4444" style={{ marginBottom: 20 }} />
          <h2 style={{ marginBottom: 12 }}>Initialization Failed</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 400, marginBottom: 24 }}>
            The Solana environment could not be initialized. This is often due to missing wallet polyfills or a connection issue.
          </p>
          <button onClick={() => window.location.reload()} className="btn-primary">Retry Connection</button>
        </div>
      );
    }
    return this.props.children;
  }
}
