import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ArrowRight, Lock, Layers, Zap, Code, Globe, Cpu, CheckCircle, Mail, Sparkles } from 'lucide-react';

export default function LandingPage({ onLaunch }: { onLaunch: () => void }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/loops/contacts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'waitlist',
          userGroup: 'waitlist',
          // Add the list ID if you set VITE_LOOPS_LIST_ID in .env
          ...(import.meta.env.VITE_LOOPS_LIST_ID
            ? { mailingLists: { [import.meta.env.VITE_LOOPS_LIST_ID]: true } }
            : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Something went wrong. Please try again.');
      }

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      <div className="mesh-bg" />
      <div className="grid-overlay" />
      
      {/* Navbar */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '20px 0', background: 'rgba(7, 7, 8, 0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div style={{
              width: 36, height: 36, borderRadius: 12,
              background: 'linear-gradient(135deg, #7B3FE4, #10B981)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(123, 63, 228, 0.3)'
            }}>
              <Shield size={18} color="white" />
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'white' }}>
              Trust<span className="gradient-text">Layer</span>
            </span>
          </div>
          
          <div style={{ display: 'none', gap: 32, alignItems: 'center' }} className="nav-links">
            {['About', 'How it Works', 'Features'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = 'white'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}>
                {item}
              </a>
            ))}
          </div>

          <button onClick={onLaunch} className="btn-primary" style={{ padding: '10px 24px', fontSize: '0.85rem' }}>
            Launch App
          </button>
        </div>
      </nav>

      <style>{`
        @media (min-width: 768px) {
          .nav-links { display: flex !important; }
        }
        section { scroll-margin-top: 80px; }
      `}</style>

      {/* Hero Section */}
      <section style={{ paddingTop: '160px', paddingBottom: '80px', textAlign: 'center', position: 'relative' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', marginBottom: 24, padding: '6px 16px', background: 'rgba(123, 63, 228, 0.1)', border: '1px solid rgba(123, 63, 228, 0.2)', borderRadius: 100 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A78BFA', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Revolutionizing Freelance</span>
            </div>
            <h1 style={{ fontSize: 'clamp(3rem, 8vw, 5rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 24, color: 'white' }}>
              Trustless Escrow <br />
              <span className="gradient-text">for the Gig Economy.</span>
            </h1>
            <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', maxWidth: 650, margin: '0 auto 40px', lineHeight: 1.6 }}>
              Hire top talent and work with confidence. TrustLayer uses Solana smart contracts to lock funds in escrow, releasing them only when milestones are verifiably met. No middlemen. No exorbitant fees.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
              <button onClick={onLaunch} className="btn-primary" style={{ padding: '16px 36px', fontSize: '1.05rem', borderRadius: 12 }}>
                Launch App <ArrowRight size={18} style={{ marginLeft: 8 }} />
              </button>
              <a href="#how-it-works" style={{ padding: '16px 36px', fontSize: '1.05rem', borderRadius: 12, background: 'rgba(255,255,255,0.03)', color: 'white', textDecoration: 'none', fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}>
                Learn More
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" style={{ padding: '100px 0', background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.4), transparent)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 60, alignItems: 'center' }}>
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 20, color: 'white' }}>Why TrustLayer?</h2>
              <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 20 }}>
                Traditional freelance platforms charge up to 20% in fees, hold your funds hostage, and arbitrate disputes poorly. 
              </p>
              <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 30 }}>
                TrustLayer replaces the middleman with an immutable Solana smart contract. Clients lock their funds in escrow, proving they have the money. Freelancers submit work knowing they will be paid instantly upon approval.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {['Zero intermediary fees', 'Instant USDC settlement', 'Transparent on-chain reputation'].map(item => (
                  <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'white', fontWeight: 500 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle size={14} color="#10B981" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="glass" style={{ padding: 40, position: 'relative' }}>
               <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: 'radial-gradient(circle, rgba(123, 63, 228, 0.4) 0%, transparent 70%)', filter: 'blur(20px)', zIndex: -1 }} />
               <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 24, color: 'white' }}>The Old Way vs. TrustLayer</h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                   <span style={{ color: 'var(--text-muted)' }}>Platform Fees</span>
                   <span style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through' }}>20%</span>
                   <span style={{ color: '#10B981', fontWeight: 700 }}>0%</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                   <span style={{ color: 'var(--text-muted)' }}>Payout Speed</span>
                   <span style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through' }}>5-10 Days</span>
                   <span style={{ color: '#10B981', fontWeight: 700 }}>Instant</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                   <span style={{ color: 'var(--text-muted)' }}>Dispute Control</span>
                   <span style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through' }}>Black Box</span>
                   <span style={{ color: '#10B981', fontWeight: 700 }}>Decentralized</span>
                 </div>
               </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" style={{ padding: '100px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 16, color: 'white' }}>How It Works</h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', maxWidth: 600, margin: '0 auto 60px' }}>
            A radically transparent workflow designed to protect both parties and ensure successful delivery.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 30, textAlign: 'left', position: 'relative' }}>
            {[
              { step: '01', title: 'Client Funds Escrow', desc: 'The client deposits USDC into a secure on-chain vault, creating a job with clear milestones.' },
              { step: '02', title: 'Freelancer Applies & Works', desc: 'Talent applies for the gig. Once hired, they work with the guarantee that the funds are secured.' },
              { step: '03', title: 'Submit & Review', desc: 'The freelancer submits completed work or milestones on-chain for the client to review.' },
              { step: '04', title: 'Instant Payout', desc: 'Upon approval, the smart contract immediately releases funds from the vault to the freelancer.' }
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }} className="glass" style={{ padding: 32, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, fontSize: '6rem', fontWeight: 800, color: 'rgba(255,255,255,0.03)', lineHeight: 1, zIndex: 0 }}>
                  {s.step}
                </div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 12, color: 'white' }}>{s.title}</h3>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ padding: '100px 0', background: 'linear-gradient(to top, rgba(123, 63, 228, 0.05), transparent)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 16, color: 'white' }}>State-of-the-Art Features</h2>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', maxWidth: 600, margin: '0 auto' }}>Everything you need to run freelance gigs without intermediaries.</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {[
              { icon: <Lock size={28} color="#A78BFA" />, title: 'Smart Contract Escrow', desc: 'Code is law. Funds are locked securely and can only be released upon mutual agreement or through decentralized arbitration.' },
              { icon: <Zap size={28} color="#10B981" />, title: 'Blazing Fast on Solana', desc: 'No waiting for blocks. Create contracts, submit work, and receive payouts in under 400 milliseconds.' },
              { icon: <Layers size={28} color="#0ea5e9" />, title: 'Milestone Payments', desc: 'Break down large projects into manageable chunks. Get paid for each stage of the work you complete.' },
              { icon: <Globe size={28} color="#f59e0b" />, title: 'Permissionless Global Access', desc: 'No banks, no KYC, no boundaries. Work with anyone, anywhere in the world using just a crypto wallet.' },
              { icon: <Code size={28} color="#ec4899" />, title: 'Immutable Audit Trail', desc: 'Every application, status update, and payment is recorded on the blockchain forever, building true verifiable reputation.' },
              { icon: <Cpu size={28} color="#8b5cf6" />, title: 'Arbitration System', desc: 'In case of disputes, funds are locked and a trusted decentralized arbiter can step in to review the work and split the funds.' }
            ].map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.05 }} className="glass" style={{ padding: 32 }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 12, color: 'white' }}>{f.title}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist Section */}
      <section id="waitlist" style={{ padding: '100px 0', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Background glow */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, height: 400, background: 'radial-gradient(ellipse at center, rgba(123, 63, 228, 0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '30%', left: '20%', width: 200, height: 200, background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24, padding: '6px 16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 100 }}>
              <Sparkles size={12} color="#10B981" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10B981', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Early Access</span>
            </div>

            <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 16, color: 'white' }}>
              Be the First to Experience <span className="gradient-text">TrustLayer</span>
            </h2>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', marginBottom: 40, lineHeight: 1.6 }}>
              We're onboarding early freelancers and clients. Drop your email and we'll notify you the moment we're live on mainnet.
            </p>

            <AnimatePresence mode="wait">
              {!submitted ? (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  onSubmit={handleWaitlistSubmit}
                  style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}
                >
                  <div style={{
                    display: 'flex',
                    width: '100%',
                    maxWidth: 520,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 14,
                    overflow: 'hidden',
                    transition: 'border-color 0.2s',
                  }}
                    onFocus={() => {}}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', color: 'var(--text-muted)' }}>
                      <Mail size={18} />
                    </div>
                    <input
                      id="waitlist-email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        padding: '16px 0',
                        fontSize: '1rem',
                        color: 'white',
                        fontFamily: 'inherit',
                      }}
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary"
                      style={{
                        margin: 6,
                        padding: '10px 24px',
                        fontSize: '0.9rem',
                        borderRadius: 10,
                        whiteSpace: 'nowrap',
                        opacity: loading ? 0.7 : 1,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'opacity 0.2s',
                      }}
                    >
                      {loading ? 'Joining...' : 'Join Waitlist'}
                    </button>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
                    No spam, ever. Unsubscribe anytime.
                  </p>
                  {error && (
                    <p style={{ fontSize: '0.85rem', color: '#f87171', margin: 0, padding: '10px 16px', background: 'rgba(248, 113, 113, 0.08)', borderRadius: 8, border: '1px solid rgba(248, 113, 113, 0.2)' }}>
                      ⚠️ {error}
                    </p>
                  )}
                </motion.form>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="glass"
                  style={{ padding: '32px 40px', borderRadius: 16, display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
                >
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={26} color="#10B981" />
                  </div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'white', margin: 0 }}>You're on the list! 🎉</h3>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', margin: 0 }}>We'll reach out to <strong style={{ color: 'white' }}>{email}</strong> as soon as early access opens.</p>
                  <button onClick={onLaunch} className="btn-primary" style={{ padding: '10px 24px', fontSize: '0.85rem', borderRadius: 10, marginTop: 8 }}>
                    Try the Devnet App <ArrowRight size={14} style={{ marginLeft: 6 }} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '60px 0 40px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #7B3FE4, #10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={16} color="white" />
            </div>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'white' }}>
              Trust<span className="gradient-text">Layer</span>
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 32, textAlign: 'center' }}>
            Decentralizing the gig economy. Built with ♥ on Solana.
          </p>
          <div style={{ display: 'flex', gap: 24 }}>
            <a href="https://x.com/Trustayer0" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='white'} onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}>Twitter</a>
            <a href="https://www.linkedin.com/company/trustlayer0/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='white'} onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}>LinkedIn</a>
            <a href="mailto:trustlayer01@gmail.com" style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='white'} onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}>Contact</a>
          </div>
          <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.05)', margin: '40px 0 24px' }} />
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>&copy; {new Date().getFullYear()} TrustLayer. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
