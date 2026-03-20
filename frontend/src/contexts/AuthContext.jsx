import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [doctor, setDoctor] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchDoctorData(session.user.id, session.user)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchDoctorData(session.user.id, session.user)
      } else {
        setDoctor(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchDoctorData = async (userId, userObj) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        throw error
      }
      
      // If found in public.users, set it. Otherwise just use basic info from auth
      if (data) {
        setDoctor({ ...data, email: userObj.email })
      } else {
        // Fallback if public.users record doesn't exist yet
        setDoctor({ 
          id: userId, 
          name: userObj.user_metadata?.name || 'Doctor', 
          role: 'doctor',
          email: userObj.email
        })
      }
    } catch (err) {
      console.error('Error fetching doctor profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  const signup = async (email, password, name, metadata = {}) => {
    const role = metadata.role || 'doctor'
    
    // Assign random metadata for nurses
    let assignedDoctor = null
    let assignedWard = null
    
    if (role === 'nurse') {
      const doctors = ["Dr. Avery", "Dr. Sterling", "Dr. Vance", "Dr. Thorne"]
      const wards = ["ICU-A (Critical Care)", "ICU-B (Post-Op)", "ICU-C (Neonatal)", "ICU-D (Neuro)"]
      assignedDoctor = doctors[Math.floor(Math.random() * doctors.length)]
      assignedWard = wards[Math.floor(Math.random() * wards.length)]
    }

    // 1. Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'http://localhost:5173',
        data: {
          name,
          role: role,
          assigned_doctor_name: assignedDoctor,
          assigned_icu_ward: assignedWard
        }
      }
    })
    
    if (error) {
      if (error.message.includes('Email rate limit exceeded') || error.message.includes('rate limit')) {
         console.warn('Rate limit exceeded. Falling back to Guest Session for demo.')
         const mockUser = { id: 'guest-' + Math.random().toString(36).substr(2, 9), email, user_metadata: { name, role, assigned_doctor_name: assignedDoctor, assigned_icu_ward: assignedWard } }
         setSession({ user: mockUser })
         setDoctor({ ...mockUser.user_metadata, id: mockUser.id, email })
         setLoading(false)
         return { user: mockUser, session: { user: mockUser }, isGuest: true }
      }
      throw error
    }
    
    // 2. Insert into public.users
    if (data.user) {
      const { error: insertError } = await supabase
        .from('users')
        .upsert({
          id: data.user.id,
          name: name,
          role: role,
          assigned_doctor_name: assignedDoctor,
          assigned_icu_ward: assignedWard
        })
        
      if (insertError) {
         console.error('Error creating public profile:', insertError)
      }
    }
    
    return data
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setDoctor(null)
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user, doctor, loading, login, signup, logout, isAuthenticated: !!session }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
