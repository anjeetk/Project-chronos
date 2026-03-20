import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { QRCodeSVG } from 'qrcode.react'
import {
  ShieldCheck, Clock, FileText, Pill, AlertTriangle, Send, User, ChevronRight, Activity, BellRing
} from 'lucide-react'

// Removed legacy SimpleQRCode placeholder

export default function PatientPortal() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedItem, setSelectedItem] = useState(null)
  const [data, setData] = useState({
    patient: null,
    otBlock: null,
    medications: [],
    instructions: [],
    reminders: [],
    complaints: []
  })

  // Complaint form state
  const [complaintText, setComplaintText] = useState('')
  const [complaintTarget, setComplaintTarget] = useState('nurse') // 'nurse' or 'authority'

  useEffect(() => {
    fetchPatientData()
    
    // Set up realtime subscriptions
    const sub = supabase.channel('patient_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patient_reminders' }, fetchPatientData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'instructions' }, fetchPatientData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, fetchPatientData)
      .subscribe()

    return () => {
      supabase.removeChannel(sub)
    }
  }, [])

  const fetchPatientData = async () => {
    // For demo MVP, we extract the patient ID from the pre-filled name "R. Sharma (P-1042)"
    const userName = user?.user_metadata?.name || ''
    const match = userName.match(/P-\d{4}/)
    const patientId = match ? match[0] : 'P-1042' // Fallback to P-1042 if not found

    // Fetch Patient Details
    const { data: patientData } = await supabase.from('patients').select('*').eq('id', patientId).single()
    
    // Fetch OT Block (Secure Sentinel Hash)
    const { data: otBlock } = await supabase.from('ot_blocks').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(1).single()
    
    // Fetch Administered Medications
    const { data: meds } = await supabase.from('administered').select('*, users!nurse_id(name)').eq('patient_id', patientId).eq('is_administered', true).order('administered_at', { ascending: false })
    
    // Fetch Instructions targeted at patient (represented by nurse_id being null or similar logic, but for now we fetch all for this patient and filter in memory if needed)
    const { data: insts } = await supabase.from('instructions').select('*, users!doctor_id(name)').eq('patient_id', patientId).order('created_at', { ascending: false })
    
    // Fetch Reminders
    const { data: rems } = await supabase.from('patient_reminders').select('*').eq('patient_id', patientId).order('reminder_date', { ascending: true })
    
    // Fetch Complaints
    const { data: comps } = await supabase.from('complaints').select('*').eq('patient_id', patientId).order('created_at', { ascending: false })

    setData({
      patient: patientData || { id: patientId, name: userName },
      otBlock,
      medications: meds || [],
      instructions: insts?.filter(i => !i.nurse_id) || [], // Instructions where nurse_id is null = meant for patient
      reminders: rems || [],
      complaints: comps || []
    })
  }

  const submitComplaint = async (e) => {
    e.preventDefault()
    if (!complaintText.trim()) return

    await supabase.from('complaints').insert({
      patient_id: data.patient.id,
      lodged_by: 'patient',
      nature: complaintTarget === 'authority' ? 'Authority Escalation: ' + complaintText : 'Nurse Request: ' + complaintText,
      status: 'active'
    })

    setComplaintText('')
    await fetchPatientData()
  }

  const TABS = [
    { id: 'overview', label: 'My Hub', icon: User },
    { id: 'sentinel', label: 'OT Secure Record', icon: ShieldCheck },
    { id: 'meds', label: 'Medication History', icon: Pill },
    { id: 'instructions', label: 'My Instructions', icon: FileText },
    { id: 'reminders', label: 'Follow-ups', icon: BellRing },
    { id: 'complaints', label: 'Help & Complaints', icon: AlertTriangle },
  ]

  if (!data.patient) return <div style={{ padding: '40px', color: 'white' }}>Loading secure portal...</div>

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '24px',
      display: 'grid',
      gridTemplateColumns: '240px 1fr',
      gap: '24px',
      height: '100%',
    }}>
      {/* ── SIDEBAR NAV ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="glass" style={{ padding: '20px', marginBottom: '16px', textAlign: 'center' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'var(--accent-cyan)', margin: '0 auto 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', fontWeight: 'bold', color: '#000'
          }}>
            {data.patient.name?.charAt(0) || 'P'}
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>{data.patient.name}</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
             ID: {data.patient.id}
          </p>
        </div>

        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          let badge = 0
          if (tab.id === 'instructions') badge = data.instructions.filter(i => i.status === 'pending').length
          if (tab.id === 'reminders') badge = data.reminders.length

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderRadius: 'var(--radius-md)', border: 'none',
                background: isActive ? 'var(--color-brand-accent)' : 'var(--glass-bg)',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer', transition: 'all 0.2s',
                fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 500,
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <tab.icon size={18} />
                {tab.label}
              </div>
              {badge > 0 && (
                <div style={{
                  background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--color-critical)',
                  color: '#fff', padding: '2px 8px', borderRadius: '20px', fontSize: '11px',
                  fontWeight: 'bold', fontFamily: 'var(--font-mono)'
                }}>
                  {badge}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* ── EXCLUSIVE PATIENT CONTENT AREA ── */}
      <div className="glass scrollbar-hide" style={{ padding: '32px', overflow: 'auto' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* OVERVIEW / QR */}
            {activeTab === 'overview' && (
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', color: 'var(--color-stable)' }}>Welcome to your Secure Hub</h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div className="glass" style={{ padding: '24px', background: 'rgba(52, 211, 153, 0.05)', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                    <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Activity size={18} color="var(--color-stable)" /> Admission Details
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                      <div><strong style={{ color: 'var(--text-primary)' }}>Unit:</strong> {data.patient.unit_id || 'MICU'}</div>
                      <div><strong style={{ color: 'var(--text-primary)' }}>Admitted:</strong> {data.patient.admission_time ? new Date(data.patient.admission_time).toLocaleDateString() : 'N/A'}</div>
                      <div><strong style={{ color: 'var(--text-primary)' }}>Diagnosis:</strong> {data.patient.diagnosis || 'Post-Op Monitoring'}</div>
                      <div><strong style={{ color: 'var(--text-primary)' }}>Status:</strong> <span style={{ color: 'var(--color-stable)', fontWeight: 'bold' }}>{data.patient.status?.toUpperCase() || 'STABLE'}</span></div>
                    </div>
                  </div>

                  <div className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Your Universal Medical ID</h3>
                    <div style={{ background: '#fff', padding: '12px', borderRadius: '12px' }}>
                      <QRCodeSVG value={data.patient.id} size={150} level="H" />
                    </div>
                    <p style={{ marginTop: '16px', fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center', maxWidth: '80%' }}>
                      Scan at any Synapse GTB terminal to transmit encrypted medical history.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SECURE OT HASH */}
            {activeTab === 'sentinel' && (
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <ShieldCheck size={28} /> Operation Theatre Record
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
                  Your surgical metrics are recorded deterministically using the Sentinel Black Box. This hash is exclusively available to you and your primary surgeon, guaranteeing transparency and untampered evidence of the procedure.
                </p>

                {data.otBlock ? (
                  <div className="glass" style={{ padding: '32px', background: 'rgba(192, 132, 252, 0.05)', border: '1px solid rgba(192, 132, 252, 0.2)', textAlign: 'center' }}>
                    <ShieldCheck size={48} color="var(--accent-purple)" style={{ marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px' }}>Procedure Cryptographically Secured</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginBottom: '24px' }}>
                      Timestamp: {new Date(data.otBlock.created_at).toLocaleString()}
                    </p>
                    
                    <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>SECURE SHA-256 HASH</div>
                      <div style={{ fontSize: '14px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                        {data.otBlock.curr_hash}
                      </div>
                    </div>

                    <button style={{
                      marginTop: '24px', padding: '10px 24px', borderRadius: '8px',
                      background: 'var(--accent-purple)', color: '#fff', border: 'none',
                      fontFamily: 'var(--font-display)', fontWeight: 600, cursor: 'pointer'
                    }}>
                      Download Immutable PDF Report
                    </button>
                  </div>
                ) : (
                  <div className="glass" style={{ padding: '64px 32px', textAlign: 'center' }}>
                    <ShieldCheck size={48} color="var(--text-dim)" style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <h3 style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>No Operation Theatre records found</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginTop: '8px' }}>
                      Secure hash blocks are only generated once a procedure has concluded.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* MEDICATIONS */}
            {activeTab === 'meds' && (
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', color: 'var(--accent-cyan)' }}>Administered Medications</h2>
                
                {data.medications.length === 0 ? (
                  <p style={{ color: 'var(--text-dim)' }}>No medications administered yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {data.medications.map(med => (
                      <motion.div 
                        key={med.id} 
                        whileHover={{ scale: 1.01, backgroundColor: 'rgba(56, 189, 248, 0.05)' }}
                        onClick={() => setSelectedItem({ ...med, type: 'medication' })}
                        className="glass" 
                        style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                      >
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Pill size={20} color="var(--accent-cyan)" />
                          </div>
                          <div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{med.medicine}</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              Dose: {med.dosage} | Route: {med.route}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                            {new Date(med.administered_at).toLocaleString()}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-stable)', marginTop: '4px' }}>
                            Administered by: {med.users?.name || 'Nurse'}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* INSTRUCTIONS */}
            {activeTab === 'instructions' && (
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', color: 'var(--color-brand-accent)' }}>Doctor's Instructions For You</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Direct notes and lifestyle instructions prescribed by your medical team.</p>
                
                {data.instructions.length === 0 ? (
                  <div className="glass" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    No direct instructions at this time.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {data.instructions.map(inst => (
                      <motion.div 
                        key={inst.id} 
                        whileHover={{ scale: 1.01, backgroundColor: 'rgba(52, 211, 153, 0.05)' }}
                        onClick={() => setSelectedItem({ ...inst, type: 'instruction' })}
                        className="glass" 
                        style={{ 
                          padding: '20px', 
                          borderLeft: `4px solid ${inst.status === 'pending' ? 'var(--color-observing)' : 'var(--color-stable)'}`,
                          cursor: 'pointer', transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                            {new Date(inst.created_at).toLocaleString()}
                          </div>
                          <div style={{ 
                            fontSize: '10px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)',
                            color: inst.status === 'pending' ? 'var(--color-observing)' : 'var(--text-secondary)'
                          }}>
                            {inst.status.toUpperCase()}
                          </div>
                        </div>
                        <p style={{ fontSize: '16px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                          {inst.text}
                        </p>
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '12px' }}>
                          From: {inst.users?.name || 'Doctor'}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* REMINDERS / FOLLOW-UPS */}
            {activeTab === 'reminders' && (
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', color: 'var(--accent-blue)' }}>Routine Checkups & Reminders</h2>
                
                {data.reminders.length === 0 ? (
                  <p style={{ color: 'var(--text-dim)' }}>No upcoming reminders.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {data.reminders.map(rem => {
                      const date = new Date(rem.reminder_date)
                      const diffTime = Math.abs(date - new Date())
                      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                      const isUrgent = daysLeft <= 10
                      
                      return (
                        <motion.div 
                          key={rem.id} 
                          whileHover={{ scale: 1.02, backgroundColor: 'rgba(56, 189, 248, 0.05)' }}
                          onClick={() => setSelectedItem({ ...rem, type: 'reminder', daysLeft, isUrgent })}
                          className="glass" 
                          style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: 'bold' }}>{rem.title}</h3>
                              <BellRing size={16} color={isUrgent ? 'var(--color-critical)' : 'var(--accent-blue)'} />
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                              Scheduled: {date.toLocaleDateString()}
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '24px' }}>
                            <div style={{ 
                              background: isUrgent ? 'var(--color-critical-bg)' : 'rgba(56, 189, 248, 0.1)',
                              border: `1px solid ${isUrgent ? 'var(--color-critical)' : 'var(--accent-blue)'}`,
                              color: isUrgent ? 'var(--color-critical)' : 'var(--accent-blue)',
                              width: '48px', height: '48px', borderRadius: '12px',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                            }}>
                              <span style={{ fontSize: '18px', fontWeight: 'bold', lineHeight: 1 }}>{daysLeft}</span>
                              <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)' }}>DAYS</span>
                            </div>
                            <div style={{ fontSize: '13px', color: isUrgent ? 'var(--color-critical)' : 'var(--text-secondary)', fontWeight: 600 }}>
                              {isUrgent ? 'Approaching Soon' : 'Mark your calendar'}
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* COMPLAINTS */}
            {activeTab === 'complaints' && (
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--color-critical)' }}>Help & Complaints</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
                  If you need immediate assistance or wish to lodge a formal complaint, use this encrypted channel.
                </p>

                <form onSubmit={submitComplaint} className="glass" style={{ padding: '24px', marginBottom: '32px' }}>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                      <input 
                        type="radio" 
                        checked={complaintTarget === 'nurse'} 
                        onChange={() => setComplaintTarget('nurse')}
                        style={{ accentColor: 'var(--color-stable)' }}
                      />
                      Request Nurse Assistance
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--color-critical)' }}>
                      <input 
                        type="radio" 
                        checked={complaintTarget === 'authority'} 
                        onChange={() => setComplaintTarget('authority')}
                        style={{ accentColor: 'var(--color-critical)' }}
                      />
                      Escalate to Authorities
                    </label>
                  </div>
                  
                  <textarea
                    value={complaintText}
                    onChange={e => setComplaintText(e.target.value)}
                    placeholder={complaintTarget === 'nurse' ? "E.g., I'm experiencing pain and need my medication..." : "E.g., Describe your formal grievance here..."}
                    style={{
                      width: '100%', minHeight: '120px', padding: '16px', borderRadius: '12px',
                      background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                      color: 'var(--text-primary)', fontSize: '15px', fontFamily: 'var(--font-display)',
                      resize: 'vertical', marginBottom: '16px'
                    }}
                    required
                  />
                  
                  <button type="submit" style={{
                    padding: '12px 24px', borderRadius: '8px', border: 'none',
                    background: complaintTarget === 'authority' ? 'var(--color-critical)' : 'var(--color-stable)',
                    color: complaintTarget === 'authority' ? '#fff' : '#000',
                    fontFamily: 'var(--font-display)', fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}>
                    <Send size={16} /> Submit Securely
                  </button>
                </form>

                <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '16px' }}>Your Previous Logs</h3>
                {data.complaints.length === 0 ? (
                  <p style={{ color: 'var(--text-dim)' }}>No prior logs found.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {data.complaints.map(c => (
                      <div key={c.id} className="glass" style={{ padding: '16px', borderLeft: `3px solid ${c.nature.includes('Authority') ? 'var(--color-critical)' : 'var(--text-dim)'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{new Date(c.created_at).toLocaleString()}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px' }}>{c.status}</span>
                        </div>
                        <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: 0 }}>{c.nature}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
          {selectedItem && (
          <ItemDetailModal 
            item={selectedItem} 
            onClose={() => setSelectedItem(null)} 
          />
        )}
      </AnimatePresence>
      </div>
    </div>
  )
}

// ─── ITEM DETAIL MODAL ──────────────────────────────────────────────
function ItemDetailModal({ item, onClose }) {
  const typeLabels = {
    instruction: 'Doctor Instruction',
    medication: 'Medication Administration',
    reminder: 'Follow-up Reminder',
    complaint: 'Grievance / Request'
  }

  const icons = {
    instruction: Clock,
    medication: Pill,
    reminder: BellRing,
    complaint: AlertTriangle
  }

  const Icon = icons[item.type] || FileText

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(5, 10, 15, 0.9)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95 }}
        className="glass"
        style={{ width: '100%', maxWidth: '480px', padding: '32px', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'color-mix(in srgb, var(--color-brand-accent) 15%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={22} color="var(--color-brand-accent)" />
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--color-brand-accent)', fontFamily: 'var(--font-mono)', letterSpacing: '2px', fontWeight: 700 }}>
              {typeLabels[item.type]?.toUpperCase()}
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginTop: '4px', letterSpacing: '-0.5px' }}>
              {item.medicine || item.title || item.complaint_type || item.text?.substring(0, 20) || 'Secure Medical Update'}
            </h2>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {item.type === 'instruction' && (
            <>
               <DetailSection label="Instruction Note" value={item.text} large />
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <DetailSection label="Doctor" fallback="Dr. Elena Vance" />
                  <DetailSection label="Status" value={item.status.toUpperCase()} color={item.status === 'completed' ? 'var(--color-stable)' : 'var(--color-observing)'} />
                  <DetailSection label="Issued At" value={new Date(item.created_at).toLocaleString()} />
               </div>
            </>
          )}

          {item.type === 'medication' && (
            <>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <DetailSection label="Medicine Name" value={item.medicine} />
                  <DetailSection label="Dosage" value={item.dosage} />
                  <DetailSection label="Route" value={item.route} />
                  <DetailSection label="Action By" fallback="Senior Nursing Staff" />
                  <DetailSection label="Time" value={new Date(item.administered_at).toLocaleString()} />
               </div>
            </>
          )}

          {item.type === 'reminder' && (
            <>
               <DetailSection label="Follow-up Title" value={item.title} large />
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <DetailSection label="Scheduled Date" value={new Date(item.reminder_date).toLocaleDateString()} />
                  <DetailSection label="Urgency" value={item.isUrgent ? 'URGENT' : 'NORMAL'} color={item.isUrgent ? 'var(--color-critical)' : 'var(--color-stable)'} />
                  <DetailSection label="Time Remaining" value={`${item.daysLeft} Days`} />
               </div>
               <div style={{ fontSize: '13px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}>
                  This is an automated system reminder based on your clinical discharge pathway. Please ensure documentation is ready.
               </div>
            </>
          )}

          <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
            <button 
              onClick={onClose}
              style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'var(--color-brand-accent)', color: '#fff', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
            >
              ACKNOWLEDGE & CLOSE
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function DetailSection({ label, value, color, large, fallback }) {
  const displayValue = value || fallback || '—'
  return (
    <div>
      <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '1px', marginBottom: '2px' }}>
        {label.toUpperCase()}
      </div>
      <div style={{ 
        fontSize: large ? '16px' : '14px', 
        fontWeight: large ? 600 : 500, 
        color: color || 'var(--text-primary)',
        lineHeight: 1.4
      }}>
        {displayValue}
      </div>
    </div>
  )
}
