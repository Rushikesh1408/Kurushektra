import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster, toast } from 'react-hot-toast'
import { Navbar } from './components/Navbar'
import { DashboardPage } from './pages/DashboardPage'
import { TutorPage } from './pages/TutorPage'
import { CodeArenaPage } from './pages/CodeArenaPage'
import { KnowledgePage } from './pages/KnowledgePage'
import { ProgressPage } from './pages/ProgressPage'
import { AuthPage } from './pages/AuthPage'
import { getMe } from './services/api'
import { User } from './types'

export function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      // Default demo student user if not logged in
      setUser({
        user_id: 'usr-demo-student',
        email: 'alex.chen@student.codearena.edu',
        display_name: 'Alex Chen',
        role: 'student',
        is_active: true,
      })
      setLoading(false)
      return
    }

    try {
      const res = await getMe()
      setUser(res.data)
    } catch {
      // Token expired or server unreachable
      setUser({
        user_id: 'usr-demo-student',
        email: 'alex.chen@student.codearena.edu',
        display_name: 'Alex Chen',
        role: 'student',
        is_active: true,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    setUser(null)
    toast.success('Signed out successfully')
  }

  const handleLoginSuccess = () => {
    fetchUser()
    toast.success('Welcome back!')
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-base)' }}>
        <div style={{ color: 'var(--color-accent-light)', fontSize: '16px', fontWeight: 600 }}>
          Initializing Code Arena AI Brain...
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Toaster position="top-right" toastOptions={{ style: { background: '#1a1c26', color: '#f1f2f6', border: '1px solid rgba(255,255,255,0.1)' } }} />
        <Navbar user={user} onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={<DashboardPage user={user} />} />
          <Route path="/tutor" element={<TutorPage />} />
          <Route path="/arena" element={<CodeArenaPage />} />
          <Route path="/knowledge" element={<KnowledgePage />} />
          <Route path="/progress" element={<ProgressPage user={user} />} />
          <Route path="/auth" element={<AuthPage onLogin={handleLoginSuccess} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
