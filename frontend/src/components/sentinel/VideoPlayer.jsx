import { forwardRef, useState, useRef, useEffect } from 'react'
import { RotateCcw, SkipBack, Play, Pause, SkipForward, Gauge, Plus, Minus } from 'lucide-react'

function formatTime(seconds) {
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

const SPEEDS = [0.5, 1, 1.5, 2]

const btnBase = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '6px',
  borderRadius: '6px',
  transition: 'all 0.15s ease',
}

const VideoPlayer = forwardRef(function VideoPlayer({
  isPlaying, currentTime, duration, onPlayPause, onLoadedMetadata, currentFrame,
  onSeek,
}, ref) {
  const [speed, setSpeed] = useState(1)
  const [extraFeeds, setExtraFeeds] = useState(0)
  const cctvRef = useRef()

  // --- MASTER CLOCK SYNC LOGIC ---
  // Sync PiP video Play/Pause state with Master video
  useEffect(() => {
    if (!cctvRef.current) return
    if (isPlaying) {
      cctvRef.current.play().catch(e => console.error("Auto-play prevented", e))
    } else {
      cctvRef.current.pause()
    }
  }, [isPlaying])

  // Sync PiP scrub time if it drifts from master by >0.5s or they seek backwards/forwards
  useEffect(() => {
    if (!cctvRef.current) return
    if (!isPlaying || Math.abs(cctvRef.current.currentTime - currentTime) > 0.5) {
      cctvRef.current.currentTime = currentTime
    }
  }, [currentTime, isPlaying])
  // -------------------------------

  // Determine if we should show AR overlays
  const showHrOverlay = currentFrame && currentFrame.tags?.some(t => t.type === 'HR_SPIKE')
  const showSpo2Overlay = currentFrame && currentFrame.tags?.some(t => t.type === 'SPO2_DROP')
  const showMotionOverlay = currentFrame && currentFrame.tags?.some(t => t.type === 'MOTION_ANOMALY')

  const handleReplay = () => {
    if (ref.current) {
      ref.current.currentTime = 0
      ref.current.play()
      if (onSeek) onSeek(0)
    }
  }

  const handleSkipBack = () => {
    if (ref.current) {
      const t = Math.max(0, ref.current.currentTime - 10)
      ref.current.currentTime = t
      if (onSeek) onSeek(t)
    }
  }

  const handleSkipForward = () => {
    if (ref.current) {
      const t = Math.min(ref.current.duration || duration, ref.current.currentTime + 10)
      ref.current.currentTime = t
      if (onSeek) onSeek(t)
    }
  }

  const handleCycleSpeed = () => {
    const idx = SPEEDS.indexOf(speed)
    const next = SPEEDS[(idx + 1) % SPEEDS.length]
    setSpeed(next)
    if (ref.current) ref.current.playbackRate = next
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '12px' }}>
      
      {/* UNIFIED VIDEO CONTAINER */}
      <div className="bg-slate-900/50 border border-white/10 p-1 rounded-xl" style={{
        flex: 1,
        minHeight: 0,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
      }}>
        
        {/* 1. Master Surgical Feed (Left) */}
        <div className="border-r border-white/5" style={{ flex: 1, position: 'relative', background: '#0a0a0a' }}>
        <video
          ref={ref}
          preload="auto"
          onLoadedMetadata={(e) => onLoadedMetadata(e.target.duration)}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          muted={false} // Master video can have audio if provided
        >
          <source src="/video/videoplayback - Trim.mp4" type="video/mp4" />
        </video>

        {/* Master Meta Tag */}
        <div style={{
          position: 'absolute', top: 12, left: 16, zIndex: 11,
          background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: 4, backdropFilter: 'blur(4px)',
          fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'white', display: 'flex', alignItems: 'center', gap: 6,
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#e11d48', animation: 'pulse-dot 2s infinite' }}/>
          CAM 01 // LAPAROSCOPIC
        </div>

        {/* AR Overlays (Pinned to Master Feed) */}
        {showHrOverlay && (
          <div style={{
            position: 'absolute', top: '15%', right: '10%', padding: '6px 12px',
            background: 'rgba(255, 45, 85, 0.15)', border: '1px solid rgba(255, 45, 85, 0.6)',
            borderRadius: 'var(--radius-sm)', color: 'var(--color-critical)', fontFamily: 'var(--font-mono)',
            fontSize: '11px', fontWeight: 700, animation: 'pulse-critical 1.5s infinite', backdropFilter: 'blur(4px)',
          }}>
            ⚡ HR SPIKE: {currentFrame?.heart_rate?.toFixed(0)} BPM
          </div>
        )}

        {showSpo2Overlay && (
          <div style={{
            position: 'absolute', top: '28%', right: '10%', padding: '6px 12px',
            background: 'rgba(0, 122, 255, 0.15)', border: '1px solid rgba(0, 122, 255, 0.6)',
            borderRadius: 'var(--radius-sm)', color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)',
            fontSize: '11px', fontWeight: 700, backdropFilter: 'blur(4px)',
          }}>
            🫁 SpO2 DROP: {currentFrame?.spo2?.toFixed(1)}%
          </div>
        )}

        {showMotionOverlay && (
          <div style={{
            position: 'absolute', top: '15%', left: '5%', width: '200px', height: '200px',
            border: '2px solid rgba(251, 191, 36, 0.5)', borderRadius: 'var(--radius-sm)',
            background: 'rgba(251, 191, 36, 0.05)', display: 'flex', alignItems: 'flex-end',
            padding: '8px', pointerEvents: 'none',
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-observing)', fontWeight: 700, letterSpacing: '1px' }}>MOTION DETECTED</span>
          </div>
        )}
      </div>

      {/* 2. Slave CCTV Feed (Right) */}
      <div style={{ flex: 1, position: 'relative', background: '#050505' }}>
        <video
          ref={cctvRef}
          muted // CRITICAL: Slave video MUST be muted to prevent audio echoing
          style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'grayscale(0.3) contrast(1.1)' }}
        >
          <source src="/video/real video - Trim.mp4" type="video/mp4" />
        </video>

        {/* CCTV Meta Tag */}
        <div style={{
          position: 'absolute', top: 12, left: 16, zIndex: 11,
          background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: 4, backdropFilter: 'blur(4px)',
          fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'white', display: 'flex', alignItems: 'center', gap: 6,
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ffa3', animation: 'pulse-dot 2s infinite' }}/>
          CAM 02 // WIDE OR
        </div>
      </div>

      {Array.from({ length: extraFeeds }).map((_, i) => (
        <div key={i} className="border-l border-white/5" style={{ flex: 1, position: 'relative', background: '#050505' }}>
          <video
            muted
            style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'grayscale(0.6)' }}
            autoPlay
            loop
          >
            {/* Re-use surgical video for demonstration of extra feeds */}
            <source src="/video/real video - Trim.mp4" type="video/mp4" />
          </video>
          <div style={{
            position: 'absolute', top: 12, left: 16, zIndex: 11,
            background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: 4, backdropFilter: 'blur(4px)',
            fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'white', display: 'flex', alignItems: 'center', gap: 6,
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fbbf24', animation: 'pulse-dot 2s infinite' }}/>
            CAM 0{i + 3} // AUX FEED
          </div>
        </div>
      ))}
      {showHrOverlay && (
        <div style={{
          position: 'absolute',
          top: '15%',
          right: '10%',
          padding: '6px 12px',
          background: 'rgba(255, 45, 85, 0.15)',
          border: '1px solid rgba(255, 45, 85, 0.6)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--color-critical)',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          fontWeight: 700,
          animation: 'pulse-critical 1.5s infinite',
          backdropFilter: 'blur(4px)',
        }}>
          ⚡ HR SPIKE: {currentFrame?.heart_rate?.toFixed(0)} BPM
        </div>
      )}

      {showSpo2Overlay && (
        <div style={{
          position: 'absolute',
          top: '28%',
          right: '10%',
          padding: '6px 12px',
          background: 'rgba(0, 122, 255, 0.15)',
          border: '1px solid rgba(0, 122, 255, 0.6)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--accent-blue)',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          fontWeight: 700,
          backdropFilter: 'blur(4px)',
        }}>
          🫁 SpO2 DROP: {currentFrame?.spo2?.toFixed(1)}%
        </div>
      )}

      {showMotionOverlay && (
        <div style={{
          position: 'absolute',
          top: '15%',
          left: '5%',
          width: '200px',
          height: '200px',
          border: '2px solid rgba(251, 191, 36, 0.5)',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(251, 191, 36, 0.05)',
          display: 'flex',
          alignItems: 'flex-end',
          padding: '8px',
          pointerEvents: 'none',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--color-observing)',
            fontWeight: 700,
            letterSpacing: '1px',
          }}>MOTION DETECTED</span>
        </div>
      )}

      {/* === Enhanced Playback Controls === */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(15, 23, 42, 0.7)', // slate-900/70 approx
        backdropFilter: 'blur(16px)',
        padding: '6px 14px',
        borderRadius: 'var(--radius-full)',
        border: '1px solid var(--glass-border)',
      }}>
        {/* Replay */}
        <button
          onClick={handleReplay}
          title="Replay from start"
          style={btnBase}
          onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <RotateCcw size={15} />
        </button>

        {/* Divider */}
        <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.1)' }} />

        {/* Skip Back 10s */}
        <button
          onClick={handleSkipBack}
          title="Back 10 seconds"
          style={{ ...btnBase, position: 'relative' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <SkipBack size={15} />
          <span style={{ position: 'absolute', bottom: '-1px', right: '2px', fontSize: '7px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>10</span>
        </button>

        {/* Play / Pause — large primary button */}
        <button
          onClick={onPlayPause}
          title={isPlaying ? 'Pause' : 'Play'}
          style={{
            background: 'white',
            color: '#000',
            border: 'none',
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s',
            boxShadow: '0 0 12px rgba(255,255,255,0.15)',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(255,255,255,0.3)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(255,255,255,0.15)'; }}
        >
          {isPlaying ? <Pause size={16} fill="#000" /> : <Play size={16} fill="#000" style={{ marginLeft: '2px' }} />}
        </button>

        {/* Skip Forward 10s */}
        <button
          onClick={handleSkipForward}
          title="Forward 10 seconds"
          style={{ ...btnBase, position: 'relative' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <SkipForward size={15} />
          <span style={{ position: 'absolute', bottom: '-1px', right: '2px', fontSize: '7px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>10</span>
        </button>

        {/* Divider */}
        <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.1)' }} />

        {/* Playback Speed */}
        <button
          onClick={handleCycleSpeed}
          title={`Speed: ${speed}x (click to cycle)`}
          style={{
            ...btnBase,
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            fontWeight: 700,
            gap: '3px',
            padding: '4px 8px',
            color: speed !== 1 ? 'var(--accent-cyan)' : 'var(--text-secondary)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Gauge size={12} />
          {speed}x
        </button>

        {/* Divider */}
        <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.1)' }} />

        {/* Timestamp */}
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-secondary)',
          letterSpacing: '0.5px',
          minWidth: '85px',
          textAlign: 'center',
        }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Divider */}
        <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.1)' }} />

        {/* Remove Feed Button */}
        {extraFeeds > 0 && (
          <>
            <button
              onClick={() => setExtraFeeds(prev => Math.max(0, prev - 1))}
              title="Remove Camera Feed"
              style={{
                ...btnBase,
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 700,
                gap: '4px',
                padding: '4px 10px',
                color: 'var(--color-critical)',
                background: 'rgba(255,45,85,0.05)',
                border: '1px solid rgba(255,45,85,0.2)',
                borderRadius: 'var(--radius-full)'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,45,85,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,45,85,0.05)'; }}
            >
              <Minus size={12} /> REMOVE
            </button>
            <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.1)' }} />
          </>
        )}

        {/* Add Feed Button */}
        <button
          onClick={() => setExtraFeeds(prev => prev + 1)}
          title="Add Camera Feed"
          style={{
            ...btnBase,
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            fontWeight: 700,
            gap: '4px',
            padding: '4px 10px',
            color: 'var(--text-primary)',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 'var(--radius-full)'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
        >
          <Plus size={12} /> ADD FEED
        </button>
      </div>

      {/* Top-left badge */}
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(8px)',
        padding: '4px 10px',
        borderRadius: 'var(--radius-sm)',
      }}>
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: isPlaying ? 'var(--color-critical)' : 'var(--text-dim)',
          animation: isPlaying ? 'pulse-dot 1s infinite' : 'none',
        }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-secondary)', letterSpacing: '1.5px' }}>
          {isPlaying ? 'REC' : 'PAUSED'}
        </span>
      </div>
      </div>
    </div>
  )
})

export default VideoPlayer
