import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import {
  ClipboardList, Pill, AlertTriangle, CheckCircle2, 
  Send, User, Clock, Bell, FileText, Check, X,
  ExternalLink, MessageSquare
} from 'lucide-react'
import { playNavClick, playSuccess, playNotification } from '../utils/sounds'

export default function NurseDashboard() {
  const { user, doctor } = useAuth()
  const [activeTab, setActiveTab] = useState('tasks')
  const [data, setData] = useState({
    instructions: [],
    medications: [],
    complaints: [],
    history: []
  })
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [selectedTask, setSelectedTask] = useState(null)
  const [modalType, setModalType] = useState(null) // 'task' | 'med' | 'complaint'
  const [note, setNote] = useState('')

  useEffect(() => {
    fetchActiveData()
    if (!user) return
    
    // Real-time subscriptions
    const sub = supabase.channel('nurse_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'instructions', filter: `nurse_id=eq.${user.id}` }, (payload) => {
        if (payload.eventType === 'INSERT') playNotification()
        fetchActiveData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'administered', filter: `nurse_id=eq.${user.id}` }, fetchActiveData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints', filter: `nurse_id=eq.${user.id}` }, fetchActiveData)
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [user?.id])

  const fetchActiveData = async () => {
    if (!user) return
    const userId = user.id
    
    // 1. Pending Instructions (Assigned to this nurse)
    const { data: insts } = await supabase
      .from('instructions')
      .select('*, doctor:users!doctor_id(name), patient:patients(name)')
      .eq('nurse_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      
    // 2. Pending Medications (Assigned to this nurse)
    const { data: meds } = await supabase
      .from('administered')
      .select('*, doctor:users!doctor_id(name), patient:patients(name)')
      .eq('is_administered', false)
      .eq('nurse_id', userId)
      .order('admin_id', { ascending: false })
      
    // 3. Active Complaints (Assigned to this nurse)
    const { data: comps } = await supabase
      .from('complaints')
      .select('*, patient:patients(name)')
      .eq('nurse_id', userId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    // 4. Completed History (Limited to recent 10)
    const { data: instHistory } = await supabase.from('instructions').select('*, patient:patients(name)').eq('nurse_id', userId).eq('status', 'completed').limit(5)
    const { data: medHistory } = await supabase.from('administered').select('*, patient:patients(name)').eq('nurse_id', userId).eq('is_administered', true).limit(5)
    
    setData({
      instructions: insts || [],
      medications: meds || [],
      complaints: comps || [],
      history: [...(instHistory || []).map(i => ({ ...i, type: 'instruction' })), ...(medHistory || []).map(m => ({ ...m, type: 'medication' }))]
        .sort((a,b) => new Date(b.completed_at || b.administered_at) - new Date(a.completed_at || a.administered_at))
    })
    setLoading(false)
  }

  const handleAction = async () => {
    if (!selectedTask) return
    
    try {
      if (modalType === 'task') {
        const { error } = await supabase.from('instructions')
          .update({ 
            status: 'completed', 
            notes: note, 
            completed_at: new Date().toISOString() 
          })
          .eq('instruction_id', selectedTask.instruction_id)
        if (error) throw error
      } else if (modalType === 'med') {
        const { error } = await supabase.from('administered')
          .update({ 
            is_administered: true, 
            notes: note, 
            administered_at: new Date().toISOString() 
          })
          .eq('admin_id', selectedTask.admin_id)
        if (error) throw error
      } else if (modalType === 'complaint') {
        const { error } = await supabase.from('complaints')
          .update({ 
            status: 'resolved', 
            resolution_notes: note, 
            resolved_at: new Date().toISOString(),
            resolved_by: user.id
          })
          .eq('complaint_id', selectedTask.complaint_id)
        if (error) throw error
      }
      
      playSuccess()
      setSelectedTask(null)
      setNote('')
      fetchActiveData()
    } catch (err) {
      console.error('Error completing task:', err)
    }
  }

  const TABS = [
    { id: 'tasks', label: 'Procedures', icon: ClipboardList, count: data.instructions.length },
    { id: 'meds', label: 'Medications', icon: Pill, count: data.medications.length },
    { id: 'complaints', label: 'Requests', icon: AlertTriangle, count: data.complaints.length },
    { id: 'history', label: 'History', icon: Clock, count: 0 },
  ]

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      {/* Nurse Profile & Assignment Header */}
      <div className="glass" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '4px solid var(--color-brand-accent)' }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-brand-accent), var(--accent-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#fff' }}>
             {doctor?.name?.charAt(0) || 'N'}
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{doctor?.name || 'Staff Nurse'}</h1>
            <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
              <span style={{ fontSize: '13px', padding: '4px 10px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-blue)', fontWeight: 600 }}>
                {doctor?.role?.toUpperCase() || 'NURSE'}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} /> Active Session: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '32px', padding: '0 32px', borderLeft: '1px solid var(--input-border)' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Assigned Surgeon</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{doctor?.assigned_doctor_name || 'Dr. Sterling (Default)'}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Assignment Sector</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{doctor?.assigned_icu_ward || 'ICU-A Critical Care'}</div>
          </div>
        </div>
      </div>

      {/* Header Stat Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { playNavClick(); setActiveTab(tab.id); }}
            className="glass"
            style={{
              padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', border: 'none', cursor: 'pointer',
              background: activeTab === tab.id ? 'var(--color-brand-accent)' : 'var(--glass-bg)',
              transition: 'all 0.3s ease', textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <tab.icon size={20} color={activeTab === tab.id ? '#fff' : 'var(--text-secondary)'} />
              {tab.count > 0 && <span style={{ background: '#ff3b30', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>{tab.count}</span>}
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: activeTab === tab.id ? '#fff' : 'var(--text-primary)' }}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Work Area */}
      <div className="glass scrollbar-hide" style={{ flex: 1, padding: '32px', overflow: 'auto' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>
              {TABS.find(t => t.id === activeTab)?.label}
            </h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginBottom: '32px' }}>
              Assign, supervise, and perform clinical protocols with deterministic records.
            </p>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}><Loader2 size={32} className="spin" color="var(--color-brand-accent)" /></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {activeTab === 'tasks' && data.instructions.map(item => (
                  <TaskCard key={item.instruction_id} item={item} onAction={() => { setSelectedTask(item); setModalType('task'); }} />
                ))}
                
                {activeTab === 'meds' && data.medications.map(item => (
                  <MedCard key={item.admin_id} item={item} onAction={() => { setSelectedTask(item); setModalType('med'); }} />
                ))}

                {activeTab === 'complaints' && data.complaints.map(item => (
                   <ComplaintCard key={item.complaint_id} item={item} onAction={() => { setSelectedTask(item); setModalType('complaint'); }} />
                ))}

                {activeTab === 'history' && data.history.map((item, idx) => (
                   <HistoryCard key={idx} item={item} />
                ))}

                {data[activeTab]?.length === 0 && activeTab !== 'history' && (
                  <div className="glass" style={{ padding: '64px', textAlign: 'center', opacity: 0.6 }}>
                    <CheckCircle2 size={48} style={{ margin: '0 auto 16px' }} color="var(--color-stable)" />
                    <h3>All activities resolved</h3>
                    <p style={{ fontSize: '13px', marginTop: '8px' }}>There are no pending protocols in this sector.</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action Modal */}
      <AnimatePresence>
        {selectedTask && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass" style={{ width: '100%', maxWidth: '480px', padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>Complete Procedure</h3>
                <button onClick={() => setSelectedTask(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={20} /></button>
              </div>

              <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', borderLeft: '4px solid var(--color-brand-accent)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>Procedure Details</div>
                <div style={{ fontSize: '15px', fontWeight: 600 }}>{selectedTask.text || selectedTask.medicine || selectedTask.complaint_text}</div>
              </div>

              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Clinical Notes (optional)</label>
              <textarea 
                value={note} onChange={e => setNote(e.target.value)} 
                placeholder="E.g. Patient tolerated well, BP 120/80..."
                style={{ width: '100%', height: '120px', padding: '16px', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)', marginBottom: '24px', outline: 'none', resize: 'none' }}
              />

              <button onClick={handleAction} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--color-brand-accent)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <Check size={18} /> Confirm Handover & Log
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TaskCard({ item, onAction }) {
  return (
    <div className="glass" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FileText size={20} color="var(--accent-blue)" />
        </div>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{item.text}</div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '12px', color: 'var(--text-dim)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={12} /> {item.patient?.name}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {new Date(item.created_at).toLocaleTimeString()}</span>
            <span style={{ color: 'var(--accent-blue)' }}>Ordered by {item.doctor?.name}</span>
          </div>
        </div>
      </div>
      <button onClick={onAction} style={{ background: 'var(--color-brand-accent)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Mark Completed</button>
    </div>
  )
}

function MedCard({ item, onAction }) {
  return (
    <div className="glass" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Pill size={20} color="var(--color-critical)" />
        </div>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{item.medicine} <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>({item.dosage})</span></div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '12px', color: 'var(--text-dim)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={12} /> {item.patient?.name}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><ExternalLink size={12} /> Route: {item.route}</span>
            <span style={{ color: 'var(--color-critical)' }}>Signed by {item.doctor?.name}</span>
          </div>
        </div>
      </div>
      <button onClick={onAction} style={{ background: 'var(--color-stable)', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Administer</button>
    </div>
  )
}

function ComplaintCard({ item, onAction }) {
  return (
    <div className="glass" style={{ padding: '24px', borderLeft: '4px solid var(--color-critical)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
       <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 69, 58, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MessageSquare size={20} color="var(--color-critical)" />
        </div>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{item.complaint_text}</div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '12px', color: 'var(--text-dim)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={12} /> {item.patient?.name}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {new Date(item.created_at).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
      <button onClick={onAction} style={{ background: 'var(--color-critical)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Resolve Complaint</button>
    </div>
  )
}

function HistoryCard({ item }) {
  return (
    <div className="glass" style={{ padding: '16px 24px', opacity: 0.8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Check size={16} color="var(--color-stable)" />
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>{item.text || item.medicine}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Patient: {item.patient?.name} | {new Date(item.completed_at || item.administered_at).toLocaleString()}</div>
        </div>
      </div>
      {item.notes && <div style={{ fontSize: '11px', color: 'var(--color-brand-accent)', fontStyle: 'italic' }}>"{item.notes}"</div>}
    </div>
  )
}

function Loader2({ size, color, className }) {
  return <div style={{ width: size, height: size, border: `3px solid ${color}33`, borderTopColor: color, borderRadius: '50%', animation: 'spin 1s linear infinite' }} className={className} />
}
