import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import VideoPlayer from '../components/sentinel/VideoPlayer'
import HashMatrix from '../components/sentinel/HashMatrix'
import MagneticTimeline from '../components/sentinel/MagneticTimeline'
import AnomalyLog from '../components/sentinel/AnomalyLog'
import TamperSimulator from '../components/sentinel/TamperSimulator'
import VitalsSync from '../components/sentinel/VitalsSync'
import { loadTelemetry, loadAuditTrail, SAMPLE_COMMS } from '../data/sentinelLoader'
import { playBreachAlarm, playAnomalyPing } from '../utils/sounds'

export default function SentinelView() {
  const [telemetry, setTelemetry] = useState([])
  const [audit, setAudit] = useState([])
  const [comms, setComms] = useState([])
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [tamperActive, setTamperActive] = useState(false)
  const videoRef = useRef()

  // Load data
  useEffect(() => {
    async function load() {
      const tel = await loadTelemetry()
      const aud = await loadAuditTrail()
      setTelemetry(tel)
      setAudit(aud)
      setComms(SAMPLE_COMMS)
    }
    load()
  }, [])

  // Sync time with video using requestAnimationFrame for smoothness
  useEffect(() => {
    let raf
    const sync = () => {
      if (videoRef.current && !videoRef.current.paused) {
        setCurrentTime(videoRef.current.currentTime)
      }
      raf = requestAnimationFrame(sync)
    }
    raf = requestAnimationFrame(sync)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Get current telemetry frame
  const currentFrame = telemetry.find(t => Math.abs(t.timestamp - currentTime) < 0.3) || telemetry[0] || null

  // Get current audit entry
  const currentAuditIdx = currentFrame ? currentFrame.frame_idx : 0
  const currentAuditEntry = audit[currentAuditIdx] || null

  // All anomalies
  const anomalies = telemetry.filter(t => t.tags && t.tags.length > 0)

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play()
        setIsPlaying(true)
      } else {
        videoRef.current.pause()
        setIsPlaying(false)
      }
    }
  }

  const handleSeek = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleJumpToAnomaly = (timestamp) => {
    playAnomalyPing()
    handleSeek(timestamp)
    if (videoRef.current && videoRef.current.paused) {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleTamper = () => {
    setTamperActive(true)
    // Breach alarm sound
    playBreachAlarm()
    // Haptic feedback on supported devices
    if (navigator.vibrate) navigator.vibrate([50, 30, 50])
    setTimeout(() => setTamperActive(false), 3000)
  }

  return (
    <div className={tamperActive ? 'screen-shake' : ''} style={{
      display: 'grid',
      gridTemplateColumns: '1fr 340px',
      gridTemplateRows: '1fr auto',
      gap: '16px',
      height: 'calc(100vh - 56px)',
      padding: '16px',
      position: 'relative',
      zIndex: 1,
    }}>
      {/* Tamper overlay */}
      {tamperActive && <TamperSimulator />}

      {/* Left: Video + Vitals + Timeline */}
      <div style={{
        gridColumn: '1',
        gridRow: '1 / 3',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        minHeight: 0,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
          <div>
            <h2 style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '2px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Project Sentinel</h2>
            <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px', marginTop: '2px' }}>Surgical Flight Recorder</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: tamperActive ? 'var(--color-critical-bg)' : 'var(--color-stable-bg)',
              padding: '4px 12px', borderRadius: 'var(--radius-full)',
              border: `1px solid ${tamperActive ? 'var(--color-critical)' : 'var(--color-stable)'}33`,
              transition: 'var(--transition-smooth)',
            }}>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: tamperActive ? 'var(--color-critical)' : 'var(--color-stable)',
                animation: 'pulse-dot 2s infinite',
              }} />
              <span style={{
                fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px',
                color: tamperActive ? 'var(--color-critical)' : 'var(--color-stable)',
              }}>
                {tamperActive ? 'BREACH DETECTED' : 'INTEGRITY VERIFIED'}
              </span>
            </div>
            <button onClick={handleTamper} style={{
              background: 'rgba(255, 45, 85, 0.1)',
              border: '1px solid rgba(255, 45, 85, 0.3)',
              color: 'var(--color-critical)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '1px',
              transition: 'var(--transition-smooth)',
            }}>⚠ SIMULATE TAMPER</button>
          </div>
        </div>

        {/* Video */}
        <VideoPlayer
          ref={videoRef}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          onPlayPause={handlePlayPause}
          onLoadedMetadata={(d) => setDuration(d)}
          currentFrame={currentFrame}
          onSeek={handleSeek}
        />

        {/* Vitals Sync */}
        <VitalsSync frame={currentFrame} />

        {/* Timeline */}
        <MagneticTimeline
          telemetry={telemetry}
          currentTime={currentTime}
          duration={duration || (telemetry.length > 0 ? telemetry[telemetry.length - 1].timestamp : 60)}
          onSeek={handleSeek}
          anomalies={anomalies}
        />
      </div>

      {/* Right: Telemetry Sidebar */}
      <div style={{
        gridColumn: '2',
        gridRow: '1 / 3',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        minHeight: 0,
      }}>
        <HashMatrix
          auditTrail={audit}
          currentIdx={currentAuditIdx}
          tamperActive={tamperActive}
          finalHash={audit.length > 0 ? audit[audit.length - 1].data_hash : null}
        />

        <AnomalyLog
          anomalies={anomalies}
          onJump={handleJumpToAnomaly}
        />
      </div>
    </div>
  )
}
