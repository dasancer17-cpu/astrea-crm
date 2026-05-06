'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Company, CompanyInsert, Contact, Deal, Activity } from '@/lib/supabase/types'
import { Topbar } from '@/components/Topbar'
import { Modal } from '@/components/Modal'
import { fmt, initials, relativeTime, STAGE_META, ACTIVITY_META } from '@/lib/utils'

const TYPE_COLORS: Record<string, string> = {
  note: 'var(--purple)', call: 'var(--green)', email: 'var(--blue)',
  meeting: 'var(--amber)', task: 'var(--t2)',
}

const INDUSTRIES = ['SaaS','FinTech','DevTools','E-commerce','Healthcare','Legal','Consulting','Retail','Manufacturing','Otro']
const SIZES = ['1-50','51-200','201-1000','1000+']

export default function CompanyDetailPage() {
  const { id }  = useParams<{ id: string }>()
  const router   = useRouter()
  const supabase = createClient()

  const [company,    setCompany]    = useState<Company | null>(null)
  const [contacts,   setContacts]   = useState<Contact[]>([])
  const [deals,      setDeals]      = useState<Deal[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [form,       setForm]       = useState<Partial<CompanyInsert>>({})

  const load = useCallback(async () => {
    const [{ data: co }, { data: cts }, { data: ds }, { data: acts }] = await Promise.all([
      supabase.from('companies').select('*').eq('id', id).single(),
      supabase.from('contacts').select('*').eq('company_id', id).order('first_name'),
      supabase.from('deals').select('*').eq('company_id', id).order('created_at', { ascending: false }),
      supabase.from('activities').select('*').eq('company_id', id).order('created_at', { ascending: false }),
    ])
    if (!co) { router.push('/companies'); return }
    setCompany(co as Company)
    setForm(co as Company)
    setContacts((cts as Contact[] | null) ?? [])
    setDeals((ds as Deal[] | null) ?? [])
    setActivities((acts as Activity[] | null) ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('companies').update({
      name: form.name!, domain: form.domain || null, industry: form.industry || null,
      size: form.size || null, website: form.website || null,
      phone: form.phone || null, address: form.address || null, notes: form.notes || null,
    }).eq('id', id)
    setSaving(false)
    setModal(false)
    load()
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta empresa? Esta acción no se puede deshacer.')) return
    await supabase.from('companies').delete().eq('id', id)
    router.push('/companies')
  }

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 11 }}>
      ⟳ Cargando...
    </div>
  )
  if (!company) return null

  const totalPipeline = deals.filter(d => d.stage !== 'ganado' && d.stage !== 'perdido').reduce((s, d) => s + d.value, 0)
  const wonValue = deals.filter(d => d.stage === 'ganado').reduce((s, d) => s + d.value, 0)

  return (
    <>
      <Topbar
        title={company.name}
        subtitle={[company.industry, company.size ? `${company.size} empleados` : null].filter(Boolean).join(' · ') || 'Empresa'}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => router.push('/companies')}>← Empresas</button>
            <button className="btn btn-primary" onClick={() => setModal(true)}>✎ Editar</button>
            <button className="btn btn-danger" onClick={handleDelete}>✕ Eliminar</button>
          </div>
        }
      />

      <div style={{ flex: 1, overflow: 'auto', padding: 24 }} className="ai">
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 1, alignItems: 'start' }}>

          {/* LEFT: Company info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <div className="crm-card">
              <div style={{ padding: '24px 20px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                <div style={{
                  width: 56, height: 56, background: 'var(--gd)', border: '2px solid rgba(0,232,122,.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: 'var(--green)',
                  margin: '0 auto 12px',
                }}>{initials(company.name)}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx)' }}>{company.name}</div>
                {company.industry && <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 3 }}>{company.industry}</div>}
              </div>
              <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Dominio',    value: company.domain,  icon: '◉' },
                  { label: 'Sitio web',  value: company.website, icon: '⊕' },
                  { label: 'Teléfono',   value: company.phone,   icon: '☎' },
                  { label: 'Tamaño',     value: company.size ? `${company.size} empleados` : null, icon: '⊞' },
                  { label: 'Dirección',  value: company.address, icon: '◎' },
                  { label: 'Creada',     value: relativeTime(company.created_at), icon: '⏱' },
                ].filter(f => f.value).map(f => (
                  <div key={f.label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--t3)', width: 14, fontSize: 11, flexShrink: 0, marginTop: 1 }}>{f.icon}</span>
                    <div>
                      <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t3)' }}>{f.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--tx)', marginTop: 1 }}>{f.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* KPIs */}
            <div className="crm-card">
              <div className="crm-card-header"><span className="crm-card-title">Resumen</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                {[
                  { label: 'Contactos', value: String(contacts.length), color: 'var(--blue)' },
                  { label: 'Deals',     value: String(deals.length),    color: 'var(--purple)' },
                  { label: 'Pipeline',  value: fmt(totalPipeline),       color: 'var(--amber)' },
                  { label: 'Cerrado',   value: fmt(wonValue),            color: 'var(--green)' },
                ].map(k => (
                  <div key={k.label} style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 8, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t3)' }}>{k.label}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 700, color: k.color, marginTop: 3 }}>{k.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {company.notes && (
              <div className="crm-card">
                <div className="crm-card-header"><span className="crm-card-title">Notas</span></div>
                <div className="crm-card-body" style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.6 }}>{company.notes}</div>
              </div>
            )}
          </div>

          {/* RIGHT: Contacts + Deals + Activities */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>

            {/* Contacts */}
            <div className="crm-card">
              <div className="crm-card-header">
                <span className="crm-card-title">Contactos</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>{contacts.length}</span>
              </div>
              {contacts.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--t3)', fontSize: 11 }}>Sin contactos asociados</div>
              ) : (
                <table className="crm-table">
                  <thead><tr><th>Nombre</th><th>Cargo</th><th>Email</th><th>Score</th></tr></thead>
                  <tbody>
                    {contacts.map(c => {
                      const sc = c.lead_score >= 80 ? 'var(--green)' : c.lead_score >= 60 ? 'var(--amber)' : 'var(--blue)'
                      return (
                        <tr key={c.id} onClick={() => router.push(`/contacts/${c.id}`)}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 24, height: 24, background: 'var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 8, fontWeight: 700, color: 'var(--blue)', flexShrink: 0 }}>
                                {initials(`${c.first_name} ${c.last_name}`)}
                              </div>
                              <span style={{ color: 'var(--tx)', fontWeight: 500 }}>{c.first_name} {c.last_name}</span>
                            </div>
                          </td>
                          <td>{c.title || '—'}</td>
                          <td style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>{c.email || '—'}</td>
                          <td><span className="chip" style={{ background: sc + '18', color: sc, border: `1px solid ${sc}33` }}>{c.lead_score}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Deals */}
            <div className="crm-card">
              <div className="crm-card-header">
                <span className="crm-card-title">Deals</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>{deals.length}</span>
              </div>
              {deals.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--t3)', fontSize: 11 }}>Sin deals asociados</div>
              ) : (
                <table className="crm-table">
                  <thead><tr><th>Deal</th><th>Etapa</th><th>Valor</th><th>Asignado</th></tr></thead>
                  <tbody>
                    {deals.map(d => {
                      const meta = STAGE_META[d.stage]
                      return (
                        <tr key={d.id}>
                          <td style={{ color: 'var(--tx)', fontWeight: 500 }}>{d.title}</td>
                          <td><span className="chip" style={{ background: meta.color + '18', color: meta.color, border: `1px solid ${meta.color}33` }}>{meta.label}</span></td>
                          <td style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: meta.color }}>{fmt(d.value)}</td>
                          <td>{d.assigned_to || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Activities */}
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
                            position: 'absolute', left: -20, top: 10,
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
        <Modal title={`Editar: ${company.name}`} onClose={() => setModal(false)}>
          <form onSubmit={handleSave}>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Nombre *</label>
                  <input className="form-input" required value={form.name ?? ''} onChange={e => set('name', e.target.value)}/>
                </div>
                <div>
                  <label className="form-label">Dominio</label>
                  <input className="form-input" value={form.domain ?? ''} onChange={e => set('domain', e.target.value)}/>
                </div>
                <div>
                  <label className="form-label">Sitio web</label>
                  <input className="form-input" value={form.website ?? ''} onChange={e => set('website', e.target.value)}/>
                </div>
                <div>
                  <label className="form-label">Industria</label>
                  <select className="form-select" value={form.industry ?? ''} onChange={e => set('industry', e.target.value)}>
                    <option value="">—</option>
                    {INDUSTRIES.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Tamaño</label>
                  <select className="form-select" value={form.size ?? ''} onChange={e => set('size', e.target.value)}>
                    <option value="">—</option>
                    {SIZES.map(o => <option key={o} value={o}>{o} empleados</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Teléfono</label>
                  <input className="form-input" value={form.phone ?? ''} onChange={e => set('phone', e.target.value)}/>
                </div>
                <div>
                  <label className="form-label">Dirección</label>
                  <input className="form-input" value={form.address ?? ''} onChange={e => set('address', e.target.value)}/>
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
