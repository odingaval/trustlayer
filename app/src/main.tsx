import { Buffer } from 'buffer';
import process from 'process';
window.Buffer = Buffer;
window.process = process;

if (typeof (window as any).global === 'undefined') {
  (window as any).global = window;
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (error) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding: 20px; color: #ef4444; font-family: sans-serif;">
      <h2 style="margin-bottom: 10px;">Frontend Crash</h2>
      <pre style="background: #1e293b; padding: 15px; border-radius: 8px; overflow: auto;">${error instanceof Error ? error.stack : String(error)}</pre>
    </div>`;
  }
}
