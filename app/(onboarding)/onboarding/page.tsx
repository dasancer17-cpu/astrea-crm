'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [teamName, setTeamName] = useState('')
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: te } = await supabase.rpc('create_team', { p_name: teamName })
    if (te) { setError(te.message); setLoading(false); return }
    if (!data) { setError('Error al crear equipo'); setLoading(false); return }

    router.push('/dashboard')
    router.refresh()
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const rawToken = token.trim().split('token=').pop() ?? token.trim()
    const { data, error: fe } = await supabase.rpc('accept_invite', { p_token: rawToken })
    if (fe) { setError(fe.message); setLoading(false); return }
    if (data?.error) { setError(data.error); setLoading(false); return }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#070707', padding: 24 }}>
      <div style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', padding: 40, width: '100%', maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{ width: 36, height: 36, border: '1.5px solid #00E87A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#00E87A' }}>A</div>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, letterSpacing: '.16em', color: '#EBEBEB' }}>ASTREA CRM</div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#444', marginTop: 2 }}>Configura tu espacio de equipo</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderBottom: '1px solid #1A1A1A' }}>
          {(['create', 'join'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError('') }} style={{
              flex: 1, padding: '9px 0', fontSize: 11, fontWeight: 700, letterSpacing: '.08em',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: tab === t ? '#00E87A' : '#555',
              borderBottom: tab === t ? '2px solid #00E87A' : '2px solid transparent',
              transition: 'all .15s',
            }}>
              {t === 'create' ? '+ CREAR EQUIPO' : '▸ UNIRSE CON INVITACIÓN'}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', color: '#EF4444', padding: '10px 14px', fontSize: 12, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {tab === 'create' ? (
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.11em', textTransform: 'uppercase', color: '#888', marginBottom: 6 }}>
                Nombre del equipo
              </div>
              <input
                style={{ background: '#131313', border: '1px solid #252525', color: '#EBEBEB', fontSize: 13, padding: '10px 12px', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }}
                required placeholder="Equipo de Ventas Acme" value={teamName}
                onChange={e => setTeamName(e.target.value)}
              />
            </div>
            <button type="submit" disabled={loading} style={{
              background: '#00E87A', color: '#000', border: 'none', padding: 11,
              fontSize: 12, fontWeight: 700, letterSpacing: '.06em', cursor: 'pointer',
              opacity: loading ? .5 : 1,
            }}>
              {loading ? '⟳ Creando...' : '▸ Crear equipo y continuar'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.11em', textTransform: 'uppercase', color: '#888', marginBottom: 6 }}>
                Token o enlace de invitación
              </div>
              <input
                style={{ background: '#131313', border: '1px solid #252525', color: '#EBEBEB', fontSize: 12, padding: '10px 12px', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'monospace' }}
                required placeholder="Pega aquí el enlace o el token" value={token}
                onChange={e => setToken(e.target.value)}
              />
              <div style={{ fontSize: 10, color: '#444', marginTop: 6 }}>
                Pide el enlace de invitación al administrador de tu equipo.
              </div>
            </div>
            <button type="submit" disabled={loading} style={{
              background: '#00E87A', color: '#000', border: 'none', padding: 11,
              fontSize: 12, fontWeight: 700, letterSpacing: '.06em', cursor: 'pointer',
              opacity: loading ? .5 : 1,
            }}>
              {loading ? '⟳ Uniéndose...' : '▸ Unirse al equipo'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
