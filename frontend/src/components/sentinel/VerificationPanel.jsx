/**
 * VerificationPanel.jsx — "Verify Recording Integrity" panel.
 * 
 * States: [Idle] → [Loading recordings] → [Verifying...] → [Result]
 * 
 * Includes tamper simulation: Delete Frame, Modify Vitals, Modify Frame
 * After tampering, auto-re-verifies and plays breach alarm.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldCheck, ShieldAlert, Loader2, RefreshCw, Trash2, Edit3, Zap, AlertTriangle } from 'lucide-react';
import { playBreachAlarm, playHashSealed, playCriticalBeep } from '../../utils/sounds';

const API_BASE = 'http://localhost:8000';

export default function VerificationPanel({ activeSessionId = null }) {
  const [recordings, setRecordings] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [state, setState] = useState('idle'); // idle | loading | verifying | result | tampering
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [tamperResult, setTamperResult] = useState(null);
  const [tamperTarget, setTamperTarget] = useState(null); // seq to tamper

  useEffect(() => {
    fetchRecordings();
  }, []);

  // Auto-select active session when it changes
  useEffect(() => {
    if (activeSessionId) {
      setSelectedSession(activeSessionId);
      // Refresh recordings list to include this session
      fetchRecordings();
    }
  }, [activeSessionId]);

  async function fetchRecordings() {
    setState('loading');
    try {
      const res = await fetch(`${API_BASE}/api/recordings`);
      if (!res.ok) throw new Error('Backend unavailable');
      const data = await res.json();
      setRecordings(data);
      if (!selectedSession && data.length > 0) setSelectedSession(data[0].session_id);
      setState('idle');
    } catch (e) {
      setError('Backend not running — start with: python -m app.main --with-api');
      setState('idle');
    }
  }

  const runVerification = useCallback(async (sid) => {
    const sessionId = sid || selectedSession;
    if (!sessionId) return;
    setState('verifying');
    setResult(null);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/verify/${sessionId}`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult(data);
      setState('result');

      // Play sound based on result
      if (data.ok) {
        playHashSealed();
      } else {
        playBreachAlarm();
        playCriticalBeep();
      }
    } catch (e) {
      setError(e.message);
      setState('idle');
    }
  }, [selectedSession]);

  // ── Tamper Functions ──
  async function tamperSession(mode, label) {
    if (!selectedSession) return;
    
    // Pick a random seq to tamper (middle of the recording for drama)
    const recording = recordings.find(r => r.session_id === selectedSession);
    const maxSeq = recording ? recording.records - 1 : 5;
    const targetSeq = Math.max(1, Math.floor(maxSeq / 2));
    
    setTamperTarget(targetSeq);
    setState('tampering');
    setTamperResult(null);
    setResult(null);

    try {
      const res = await fetch(
        `${API_BASE}/api/tamper/${selectedSession}/${targetSeq}?mode=${mode}`,
        { method: 'POST' }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTamperResult({ ...data, label });

      // Now auto-verify to show the broken chain
      await new Promise(resolve => setTimeout(resolve, 800));
      await runVerification(selectedSession);
    } catch (e) {
      setError(`Tamper failed: ${e.message}`);
      setState('idle');
    }
  }

  const selectedRec = recordings.find(r => r.session_id === selectedSession);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Shield size={18} style={{ color: 'var(--accent)' }} />
        <span style={styles.title}>Recording Verification</span>
        <button onClick={fetchRecordings} style={styles.refreshBtn} title="Refresh recordings">
          <RefreshCw size={14} />
        </button>
      </div>

      {error && (
        <div style={styles.errorBox}>
          <ShieldAlert size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Session selector */}
      {recordings.length > 0 && (
        <div style={styles.selectorWrap}>
          <select
            value={selectedSession || ''}
            onChange={(e) => {
              setSelectedSession(e.target.value);
              setResult(null);
              setTamperResult(null);
            }}
            style={styles.select}
          >
            {recordings.map((r) => (
              <option key={r.session_id} value={r.session_id}>
                {r.session_id.slice(0, 8)}... ({r.records} records, {r.batches} batches)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Verify button */}
      <button
        onClick={() => runVerification()}
        disabled={state === 'verifying' || state === 'tampering' || !selectedSession}
        style={{
          ...styles.verifyBtn,
          opacity: state === 'verifying' || state === 'tampering' || !selectedSession ? 0.5 : 1,
        }}
      >
        {state === 'verifying' ? (
          <>
            <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
            Verifying Chain...
          </>
        ) : (
          <>
            <ShieldCheck size={16} />
            Verify Recording Integrity
          </>
        )}
      </button>

      {/* ── Tamper Simulation Section ── */}
      {selectedSession && state !== 'verifying' && (
        <div style={styles.tamperSection}>
          <div style={styles.tamperHeader}>
            <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#f59e0b' }}>
              TAMPER SIMULATION
            </span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 8 }}>
            Simulate data tampering on seq #{selectedRec ? Math.max(1, Math.floor((selectedRec.records - 1) / 2)) : '?'} to test integrity detection
          </div>
          <div style={styles.tamperBtns}>
            <button
              onClick={() => tamperSession('delete_frame', 'Frame Deleted')}
              disabled={state === 'tampering'}
              style={styles.tamperBtn}
            >
              <Trash2 size={12} />
              Delete Frame
            </button>
            <button
              onClick={() => tamperSession('modify_vitals', 'Vitals Modified')}
              disabled={state === 'tampering'}
              style={styles.tamperBtn}
            >
              <Edit3 size={12} />
              Modify Vitals
            </button>
            <button
              onClick={() => tamperSession('modify_frame', 'Frame Corrupted')}
              disabled={state === 'tampering'}
              style={styles.tamperBtn}
            >
              <Zap size={12} />
              Corrupt Frame
            </button>
          </div>
        </div>
      )}

      {/* Tampering in progress */}
      <AnimatePresence>
        {state === 'tampering' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={styles.tamperingBox}
          >
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: '#f59e0b' }} />
            <span>Tampering seq #{tamperTarget}... then auto-verifying...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tamper result badge */}
      <AnimatePresence>
        {tamperResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={styles.tamperResultBadge}
          >
            <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
            <span>⚡ {tamperResult.label} at seq #{tamperResult.seq}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verification Result */}
      <AnimatePresence>
        {state === 'result' && result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              ...styles.resultBox,
              borderColor: result.ok ? '#10b981' : '#ef4444',
              background: result.ok
                ? 'rgba(16, 185, 129, 0.08)'
                : 'rgba(239, 68, 68, 0.08)',
            }}
          >
            <div style={styles.resultHeader}>
              {result.ok ? (
                <ShieldCheck size={20} style={{ color: '#10b981' }} />
              ) : (
                <ShieldAlert size={20} style={{ color: '#ef4444', animation: 'pulse-critical 1s infinite' }} />
              )}
              <span style={{ color: result.ok ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                {result.ok
                  ? `✔ Verified — ${result.verified_count} records intact`
                  : `✗ TAMPERING DETECTED at seq ${result.failed_at}`}
              </span>
            </div>

            {!result.ok && (
              <div style={styles.mismatchDetails}>
                <div style={{
                  padding: '8px 10px',
                  background: 'rgba(239, 68, 68, 0.06)',
                  borderRadius: 6,
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  marginBottom: 6,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', letterSpacing: '1px', marginBottom: 6 }}>
                    ⚠ CHAIN INTEGRITY BROKEN
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                    Hash mismatch detected — the recorded data has been altered after capture. 
                    The cryptographic chain proves this record was tampered with.
                  </div>
                </div>
                <div style={styles.hashRow}>
                  <span style={styles.hashLabel}>Expected:</span>
                  <code style={styles.hashValue}>{result.expected}</code>
                </div>
                <div style={styles.hashRow}>
                  <span style={styles.hashLabel}>Got:</span>
                  <code style={{ ...styles.hashValue, color: '#ef4444' }}>{result.got}</code>
                </div>
                {result.reason && (
                  <div style={{ ...styles.hashRow, marginTop: 4 }}>
                    <span style={{ ...styles.hashLabel, color: '#ef4444' }}>Reason:</span>
                    <span style={styles.hashValue}>{result.reason}</span>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const styles = {
  container: {
    background: 'var(--bg-card)',
    borderRadius: 12,
    border: '1px solid var(--border)',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
    flex: 1,
  },
  refreshBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: 4,
    borderRadius: 6,
    display: 'flex',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 8,
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
    fontSize: 12,
  },
  selectorWrap: {
    display: 'flex',
    gap: 8,
  },
  select: {
    flex: 1,
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  verifyBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '10px 16px',
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: '#fff',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tamperSection: {
    borderTop: '1px solid var(--glass-border)',
    paddingTop: 12,
  },
  tamperHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  tamperBtns: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  tamperBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid rgba(239, 68, 68, 0.2)',
    background: 'rgba(239, 68, 68, 0.06)',
    color: '#ef4444',
    fontSize: 10,
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.5px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tamperingBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderRadius: 8,
    background: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    color: '#f59e0b',
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
  },
  tamperResultBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    borderRadius: 6,
    background: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    color: '#f59e0b',
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
    fontWeight: 600,
  },
  resultBox: {
    borderRadius: 8,
    border: '1px solid',
    padding: 12,
  },
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
  },
  mismatchDetails: {
    marginTop: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  hashRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  hashLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    width: 60,
    flexShrink: 0,
  },
  hashValue: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: 'var(--text-primary)',
    wordBreak: 'break-all',
  },
};
