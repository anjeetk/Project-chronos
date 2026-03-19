import { useMemo, useEffect, useRef } from 'react'

export default function HashMatrix({ auditTrail, currentIdx, tamperActive, finalHash }) {
  const scrollRef = useRef()

  // Auto-scroll to latest hash
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [currentIdx])

  const visibleHashes = useMemo(() => {
    return auditTrail.slice(Math.max(0, currentIdx - 30), currentIdx + 1).reverse()
  }, [auditTrail, currentIdx])

  return (
    <div className="glass" style={{
      display: 'flex',
      flexDirection: 'column',
      flex: '0 0 auto',
      maxHeight: '45%',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 16px 10px',
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '2px' }}>
            CRYPTOGRAPHIC TRAIL
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>Live Hash Matrix</div>
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: tamperActive ? 'var(--color-critical)' : 'var(--color-stable)',
          fontWeight: 700,
          padding: '3px 8px',
          borderRadius: 'var(--radius-sm)',
          background: tamperActive ? 'var(--color-critical-bg)' : 'var(--color-stable-bg)',
          border: `1px solid ${tamperActive ? 'var(--color-critical)' : 'var(--color-stable)'}33`,
        }}>
          {tamperActive ? '✗ BROKEN' : '✓ CHAINED'}
        </div>
      </div>

      {/* Hash Summary */}
      <div style={{
        margin: '10px 14px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        {/* Genesis Block */}
        <div style={{
          padding: '8px 10px',
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-sm)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)',
            fontWeight: 700, letterSpacing: '1px', marginBottom: '2px',
          }}>GENESIS HASH [00000]</div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '9px', wordBreak: 'break-all',
            color: 'var(--text-secondary)'
          }}>{auditTrail.length > 0 ? auditTrail[0].data_hash : 'AWAITING GENESIS...'}</div>
        </div>

        {/* Latest Block */}
        <div style={{
          padding: '8px 10px',
          background: tamperActive ? 'rgba(255,45,85,0.08)' : 'rgba(0, 255, 163, 0.05)',
          border: `1px solid ${tamperActive ? 'rgba(255,45,85,0.3)' : 'rgba(0, 255, 163, 0.2)'}`,
          borderRadius: 'var(--radius-sm)',
          transition: 'all 0.2s',
        }}>
          <div style={{
            fontSize: '9px', fontFamily: 'var(--font-mono)',
            color: tamperActive ? 'var(--color-critical)' : 'var(--color-stable)',
            fontWeight: 700, letterSpacing: '1px', marginBottom: '2px',
            display: 'flex', justifyContent: 'space-between'
          }}>
            <span>LATEST HASH [{currentIdx.toString().padStart(5, '0')}]</span>
            {tamperActive && <span style={{ animation: 'pulse-dot 1s infinite' }}>⚠ CORRUPTED</span>}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '9px', wordBreak: 'break-all',
            color: tamperActive ? 'var(--color-critical)' : 'var(--text-primary)',
            textDecoration: tamperActive ? 'line-through' : 'none',
            opacity: tamperActive ? 0.8 : 1
          }}>
            {tamperActive ? '0xef4d... [PAYLOAD ALTERED] ...f1c9 => MISMATCH' : finalHash}
          </div>
        </div>
      </div>

      {/* Hash chain scroll */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 14px',
          maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
        }}
      >
        {visibleHashes.map((entry, i) => (
          <div
            key={`${entry.timestamp}-${i}`}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              lineHeight: 1.8,
              color: tamperActive
                ? (i % 3 === 0 ? 'var(--color-critical)' : 'var(--text-dim)')
                : (i === 0 ? 'var(--color-stable)' : 'var(--text-dim)'),
              textShadow: !tamperActive && i === 0 ? '0 0 6px rgba(52, 211, 153, 0.5)' : 'none',
              animation: !tamperActive && i === 0 ? 'typewriter-glow 2s ease-out' : 'none',
              textDecoration: tamperActive && i % 3 === 0 ? 'line-through' : 'none',
              opacity: tamperActive && i % 2 === 0 ? 0.4 : 1,
              transition: 'all 0.3s',
            }}
          >
            {entry.data_hash}
          </div>
        ))}
      </div>
    </div>
  )
}
