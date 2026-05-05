'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Contact, ContactInsert, Company } from '@/lib/supabase/types'
import { Topbar } from '@/components/Topbar'
import { Modal } from '@/components/Modal'
import { EmptyState } from '@/components/EmptyState'
import { initials, relativeTime, SOURCE_LABELS } from '@/lib/utils'

const SOURCES = Object.entries(SOURCE_LABELS)
const SIZES = ['1-50','51-200','201-1000','1000+']

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--amber)' : 'var(--blue)'
  const cls   = score >= 80 ? 'chip-g' : score >= 60 ? 'chip-a' : 'chip-b'
  return <span className={`chip ${cls}`}>#{score}</span>
}

function ContactForm({
  initial, companies, onSave, onClose,
}: {
  initial?: Partial<Contact>
  companies: Company[]
  onSave: (data: ContactInsert) => Promise<void>
  onClose: () => void
}) {
  const [f, setF] = useState({
    first_name:  initial?.first_name  ?? '',
    last_name:   initial?.last_name   ?? '',
    email:       initial?.email       ?? '',
    phone:       initial?.phone       ?? '',
    title:       initial?.title       ?? '',
    company_id:  initial?.company_id  ?? '',
    lead_score:  initial?.lead_score  ?? 0,
    source:      initial?.source      ?? '',
    notes:       initial?.notes       ?? '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string | number) => setF(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSave({
      ...f,
      company_id: f.company_id || null,
      source:     f.source     || null,
    } as ContactInsert)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="modal-body">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div>
            <label className="form-label">Nombre *</label>
            <input className="form-input" required placeholder="Sara"
              value={f.first_name} onChange={e => set('first_name', e.target.value)}/>
          </div>
          <div>
            <label className="form-label">Apellidos *</label>
            <input className="form-input" required placeholder="García"
              value={f.last_name} onChange={e => set('last_name', e.target.value)}/>
          </div>
          <div>
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="sara@empresa.com"
              value={f.email} onChange={e => set('email', e.target.value)}/>
          </div>
          <div>
            <label className="form-label">Teléfono</label>
            <input className="form-input" placeholder="+34 600 000 000"
              value={f.phone} onChange={e => set('phone', e.target.value)}/>
          </div>
          <div>
            <label className="form-label">Cargo</label>
            <input className="form-input" placeholder="VP de Ventas"
              value={f.title} onChange={e => set('title', e.target.value)}/>
          </div>
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
              {SOURCES.map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Lead score (0-100)</label>
            <input className="form-input" type="number" min={0} max={100}
              value={f.lead_score} onChange={e => set('lead_score', parseInt(e.target.value)||0)}/>
          </div>
          <div style={{gridColumn:'1/-1'}}>
            <label className="form-label">Notas</label>
            <textarea className="form-textarea" placeholder="Notas internas..."
              value={f.notes} onChange={e => set('notes', e.target.value)}/>
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? '⟳ Guardando...' : '▸ Guardar'}
        </button>
      </div>
    </form>
  )
}

export default function ContactsPage() {
  const supabase = createClient()
  const [contacts,  setContacts]  = useState<Contact[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [modal,     setModal]     = useState<'create' | 'edit' | null>(null)
  const [selected,  setSelected]  = useState<Contact | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: cts }, { data: cos }] = await Promise.all([
      supabase.from('contacts').select('*').order('created_at', { ascending: false }),
      supabase.from('companies').select('*').order('name'),
    ])
    setContacts((cts as Contact[] | null) ?? [])
    setCompanies((cos as Company[] | null) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const ch = supabase
      .channel('contacts-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])

  const companyMap = Object.fromEntries(companies.map(c => [c.id, c.name]))

  const handleCreate = async (data: ContactInsert) => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('contacts').insert([{ ...data, user_id: user!.id }] as any)
    setModal(null)
    load()
  }

  const handleUpdate = async (data: ContactInsert) => {
    await supabase.from('contacts').update(data as any).eq('id', selected!.id)
    setModal(null)
    setSelected(null)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este contacto?')) return
    await supabase.from('contacts').delete().eq('id', id)
    load()
  }

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase()
    return (
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q)  ||
      (c.email ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <>
      <Topbar
        title="Contactos"
        subtitle={`${contacts.length} contactos · ${contacts.filter(c => c.lead_score >= 75).length} SQL`}
        actions={
          <button className="btn btn-primary" onClick={() => setModal('create')}>
            + Nuevo contacto
          </button>
        }
      />

      <div style={{flex:1,overflow:'auto',padding:24}}>
        <div style={{marginBottom:16}}>
          <input className="form-input" style={{maxWidth:320}}
            placeholder="Buscar contactos..."
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>

        <div className="crm-card">
          {loading ? (
            <div style={{padding:40,textAlign:'center',color:'var(--t3)',fontFamily:'var(--mono)',fontSize:11}}>⟳ Cargando...</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon="◎" title="Sin contactos"
              description="Añade tu primer contacto para empezar."
              action={<button className="btn btn-primary" onClick={() => setModal('create')}>+ Nuevo contacto</button>}/>
          ) : (
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Contacto</th>
                  <th>Empresa</th>
                  <th>Cargo</th>
                  <th>Fuente</th>
                  <th>Score</th>
                  <th>Creado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} onClick={() => { setSelected(c); setModal('edit') }}>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{
                          width:30,height:30,background:'var(--bd)',border:'1px solid rgba(96,165,250,.2)',
                          display:'flex',alignItems:'center',justifyContent:'center',
                          fontFamily:'var(--mono)',fontSize:10,fontWeight:700,color:'var(--blue)',flexShrink:0,
                        }}>{initials(`${c.first_name} ${c.last_name}`)}</div>
                        <div>
                          <div style={{fontSize:12,fontWeight:600,color:'var(--tx)'}}>{c.first_name} {c.last_name}</div>
                          {c.email && <div style={{fontSize:10,color:'var(--t3)'}}>{c.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td>{c.company_id ? companyMap[c.company_id] ?? '—' : '—'}</td>
                    <td>{c.title || '—'}</td>
                    <td>{c.source ? SOURCE_LABELS[c.source] ?? c.source : '—'}</td>
                    <td><ScoreBadge score={c.lead_score}/></td>
                    <td style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)'}}>{relativeTime(c.created_at)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <button className="btn btn-danger" style={{padding:'3px 8px',fontSize:10}}
                        onClick={() => handleDelete(c.id)}>✕</button>
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
          <ContactForm companies={companies} onSave={handleCreate} onClose={() => setModal(null)}/>
        </Modal>
      )}
      {modal === 'edit' && selected && (
        <Modal title={`${selected.first_name} ${selected.last_name}`} onClose={() => { setModal(null); setSelected(null) }}>
          <ContactForm initial={selected} companies={companies} onSave={handleUpdate} onClose={() => { setModal(null); setSelected(null) }}/>
        </Modal>
      )}
    </>
  )
}
