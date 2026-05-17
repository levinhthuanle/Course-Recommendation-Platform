import { useEffect, useState } from 'react'
import { api } from '../../utils/api'
import type { User } from '../types'

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) return

    api.me()
      .then((user) => setCurrentUser(user))
      .catch(() => {
        localStorage.removeItem('auth_token')
        setCurrentUser(null)
      })
  }, [])

  const submitAuth = async () => {
    const email = authEmail.trim()
    const password = authPassword.trim()
    if (!email || !password) return

    setAuthLoading(true)
    setAuthError(null)
    try {
      const response = authMode === 'login'
        ? await api.login(email, password)
        : await api.register(email, password)
      localStorage.setItem('auth_token', response.access_token)
      setCurrentUser(response.user)
      setAuthPassword('')
    } catch (e: any) {
      const msg = (e?.message || '').toString().toLowerCase()
      // Map backend auth messages to user-friendly Vietnamese messages
      if (msg.includes('email not found')) {
        setAuthError('Email không tồn tại')
      } else if (msg.includes('invalid password') || msg.includes('credential')) {
        setAuthError('Sai mật khẩu')
      } else {
        setAuthError(e?.message || 'Auth failed')
      }
    } finally {
      setAuthLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    setCurrentUser(null)
  }

  return {
    currentUser,
    authMode,
    authEmail,
    authPassword,
    authLoading,
    authError,
    setAuthMode,
    setAuthEmail,
    setAuthPassword,
    submitAuth,
    logout
  }
}
