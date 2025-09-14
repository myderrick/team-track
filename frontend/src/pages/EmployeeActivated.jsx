// src/pages/EmployeeActivated.jsx
import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function EmployeeActivated() {
  const navigate = useNavigate()
  useEffect(() => {
    (async () => {
      // mark employee as activated (optional RPC), then sign out
      await supabase.auth.signOut()
      navigate('/employee/login', { replace: true, state: { msg: 'Password saved. Please sign in.' } })
    })()
  }, [navigate])
  return <div className="p-6 text-sm text-gray-600">Finalizing…</div>
}
