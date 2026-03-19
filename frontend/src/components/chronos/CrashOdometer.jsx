import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Rolling odometer digit animation
function Digit({ value }) {
  return (
    <div style={{
      position: 'relative',
      overflow: 'hidden',
      height: '1em',
      width: '0.6em',
      display: 'inline-block',
    }}>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: 'absolute',
            display: 'block',
            width: '100%',
            textAlign: 'center',
          }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

export default function CrashOdometer({ value }) {
  const pct = Math.round(value * 100)
  const digits = pct.toString().padStart(2, '0').split('')
  
  const color = value > 0.7 ? 'var(--color-critical)'
    : value > 0.4 ? 'var(--color-observing)'
    : 'var(--color-stable)'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
    }}>
      <div style={{
        fontSize: '10px',
        color: 'var(--text-dim)',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '1.5px',
        marginBottom: '2px',
      }}>CRASH PROBABILITY</div>
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: '36px',
        color,
        letterSpacing: '-2px',
        lineHeight: 1,
        textShadow: value > 0.7 ? `0 0 20px ${color}` : 'none',
      }}>
        {digits.map((d, i) => <Digit key={`${i}-pos`} value={d} />)}
        <span style={{ fontSize: '20px', opacity: 0.6, marginLeft: '2px', letterSpacing: '0' }}>%</span>
      </div>
    </div>
  )
}
