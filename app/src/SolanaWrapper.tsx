import { useMemo, Suspense, lazy } from 'react';
import { Buffer } from 'buffer';

// Ensure Buffer is global before ANY other Solana imports
window.Buffer = (window as any).Buffer || Buffer;
window.global = (window as any).global || window;
window.process = (window as any).process || { env: {} };

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
  
  // Explicitly list adapters for better stability
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ], []);

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
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any, errorInfo: any}> {
  constructor(props: any) { 
    super(props); 
    this.state = { hasError: false, error: null, errorInfo: null }; 
  }
  componentDidCatch(error: any, errorInfo: any) {
    this.setState({ hasError: true, error, errorInfo });
    console.error("Critical App Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 40, textAlign: 'center' }}>
          <AlertCircle size={48} color="#ef4444" style={{ marginBottom: 20 }} />
          <h2 style={{ marginBottom: 12 }}>Initialization Failed</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 600, marginBottom: 12 }}>
            The Solana environment could not be initialized. 
          </p>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 8, textAlign: 'left', marginBottom: 24, width: '100%', maxWidth: 800, overflow: 'auto' }}>
            <p style={{ color: '#ef4444', fontSize: '0.75rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              {this.state.error?.toString()}
              {"\n\n"}
              {this.state.errorInfo?.componentStack}
            </p>
          </div>
          <button onClick={() => window.location.reload()} className="btn-primary">Retry Connection</button>
        </div>
      );
    }
    return this.props.children;
  }
}
