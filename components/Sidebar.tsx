'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useTeam } from '@/hooks/useTeam'
import { useState, useEffect } from 'react'

const NAV = [
  { href: '/dashboard',   icon: '▦', label: 'Dashboard'   },
  { href: '/contacts',    icon: '◎', label: 'Contactos'   },
  { href: '/companies',   icon: '▣', label: 'Empresas'    },
  { href: '/deals',       icon: '▤', label: 'Pipeline'    },
  { href: '/activities',  icon: '◆', label: 'Actividades' },
  { href: '/reports',     icon: '▧', label: 'Reportes'    },
  { href: '/settings',    icon: '⚙', label: 'Equipo'      },
]

export function Sidebar() {
  const pathname  = usePathname()
  const router    = useRouter()
  const { teamName, role } = useTeam()
  const [health, setHealth] = useState<number | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('deals')
      .select('value, probability, stage')
      .then(({ data }) => {
        if (!data || data.length === 0) { setHealth(100); return }
        const active = data.filter(d => d.stage !== 'perdido')
        if (active.length === 0) { setHealth(100); return }
        const totalValue    = active.reduce((s, d) => s + d.value, 0)
        const weightedValue = active.reduce((s, d) => s + d.value * d.probability / 100, 0)
        setHealth(totalValue > 0 ? Math.round(weightedValue / totalValue * 100) : 100)
      })
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const healthColor = health === null ? 'var(--t3)' : health >= 70 ? 'var(--green)' : health >= 40 ? 'var(--amber)' : 'var(--red)'

  return (
    <aside style={{
      width: 210, background: 'var(--surface)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28, border: '1.5px solid var(--green)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--green)', flexShrink: 0,
        }}>A</div>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '.16em', color: 'var(--tx)' }}>ASTREA</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t3)', letterSpacing: '.08em' }}>CRM OPS CENTER</div>
        </div>
      </div>

      {/* Team badge */}
      {teamName && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--gd)' }}>
          <div style={{ fontSize: 9, color: 'var(--green)', fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>
            {teamName}
          </div>
          <div style={{ fontSize: 8, color: 'var(--t3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', marginTop: 1 }}>
            {role === 'owner' ? 'Propietario' : role === 'admin' ? 'Admin' : 'Miembro'}
          </div>
        </div>
      )}

      {/* Nav */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--t3)', padding: '14px 20px 4px' }}>
          Navegación
        </div>
        {NAV.map(n => {
          const active = pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(n.href))
          return (
            <Link key={n.href} href={n.href} style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '7px 12px 7px 20px', fontSize: 12, fontWeight: 500, textDecoration: 'none',
              color: active ? 'var(--green)' : 'var(--t2)',
              background: active ? 'var(--gd)' : 'transparent',
              border: active ? '1px solid rgba(0,232,122,.18)' : '1px solid transparent',
              margin: '1px 8px', transition: 'all .1s',
            }}>
              <span style={{ fontSize: 13, width: 14, textAlign: 'center' }}>{n.icon}</span>
              <span>{n.label}</span>
            </Link>
          )
        })}

        {/* Pipeline health */}
        <div style={{ margin: '12px', padding: '12px', background: 'var(--s2)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 6 }}>Salud Pipeline</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: healthColor }}>
            {health === null ? '—' : `${health}%`}
          </div>
          <div style={{ height: 3, background: 'var(--s3)', marginTop: 6 }}>
            <div style={{ width: `${health ?? 0}%`, height: '100%', background: healthColor, transition: 'width .6s ease' }}/>
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t3)', marginTop: 4 }}>valor ponderado / pipeline</div>
        </div>
      </div>

      {/* Logout */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '10px 12px' }}>
        <button onClick={handleLogout} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 11 }}>
          ⎋ Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
