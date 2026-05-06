'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTeam } from '@/hooks/useTeam'
import { useProject } from '@/hooks/useProject'
import { useState, useEffect } from 'react'
import type { Project } from '@/lib/supabase/types'

const NAV = [
  { href: '/dashboard',   icon: '▦', label: 'Dashboard'   },
  { href: '/contacts',    icon: '◎', label: 'Contactos'   },
  { href: '/companies',   icon: '▣', label: 'Empresas'    },
  { href: '/deals',       icon: '▤', label: 'Pipeline'    },
  { href: '/activities',  icon: '◆', label: 'Actividades' },
  { href: '/reports',     icon: '▧', label: 'Reportes'    },
  { href: '/settings',    icon: '⚙', label: 'Equipo'      },
]

const PROJECT_COLORS = [
  '#60A5FA','#00E87A','#A78BFA','#F59E0B',
  '#EF4444','#22D3EE','#F472B6','#FB923C',
]

export function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const { teamName, teamId, role } = useTeam()
  const { projects, activeProject, setProjects, setActiveProject } = useProject()

  const [health,      setHealth]      = useState<number | null>(null)
  const [creating,    setCreating]    = useState(false)
  const [newName,     setNewName]     = useState('')
  const [newColor,    setNewColor]    = useState(PROJECT_COLORS[0])
  const [savingProj,  setSavingProj]  = useState(false)

  // Load pipeline health
  useEffect(() => {
    const supabase = createClient()
    supabase.from('deals').select('value, probability, stage').then(({ data }) => {
      if (!data || data.length === 0) { setHealth(100); return }
      const active = data.filter(d => d.stage !== 'perdido')
      if (active.length === 0) { setHealth(100); return }
      const totalValue    = active.reduce((s, d) => s + d.value, 0)
      const weightedValue = active.reduce((s, d) => s + d.value * d.probability / 100, 0)
      setHealth(totalValue > 0 ? Math.round(weightedValue / totalValue * 100) : 100)
    })
  }, [])

  // Load projects for this team
  useEffect(() => {
    if (!teamId) return
    const supabase = createClient()
    supabase.from('projects').select('*').eq('team_id', teamId).order('created_at')
      .then(({ data }) => { if (data) setProjects(data as Project[]) })
  }, [teamId])

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !teamId) return
    setSavingProj(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('projects').insert([{
      name: newName.trim(), color: newColor,
      team_id: teamId, created_by: user!.id,
    }]).select().single()
    if (data) {
      const updated = [...projects, data as Project]
      setProjects(updated)
      setActiveProject(data as Project)
    }
    setNewName('')
    setNewColor(PROJECT_COLORS[0])
    setCreating(false)
    setSavingProj(false)
  }

  const handleDeleteProject = async (e: React.MouseEvent, proj: Project) => {
    e.stopPropagation()
    if (!confirm(`¿Eliminar el proyecto "${proj.name}"? Los datos asociados no se borran.`)) return
    const supabase = createClient()
    await supabase.from('projects').delete().eq('id', proj.id)
    const updated = projects.filter(p => p.id !== proj.id)
    setProjects(updated)
    if (activeProject?.id === proj.id) setActiveProject(null)
  }

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
        <div style={{ width: 28, height: 28, border: '1.5px solid var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--green)', flexShrink: 0 }}>A</div>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '.16em', color: 'var(--tx)' }}>ASTREA</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t3)', letterSpacing: '.08em' }}>CRM OPS CENTER</div>
        </div>
      </div>

      {/* Team badge */}
      {teamName && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--gd)' }}>
          <div style={{ fontSize: 9, color: 'var(--green)', fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>{teamName}</div>
          <div style={{ fontSize: 8, color: 'var(--t3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', marginTop: 1 }}>
            {role === 'owner' ? 'Propietario' : role === 'admin' ? 'Admin' : 'Miembro'}
          </div>
        </div>
      )}

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {/* Nav */}
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

        {/* ── PROJECTS ──────────────────────────────── */}
        <div style={{ margin: '10px 0 0', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 6px' }}>
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--t3)' }}>Proyectos</span>
            <button onClick={() => setCreating(c => !c)} style={{
              background: 'transparent', border: '1px solid var(--b2)', color: 'var(--t3)',
              width: 18, height: 18, cursor: 'pointer', fontSize: 13, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }} title="Nuevo proyecto">+</button>
          </div>

          {/* All projects option */}
          <button onClick={() => setActiveProject(null)} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '6px 12px 6px 20px', fontSize: 11, fontWeight: 500, textAlign: 'left',
            background: activeProject === null ? 'var(--s2)' : 'transparent',
            color: activeProject === null ? 'var(--tx)' : 'var(--t2)',
            border: activeProject === null ? '1px solid var(--b2)' : '1px solid transparent',
            cursor: 'pointer', margin: '1px 8px', transition: 'all .1s',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--t3)', flexShrink: 0 }}/>
            <span>Todos los proyectos</span>
          </button>

          {/* Project list */}
          {projects.map(p => (
            <div key={p.id} style={{ position: 'relative', margin: '1px 8px' }}>
              <button onClick={() => setActiveProject(activeProject?.id === p.id ? null : p)} style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '6px 28px 6px 20px', fontSize: 11, fontWeight: 500, textAlign: 'left',
                background: activeProject?.id === p.id ? p.color + '18' : 'transparent',
                color: activeProject?.id === p.id ? p.color : 'var(--t2)',
                border: activeProject?.id === p.id ? `1px solid ${p.color}33` : '1px solid transparent',
                cursor: 'pointer', transition: 'all .1s',
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }}/>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
              </button>
              <button onClick={e => handleDeleteProject(e, p)} style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'transparent', border: 'none', color: 'var(--t3)', cursor: 'pointer',
                fontSize: 10, opacity: 0, transition: 'opacity .15s', padding: 2,
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
              >✕</button>
            </div>
          ))}

          {/* Create project form */}
          {creating && (
            <form onSubmit={handleCreateProject} style={{ margin: '6px 8px', padding: '10px', background: 'var(--s2)', border: '1px solid var(--b2)' }}>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Nombre del proyecto"
                style={{ background: 'var(--s3)', border: '1px solid var(--b2)', color: 'var(--tx)', fontSize: 11, padding: '5px 8px', width: '100%', outline: 'none', marginBottom: 8 }}
              />
              <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                {PROJECT_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setNewColor(c)} style={{
                    width: 16, height: 16, borderRadius: '50%', background: c, border: 'none',
                    cursor: 'pointer', outline: newColor === c ? `2px solid ${c}` : 'none',
                    outlineOffset: 2,
                  }}/>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button type="submit" disabled={savingProj || !newName.trim()} style={{
                  flex: 1, background: newColor, color: '#000', border: 'none', fontSize: 10,
                  fontWeight: 700, padding: '5px 0', cursor: 'pointer', opacity: savingProj ? .5 : 1,
                }}>{savingProj ? '⟳' : '▸ Crear'}</button>
                <button type="button" onClick={() => setCreating(false)} style={{
                  background: 'transparent', border: '1px solid var(--b2)', color: 'var(--t3)',
                  fontSize: 10, padding: '5px 8px', cursor: 'pointer',
                }}>✕</button>
              </div>
            </form>
          )}
        </div>

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
