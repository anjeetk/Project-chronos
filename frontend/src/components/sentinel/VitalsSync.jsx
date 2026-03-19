import { Heart, Droplets, Activity, Eye } from 'lucide-react'

const VITALS = [
  { key: 'heart_rate', label: 'Heart Rate', unit: 'BPM', icon: Heart, color: '#ff2d55', critical: v => v > 110 },
  { key: 'spo2', label: 'SpO2', unit: '%', icon: Droplets, color: '#007aff', critical: v => v < 92 },
  { key: 'bp_sys', label: 'Sys. BP', unit: 'mmHg', icon: Activity, color: '#bf5af2', critical: v => v < 90 },
  { key: 'motion_score', label: 'Motion', unit: 'score', icon: Eye, color: '#fbbf24', critical: v => v > 30 },
]

export default function VitalsSync({ frame }) {
  if (!frame) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '10px',
      }}>
        {VITALS.map(v => (
          <div key={v.key} className="glass" style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '1px' }}>
              {v.label}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', color: 'var(--text-dim)' }}>--</div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '10px',
    }}>
      {VITALS.map(cfg => {
        const value = frame[cfg.key]
        const isCritical = cfg.critical(value)
        const Icon = cfg.icon

        return (
          <div
            key={cfg.key}
            className="glass"
            style={{
              padding: '12px 14px',
              borderColor: isCritical ? `${cfg.color}44` : 'var(--glass-border)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {isCritical && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(ellipse at center, ${cfg.color}10, transparent 70%)`,
                pointerEvents: 'none',
              }} />
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
              <Icon size={11} color={isCritical ? cfg.color : 'var(--text-dim)'} />
              <span style={{
                fontSize: '9px',
                color: 'var(--text-dim)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}>{cfg.label}</span>
              {isCritical && (
                <div style={{
                  marginLeft: 'auto',
                  width: '5px', height: '5px', borderRadius: '50%',
                  background: cfg.color, animation: 'pulse-dot 1s infinite',
                }} />
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
              <span style={{
                fontSize: '24px',
                fontWeight: 800,
                color: isCritical ? cfg.color : 'var(--text-primary)',
                fontFamily: 'var(--font-display)',
                letterSpacing: '-0.5px',
                lineHeight: 1,
              }}>
                {typeof value === 'number' ? (cfg.key === 'motion_score' ? value.toFixed(1) : Math.round(value)) : '--'}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{cfg.unit}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
