import { useState, useMemo, useEffect, useCallback } from 'react';
import { Buffer } from 'buffer';
window.Buffer = window.Buffer || Buffer;

import { useWallet, useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { 
  TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddressSync,
  createInitializeMintInstruction,
  MINT_SIZE,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction
} from '@solana/spl-token';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, RefreshCw, Layers, Briefcase, PlusCircle, Check, Coins, Wand2, Shield
} from 'lucide-react';

import idl from './trustlayer.json';
import type { Trustlayer } from './trustlayer';

export function FreelanceContent({ toast }: { toast: any }) {
  const { connection } = useConnection();
  const { publicKey, signTransaction, signAllTransactions, sendTransaction } = useWallet();
  const anchorWallet = useAnchorWallet();

  const [amount, setAmount] = useState('');
  const [mint, setMint] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [minting, setMinting] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'client' | 'freelancer' | 'market'>('client');
  const [viewMode, setViewMode] = useState<'hire' | 'work'>('hire');

  const program = useMemo(() => {
    const wallet = anchorWallet || (publicKey && signTransaction && signAllTransactions
      ? { publicKey, signTransaction, signAllTransactions } : null);
    if (!wallet || !connection) return null;
    try {
      const provider = new anchor.AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' });
      return new anchor.Program(idl as any, provider) as anchor.Program<Trustlayer>;
    } catch (err) {
      console.error("Failed to initialize program:", err);
      return null;
    }
  }, [anchorWallet, connection, publicKey, signTransaction, signAllTransactions]);

  const [lastFetch, setLastFetch] = useState(0);

  const fetchJobs = useCallback(async () => {
    if (!program || fetching) return;
    // Don't fetch more than once every 5 seconds unless forced
    if (Date.now() - lastFetch < 5000) return;

    setFetching(true);
    try {
      // Filter for accounts that match our new v2 size (762 bytes)
      // This prevents the "buffer beyond length" error by ignoring old v1 accounts
      const allJobs = await program.account.jobEscrow.all([
        { dataSize: 762 } 
      ]);
      setJobs(allJobs);
      setLastFetch(Date.now());
    } catch (err: any) {
      if (err?.message?.includes('429')) {
        console.warn("RPC Rate limit reached. Waiting...");
      } else {
        toast.show('Failed to fetch jobs: ' + (err?.message || err), 'error');
      }
    } finally { 
      setFetching(false); 
    }
  }, [program, fetching, lastFetch, toast.show]);

  useEffect(() => { 
    if (program) {
      fetchJobs(); 
    }
  }, [program]);

  const fetchBalance = useCallback(async () => {
    if (!connection || !publicKey || !mint) {
      setTokenBalance(null); return;
    }
    try {
      const mintPK = new PublicKey(mint);
      const ata = getAssociatedTokenAddressSync(mintPK, publicKey);
      const balance = await connection.getTokenAccountBalance(ata);
      setTokenBalance(balance.value.uiAmountString || '0');
    } catch (err) {
      setTokenBalance('0');
    }
  }, [connection, publicKey, mint]);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 30000); // Update every 30s instead of 10s
    return () => clearInterval(interval);
  }, [fetchBalance]);

  const handleCreateTestMint = async () => {
    if (!publicKey || !sendTransaction) return;
    setMinting(true);
    try {
      const mintKeypair = anchor.web3.Keypair.generate();
      const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
      const ata = getAssociatedTokenAddressSync(mintKeypair.publicKey, publicKey);

      const transaction = new anchor.web3.Transaction().add(
        anchor.web3.SystemProgram.createAccount({
          fromPubkey: publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(mintKeypair.publicKey, 6, publicKey, publicKey),
        createAssociatedTokenAccountInstruction(publicKey, ata, publicKey, mintKeypair.publicKey),
        createMintToInstruction(mintKeypair.publicKey, ata, publicKey, 1000000000) // 1000 tokens
      );

      const signature = await sendTransaction(transaction, connection, { signers: [mintKeypair] });
      await connection.confirmTransaction(signature, 'confirmed');
      
      setMint(mintKeypair.publicKey.toString());
      toast.show('Test Mint created & 1000 tokens minted!', 'success');
    } catch (err: any) {
      toast.show('Minting failed: ' + (err?.message || err), 'error');
    } finally { setMinting(false); }
  };

  const handleCreateJob = async () => {
    if (!program || !publicKey) return;
    if (!mint || !amount) {
      toast.show('Please fill in all fields.', 'error'); return;
    }
    setLoading(true);
    try {
      const mintPK = new PublicKey(mint);
      const arbiterPK = new PublicKey('11111111111111111111111111111111'); // Hardcoded arbiter for demo
      const jobId = new anchor.BN(Date.now()); // Generate unique ID
      
      const [jobPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('job_v2'), publicKey.toBuffer(), jobId.toArrayLike(Buffer, 'le', 8)], 
        program.programId
      );
      const [vaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), jobPDA.toBuffer()], 
        program.programId
      );

      const clientTA = getAssociatedTokenAddressSync(mintPK, publicKey);

      await program.methods.initializeJob(jobId, new anchor.BN(amount), arbiterPK, title, description)
        .accounts({
          client: publicKey,
          mint: mintPK,
          clientTokenAccount: clientTA,
          job: jobPDA,
          vault: vaultPDA,
        } as any).rpc();

      toast.show('Job created successfully!', 'success');
      setAmount(''); setMint(''); setTitle(''); setDescription('');
      fetchJobs();
      fetchBalance();
    } catch (err: any) {
      console.error("Action failed:", err);
      const msg = err?.logs?.join('\n') || err?.message || err;
      if (msg.includes('insufficient funds')) {
        toast.show('Error: Insufficient token funds in your wallet.', 'error');
      } else {
        toast.show('Failed: ' + (msg.length > 100 ? msg.substring(0, 100) + '...' : msg), 'error');
      }
    } finally { setLoading(false); }
  };

  const handleAction = async (job: any, action: string) => {
    if (!program || !publicKey) return;
    const id = job.publicKey.toString();
    setProcessing(id);
    try {
      const jobAccount = job.account;
      const clientPK = jobAccount.client;
      const mintPK = jobAccount.mint;
      const jobId = jobAccount.jobId;

      const [jobPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('job_v2'), clientPK.toBuffer(), jobId.toArrayLike(Buffer, 'le', 8)], 
        program.programId
      );
      const [vaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), jobPDA.toBuffer()], 
        program.programId
      );

      if (action === 'accept') {
        await program.methods.acceptJob()
          .accounts({ freelancer: publicKey, job: jobPDA } as any).rpc();
        toast.show('Job accepted!', 'success');
      } else if (action === 'submit') {
        await program.methods.submitWork()
          .accounts({ freelancer: publicKey, job: jobPDA } as any).rpc();
        toast.show('Work submitted for review!', 'success');
      } else if (action === 'approve') {
        const freelancerTA = getAssociatedTokenAddressSync(mintPK, jobAccount.freelancer);
        await program.methods.approveAndRelease()
          .accounts({ 
            client: publicKey, freelancer: jobAccount.freelancer, job: jobPDA, 
            mint: mintPK, freelancerTokenAccount: freelancerTA, vault: vaultPDA 
          } as any).rpc();
        toast.show('Payment released!', 'success');
      } else if (action === 'cancel') {
        const clientTA = getAssociatedTokenAddressSync(mintPK, publicKey);
        await program.methods.cancelJob()
          .accounts({ client: publicKey, job: jobPDA, mint: mintPK, clientTokenAccount: clientTA, vault: vaultPDA } as any).rpc();
        toast.show('Job cancelled & refunded!', 'success');
      }
      
      fetchJobs();
    } catch (err: any) {
      toast.show(action + ' failed: ' + (err?.message || err), 'error');
    } finally { setProcessing(null); }
  };

  const myClientJobs = jobs.filter(j => j.account.client.toString() === publicKey?.toString());
  const myFreelancerJobs = jobs.filter(j => j.account.freelancer.toString() === publicKey?.toString());
  const openJobs = jobs.filter(j => Object.keys(j.account.status)[0] === 'open' && j.account.client.toString() !== publicKey?.toString());

  const renderStatus = (statusObj: any) => {
    const status = Object.keys(statusObj)[0];
    const map: Record<string, {label: string, color: string}> = {
      open: { label: 'Open', color: 'var(--primary-light)' },
      inProgress: { label: 'In Progress', color: 'var(--accent)' },
      inReview: { label: 'In Review', color: '#fbbf24' },
      disputed: { label: 'Disputed', color: '#ef4444' },
      completed: { label: 'Completed', color: 'var(--secondary)' },
      refunded: { label: 'Refunded', color: 'var(--text-muted)' }
    };
    const mapped = map[status] || { label: status, color: 'var(--text-primary)' };
    return <span style={{ color: mapped.color, fontWeight: 700, fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: 6 }}>{mapped.label}</span>;
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', paddingBottom: 60 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '28px 0 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #9945FF, #7c2de0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Briefcase size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
              Trust<span className="gradient-text">Layer</span> Gigs
            </h1>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>
              Freelance Escrow Dashboard
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Role Toggle Switch */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: 4, borderRadius: 12, border: '1px solid var(--border)', marginRight: 10 }}>
            <button 
              onClick={() => { setViewMode('hire'); setActiveTab('client'); }}
              style={{ 
                padding: '6px 16px', borderRadius: 8, border: 'none', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                background: viewMode === 'hire' ? 'var(--primary-light)' : 'transparent',
                color: viewMode === 'hire' ? 'white' : 'var(--text-muted)',
                transition: 'all 0.2s'
              }}
            >
              I want to Hire
            </button>
            <button 
              onClick={() => { setViewMode('work'); setActiveTab('market'); }}
              style={{ 
                padding: '6px 16px', borderRadius: 8, border: 'none', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                background: viewMode === 'work' ? 'var(--secondary)' : 'transparent',
                color: viewMode === 'work' ? 'white' : 'var(--text-muted)',
                transition: 'all 0.2s'
              }}
            >
              I want to Work
            </button>
          </div>

          {program && (
            <button onClick={fetchJobs} disabled={fetching} className="btn-ghost" title="Refresh jobs" style={{ padding: '8px 10px' }}>
              <RefreshCw size={15} className={fetching ? 'spin' : ''} />
            </button>
          )}
          <WalletMultiButton />
        </div>
      </header>

      {program && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 36 }}>
          {[
            { label: 'Available Gigs', value: openJobs.length, color: 'var(--primary-light)' },
            { label: 'Hiring (Client)', value: myClientJobs.length, color: 'var(--secondary)' },
            { label: 'Working (Freelancer)', value: myFreelancerJobs.length, color: 'var(--accent)' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>{s.label}</p>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{s.value}</p>
            </div>
          ))}
        </motion.div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'hire' ? '380px 1fr' : '1fr', gap: 32 }}>
        {/* LEFT: Action Panel (Only in Hire mode) */}
        {viewMode === 'hire' && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }} className="glass" style={{ padding: 28, height: 'fit-content', position: 'sticky', top: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(153,69,255,0.12)', border: '1px solid rgba(153,69,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PlusCircle size={16} color="var(--primary-light)" />
              </div>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Post a Gig</h2>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Fund a new freelance job escrow</p>
              </div>
            </div>
            <div style={{ height: 1, background: 'var(--border)', margin: '18px 0' }} />

            {!publicKey ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <Lock size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Connect your wallet to post a gig.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label className="label">Job Title</label>
                  <input type="text" placeholder="e.g. Design a Logo" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div>
                  <label className="label">Description / Requirements</label>
                  <textarea 
                    placeholder="Describe what needs to be done..." 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, color: 'white', fontSize: '0.85rem', minHeight: 80, outline: 'none' }}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label className="label" style={{ marginBottom: 0 }}>Payment Token Mint</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {tokenBalance !== null && (
                        <div style={{ fontSize: '0.65rem', color: 'var(--secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Coins size={10} /> Bal: {tokenBalance}
                        </div>
                      )}
                      <button onClick={handleCreateTestMint} disabled={minting} className="btn-ghost" style={{ fontSize: '0.65rem', padding: '2px 8px', height: 'auto', gap: 4 }}>
                        {minting ? <RefreshCw size={10} className="spin" /> : <Wand2 size={10} />}
                        Auto-Setup
                      </button>
                    </div>
                  </div>
                  <input type="text" placeholder="USDC Mint Address..." value={mint} onChange={e => setMint(e.target.value)} className="mono" />
                </div>
                <div>
                  <label className="label">Budget Amount</label>
                  <input type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} min="0" />
                </div>
                <button onClick={handleCreateJob} disabled={loading || !program} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
                  {loading ? <RefreshCw size={16} className="spin" /> : <Lock size={16} />}
                  {loading ? 'Funding Escrow…' : !program ? 'Awaiting wallet…' : 'Fund Job'}
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* RIGHT: Jobs List */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="glass" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(20,241,149,0.1)', border: '1px solid rgba(20,241,149,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={16} color="var(--secondary)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Job Contracts</h2>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Active escrows on-chain</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
            {viewMode === 'hire' ? (
              <button onClick={() => setActiveTab('client')} style={{ background: 'none', border: 'none', color: activeTab === 'client' ? 'var(--primary-light)' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', position: 'relative', padding: '4px 8px' }}>
                My Active Contracts {myClientJobs.length > 0 && <span style={{ marginLeft: 6, opacity: 0.6 }}>({myClientJobs.length})</span>}
                {activeTab === 'client' && <motion.div layoutId="tab" style={{ position: 'absolute', bottom: -11, left: 0, right: 0, height: 2, background: 'var(--primary-light)' }} />}
              </button>
            ) : (
              <>
                <button onClick={() => setActiveTab('market')} style={{ background: 'none', border: 'none', color: activeTab === 'market' ? 'var(--secondary)' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', position: 'relative', padding: '4px 8px' }}>
                  Available Gigs {openJobs.length > 0 && <span style={{ marginLeft: 6, opacity: 0.6 }}>({openJobs.length})</span>}
                  {activeTab === 'market' && <motion.div layoutId="tab" style={{ position: 'absolute', bottom: -11, left: 0, right: 0, height: 2, background: 'var(--secondary)' }} />}
                </button>
                <button onClick={() => setActiveTab('freelancer')} style={{ background: 'none', border: 'none', color: activeTab === 'freelancer' ? 'var(--primary-light)' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', position: 'relative', padding: '4px 8px' }}>
                  My Gigs {myFreelancerJobs.length > 0 && <span style={{ marginLeft: 6, opacity: 0.6 }}>({myFreelancerJobs.length})</span>}
                  {activeTab === 'freelancer' && <motion.div layoutId="tab" style={{ position: 'absolute', bottom: -11, left: 0, right: 0, height: 2, background: 'var(--primary-light)' }} />}
                </button>
              </>
            )}
          </div>

          {program && (
            <AnimatePresence mode="wait">
              {fetching && jobs.length === 0 ? (
                <div className="empty-state" key="loading"><RefreshCw size={32} className="spin" style={{ opacity: 0.3 }} /><p>Scanning Devnet...</p></div>
              ) : (
                <motion.div key={activeTab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                  {activeTab === 'client' && myClientJobs.length === 0 && <div className="empty-state"><PlusCircle size={32} style={{ opacity: 0.3 }} /><p>You haven't created any jobs yet.<br/><span style={{ fontSize: '0.7rem' }}>Use the form on the left to start.</span></p></div>}
                  {activeTab === 'freelancer' && myFreelancerJobs.length === 0 && <div className="empty-state"><Briefcase size={32} style={{ opacity: 0.3 }} /><p>You haven't accepted any gigs yet.</p></div>}
                  {activeTab === 'market' && openJobs.length === 0 && <div className="empty-state"><Layers size={32} style={{ opacity: 0.3 }} /><p>No open gigs available at the moment.<br/><span style={{ fontSize: '0.7rem' }}>Try creating one with a different wallet!</span></p></div>}
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                    {(activeTab === 'client' ? myClientJobs : activeTab === 'freelancer' ? myFreelancerJobs : openJobs).map(job => {
                      const isClient = job.account.client.toString() === publicKey?.toString();
                      const isFreelancer = job.account.freelancer.toString() === publicKey?.toString();
                      const status = Object.keys(job.account.status)[0];
                      const pid = job.publicKey.toString();
                      const isProc = processing === pid;

                      return (
                        <motion.div key={pid} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="escrow-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-muted)' }}>ID: {job.account.jobId.toString()}</span>
                            {renderStatus(job.account.status)}
                          </div>

                          <div style={{ marginBottom: 14 }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 4 }}>{job.account.title || 'Untitled Job'}</h3>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {job.account.description || 'No description provided.'}
                            </p>
                          </div>

                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', marginBottom: '14px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Payout</p>
                              <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }} title={job.account.arbiter.toString()}>
                                <Shield size={10} /> Arbiter: {job.account.arbiter.toString().substring(0, 4)}...
                              </p>
                            </div>
                            <p style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--primary-light)' }}>{job.account.amount.toString()} Tokens</p>
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {isClient && status === 'open' && (
                              <button onClick={() => handleAction(job, 'cancel')} disabled={!!processing} className="btn-danger" style={{ justifyContent: 'center' }}>
                                {isProc ? <RefreshCw size={14} className="spin" /> : 'Cancel & Refund'}
                              </button>
                            )}
                            {isClient && status === 'inReview' && (
                              <button onClick={() => handleAction(job, 'approve')} disabled={!!processing} className="btn-success" style={{ justifyContent: 'center' }}>
                                {isProc ? <RefreshCw size={14} className="spin" /> : <Check size={14} />} Approve & Pay
                              </button>
                            )}
                            {!isClient && !isFreelancer && status === 'open' && (
                              <button onClick={() => handleAction(job, 'accept')} disabled={!!processing} className="btn-primary" style={{ justifyContent: 'center' }}>
                                {isProc ? <RefreshCw size={14} className="spin" /> : 'Accept Job'}
                              </button>
                            )}
                            {isFreelancer && status === 'inProgress' && (
                              <button onClick={() => handleAction(job, 'submit')} disabled={!!processing} className="btn-primary" style={{ justifyContent: 'center' }}>
                                {isProc ? <RefreshCw size={14} className="spin" /> : 'Submit Work'}
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </motion.div>
      </div>
      <footer style={{ textAlign: 'center', padding: '48px 0 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
        <p>© 2026 TrustLayer Gigs · Built on Solana</p>
      </footer>
    </div>
  );
}
