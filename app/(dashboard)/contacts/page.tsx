'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Contact, ContactInsert, Company } from '@/lib/supabase/types'
import { Topbar } from '@/components/Topbar'
import { Modal } from '@/components/Modal'
import { EmptyState } from '@/components/EmptyState'
import { initials, relativeTime, SOURCE_LABELS } from '@/lib/utils'
import { useTeam } from '@/hooks/useTeam'
import { useProject } from '@/hooks/useProject'
import type { Project } from '@/lib/supabase/types'

const SOURCES = Object.entries(SOURCE_LABELS)

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--amber)' : 'var(--blue)'
  const cls   = score >= 80 ? 'chip-g' : score >= 60 ? 'chip-a' : 'chip-b'
  return <span className={`chip ${cls}`}>#{score}</span>
}

function ContactForm({
  initial, companies, projects, defaultProjectId, onSave, onClose,
}: {
  initial?: Partial<Contact>
  companies: Company[]
  projects: Project[]
  defaultProjectId?: string
  onSave: (data: ContactInsert) => Promise<void>
  onClose: () => void
}) {
  const [f, setF] = useState({
    first_name: initial?.first_name ?? '', last_name: initial?.last_name ?? '',
    email: initial?.email ?? '', phone: initial?.phone ?? '',
    title: initial?.title ?? '', company_id: initial?.company_id ?? '',
    lead_score: initial?.lead_score ?? 0, source: initial?.source ?? '',
    notes: initial?.notes ?? '', project_id: initial?.project_id ?? defaultProjectId ?? '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string | number) => setF(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSave({ ...f, company_id: f.company_id || null, source: f.source || null, project_id: f.project_id || null } as ContactInsert)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="modal-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label className="form-label">Nombre *</label><input className="form-input" required value={f.first_name} onChange={e => set('first_name', e.target.value)}/></div>
          <div><label className="form-label">Apellidos *</label><input className="form-input" required value={f.last_name} onChange={e => set('last_name', e.target.value)}/></div>
          <div><label className="form-label">Email</label><input className="form-input" type="email" value={f.email} onChange={e => set('email', e.target.value)}/></div>
          <div><label className="form-label">Teléfono</label><input className="form-input" value={f.phone} onChange={e => set('phone', e.target.value)}/></div>
          <div><label className="form-label">Cargo</label><input className="form-input" value={f.title} onChange={e => set('title', e.target.value)}/></div>
          <div>
            <label className="form-label">Empresa</label>
            <select className="form-select" value={f.company_id} onChange={e => set('company_id', e.target.value)}>
              <option value="">Sin empresa</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Fuente</label>
            <select className="form-select" value={f.source} onChange={e => set('source', e.target.value)}>
              <option value="">Seleccionar...</option>
              {SOURCES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div><label className="form-label">Lead score (0-100)</label><input className="form-input" type="number" min={0} max={100} value={f.lead_score} onChange={e => set('lead_score', parseInt(e.target.value) || 0)}/></div>
          {projects.length > 0 && (
            <div style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Proyecto</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                <button type="button" onClick={() => set('project_id', '')} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: '1px solid', fontFamily: 'var(--sans)',
                  background: !f.project_id ? 'var(--s3)' : 'transparent',
                  color: !f.project_id ? 'var(--tx)' : 'var(--t3)',
                  borderColor: !f.project_id ? 'var(--b2)' : 'var(--b2)',
                  transition: 'all .12s',
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--t3)', flexShrink: 0 }}/>
                  Sin proyecto
                </button>
                {projects.map(p => (
                  <button key={p.id} type="button" onClick={() => set('project_id', p.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    border: '1px solid', fontFamily: 'var(--sans)',
                    background: f.project_id === p.id ? p.color + '18' : 'transparent',
                    color: f.project_id === p.id ? p.color : 'var(--t3)',
                    borderColor: f.project_id === p.id ? p.color + '55' : 'var(--b2)',
                    transition: 'all .12s',
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }}/>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ gridColumn: '1/-1' }}><label className="form-label">Notas</label><textarea className="form-textarea" value={f.notes} onChange={e => set('notes', e.target.value)}/></div>
        </div>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '⟳ Guardando...' : '▸ Guardar'}</button>
      </div>
    </form>
  )
}

// ── CSV Import Modal ──────────────────────────────────────────────
function CsvImportModal({ companies, teamId, userId, onDone, onClose }: {
  companies: Company[]
  teamId: string
  userId: string
  onDone: () => void
  onClose: () => void
}) {
  const supabase = createClient()
  const fileRef  = useRef<HTMLInputElement>(null)
  const [rows,    setRows]    = useState<Record<string, string>[]>([])
  const [status,  setStatus]  = useState<'idle' | 'preview' | 'importing' | 'done'>('idle')
  const [error,   setError]   = useState('')
  const [count,   setCount]   = useState(0)

  const companyMap = Object.fromEntries(companies.map(c => [c.name.toLowerCase().trim(), c.id]))

  const parseCSV = (text: string) => {
    const lines  = text.trim().split('\n').filter(l => l.trim())
    if (lines.length < 2) { setError('El archivo necesita al menos una cabecera y una fila.'); return }
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase()
      .replace('nombre', 'first_name').replace('apellidos', 'last_name')
      .replace('teléfono', 'phone').replace('telefono', 'phone')
      .replace('cargo', 'title').replace('empresa', 'company_name')
      .replace('lead score', 'lead_score').replace('fuente', 'source')
      .replace('notas', 'notes'))
    const parsed = lines.slice(1).map(line => {
      const vals = line.split(',')
      return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? '').trim()]))
    }).filter(r => r.first_name || r.last_name)
    setRows(parsed)
    setStatus('preview')
    setError('')
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => parseCSV(ev.target?.result as string)
    reader.readAsText(file, 'UTF-8')
  }

  const handleImport = async () => {
    setStatus('importing')
    const inserts = rows.map(r => ({
      first_name: r.first_name || 'Sin nombre',
      last_name:  r.last_name  || '',
      email:      r.email      || null,
      phone:      r.phone      || null,
      title:      r.title      || null,
      company_id: r.company_name ? (companyMap[r.company_name.toLowerCase().trim()] ?? null) : null,
      lead_score: parseInt(r.lead_score) || 0,
      source:     r.source || null,
      notes:      r.notes  || null,
      user_id:    userId,
      team_id:    teamId || null,
    }))
    const { error: err } = await supabase.from('contacts').insert(inserts as any)
    if (err) { setError(err.message); setStatus('preview'); return }
    setCount(inserts.length)
    setStatus('done')
    onDone()
  }

  return (
    <Modal title="Importar contactos desde CSV" onClose={onClose}>
      <div className="modal-body">
        {status === 'done' ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: 32, color: 'var(--green)', marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)' }}>{count} contactos importados</div>
          </div>
        ) : (
          <>
            <div style={{ padding: '12px 14px', background: 'var(--s2)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--t2)' }}>
              <div style={{ fontWeight: 600, color: 'var(--tx)', marginBottom: 4 }}>Formato esperado del CSV:</div>
              <code style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>
                Nombre, Apellidos, Email, Teléfono, Cargo, Lead Score, Fuente, Notas
              </code>
            </div>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }}/>
            <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={() => fileRef.current?.click()}>
              ⊕ Seleccionar archivo CSV
            </button>
            {error && <div style={{ color: 'var(--red)', fontSize: 12, padding: '8px 12px', background: 'var(--rd)', border: '1px solid rgba(239,68,68,.2)' }}>{error}</div>}
            {status === 'preview' && rows.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 8 }}>
                  <span style={{ color: 'var(--green)', fontWeight: 700 }}>{rows.length} contactos</span> listos para importar. Vista previa:
                </div>
                <table className="crm-table" style={{ fontSize: 10 }}>
                  <thead><tr><th>Nombre</th><th>Email</th><th>Score</th></tr></thead>
                  <tbody>
                    {rows.slice(0, 5).map((r, i) => (
                      <tr key={i}>
                        <td style={{ color: 'var(--tx)' }}>{r.first_name} {r.last_name}</td>
                        <td>{r.email || '—'}</td>
                        <td style={{ fontFamily: 'var(--mono)' }}>{r.lead_score || '0'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 5 && <div style={{ fontSize: 10, color: 'var(--t3)', textAlign: 'center', marginTop: 6 }}>... y {rows.length - 5} más</div>}
              </div>
            )}
          </>
        )}
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>{status === 'done' ? 'Cerrar' : 'Cancelar'}</button>
        {status === 'preview' && (
          <button className="btn btn-primary" onClick={handleImport} disabled={rows.length === 0}>
            ▸ Importar {rows.length} contactos
          </button>
        )}
      </div>
    </Modal>
  )
}

export default function ContactsPage() {
  const supabase = createClient()
  const router   = useRouter()
  const { teamId } = useTeam()
  const { projects, activeProject } = useProject()
  const [contacts,       setContacts]       = useState<Contact[]>([])
  const [companies,      setCompanies]      = useState<Company[]>([])
  const [loading,        setLoading]        = useState(true)
  const [search,         setSearch]         = useState('')
  const [filterProject,  setFilterProject]  = useState('')
  const [modal,          setModal]          = useState<'create' | 'csv' | null>(null)
  const [userId,         setUserId]         = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('contacts').select('*').order('created_at', { ascending: false })
    if (activeProject) q = q.eq('project_id', activeProject.id)
    const [{ data: cts }, { data: cos }, { data: { user } }] = await Promise.all([
      q,
      supabase.from('companies').select('*').order('name'),
      supabase.auth.getUser(),
    ])
    setContacts((cts as Contact[] | null) ?? [])
    setCompanies((cos as Company[] | null) ?? [])
    setUserId(user?.id ?? '')
    setLoading(false)
  }, [activeProject])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const ch = supabase.channel('contacts-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])

  const companyMap = Object.fromEntries(companies.map(c => [c.id, c.name]))

  const handleCreate = async (data: ContactInsert) => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('contacts').insert([{ ...data, user_id: user!.id, team_id: teamId || null, project_id: data.project_id || activeProject?.id || null }] as any)
    setModal(null)
    load()
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('¿Eliminar este contacto?')) return
    await supabase.from('contacts').delete().eq('id', id)
    load()
  }

  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]))

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = c.first_name.toLowerCase().includes(q) || c.last_name.toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q)
    const matchProject = !filterProject || c.project_id === filterProject
    return matchSearch && matchProject
  })

  return (
    <>
      <Topbar
        title={activeProject ? `Contactos · ${activeProject.name}` : 'Contactos'}
        subtitle={`${contacts.length} contactos · ${contacts.filter(c => c.lead_score >= 75).length} SQL`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => setModal('csv')}>⊕ Importar CSV</button>
            <button className="btn btn-primary" onClick={() => setModal('create')}>+ Nuevo contacto</button>
          </div>
        }
      />

      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <input className="form-input" style={{ maxWidth: 280 }} placeholder="Buscar contactos..."
            value={search} onChange={e => setSearch(e.target.value)}/>
          {projects.length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              <button onClick={() => setFilterProject('')} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                border: '1px solid', fontFamily: 'var(--sans)',
                background: !filterProject ? 'var(--s3)' : 'transparent',
                color: !filterProject ? 'var(--tx)' : 'var(--t3)',
                borderColor: 'var(--b2)', transition: 'all .12s',
              }}>Todos</button>
              {projects.map(p => (
                <button key={p.id} onClick={() => setFilterProject(filterProject === p.id ? '' : p.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                  border: '1px solid', fontFamily: 'var(--sans)',
                  background: filterProject === p.id ? p.color + '18' : 'transparent',
                  color: filterProject === p.id ? p.color : 'var(--t3)',
                  borderColor: filterProject === p.id ? p.color + '55' : 'var(--b2)',
                  transition: 'all .12s',
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.color, flexShrink: 0 }}/>
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="crm-card">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 11 }}>⟳ Cargando...</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon="◎" title="Sin contactos" description="Añade tu primer contacto para empezar."
              action={<button className="btn btn-primary" onClick={() => setModal('create')}>+ Nuevo contacto</button>}/>
          ) : (
            <table className="crm-table">
              <thead>
                <tr><th>Contacto</th><th>Empresa</th><th>Cargo</th><th>Fuente</th><th>Score</th><th>Creado</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} onClick={() => router.push(`/contacts/${c.id}`)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, background: 'var(--bd)', border: '1px solid rgba(96,165,250,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color: 'var(--blue)', flexShrink: 0 }}>
                          {initials(`${c.first_name} ${c.last_name}`)}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {c.project_id && projectMap[c.project_id] && (
                              <span title={projectMap[c.project_id].name} style={{ width: 8, height: 8, borderRadius: '50%', background: projectMap[c.project_id].color, flexShrink: 0, display: 'inline-block' }}/>
                            )}
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx)' }}>{c.first_name} {c.last_name}</span>
                          </div>
                          {c.email && <div style={{ fontSize: 10, color: 'var(--t3)' }}>{c.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td>{c.company_id ? companyMap[c.company_id] ?? '—' : '—'}</td>
                    <td>{c.title || '—'}</td>
                    <td>{c.source ? SOURCE_LABELS[c.source] ?? c.source : '—'}</td>
                    <td><ScoreBadge score={c.lead_score}/></td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>{relativeTime(c.created_at)}</td>
                    <td>
                      <button className="btn btn-danger" style={{ padding: '3px 8px', fontSize: 10 }} onClick={e => handleDelete(e, c.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal === 'create' && (
        <Modal title="Nuevo contacto" onClose={() => setModal(null)}>
          <ContactForm companies={companies} projects={projects} defaultProjectId={activeProject?.id} onSave={handleCreate} onClose={() => setModal(null)}/>
        </Modal>
      )}
      {modal === 'csv' && (
        <CsvImportModal companies={companies} teamId={teamId} userId={userId}
          onDone={load} onClose={() => setModal(null)}/>
      )}
    </>
  )
}
