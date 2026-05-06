'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Activity, ActivityInsert, Contact, Deal, Company } from '@/lib/supabase/types'
import { Topbar } from '@/components/Topbar'
import { Modal } from '@/components/Modal'
import { EmptyState } from '@/components/EmptyState'
import { ACTIVITY_META, relativeTime } from '@/lib/utils'
import { useTeam } from '@/hooks/useTeam'
import { useProject } from '@/hooks/useProject'

const TYPES = Object.entries(ACTIVITY_META) as [keyof typeof ACTIVITY_META, { icon: string; label: string }][]

const TYPE_COLORS: Record<string, string> = {
  note: 'var(--purple)', call: 'var(--green)', email: 'var(--blue)',
  meeting: 'var(--amber)', task: 'var(--t2)',
}

function ActivityForm({
  initial, contacts, deals, companies, onSave, onClose,
}: {
  initial?: Partial<Activity>
  contacts: Contact[]; deals: Deal[]; companies: Company[]
  onSave: (data: Omit<ActivityInsert, 'user_id'>) => Promise<void>
  onClose: () => void
}) {
  const [f, setF] = useState({
    type:        (initial?.type ?? 'note') as Activity['type'],
    title:       initial?.title       ?? '',
    description: initial?.description ?? '',
    contact_id:  initial?.contact_id  ?? '',
    deal_id:     initial?.deal_id     ?? '',
    company_id:  initial?.company_id  ?? '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSave({
      ...f,
      contact_id: f.contact_id || null,
      deal_id:    f.deal_id    || null,
      company_id: f.company_id || null,
    } as Omit<ActivityInsert, 'user_id'>)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="modal-body">
        <div>
          <label className="form-label">Tipo</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TYPES.map(([k, v]) => (
              <button key={k} type="button" onClick={() => set('type', k)} style={{
                padding: '5px 12px', fontSize: 11, fontFamily: 'var(--sans)', fontWeight: 600,
                cursor: 'pointer', border: '1px solid',
                background: f.type === k ? TYPE_COLORS[k] + '22' : 'transparent',
                color: f.type === k ? TYPE_COLORS[k] : 'var(--t3)',
                borderColor: f.type === k ? TYPE_COLORS[k] + '44' : 'var(--b2)',
                transition: 'all .12s',
              }}>{v.icon} {v.label}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="form-label">Título *</label>
          <input className="form-input" required value={f.title} onChange={e => set('title', e.target.value)}/>
        </div>
        <div>
          <label className="form-label">Descripción</label>
          <textarea className="form-textarea" value={f.description} onChange={e => set('description', e.target.value)}/>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div>
            <label className="form-label">Contacto</label>
            <select className="form-select" value={f.contact_id} onChange={e => set('contact_id', e.target.value)}>
              <option value="">—</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Deal</label>
            <select className="form-select" value={f.deal_id} onChange={e => set('deal_id', e.target.value)}>
              <option value="">—</option>
              {deals.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Empresa</label>
            <select className="form-select" value={f.company_id} onChange={e => set('company_id', e.target.value)}>
              <option value="">—</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? '⟳ Guardando...' : '▸ Guardar actividad'}
        </button>
      </div>
    </form>
  )
}

function groupByDate(activities: Activity[]): [string, Activity[]][] {
  const map = new Map<string, Activity[]>()
  activities.forEach(a => {
    const key = new Date(a.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(a)
  })
  return Array.from(map.entries())
}

export default function ActivitiesPage() {
  const supabase = createClient()
  const { teamId } = useTeam()
  const { activeProject } = useProject()
  const [activities, setActivities] = useState<Activity[]>([])
  const [contacts,   setContacts]   = useState<Contact[]>([])
  const [deals,      setDeals]      = useState<Deal[]>([])
  const [companies,  setCompanies]  = useState<Company[]>([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState<'create' | 'edit' | null>(null)
  const [selected,   setSelected]   = useState<Activity | null>(null)
  const [filter,     setFilter]     = useState<string>('all')

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('activities').select('*').order('created_at', { ascending: false })
    if (activeProject) q = q.eq('project_id', activeProject.id)
    const [{ data: acts }, { data: cts }, { data: ds }, { data: cos }] = await Promise.all([
      q,
      supabase.from('contacts').select('*').order('first_name'),
      supabase.from('deals').select('*').order('title'),
      supabase.from('companies').select('*').order('name'),
    ])
    setActivities((acts as Activity[] | null) ?? [])
    setContacts((cts as Contact[] | null) ?? [])
    setDeals((ds as Deal[] | null) ?? [])
    setCompanies((cos as Company[] | null) ?? [])
    setLoading(false)
  }, [activeProject])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const ch = supabase.channel('activities-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])

  const handleCreate = async (data: Omit<ActivityInsert, 'user_id'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('activities').insert([{ ...data, user_id: user!.id, team_id: teamId || null, project_id: activeProject?.id || null }] as any)
    setModal(null)
    load()
  }

  const handleUpdate = async (data: Omit<ActivityInsert, 'user_id'>) => {
    if (!selected) return
    await supabase.from('activities').update({
      type: data.type, title: data.title, description: data.description || null,
      contact_id: data.contact_id || null, deal_id: data.deal_id || null, company_id: data.company_id || null,
    }).eq('id', selected.id)
    setModal(null)
    setSelected(null)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta actividad?')) return
    await supabase.from('activities').delete().eq('id', id)
    load()
  }

  const contactMap = Object.fromEntries(contacts.map(c => [c.id, `${c.first_name} ${c.last_name}`]))
  const dealMap    = Object.fromEntries(deals.map(d => [d.id, d.title]))
  const companyMap = Object.fromEntries(companies.map(c => [c.id, c.name]))

  const filtered = filter === 'all' ? activities : activities.filter(a => a.type === filter)
  const grouped  = groupByDate(filtered)

  return (
    <>
      <Topbar
        title={activeProject ? `Actividades · ${activeProject.name}` : 'Actividades'}
        subtitle={`${activities.length} actividades registradas`}
        actions={<button className="btn btn-primary" onClick={() => { setSelected(null); setModal('create') }}>+ Nueva actividad</button>}
      />

      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          <button className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 10, padding: '5px 10px' }} onClick={() => setFilter('all')}>Todo</button>
          {TYPES.map(([k, v]) => (
            <button key={k} className={`btn ${filter === k ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 10, padding: '5px 10px' }} onClick={() => setFilter(k)}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 11 }}>⟳ Cargando...</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="◆" title="Sin actividades" description="Registra llamadas, emails, reuniones y notas aquí."
            action={<button className="btn btn-primary" onClick={() => setModal('create')}>+ Nueva actividad</button>}/>
        ) : (
          <div style={{ maxWidth: 720 }}>
            {grouped.map(([date, acts]) => (
              <div key={date} style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t3)' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>{date}<div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
                </div>
                <div style={{ position: 'relative', paddingLeft: 32 }}>
                  <div style={{ position: 'absolute', left: 10, top: 0, bottom: 0, width: 1, background: 'var(--border)' }}/>
                  {acts.map(a => {
                    const meta  = ACTIVITY_META[a.type]
                    const color = TYPE_COLORS[a.type]
                    return (
                      <div key={a.id} style={{ position: 'relative', marginBottom: 12 }}>
                        <div style={{ position: 'absolute', left: -22, top: 14, width: 20, height: 20, borderRadius: '50%', background: color + '22', border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color }}>
                          {meta.icon}
                        </div>
                        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, padding: '1px 5px', background: color + '22', color, border: `1px solid ${color}44` }}>{meta.label.toUpperCase()}</span>
                                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)' }}>{relativeTime(a.created_at)}</span>
                              </div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)', marginBottom: a.description ? 4 : 0 }}>{a.title}</div>
                              {a.description && <div style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.5 }}>{a.description}</div>}
                              <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                                {a.contact_id && contactMap[a.contact_id] && (
                                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--blue)', background: 'var(--bd)', padding: '1px 6px', border: '1px solid rgba(96,165,250,.2)' }}>◎ {contactMap[a.contact_id]}</span>
                                )}
                                {a.deal_id && dealMap[a.deal_id] && (
                                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--amber)', background: 'var(--ad)', padding: '1px 6px', border: '1px solid rgba(245,158,11,.2)' }}>▤ {dealMap[a.deal_id]}</span>
                                )}
                                {a.company_id && companyMap[a.company_id] && (
                                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--green)', background: 'var(--gd)', padding: '1px 6px', border: '1px solid rgba(0,232,122,.2)' }}>▣ {companyMap[a.company_id]}</span>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 10 }}
                                onClick={() => { setSelected(a); setModal('edit') }}>✎</button>
                              <button className="btn btn-danger" style={{ padding: '3px 8px', fontSize: 10 }}
                                onClick={() => handleDelete(a.id)}>✕</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal === 'create' && (
        <Modal title="Nueva actividad" onClose={() => setModal(null)}>
          <ActivityForm contacts={contacts} deals={deals} companies={companies} onSave={handleCreate} onClose={() => setModal(null)}/>
        </Modal>
      )}
      {modal === 'edit' && selected && (
        <Modal title="Editar actividad" onClose={() => { setModal(null); setSelected(null) }}>
          <ActivityForm initial={selected} contacts={contacts} deals={deals} companies={companies} onSave={handleUpdate} onClose={() => { setModal(null); setSelected(null) }}/>
        </Modal>
      )}
    </>
  )
}
