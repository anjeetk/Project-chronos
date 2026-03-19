import { useState, useRef, useCallback } from 'react'

function formatTime(seconds) {
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

export default function MagneticTimeline({ telemetry, currentTime, duration, onSeek, anomalies }) {
  const [hoverX, setHoverX] = useState(null)
  const trackRef = useRef()

  const handleMouseMove = useCallback((e) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    setHoverX(e.clientX - rect.left)
  }, [])

  const handleMouseLeave = () => setHoverX(null)

  const handleClick = (e) => {
    if (!trackRef.current || duration <= 0) return
    const rect = trackRef.current.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    onSeek(ratio * duration)
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  // Build sparkline data points for the timeline
  const hrPoints = telemetry.map(t => ({
    x: duration > 0 ? (t.timestamp / duration) * 100 : 0,
    y: t.heart_rate,
  }))
  const spo2Points = telemetry.map(t => ({
    x: duration > 0 ? (t.timestamp / duration) * 100 : 0,
    y: t.spo2,
  }))

  // Anomaly markers
  const anomalyMarkers = anomalies.map(a => ({
    x: duration > 0 ? (a.timestamp / duration) * 100 : 0,
    type: a.tags[0]?.type || 'UNKNOWN',
    timestamp: a.timestamp,
  }))

  // "Dock" magnification effect
  const getMagnification = (itemX) => {
    if (hoverX === null || !trackRef.current) return 1
    const trackWidth = trackRef.current.getBoundingClientRect().width
    const itemPx = (itemX / 100) * trackWidth
    const dist = Math.abs(hoverX - itemPx)
    const radius = 80
    if (dist > radius) return 1
    return 1 + (1 - dist / radius) * 1.5
  }

  return (
    <div className="glass" style={{ padding: '12px 16px', position: 'relative' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', marginBottom: '8px',
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '1px' }}>
          TIMELINE
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-secondary)' }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Sparkline overlays */}
      <div style={{ height: '40px', position: 'relative', marginBottom: '6px', overflow: 'visible' }}>
        <svg width="100%" height="40" viewBox="0 0 100 40" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
          {/* HR line */}
          <polyline
            fill="none"
            stroke="#ff2d55"
            strokeWidth="0.3"
            strokeOpacity="0.5"
            points={hrPoints.map(p => {
              const mag = getMagnification(p.x)
              const normalY = 40 - ((p.y - 50) / 100) * 40
              const magY = 20 + (normalY - 20) / mag
              return `${p.x},${magY}`
            }).join(' ')}
          />
          {/* SpO2 line */}
          <polyline
            fill="none"
            stroke="#007aff"
            strokeWidth="0.3"
            strokeOpacity="0.5"
            points={spo2Points.map(p => {
              const mag = getMagnification(p.x)
              const normalY = 40 - ((p.y - 80) / 20) * 40
              const magY = 20 + (normalY - 20) / mag
              return `${p.x},${magY}`
            }).join(' ')}
          />
        </svg>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          position: 'relative',
          height: '20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* Background track */}
        <div style={{
          position: 'absolute',
          left: 0, right: 0,
          height: '4px',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 'var(--radius-full)',
        }}>
          {/* Progress fill */}
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-blue))',
            borderRadius: 'var(--radius-full)',
            transition: 'width 0.1s linear',
          }} />
        </div>

        {/* Anomaly pins */}
        {anomalyMarkers.map((m, i) => {
          const color = m.type === 'HR_SPIKE' ? 'var(--color-critical)' :
                        m.type === 'SPO2_DROP' ? 'var(--accent-blue)' :
                        'var(--color-observing)'
          const mag = getMagnification(m.x)
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${m.x}%`,
                top: '50%',
                transform: `translate(-50%, -50%) scale(${mag})`,
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: color,
                boxShadow: `0 0 ${4 * mag}px ${color}`,
                transition: 'transform 0.15s ease-out',
                zIndex: 2,
              }}
            />
          )
        })}

        {/* Playhead */}
        <div style={{
          position: 'absolute',
          left: `${progress}%`,
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: 'white',
          boxShadow: '0 0 10px rgba(100, 210, 255, 0.5)',
          border: '2px solid var(--accent-cyan)',
          zIndex: 3,
        }} />

        {/* Hover indicator */}
        {hoverX !== null && trackRef.current && (() => {
          const trackWidth = trackRef.current.getBoundingClientRect().width
          const hoverTime = (hoverX / trackWidth) * duration
          // Find closest telemetry point
          const point = telemetry.length ? telemetry.reduce((prev, curr) => 
            Math.abs(curr.timestamp - hoverTime) < Math.abs(prev.timestamp - hoverTime) ? curr : prev
          ) : null
          
          return (
            <div style={{
              position: 'absolute',
              left: `${hoverX}px`,
              top: '-45px',
              transform: 'translateX(-50%)',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--text-secondary)',
              background: 'rgba(15, 23, 42, 0.9)',
              backdropFilter: 'blur(8px)',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              zIndex: 10
            }}>
              <span style={{ color: 'white', fontWeight: 600 }}>{formatTime(hoverTime)}</span>
              {point && (
                <span style={{ fontSize: '9px', opacity: 0.8 }}>
                  HR: <span style={{ color: '#ff2d55' }}>{point.heart_rate}</span> | SpO2: <span style={{ color: '#007aff' }}>{point.spo2}%</span>
                </span>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
