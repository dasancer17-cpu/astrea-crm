'use client'
import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function LoginForm() {
  const router  = useRouter()
  const params  = useSearchParams()
  const redirectTo = params.get('redirect') ?? '/dashboard'
  const teamSlug   = params.get('team')  ?? ''
  const teamName   = params.get('tname') ?? ''

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push(redirectTo)
    router.refresh()
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#070707', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: teamName ? 20 : 40 }}>
          <div style={{
            width: 36, height: 36, border: '1.5px solid #00E87A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#00E87A',
          }}>A</div>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, letterSpacing: '.16em', color: '#EBEBEB' }}>ASTREA CRM</div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#444', marginTop: 2 }}>Inicia sesión en tu cuenta</div>
          </div>
        </div>

        {/* Team badge */}
        {teamName && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(0,232,122,.06)', border: '1px solid rgba(0,232,122,.18)',
            padding: '10px 14px', marginBottom: 24,
          }}>
            <div style={{
              width: 28, height: 28, background: 'rgba(0,232,122,.12)',
              border: '1px solid rgba(0,232,122,.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#00E87A', flexShrink: 0,
            }}>
              {teamName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#00E87A', letterSpacing: '.04em' }}>{teamName}</div>
              <div style={{ fontSize: 9, color: '#444', marginTop: 1, fontFamily: 'monospace' }}>entrando al equipo</div>
            </div>
            <Link href="/" style={{ marginLeft: 'auto', fontSize: 9, color: '#555', textDecoration: 'none' }}>✕ cambiar</Link>
          </div>
        )}

        {/* Card */}
        <div style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', padding: 40 }}>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)',
              color: '#EF4444', padding: '10px 14px', fontSize: 12, marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.11em', textTransform: 'uppercase', color: '#888' }}>Email</label>
              <input
                style={{ background: '#131313', border: '1px solid #252525', color: '#EBEBEB', fontSize: 13, padding: '10px 12px', outline: 'none', transition: 'border-color .15s', fontFamily: 'inherit' }}
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={e => (e.target.style.borderColor = '#00E87A')}
                onBlur={e  => (e.target.style.borderColor = '#252525')}
                placeholder="tu@empresa.com"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.11em', textTransform: 'uppercase', color: '#888' }}>Contraseña</label>
              <input
                style={{ background: '#131313', border: '1px solid #252525', color: '#EBEBEB', fontSize: 13, padding: '10px 12px', outline: 'none', transition: 'border-color .15s', fontFamily: 'inherit' }}
                type="password" required value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={e => (e.target.style.borderColor = '#00E87A')}
                onBlur={e  => (e.target.style.borderColor = '#252525')}
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                background: '#00E87A', color: '#000', border: 'none', padding: 11,
                fontSize: 12, fontWeight: 700, letterSpacing: '.06em',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? .5 : 1, transition: 'all .15s', marginTop: 4,
              }}
            >
              {loading ? '⟳ Entrando...' : '▸ Iniciar sesión'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#444', marginTop: 24 }}>
          ¿No tienes cuenta?{' '}
          <Link href="/register" style={{ color: '#00E87A', textDecoration: 'none' }}>Regístrate gratis</Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#070707' }}/>}>
      <LoginForm />
    </Suspense>
  )
}
