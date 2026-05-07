'use client'
import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function RegisterForm() {
  const router  = useRouter()
  const params  = useSearchParams()
  const redirectTo = params.get('redirect') ?? ''

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess(true)
    setLoading(false)
  }

  if (success) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#070707', padding: 24 }}>
      <div style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', padding: 40, width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: 32, color: '#00E87A', marginBottom: 12 }}>✓</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#EBEBEB', marginBottom: 8 }}>¡Cuenta creada!</div>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 24 }}>
          Revisa tu email para confirmar tu cuenta y luego inicia sesión.
        </div>
        <Link
          href={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login'}
          style={{ display: 'block', background: '#00E87A', color: '#000', padding: 11, fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textDecoration: 'none', textAlign: 'center' }}
        >
          ▸ Ir al login
        </Link>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#070707', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
          <div style={{ width: 36, height: 36, border: '1.5px solid #00E87A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#00E87A' }}>A</div>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, letterSpacing: '.16em', color: '#EBEBEB' }}>ASTREA CRM</div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#444', marginTop: 2 }}>Crea tu cuenta gratis</div>
          </div>
        </div>

        <div style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', padding: 40 }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', color: '#EF4444', padding: '10px 14px', fontSize: 12, marginBottom: 20 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                type="password" required minLength={6} value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={e => (e.target.style.borderColor = '#00E87A')}
                onBlur={e  => (e.target.style.borderColor = '#252525')}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.11em', textTransform: 'uppercase', color: '#888' }}>Confirmar contraseña</label>
              <input
                style={{ background: '#131313', border: '1px solid #252525', color: '#EBEBEB', fontSize: 13, padding: '10px 12px', outline: 'none', transition: 'border-color .15s', fontFamily: 'inherit' }}
                type="password" required value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onFocus={e => (e.target.style.borderColor = '#00E87A')}
                onBlur={e  => (e.target.style.borderColor = '#252525')}
                placeholder="Repite la contraseña"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ background: '#00E87A', color: '#000', border: 'none', padding: 11, fontSize: 12, fontWeight: 700, letterSpacing: '.06em', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .5 : 1, transition: 'all .15s', marginTop: 4 }}
            >
              {loading ? '⟳ Creando cuenta...' : '▸ Crear cuenta'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#444', marginTop: 24 }}>
          ¿Ya tienes cuenta?{' '}
          <Link href={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login'} style={{ color: '#00E87A', textDecoration: 'none' }}>Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#070707' }}/>}>
      <RegisterForm />
    </Suspense>
  )
}
