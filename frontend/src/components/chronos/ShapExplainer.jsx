import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip } from 'recharts'

export default function ShapExplainer({ features, patientId }) {
  const data = features.map(f => ({
    name: f.feature,
    value: f.value,
    direction: f.direction,
  })).sort((a, b) => Math.abs(b.value) - Math.abs(a.value))

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
      }}>
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '2px' }}>
            EXPLAINABLE AI
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>
            Why This Prediction? <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: '12px' }}>SHAP Feature Contributions</span>
          </div>
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--text-dim)',
          background: 'rgba(255,255,255,0.03)',
          padding: '4px 8px',
          borderRadius: 'var(--radius-sm)',
        }}>{patientId}</div>
      </div>

      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
          <XAxis type="number" hide domain={[-0.4, 0.4]} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#f1f5f9', fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 600, letterSpacing: '1px' }}
            width={130}
            axisLine={false}
            tickLine={false}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={8}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.direction === 'risk' ? '#ff2d55' : '#34d399'}
                fillOpacity={0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div style={{
        display: 'flex',
        gap: '16px',
        marginTop: '6px',
        justifyContent: 'center',
      }}>
        <Legend color="#ff2d55" label="Risk Driver" />
        <Legend color="#34d399" label="Protective" />
      </div>
    </div>
  )
}

function Legend({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: color, opacity: 0.7 }} />
      <span style={{ fontSize: '9px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>{label}</span>
    </div>
  )
}
