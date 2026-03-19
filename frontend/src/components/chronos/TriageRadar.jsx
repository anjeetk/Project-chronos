import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Activity, Zap } from 'lucide-react'

export default function TriageRadar({ patients, selected, onSelect }) {
  const sorted = [...patients].sort((a, b) => b.aggregateRisk - a.aggregateRisk)

  return (
    <div className="glass" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 18px 12px',
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '2px' }}>
            TRIAGE RADAR
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>
            Patient Risk Ranking
          </div>
        </div>
        <div style={{
          background: 'var(--color-critical-bg)',
          padding: '4px 10px',
          borderRadius: 'var(--radius-full)',
          fontSize: '11px',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-critical)',
        }}>
          {patients.filter(p => p.status === 'critical').length} CRITICAL
        </div>
      </div>

      {/* Patient List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px',
      }}>
        {sorted.map((patient, i) => (
          <motion.div
            key={patient.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <PatientCard
              patient={patient}
              isSelected={selected.id === patient.id}
              onClick={() => onSelect(patient)}
              rank={i + 1}
            />
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function PatientCard({ patient, isSelected, onClick, rank }) {
  const borderColor = patient.status === 'critical'
    ? 'var(--color-critical)'
    : patient.status === 'observing'
    ? 'var(--color-observing)'
    : 'var(--color-stable)'

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '12px 14px',
        marginBottom: '6px',
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${isSelected ? borderColor : 'var(--glass-border)'}`,
        background: isSelected ? `${borderColor}11` : 'transparent',
        cursor: 'pointer',
        transition: 'var(--transition-smooth)',
        fontFamily: 'var(--font-display)',
        color: 'var(--text-primary)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Left border accent */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '3px',
        background: borderColor,
        opacity: isSelected ? 1 : 0.3,
      }} />

      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginLeft: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-dim)', opacity: 0.5, fontFamily: 'var(--font-mono)', width: '18px' }}>
            #{rank}
          </span>
          <span style={{ fontWeight: 600, fontSize: '13px' }}>Bed {patient.bed}</span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{patient.name}</span>
        </div>
        <RiskBadge value={patient.aggregateRisk} status={patient.status} />
      </div>

      {/* Reason */}
      <div style={{
        fontSize: '11px',
        color: 'var(--text-secondary)',
        marginTop: '6px',
        marginLeft: '36px',
      }}>
        {patient.admitReason}
      </div>

      {isSelected && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={{ duration: 0.3 }}
          style={{ marginTop: '10px', marginLeft: '36px' }}
        >
          <RiskBar label="Shock" value={patient.riskScores.shock} icon={Zap} labelWidth="w-20" />
          <RiskBar label="Sepsis" value={patient.riskScores.sepsis} icon={Activity} labelWidth="w-20" />
          <RiskBar label="Deterioration" value={patient.riskScores.deterioration} icon={AlertTriangle} labelWidth="w-20" />
        </motion.div>
      )}
    </button>
  )
}

function RiskBadge({ value, status }) {
  const color = status === 'critical' ? 'var(--color-critical)'
    : status === 'observing' ? 'var(--color-observing)'
    : 'var(--color-stable)'

  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '13px',
      fontWeight: 700,
      color,
      animation: status === 'critical' ? 'pulse-critical 1.5s infinite' : 'none',
      padding: '2px 8px',
      borderRadius: 'var(--radius-sm)',
      background: `${color}15`,
    }}>
      {Math.round(value * 100)}%
    </span>
  )
}

function RiskBar({ label, value, icon: Icon, labelWidth = "70px" }) {
  const pct = Math.round(value * 100)
  const color = value > 0.7 ? 'var(--color-critical)' : value > 0.4 ? 'var(--color-observing)' : 'var(--color-stable)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
      <Icon size={10} color="var(--text-dim)" />
      <span style={{ fontSize: '10px', color: 'var(--text-dim)', width: labelWidth, fontFamily: 'var(--font-mono)' }}>{label}</span>
      <div style={{
        flex: 1,
        height: '4px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 'var(--radius-full)',
        overflow: 'hidden',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            height: '100%',
            background: color,
            borderRadius: 'var(--radius-full)',
          }}
        />
      </div>
      <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color, width: '28px', textAlign: 'right' }}>{pct}%</span>
    </div>
  )
}
