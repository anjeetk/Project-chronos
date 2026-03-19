import { motion } from 'framer-motion'

export default function TamperSimulator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 45, 85, 0.08)',
        backdropFilter: 'blur(4px)',
        pointerEvents: 'none',
      }}
    >
      {/* Scanline effect */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,45,85,0.03) 2px, rgba(255,45,85,0.03) 4px)',
        animation: 'breach-pulse 0.5s infinite',
      }} />

      {/* Main alert */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div style={{
          fontSize: '64px',
          lineHeight: 1,
        }}>🚨</div>

        <div className="glitch-text" style={{
          fontFamily: 'var(--font-display)',
          fontSize: '42px',
          fontWeight: 800,
          color: 'var(--color-critical)',
          textShadow: '0 0 40px rgba(255, 45, 85, 0.6), 0 0 80px rgba(255, 45, 85, 0.3)',
          letterSpacing: '-1px',
          textAlign: 'center',
        }}>
          SECURITY BREACH
        </div>

        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '14px',
          color: 'rgba(255, 45, 85, 0.8)',
          letterSpacing: '3px',
          animation: 'breach-pulse 0.8s infinite',
        }}>
          HASH CHAIN INTEGRITY COMPROMISED
        </div>

        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-dim)',
          marginTop: '8px',
          letterSpacing: '1px',
        }}>
          TAMPER DETECTED AT FRAME 847 / BLOCK 0x3fa2...e9c1
        </div>
      </motion.div>

      {/* Corner warnings */}
      {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => {
        const [v, h] = pos.split('-')
        return (
          <div key={pos} style={{
            position: 'absolute',
            [v]: '20px',
            [h]: '20px',
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--color-critical)',
            opacity: 0.6,
            letterSpacing: '1px',
            animation: 'breach-pulse 0.6s infinite',
          }}>
            ⚠ ALERT
          </div>
        )
      })}
    </motion.div>
  )
}
