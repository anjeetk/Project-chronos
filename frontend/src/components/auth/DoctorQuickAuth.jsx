import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, Stethoscope, Mail, Lock, User, ArrowRight, AlertCircle, Loader2, CheckCircle2, Zap } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const PHASES = {
  INPUT: 'input',
  VERIFYING: 'verifying',
  SUCCESS: 'success',
}

// Particle system for background
function AuthParticles() {
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * 10,
    opacity: Math.random() * 0.3 + 0.05,
  }))

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.id % 3 === 0
              ? 'rgba(52, 211, 153, 0.6)'
              : p.id % 3 === 1
                ? 'rgba(100, 210, 255, 0.5)'
                : 'rgba(191, 90, 242, 0.4)',
          }}
          animate={{
            y: [0, -30, 0, 20, 0],
            x: [0, 15, -10, 5, 0],
            opacity: [p.opacity, p.opacity * 2, p.opacity, p.opacity * 1.5, p.opacity],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

// DNA Helix animation
function DNAHelix() {
  const strands = Array.from({ length: 12 }, (_, i) => i)
  return (
    <div style={{
      position: 'absolute',
      right: '-80px',
      top: '50%',
      transform: 'translateY(-50%)',
      opacity: 0.06,
      pointerEvents: 'none',
    }}>
      {strands.map(i => (
        <motion.div
          key={i}
          style={{
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: '#34d399',
            position: 'absolute',
          }}
          animate={{
            x: [Math.sin(i * 0.5) * 40, Math.sin(i * 0.5 + Math.PI) * 40],
            y: [i * 30, i * 30],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatType: 'reverse',
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  )
}

// Scanning line effect during verification
function ScanLine({ active }) {
  if (!active) return null
  return (
    <motion.div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        height: '2px',
        background: 'linear-gradient(90deg, transparent, rgba(52, 211, 153, 0.8), transparent)',
        zIndex: 10,
        pointerEvents: 'none',
      }}
      initial={{ top: '0%' }}
      animate={{ top: ['0%', '100%', '0%'] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
    />
  )
}

export default function DoctorQuickAuth() {
  const { login, signup } = useAuth()
  const [phase, setPhase] = useState(PHASES.INPUT)
  
  // Auth Form State
  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  
  const [scanProgress, setScanProgress] = useState(0)
  const [displayedName, setDisplayedName] = useState('Doctor')

  // Simulate verification scan
  useEffect(() => {
    if (phase !== PHASES.VERIFYING) return
    setScanProgress(0)
    const steps = [
      { progress: 15, delay: 200 },
      { progress: 35, delay: 500 },
      { progress: 58, delay: 900 },
      { progress: 76, delay: 1300 },
      { progress: 89, delay: 1600 },
      { progress: 100, delay: 2000 },
    ]

    const timers = steps.map(step =>
      setTimeout(() => setScanProgress(step.progress), step.delay)
    )

    return () => timers.forEach(clearTimeout)
  }, [phase])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Email and password required')
      return
    }
    
    if (!isLogin && !name.trim()) {
       setError('Full name is required for registration')
       return
    }

    setPhase(PHASES.VERIFYING)
    
    // Default to 'Doctor' for login display
    setDisplayedName(isLogin ? email.split('@')[0] : name)

    try {
      // Small artificial delay to show off the scanning animation
      await new Promise(resolve => setTimeout(resolve, 2200)) 
      
      let res;
      if (isLogin) {
        res = await login(email.trim(), password)
      } else {
        res = await signup(email.trim(), password, name.trim())
        // Supabase returns a user but might require email confirmation.
        // Assuming auto-confirm or test mode is enabled for hackathon.
        if (res.user && res.session === null) {
          throw new Error("Check your email for confirmation link.")
        }
      }
      
      if (res.user?.user_metadata?.name) {
         setDisplayedName(res.user.user_metadata.name)
      }
      
      setPhase(PHASES.SUCCESS)
    } catch (err) {
      setError(err.message || 'Authentication failed')
      setPhase(PHASES.INPUT)
    }
  }

  const verifySteps = [
    { label: 'Initializing secure handshake', threshold: 10 },
    { label: 'Verifying with biometric vault', threshold: 30 },
    { label: 'Cross-referencing database', threshold: 55 },
    { label: 'Establishing encrypted session', threshold: 75 },
    { label: 'Granting access privileges', threshold: 90 },
  ]

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#040608',
      fontFamily: 'var(--font-display)',
      overflow: 'hidden',
      zIndex: 9999,
    }}>
      {/* Ambient animated background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(ellipse at 25% 25%, rgba(52, 211, 153, 0.06) 0%, transparent 50%),
          radial-gradient(ellipse at 75% 75%, rgba(100, 210, 255, 0.04) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 50%, rgba(191, 90, 242, 0.03) 0%, transparent 60%)
        `,
      }} />

      {/* Grid overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(52, 211, 153, 0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(52, 211, 153, 0.015) 1px, transparent 1px)
        `,
        backgroundSize: '80px 80px',
        pointerEvents: 'none',
      }} />

      <AuthParticles />
      <DNAHelix />

      {/* Main auth card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '460px',
          padding: '40px',
          borderRadius: '24px',
          background: 'rgba(10, 14, 23, 0.85)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: `
            0 0 0 1px rgba(52, 211, 153, 0.05),
            0 25px 80px rgba(0, 0, 0, 0.6),
            0 0 120px rgba(52, 211, 153, 0.03),
            inset 0 1px 0 rgba(255, 255, 255, 0.04)
          `,
          overflow: 'hidden',
        }}
      >
        <ScanLine active={phase === PHASES.VERIFYING} />

        {/* Top glow accent */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '200px',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(52, 211, 153, 0.5), transparent)',
        }} />

        <AnimatePresence mode="wait">
          {/* ── INPUT PHASE ── */}
          {phase === PHASES.INPUT && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <motion.div
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.15), rgba(100, 210, 255, 0.1))',
                    border: '1px solid rgba(52, 211, 153, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                  }}
                  animate={{
                    boxShadow: [
                      '0 0 20px rgba(52, 211, 153, 0.1)',
                      '0 0 40px rgba(52, 211, 153, 0.2)',
                      '0 0 20px rgba(52, 211, 153, 0.1)',
                    ],
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <ShieldCheck size={32} color="#34d399" strokeWidth={1.5} />
                </motion.div>

                <h1 style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  letterSpacing: '-0.5px',
                  color: '#eef1f6',
                  marginBottom: '8px',
                }}>
                  {isLogin ? 'Secure Gateway' : 'Doctor Registration'}
                </h1>
                <p style={{
                  fontSize: '13px',
                  color: '#8891a4',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.5px',
                }}>
                  SYNAPSE EIT // COMMAND CENTER
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit}>
                {/* Expand Registration fields */}
                <AnimatePresence>
                  {!isLogin && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <label style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#8891a4',
                        textTransform: 'uppercase',
                        letterSpacing: '1.2px',
                        marginBottom: '8px',
                        fontFamily: 'var(--font-mono)',
                      }}>
                        Full Name
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="Dr. Jane Smith"
                          style={{
                            width: '100%',
                            padding: '14px 16px 14px 44px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            background: 'rgba(255, 255, 255, 0.03)',
                            color: '#eef1f6',
                            fontSize: '15px',
                            outline: 'none',
                            transition: 'all 300ms',
                            boxSizing: 'border-box',
                          }}
                          onFocus={e => {
                            e.target.style.borderColor = 'rgba(52, 211, 153, 0.4)'
                            e.target.style.boxShadow = '0 0 0 3px rgba(52, 211, 153, 0.08)'
                          }}
                          onBlur={e => {
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                            e.target.style.boxShadow = 'none'
                          }}
                        />
                        <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4a5568' }} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email field */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#8891a4',
                    textTransform: 'uppercase',
                    letterSpacing: '1.2px',
                    marginBottom: '8px',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    Medical Email
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="dr.smith@hospital.org"
                      style={{
                        width: '100%',
                        padding: '14px 16px 14px 44px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'rgba(255, 255, 255, 0.03)',
                        color: '#eef1f6',
                        fontSize: '15px',
                        outline: 'none',
                        transition: 'all 300ms',
                        boxSizing: 'border-box',
                      }}
                      onFocus={e => {
                        e.target.style.borderColor = 'rgba(52, 211, 153, 0.4)'
                        e.target.style.boxShadow = '0 0 0 3px rgba(52, 211, 153, 0.08)'
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                    <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4a5568' }} />
                  </div>
                </div>

                {/* Password field */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#8891a4',
                    textTransform: 'uppercase',
                    letterSpacing: '1.2px',
                    marginBottom: '8px',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    Cryptographic Key
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      style={{
                        width: '100%',
                        padding: '14px 16px 14px 44px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'rgba(255, 255, 255, 0.03)',
                        color: '#eef1f6',
                        fontSize: '15px',
                        letterSpacing: '2px',
                        outline: 'none',
                        transition: 'all 300ms',
                        boxSizing: 'border-box',
                      }}
                      onFocus={e => {
                        e.target.style.borderColor = 'rgba(52, 211, 153, 0.4)'
                        e.target.style.boxShadow = '0 0 0 3px rgba(52, 211, 153, 0.08)'
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                    <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4a5568' }} />
                  </div>
                </div>

                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: 'rgba(255, 45, 85, 0.08)',
                        border: '1px solid rgba(255, 45, 85, 0.2)',
                        marginBottom: '16px',
                        fontSize: '13px',
                        color: '#ff6b8a',
                      }}
                    >
                      <AlertCircle size={16} />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit button */}
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  style={{
                    width: '100%',
                    padding: '15px 24px',
                    borderRadius: '14px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #34d399, #22c55e)',
                    color: '#022c22',
                    fontSize: '15px',
                    fontWeight: 700,
                    fontFamily: 'var(--font-display)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'all 300ms',
                    boxShadow: '0 4px 20px rgba(52, 211, 153, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                    letterSpacing: '0.3px',
                  }}
                >
                  <Zap size={18} strokeWidth={2.5} />
                  {isLogin ? 'Authenticate & Enter' : 'Register Identity'}
                  <ArrowRight size={18} />
                </motion.button>
              </form>

              {/* Login/Signup Toggle */}
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                 <button 
                  onClick={() => setIsLogin(!isLogin)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-accent)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textDecoration: 'none',
                  }}
                >
                  {isLogin ? "Don't have clearance? Click to register" : "Already have clearance? Click to login"}
                </button>
              </div>

              {/* Footer */}
              <div style={{
                textAlign: 'center',
                marginTop: '28px',
                paddingTop: '20px',
                borderTop: '1px solid rgba(255, 255, 255, 0.04)',
              }}>
                <p style={{
                  fontSize: '11px',
                  color: '#4a5568',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.5px',
                  lineHeight: 1.6,
                }}>
                  🔐 SUPABASE SECURE PROTOCOL<br />
                  256-BIT AES ENCRYPTED SESSION
                </p>
              </div>
            </motion.div>
          )}

          {/* ── VERIFYING PHASE ── */}
          {phase === PHASES.VERIFYING && (
            <motion.div
              key="verifying"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              style={{ textAlign: 'center' }}
            >
              {/* Animated icon */}
              <motion.div
                style={{
                  width: '88px',
                  height: '88px',
                  borderRadius: '50%',
                  background: 'rgba(52, 211, 153, 0.08)',
                  border: '2px solid rgba(52, 211, 153, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 28px',
                }}
                animate={{
                  boxShadow: [
                    '0 0 0 0px rgba(52, 211, 153, 0.2), 0 0 30px rgba(52, 211, 153, 0.1)',
                    '0 0 0 15px rgba(52, 211, 153, 0), 0 0 50px rgba(52, 211, 153, 0.2)',
                    '0 0 0 0px rgba(52, 211, 153, 0.2), 0 0 30px rgba(52, 211, 153, 0.1)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                >
                  <Stethoscope size={36} color="#34d399" strokeWidth={1.5} />
                </motion.div>
              </motion.div>

              <h2 style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#eef1f6',
                marginBottom: '6px',
              }}>
                {isLogin ? 'Verifying Credentials' : 'Registering Identity'}
              </h2>
              <p style={{
                fontSize: '12px',
                color: '#8891a4',
                fontFamily: 'var(--font-mono)',
                marginBottom: '28px',
              }}>
                {email.toUpperCase()} // SUPABASE AUTH
              </p>

              {/* Progress bar */}
              <div style={{
                width: '100%',
                height: '3px',
                borderRadius: '2px',
                background: 'rgba(255, 255, 255, 0.05)',
                marginBottom: '24px',
                overflow: 'hidden',
              }}>
                <motion.div
                  style={{
                    height: '100%',
                    borderRadius: '2px',
                    background: 'linear-gradient(90deg, #34d399, #64d2ff)',
                  }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${scanProgress}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>

              {/* Verification steps */}
              <div style={{ textAlign: 'left' }}>
                {verifySteps.map((step, i) => {
                  const isActive = scanProgress >= step.threshold
                  const isDone = i < verifySteps.length - 1
                    ? scanProgress >= verifySteps[i + 1].threshold
                    : scanProgress >= 100

                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: isActive ? 1 : 0.3, x: 0 }}
                      transition={{ delay: i * 0.1, duration: 0.3 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 0',
                        fontSize: '12px',
                        fontFamily: 'var(--font-mono)',
                        color: isDone ? '#34d399' : isActive ? '#eef1f6' : '#4a5568',
                      }}
                    >
                      {isDone ? (
                        <CheckCircle2 size={14} color="#34d399" />
                      ) : isActive ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                          <Loader2 size={14} color="#64d2ff" />
                        </motion.div>
                      ) : (
                        <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid #4a5568' }} />
                      )}
                      {step.label}
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* ── SUCCESS PHASE ── */}
          {phase === PHASES.SUCCESS && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ textAlign: 'center', padding: '20px 0' }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'rgba(52, 211, 153, 0.12)',
                  border: '2px solid rgba(52, 211, 153, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  boxShadow: '0 0 40px rgba(52, 211, 153, 0.15)',
                }}
              >
                <CheckCircle2 size={36} color="#34d399" strokeWidth={2} />
              </motion.div>

              <h2 style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#34d399',
                marginBottom: '8px',
              }}>
                Access Granted
              </h2>
              <p style={{
                fontSize: '13px',
                color: '#8891a4',
                fontFamily: 'var(--font-mono)',
                marginBottom: '4px',
              }}>
                Welcome, {displayedName}
              </p>
              <p style={{
                fontSize: '11px',
                color: '#4a5568',
                fontFamily: 'var(--font-mono)',
              }}>
                Redirecting to Command Center...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Bottom branding */}
      <div style={{
        position: 'absolute',
        bottom: '28px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        opacity: 0.4,
      }}>
        <img
          src="/images/MasterBrandLogo.png"
          alt="Synapse"
          style={{ height: '24px', objectFit: 'contain' }}
        />
        <span style={{
          fontSize: '12px',
          fontFamily: 'var(--font-mono)',
          color: '#8891a4',
          letterSpacing: '2px',
        }}>
          SYNAPSE EIT
        </span>
      </div>
    </div>
  )
}
