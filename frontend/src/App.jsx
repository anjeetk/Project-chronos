import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import ChronosView from './pages/ChronosView'
import SentinelView from './pages/SentinelView'
import CommandPalette from './components/CommandPalette'
import DoctorQuickAuth from './components/auth/DoctorQuickAuth'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { playNavClick, playPaletteOpen } from './utils/sounds'
import { LogOut } from 'lucide-react'
import './styles/index.css'

function AuthenticatedApp() {
  const { isAuthenticated, loading, doctor, logout } = useAuth()
  const [showPalette, setShowPalette] = useState(false)
  const [activeView, setActiveView] = useState('chronos')

  // Global Cmd+K handler
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowPalette(v => {
          if (!v) playPaletteOpen()
          return !v
        })
      }
      if (e.key === 'Escape') setShowPalette(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const navigate = useCallback((view) => {
    playNavClick()
    setActiveView(view)
    setShowPalette(false)
  }, [])

  // Loading state
  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#040608',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '2px solid rgba(52, 211, 153, 0.2)',
          borderTopColor: '#34d399',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // Show Quick Auth if not authenticated
  if (!isAuthenticated) {
    return <DoctorQuickAuth />
  }

  // Main authenticated dashboard
  return (
    <div className="bg-[#06080d] text-gray-100 min-h-screen font-display">
      {/* Ambient background */}
      <div className="ambient-bg" />

      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 py-3 bg-glass-texture border-b border-white/5">
        <div className="flex items-center gap-3">
          <img src="/images/MasterBrandLogo.png" alt="Synapse Logo" className="h-9 w-auto object-contain drop-shadow-md" />
          <span className="font-bold text-xl tracking-tight text-white font-display">Synapse EIT</span>
        </div>

        <div className="flex gap-2 p-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10 shadow-inner">
          <NavTab active={activeView === 'chronos'} onClick={() => navigate('chronos')} icon="/images/ProjectChronos.png" label="Project Chronos" />
          <NavTab active={activeView === 'sentinel'} onClick={() => navigate('sentinel')} icon="/images/ProjectSentinel.png" label="Project Sentinel" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Doctor badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 12px',
            borderRadius: '9999px',
            background: 'rgba(52, 211, 153, 0.08)',
            border: '1px solid rgba(52, 211, 153, 0.15)',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            color: '#34d399',
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#34d399',
              boxShadow: '0 0 8px rgba(52, 211, 153, 0.6)',
              animation: 'pulse-dot 2s infinite',
            }} />
            {doctor?.name || 'Doctor'}
          </div>

          {/* Search button */}
          <button
            onClick={() => { playPaletteOpen(); setShowPalette(true) }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              transition: 'var(--transition-smooth)',
            }}
            onMouseEnter={e => { e.target.style.borderColor = 'var(--glass-border-hover)'; e.target.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.target.style.borderColor = 'var(--glass-border)'; e.target.style.color = 'var(--text-secondary)'; }}
          >
            <span>Search</span>
            <kbd style={{
              background: 'rgba(255,255,255,0.06)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>⌘K</kbd>
          </button>

          {/* Logout button */}
          <button
            id="logout-btn"
            onClick={logout}
            title="Sign Out"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: 'rgba(255, 45, 85, 0.06)',
              border: '1px solid rgba(255, 45, 85, 0.12)',
              color: '#ff6b8a',
              cursor: 'pointer',
              transition: 'all 300ms',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255, 45, 85, 0.15)'
              e.currentTarget.style.borderColor = 'rgba(255, 45, 85, 0.3)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255, 45, 85, 0.06)'
              e.currentTarget.style.borderColor = 'rgba(255, 45, 85, 0.12)'
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ position: 'relative', zIndex: 1, paddingTop: '56px', height: '100vh' }}>
        {activeView === 'chronos' && <ChronosView />}
        {activeView === 'sentinel' && <SentinelView />}
      </div>

      {/* Command Palette */}
      <AnimatePresence>
        {showPalette && (
          <CommandPalette
            onClose={() => setShowPalette(false)}
            onNavigate={navigate}
            currentView={activeView}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </BrowserRouter>
  )
}

function NavTab({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2.5 px-5 py-2 rounded-full border-b-2 transition-all duration-300
        ${active 
          ? 'bg-[#34d399]/15 text-[#34d399] border-[#34d399] shadow-[0_0_12px_rgba(52,211,153,0.3)]' 
          : 'border-transparent text-gray-400 hover:text-white hover:brightness-125 hover:bg-white/5'}
      `}
      style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13px', letterSpacing: '0.5px' }}
    >
      <img src={icon} alt={label} className={`h-6 w-6 object-contain drop-shadow transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-60'}`} />
      <span>{label}</span>
    </button>
  )
}
