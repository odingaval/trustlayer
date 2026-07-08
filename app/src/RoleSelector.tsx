import { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, PlusCircle, ArrowRight, Shield } from 'lucide-react';

interface RoleSelectorProps {
  onSelect: (role: 'hire' | 'work') => void;
}

export function RoleSelector({ onSelect }: RoleSelectorProps) {
  const [hovered, setHovered] = useState<'hire' | 'work' | null>(null);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative' }}>
      <div className="mesh-bg" />
      <div className="grid-overlay" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ textAlign: 'center', marginBottom: 48, position: 'relative', zIndex: 1 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg, #7B3FE4, #10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={18} color="white" />
          </div>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'white' }}>
            Trust<span className="gradient-text">Layer</span>
          </span>
        </div>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, color: 'white', marginBottom: 12 }}>
          How are you using TrustLayer today?
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: 480, margin: '0 auto' }}>
          Choose your role. You can switch anytime from inside the app.
        </p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, maxWidth: 700, width: '100%', position: 'relative', zIndex: 1 }}>
        {/* Client Card */}
        <motion.button
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          onClick={() => onSelect('hire')}
          onMouseEnter={() => setHovered('hire')}
          onMouseLeave={() => setHovered(null)}
          style={{
            background: hovered === 'hire' ? 'rgba(123, 63, 228, 0.12)' : 'rgba(123, 63, 228, 0.05)',
            border: `2px solid ${hovered === 'hire' ? 'rgba(123, 63, 228, 0.6)' : 'rgba(123, 63, 228, 0.2)'}`,
            borderRadius: 20,
            padding: '36px 32px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.25s ease',
            transform: hovered === 'hire' ? 'translateY(-4px)' : 'translateY(0)',
            boxShadow: hovered === 'hire' ? '0 20px 40px rgba(123, 63, 228, 0.2)' : 'none',
          }}
        >
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(123, 63, 228, 0.15)', border: '1px solid rgba(123, 63, 228, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <PlusCircle size={28} color="#A78BFA" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', marginBottom: 10 }}>I'm a Client</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 24 }}>
            Post gigs, fund escrow, review freelancer applications, and release payment when work is complete.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['Post jobs with milestone payments', 'Review applicants & hire talent', 'Approve work & release funds'].map(item => (
              <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#C4B5FD', fontSize: '0.85rem' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#A78BFA', flexShrink: 0 }} />
                {item}
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#A78BFA', fontWeight: 700, fontSize: '0.95rem' }}>
            Enter as Client <ArrowRight size={16} />
          </div>
        </motion.button>

        {/* Freelancer Card */}
        <motion.button
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          onClick={() => onSelect('work')}
          onMouseEnter={() => setHovered('work')}
          onMouseLeave={() => setHovered(null)}
          style={{
            background: hovered === 'work' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.05)',
            border: `2px solid ${hovered === 'work' ? 'rgba(16, 185, 129, 0.6)' : 'rgba(16, 185, 129, 0.2)'}`,
            borderRadius: 20,
            padding: '36px 32px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.25s ease',
            transform: hovered === 'work' ? 'translateY(-4px)' : 'translateY(0)',
            boxShadow: hovered === 'work' ? '0 20px 40px rgba(16, 185, 129, 0.2)' : 'none',
          }}
        >
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <Briefcase size={28} color="#10B981" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', marginBottom: 10 }}>I'm a Freelancer</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 24 }}>
            Browse open gigs, send applications, submit your work, and get paid instantly on-chain.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['Browse & apply for open gigs', 'Submit work deliverables on-chain', 'Get paid instantly upon approval'].map(item => (
              <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6EE7B7', fontSize: '0.85rem' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
                {item}
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10B981', fontWeight: 700, fontSize: '0.95rem' }}>
            Enter as Freelancer <ArrowRight size={16} />
          </div>
        </motion.button>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.78rem', marginTop: 40, position: 'relative', zIndex: 1 }}
      >
        Devnet · Test Only — No real funds involved
      </motion.p>
    </div>
  );
}
