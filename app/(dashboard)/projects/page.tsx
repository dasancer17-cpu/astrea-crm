'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Topbar } from '@/components/Topbar'
import { useTeam } from '@/hooks/useTeam'
import { useProject } from '@/hooks/useProject'
import type { Project } from '@/lib/supabase/types'

const COLORS = [
  '#60A5FA','#00E87A','#A78BFA','#F59E0B',
  '#EF4444','#22D3EE','#F472B6','#FB923C',
]

export default function ProjectsPage() {
  const supabase = createClient()
  const { teamId } = useTeam()
  const { projects, setProjects, setActiveProject } = useProject()

  const [creating,   setCreating]   = useState(false)
  const [newName,    setNewName]    = useState('')
  const [newColor,   setNewColor]   = useState(COLORS[0])
  const [newDesc,    setNewDesc]    = useState('')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !teamId) return
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error: err } = await supabase.from('projects').insert([{
      name: newName.trim(),
      description: newDesc.trim() || null,
      color: newColor,
      team_id: teamId,
      created_by: user!.id,
    }]).select().single()
    if (err) { setError(err.message); setSaving(false); return }
    setProjects([...projects, data as Project])
    setNewName('')
    setNewDesc('')
    setNewColor(COLORS[0])
    setCreating(false)
    setSaving(false)
  }

  const handleDelete = async (proj: Project) => {
    if (!confirm(`¿Eliminar el proyecto "${proj.name}"? Los datos asociados no se borran.`)) return
    await supabase.from('projects').delete().eq('id', proj.id)
    const updated = projects.filter(p => p.id !== proj.id)
    setProjects(updated)
    setActiveProject(null)
  }

  return (
    <>
      <Topbar
        title="Proyectos"
        subtitle={`${projects.length} proyectos en tu equipo`}
        actions={
          <button className="btn btn-primary" onClick={() => setCreating(true)}>+ Nuevo proyecto</button>
        }
      />

      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>

        {/* Create form */}
        {creating && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 24, marginBottom: 24, maxWidth: 520 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)', marginBottom: 18 }}>Nuevo proyecto</div>
            {error && (
              <div style={{ background: 'var(--rd)', border: '1px solid rgba(239,68,68,.2)', color: 'var(--red)', padding: '8px 12px', fontSize: 12, marginBottom: 14 }}>{error}</div>
            )}
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="form-label">Nombre *</label>
                <input autoFocus className="form-input" required placeholder="Ej: Campaña Q2, Clientes Premium..."
                  value={newName} onChange={e => setNewName(e.target.value)}/>
              </div>
              <div>
                <label className="form-label">Descripción</label>
                <input className="form-input" placeholder="Descripción opcional"
                  value={newDesc} onChange={e => setNewDesc(e.target.value)}/>
              </div>
              <div>
                <label className="form-label">Color</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setNewColor(c)} style={{
                      width: 24, height: 24, borderRadius: '50%', background: c, border: 'none',
                      cursor: 'pointer', outline: newColor === c ? `3px solid ${c}` : '2px solid transparent',
                      outlineOffset: 2, transition: 'outline .1s',
                    }}/>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="submit" disabled={saving || !newName.trim()} className="btn btn-primary">
                  {saving ? '⟳ Creando...' : '▸ Crear proyecto'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => { setCreating(false); setError('') }}>Cancelar</button>
              </div>
            </form>
          </div>
        )}

        {/* Project grid */}
        {projects.length === 0 && !creating ? (
          <div style={{ textAlign: 'center', paddingTop: 80, color: 'var(--t3)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>◈</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t2)', marginBottom: 6 }}>Sin proyectos</div>
            <div style={{ fontSize: 12, marginBottom: 20 }}>Organiza tus contactos, deals y empresas por proyecto.</div>
            <button className="btn btn-primary" onClick={() => setCreating(true)}>+ Crear primer proyecto</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, maxWidth: 960 }}>
            {projects.map(p => (
              <div key={p.id} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderTop: `3px solid ${p.color}`, padding: 20,
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: p.color + '22', border: `1px solid ${p.color}44`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: p.color, flexShrink: 0,
                    }}>
                      {p.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{p.name}</div>
                      {p.description && <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 1 }}>{p.description}</div>}
                    </div>
                  </div>
                  <button className="btn btn-danger" style={{ padding: '3px 7px', fontSize: 10, flexShrink: 0 }}
                    onClick={() => handleDelete(p)}>✕</button>
                </div>

                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  <div style={{
                    flex: 1, padding: '6px 10px', background: 'var(--s2)', border: '1px solid var(--b2)',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: p.color }}>—</div>
                    <div style={{ fontSize: 8, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 1 }}>Deals</div>
                  </div>
                  <div style={{
                    flex: 1, padding: '6px 10px', background: 'var(--s2)', border: '1px solid var(--b2)',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: p.color }}>—</div>
                    <div style={{ fontSize: 8, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 1 }}>Contactos</div>
                  </div>
                </div>

                <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 10 }}
                  onClick={() => setActiveProject(p)}>
                  ▸ Ver proyecto
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
