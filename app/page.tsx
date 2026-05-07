'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '')
   .trim().toLowerCase()
   .replace(/[^a-z0-9]+/g, '-')
   .replace(/^-|-$/g, '')

export default function LandingPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [name,    setName]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')

    const slug = slugify(name)
    const { data, error: err } = await supabase.rpc('get_team_by_slug', { p_slug: slug })

    if (err || !data || data.length === 0) {
      setError('No encontramos ese equipo. Verifica el nombre o pide que te inviten.')
      setLoading(false)
      return
    }

    const team = data[0] as { id: string; name: string }
    router.push(`/login?team=${encodeURIComponent(slug)}&tname=${encodeURIComponent(team.name)}`)
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#070707', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
          <div style={{
            width: 42, height: 42, border: '1.5px solid #00E87A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: '#00E87A',
          }}>A</div>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, letterSpacing: '.16em', color: '#EBEBEB' }}>ASTREA CRM</div>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#444', marginTop: 3, letterSpacing: '.08em' }}>OPS CENTER</div>
          </div>
        </div>

        {/* Card */}
        <div style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', padding: 40 }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#EBEBEB', marginBottom: 6 }}>Accede a tu equipo</div>
            <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>
              Escribe el nombre de tu empresa o equipo para continuar.
            </div>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)',
              color: '#EF4444', padding: '10px 14px', fontSize: 12, marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.11em', textTransform: 'uppercase', color: '#888', marginBottom: 6 }}>
                Nombre del equipo
              </div>
              <input
                autoFocus
                style={{
                  background: '#131313', border: '1px solid #252525', color: '#EBEBEB',
                  fontSize: 14, padding: '11px 14px', outline: 'none',
                  width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
                  transition: 'border-color .15s',
                }}
                placeholder="Ej: Astrea, Acme Sales, MiEmpresa..."
                value={name}
                onChange={e => { setName(e.target.value); setError('') }}
                onFocus={e  => (e.target.style.borderColor = '#00E87A')}
                onBlur={e   => (e.target.style.borderColor = '#252525')}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              style={{
                background: '#00E87A', color: '#000', border: 'none', padding: 12,
                fontSize: 12, fontWeight: 700, letterSpacing: '.06em',
                cursor: loading || !name.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !name.trim() ? .5 : 1, transition: 'all .15s',
              }}
            >
              {loading ? '⟳ Buscando...' : '▸ Continuar'}
            </button>
          </form>
        </div>

        {/* Footer links */}
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: '#444' }}>
          ¿Sin equipo todavía?{' '}
          <Link href="/register" style={{ color: '#00E87A', textDecoration: 'none' }}>Regístrate gratis</Link>
          <span style={{ margin: '0 8px', color: '#2A2A2A' }}>·</span>
          <Link href="/login" style={{ color: '#666', textDecoration: 'none' }}>Login directo</Link>
        </div>
      </div>
    </div>
  )
}
