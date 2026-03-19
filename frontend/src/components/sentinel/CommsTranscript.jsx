import { useEffect, useRef } from 'react'

export default function CommsTranscript({ comms, currentTime }) {
  const scrollRef = useRef()

  // Auto-scroll to bottom whenever new comms appear
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [currentTime])

  // Get all comms up to current master time
  const visibleComms = comms.filter(c => c.timestamp <= currentTime)

  return (
    <div className="glass" style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1, // Fills middle space in the right sidebar
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-observing)', animation: 'pulse-dot 2s infinite' }} />
          <h3 style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', margin: 0 }}>Comms Transcript</h3>
        </div>
        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>LIVE NLP</span>
      </div>

      <div ref={scrollRef} className="overflow-y-auto" style={{
        padding: '16px 12px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        height: '100%',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        scrollBehavior: 'smooth',
        maskImage: 'linear-gradient(to bottom, transparent, black 16px, black)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 16px, black)',
      }}>
        {visibleComms.map((c, i) => {
          let color = 'var(--text-secondary)'
          let bg = 'transparent'
          let border = 'none'

          // NLP Sentiment coloring
          if (c.type === 'alarm') {
            color = 'var(--color-critical)'
            bg = 'rgba(255, 45, 85, 0.1)'
            border = '1px solid rgba(255, 45, 85, 0.3)'
          } else if (c.type === 'alert') {
            color = '#fbbf24' // Yellow for alerts
            bg = 'rgba(251, 191, 36, 0.1)'
            border = '1px solid rgba(251, 191, 36, 0.3)'
          }

          return (
            <div key={i} style={{
              display: 'flex',
              gap: '8px',
              padding: '6px 8px',
              background: bg,
              border: border,
              borderRadius: '4px',
              animation: 'slide-up 0.3s ease-out'
            }}>
              <span style={{ color: 'var(--text-tertiary)', minWidth: '45px' }}>
                [{Math.floor(c.timestamp / 60)}:{(c.timestamp % 60).toString().padStart(2, '0')}]
              </span>
              <span style={{ color: c.type === 'normal' ? '#94a3b8' : color, fontWeight: 700, minWidth: '70px' }}>
                {c.speaker}:
              </span>
              <span style={{ color: color === 'var(--text-secondary)' ? '#cbd5e1' : color, flex: 1, wordBreak: 'break-word' }}>
                {c.text}
              </span>
            </div>
          )
        })}
        {visibleComms.length === 0 && (
          <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '20px' }}>Awaiting transmission...</div>
        )}
      </div>
    </div>
  )
}
