'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Contact, ContactInsert, Company, Deal, Activity } from '@/lib/supabase/types'
import { Topbar } from '@/components/Topbar'
import { Modal } from '@/components/Modal'
import { fmt, initials, relativeTime, SOURCE_LABELS, STAGE_META, ACTIVITY_META } from '@/lib/utils'

const TYPE_COLORS: Record<string, string> = {
  note: 'var(--purple)', call: 'var(--green)', email: 'var(--blue)',
  meeting: 'var(--amber)', task: 'var(--t2)',
}

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const supabase = createClient()

  const [contact,    setContact]    = useState<Contact | null>(null)
  const [company,    setCompany]    = useState<Company | null>(null)
  const [deals,      setDeals]      = useState<Deal[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [companies,  setCompanies]  = useState<Company[]>([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [form,       setForm]       = useState<Partial<ContactInsert>>({})

  const load = useCallback(async () => {
    const [{ data: ct }, { data: ds }, { data: acts }, { data: cos }] = await Promise.all([
      supabase.from('contacts').select('*').eq('id', id).single(),
      supabase.from('deals').select('*').eq('contact_id', id).order('created_at', { ascending: false }),
      supabase.from('activities').select('*').eq('contact_id', id).order('created_at', { ascending: false }),
      supabase.from('companies').select('*').order('name'),
    ])
    if (!ct) { router.push('/contacts'); return }
    setContact(ct as Contact)
    setForm(ct as Contact)
    setDeals((ds as Deal[] | null) ?? [])
    setActivities((acts as Activity[] | null) ?? [])
    setCompanies((cos as Company[] | null) ?? [])
    if ((ct as Contact).company_id) {
      const { data: co } = await supabase.from('companies').select('*').eq('id', (ct as Contact).company_id!).single()
      setCompany(co as Company | null)
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('contacts').update({
      first_name: form.first_name, last_name: form.last_name,
      email: form.email || null, phone: form.phone || null,
      title: form.title || null, company_id: form.company_id || null,
      lead_score: form.lead_score ?? 0, source: form.source || null,
      notes: form.notes || null,
    }).eq('id', id)
    setSaving(false)
    setModal(false)
    load()
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este contacto? Esta acción no se puede deshacer.')) return
    await supabase.from('contacts').delete().eq('id', id)
    router.push('/contacts')
  }

  const set = (k: string, v: string | number) => setForm(p => ({ ...p, [k]: v }))

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 11 }}>
      ⟳ Cargando...
    </div>
  )
  if (!contact) return null

  const scoreColor = contact.lead_score >= 80 ? 'var(--green)' : contact.lead_score >= 60 ? 'var(--amber)' : 'var(--blue)'
  const scoreLabel = contact.lead_score >= 75 ? 'SQL' : contact.lead_score >= 50 ? 'MQL' : 'Lead'

  return (
    <>
      <Topbar
        title={`${contact.first_name} ${contact.last_name}`}
        subtitle={company ? `${contact.title ?? ''} · ${company.name}` : contact.title ?? 'Contacto'}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => router.push('/contacts')}>← Contactos</button>
            <button className="btn btn-primary" onClick={() => setModal(true)}>✎ Editar</button>
            <button className="btn btn-danger" onClick={handleDelete}>✕ Eliminar</button>
          </div>
        }
      />

      <div style={{ flex: 1, overflow: 'auto', padding: 24 }} className="ai">
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 1, alignItems: 'start' }}>

          {/* LEFT: Contact card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <div className="crm-card">
              <div style={{ padding: '24px 20px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                <div style={{
                  width: 56, height: 56, background: 'var(--bd)', border: '2px solid rgba(96,165,250,.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: 'var(--blue)',
                  margin: '0 auto 12px',
                }}>{initials(`${contact.first_name} ${contact.last_name}`)}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx)' }}>{contact.first_name} {contact.last_name}</div>
                {contact.title && <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 3 }}>{contact.title}</div>}
                <div style={{ marginTop: 10 }}>
                  <span className="chip" style={{ background: scoreColor + '18', color: scoreColor, border: `1px solid ${scoreColor}33`, fontSize: 10 }}>
                    {scoreLabel} · {contact.lead_score}
                  </span>
                </div>
              </div>
              <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Email',   value: contact.email,    icon: '✉' },
                  { label: 'Teléfono', value: contact.phone,   icon: '☎' },
                  { label: 'Empresa', value: company?.name,    icon: '▣' },
                  { label: 'Fuente',  value: contact.source ? SOURCE_LABELS[contact.source] ?? contact.source : null, icon: '◉' },
                  { label: 'Creado',  value: relativeTime(contact.created_at), icon: '⏱' },
                ].filter(f => f.value).map(f => (
                  <div key={f.label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--t3)', width: 14, fontSize: 11, flexShrink: 0, marginTop: 1 }}>{f.icon}</span>
                    <div>
                      <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t3)' }}>{f.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--tx)', marginTop: 1 }}>{f.value}</div>
                    </div>
                  </div>
                ))}

                {/* Lead score bar */}
                <div>
                  <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 5 }}>Lead Score</div>
                  <div className="score-bar-track">
                    <div className="score-bar-fill" style={{ width: `${contact.lead_score}%`, background: scoreColor }}/>
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: scoreColor, marginTop: 3 }}>{contact.lead_score}/100</div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {contact.notes && (
              <div className="crm-card">
                <div className="crm-card-header"><span className="crm-card-title">Notas</span></div>
                <div className="crm-card-body" style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.6 }}>{contact.notes}</div>
              </div>
            )}
          </div>

          {/* RIGHT: Deals + Activities */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>

            {/* Deals */}
            <div className="crm-card">
              <div className="crm-card-header">
                <span className="crm-card-title">Deals asociados</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>{deals.length}</span>
              </div>
              {deals.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--t3)', fontSize: 11 }}>Sin deals asociados</div>
              ) : (
                <table className="crm-table">
                  <thead><tr><th>Deal</th><th>Etapa</th><th>Valor</th><th>Prob.</th><th>Cierre</th></tr></thead>
                  <tbody>
                    {deals.map(d => {
                      const meta = STAGE_META[d.stage]
                      return (
                        <tr key={d.id} onClick={() => router.push(`/deals`)}>
                          <td style={{ color: 'var(--tx)', fontWeight: 500 }}>{d.title}</td>
                          <td><span className="chip" style={{ background: meta.color + '18', color: meta.color, border: `1px solid ${meta.color}33` }}>{meta.label}</span></td>
                          <td style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: meta.color }}>{fmt(d.value)}</td>
                          <td style={{ fontFamily: 'var(--mono)' }}>{d.probability}%</td>
                          <td style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>{d.expected_close ? new Date(d.expected_close).toLocaleDateString('es-ES') : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Activity timeline */}
            <div className="crm-card">
              <div className="crm-card-header">
                <span className="crm-card-title">Historial de actividades</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>{activities.length}</span>
              </div>
              <div className="crm-card-body" style={{ padding: activities.length === 0 ? 24 : '12px 16px' }}>
                {activities.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--t3)', fontSize: 11 }}>Sin actividades registradas</div>
                ) : (
                  <div style={{ position: 'relative', paddingLeft: 28 }}>
                    <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 1, background: 'var(--border)' }}/>
                    {activities.map(a => {
                      const meta  = ACTIVITY_META[a.type]
                      const color = TYPE_COLORS[a.type]
                      return (
                        <div key={a.id} style={{ position: 'relative', marginBottom: 10 }}>
                          <div style={{
                            position: 'absolute', left: -20, top: 12,
                            width: 16, height: 16, borderRadius: '50%',
                            background: color + '22', border: `1px solid ${color}44`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 9, color,
                          }}>{meta.icon}</div>
                          <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', padding: '9px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                              <span style={{ fontFamily: 'var(--mono)', fontSize: 8, fontWeight: 700, padding: '1px 4px', background: color + '22', color, border: `1px solid ${color}44` }}>{meta.label.toUpperCase()}</span>
                              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)' }}>{relativeTime(a.created_at)}</span>
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx)' }}>{a.title}</div>
                            {a.description && <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 3 }}>{a.description}</div>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {modal && (
        <Modal title={`Editar: ${contact.first_name} ${contact.last_name}`} onClose={() => setModal(false)}>
          <form onSubmit={handleSave}>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Nombre *</label>
                  <input className="form-input" required value={form.first_name ?? ''} onChange={e => set('first_name', e.target.value)}/>
                </div>
                <div>
                  <label className="form-label">Apellidos *</label>
                  <input className="form-input" required value={form.last_name ?? ''} onChange={e => set('last_name', e.target.value)}/>
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)}/>
                </div>
                <div>
                  <label className="form-label">Teléfono</label>
                  <input className="form-input" value={form.phone ?? ''} onChange={e => set('phone', e.target.value)}/>
                </div>
                <div>
                  <label className="form-label">Cargo</label>
                  <input className="form-input" value={form.title ?? ''} onChange={e => set('title', e.target.value)}/>
                </div>
                <div>
                  <label className="form-label">Empresa</label>
                  <select className="form-select" value={form.company_id ?? ''} onChange={e => set('company_id', e.target.value)}>
                    <option value="">Sin empresa</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Lead score (0-100)</label>
                  <input className="form-input" type="number" min={0} max={100} value={form.lead_score ?? 0} onChange={e => set('lead_score', parseInt(e.target.value) || 0)}/>
                </div>
                <div>
                  <label className="form-label">Fuente</label>
                  <select className="form-select" value={form.source ?? ''} onChange={e => set('source', e.target.value)}>
                    <option value="">—</option>
                    {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Notas</label>
                  <textarea className="form-textarea" value={form.notes ?? ''} onChange={e => set('notes', e.target.value)}/>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '⟳ Guardando...' : '▸ Guardar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
