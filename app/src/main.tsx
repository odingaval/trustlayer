import { Buffer } from 'buffer';
import process from 'process';

// Polyfills for Solana/Web3.js
window.Buffer = Buffer;
window.process = process;

if (typeof (window as any).global === 'undefined') {
  (window as any).global = window;
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
try {
  import('./App.tsx').then(module => {
    const App = module.default;
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  }).catch(error => {
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `<div style="padding: 20px; color: #ef4444; font-family: sans-serif;">
        <h2 style="margin-bottom: 10px;">Frontend Crash (Module Load)</h2>
        <pre style="background: #1e293b; padding: 15px; border-radius: 8px; overflow: auto; text-align: left;">${error instanceof Error ? error.stack : String(error)}</pre>
      </div>`;
    }
  });
} catch (error) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding: 20px; color: #ef4444; font-family: sans-serif;">
      <h2 style="margin-bottom: 10px;">Frontend Crash</h2>
      <pre style="background: #1e293b; padding: 15px; border-radius: 8px; overflow: auto; text-align: left;">${error instanceof Error ? error.stack : String(error)}</pre>
    </div>`;
  }
}
