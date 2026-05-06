'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function JoinContent() {
  const router = useRouter()
  const params = useSearchParams()
  const token  = params.get('token') ?? ''
  const supabase = createClient()

  const [status, setStatus] = useState<'checking' | 'join' | 'error' | 'success'>('checking')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const check = async () => {
      if (!token) { setStatus('error'); setError('Token de invitación no encontrado.'); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace(`/login?redirect=/join?token=${token}`)
        return
      }
      setStatus('join')
    }
    check()
  }, [token])

  const handleAccept = async () => {
    setLoading(true)
    setError('')
    const { data, error: fe } = await supabase.rpc('accept_invite', { p_token: token })
    if (fe) { setError(fe.message); setLoading(false); return }
    if (data?.error) { setError(data.error); setLoading(false); return }
    setStatus('success')
    setTimeout(() => { router.push('/dashboard'); router.refresh() }, 1200)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#070707', padding: 24 }}>
      <div style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', padding: 40, width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: '1.5px solid #00E87A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#00E87A', margin: '0 auto 20px' }}>A</div>

        {status === 'checking' && (
          <div style={{ color: '#555', fontFamily: 'monospace', fontSize: 12 }}>⟳ Verificando invitación...</div>
        )}

        {status === 'join' && (
          <>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#EBEBEB', marginBottom: 8 }}>Unirse al equipo</div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 28 }}>
              Acepta la invitación para acceder al CRM compartido de tu empresa.
            </div>
            {error && (
              <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', color: '#EF4444', padding: '10px 14px', fontSize: 12, marginBottom: 20 }}>
                {error}
              </div>
            )}
            <button onClick={handleAccept} disabled={loading} style={{
              background: '#00E87A', color: '#000', border: 'none', padding: '11px 24px',
              fontSize: 12, fontWeight: 700, letterSpacing: '.06em', cursor: 'pointer', width: '100%',
              opacity: loading ? .5 : 1,
            }}>
              {loading ? '⟳ Uniéndose...' : '▸ Aceptar invitación'}
            </button>
          </>
        )}

        {status === 'success' && (
          <div style={{ color: '#00E87A' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>¡Bienvenido al equipo!</div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 8 }}>Redirigiendo al dashboard...</div>
          </div>
        )}

        {status === 'error' && (
          <>
            <div style={{ color: '#EF4444', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Invitación no válida</div>
            <div style={{ color: '#555', fontSize: 12, marginBottom: 24 }}>{error}</div>
            <Link href="/login" style={{ color: '#00E87A', fontSize: 12 }}>Ir al inicio de sesión</Link>
          </>
        )}
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#070707' }}>
        <div style={{ color: '#555', fontFamily: 'monospace', fontSize: 12 }}>⟳ Cargando...</div>
      </div>
    }>
      <JoinContent />
    </Suspense>
  )
}
