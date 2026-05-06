'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function LoginForm() {
  const router  = useRouter()
  const params  = useSearchParams()
  const redirect = params.get('redirect') ?? '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push(redirect)
    router.refresh()
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-mark">A</div>
          <div>
            <div className="auth-title">ASTREA CRM</div>
            <div className="auth-sub">Inicia sesión en tu cuenta</div>
          </div>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleLogin} className="auth-form">
          <div className="auth-fg">
            <label className="auth-lbl">Email</label>
            <input className="auth-inp" type="email" required value={email}
              onChange={e => setEmail(e.target.value)} placeholder="tu@empresa.com"/>
          </div>
          <div className="auth-fg">
            <label className="auth-lbl">Contraseña</label>
            <input className="auth-inp" type="password" required value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••"/>
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? '⟳ Entrando...' : '▸ Iniciar sesión'}
          </button>
        </form>

        <p className="auth-footer">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="auth-link">Regístrate gratis</Link>
        </p>
      </div>

      <style jsx>{`
        .auth-wrap{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#070707;padding:24px;}
        .auth-card{background:#0D0D0D;border:1px solid #1A1A1A;padding:40px;width:100%;max-width:400px;}
        .auth-logo{display:flex;align-items:center;gap:12px;margin-bottom:32px;}
        .auth-mark{width:36px;height:36px;border:1.5px solid #00E87A;display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:14px;font-weight:700;color:#00E87A;flex-shrink:0;}
        .auth-title{font-family:monospace;font-size:13px;font-weight:700;letter-spacing:.16em;color:#EBEBEB;}
        .auth-sub{font-family:monospace;font-size:10px;color:#444;margin-top:2px;}
        .auth-error{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);color:#EF4444;padding:10px 14px;font-size:12px;margin-bottom:20px;}
        .auth-form{display:flex;flex-direction:column;gap:16px;}
        .auth-fg{display:flex;flex-direction:column;gap:6px;}
        .auth-lbl{font-size:9px;font-weight:600;letter-spacing:.11em;text-transform:uppercase;color:#888;}
        .auth-inp{background:#131313;border:1px solid #252525;color:#EBEBEB;font-size:13px;padding:10px 12px;outline:none;transition:border-color .15s;font-family:inherit;}
        .auth-inp:focus{border-color:#00E87A;}
        .auth-btn{background:#00E87A;color:#000;border:none;padding:11px;font-size:12px;font-weight:700;letter-spacing:.06em;cursor:pointer;transition:background .15s;margin-top:4px;}
        .auth-btn:hover{background:#00ff87;}
        .auth-btn:disabled{opacity:.5;cursor:not-allowed;}
        .auth-footer{text-align:center;font-size:11px;color:#444;margin-top:24px;}
        .auth-link{color:#00E87A;text-decoration:none;}
        .auth-link:hover{text-decoration:underline;}
      `}</style>
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
