'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Company, CompanyInsert } from '@/lib/supabase/types'
import { Topbar } from '@/components/Topbar'
import { Modal } from '@/components/Modal'
import { EmptyState } from '@/components/EmptyState'
import { initials, relativeTime } from '@/lib/utils'
import { useTeam } from '@/hooks/useTeam'

const INDUSTRIES = ['SaaS','FinTech','DevTools','E-commerce','Healthcare','Legal','Consulting','Retail','Manufacturing','Otro']
const SIZES = ['1-50','51-200','201-1000','1000+']

function CompanyForm({
  initial, onSave, onClose,
}: {
  initial?: Partial<Company>
  onSave: (data: CompanyInsert) => Promise<void>
  onClose: () => void
}) {
  const [f, setF] = useState({
    name: initial?.name ?? '',
    domain: initial?.domain ?? '',
    industry: initial?.industry ?? '',
    size: initial?.size ?? '',
    website: initial?.website ?? '',
    phone: initial?.phone ?? '',
    address: initial?.address ?? '',
    notes: initial?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSave(f as CompanyInsert)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="modal-body">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {[
            {k:'name',    lbl:'Nombre *',   ph:'Acme Corp',         full: true},
            {k:'domain',  lbl:'Dominio',     ph:'acme.com'},
            {k:'website', lbl:'Sitio web',   ph:'https://acme.com'},
            {k:'phone',   lbl:'Teléfono',    ph:'+34 91 000 0000'},
            {k:'address', lbl:'Dirección',   ph:'Calle Mayor 1, Madrid', full: true},
          ].map(i => (
            <div key={i.k} style={{gridColumn: i.full ? '1/-1' : undefined}}>
              <label className="form-label">{i.lbl}</label>
              <input className="form-input" required={i.k==='name'} placeholder={i.ph}
                value={(f as any)[i.k]} onChange={e => set(i.k, e.target.value)}/>
            </div>
          ))}
          <div>
            <label className="form-label">Industria</label>
            <select className="form-select" value={f.industry} onChange={e => set('industry',e.target.value)}>
              <option value="">Seleccionar...</option>
              {INDUSTRIES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Tamaño</label>
            <select className="form-select" value={f.size} onChange={e => set('size',e.target.value)}>
              <option value="">Seleccionar...</option>
              {SIZES.map(o => <option key={o} value={o}>{o} empleados</option>)}
            </select>
          </div>
          <div style={{gridColumn:'1/-1'}}>
            <label className="form-label">Notas</label>
            <textarea className="form-textarea" placeholder="Notas internas..."
              value={f.notes} onChange={e => set('notes',e.target.value)}/>
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

export default function CompaniesPage() {
  const supabase = createClient()
  const { teamId } = useTeam()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [selected, setSelected] = useState<Company | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })
    setCompanies((data as Company[] | null) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Real-time
  useEffect(() => {
    const channel = supabase
      .channel('companies')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load])

  const handleCreate = async (data: CompanyInsert) => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('companies').insert([{ ...data, user_id: user!.id, team_id: teamId || null }] as any)
    setModal(null)
    load()
  }

  const handleUpdate = async (data: CompanyInsert) => {
    await supabase.from('companies').update(data as any).eq('id', selected!.id)
    setModal(null)
    setSelected(null)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta empresa?')) return
    await supabase.from('companies').delete().eq('id', id)
    load()
  }

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.domain ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <Topbar
        title="Empresas"
        subtitle={`${companies.length} empresas registradas`}
        actions={
          <button className="btn btn-primary" onClick={() => setModal('create')}>
            + Nueva empresa
          </button>
        }
      />

      <div style={{flex:1, overflow:'auto', padding:24}}>
        {/* Search */}
        <div style={{marginBottom:16}}>
          <input className="form-input" style={{maxWidth:320}}
            placeholder="Buscar empresas..."
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>

        <div className="crm-card">
          {loading ? (
            <div style={{padding:40,textAlign:'center',color:'var(--t3)',fontFamily:'var(--mono)',fontSize:11}}>
              ⟳ Cargando...
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="▣"
              title="Sin empresas"
              description="Añade tu primera empresa para empezar a gestionar relaciones."
              action={<button className="btn btn-primary" onClick={() => setModal('create')}>+ Nueva empresa</button>}
            />
          ) : (
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Industria</th>
                  <th>Tamaño</th>
                  <th>Dominio</th>
                  <th>Creada</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} onClick={() => { setSelected(c); setModal('edit') }}>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{
                          width:30,height:30,background:'var(--gd)',border:'1px solid rgba(0,232,122,.2)',
                          display:'flex',alignItems:'center',justifyContent:'center',
                          fontFamily:'var(--mono)',fontSize:10,fontWeight:700,color:'var(--green)',flexShrink:0,
                        }}>{initials(c.name)}</div>
                        <div>
                          <div style={{fontSize:12,fontWeight:600,color:'var(--tx)'}}>{c.name}</div>
                          {c.website && <div style={{fontSize:10,color:'var(--t3)'}}>{c.website}</div>}
                        </div>
                      </div>
                    </td>
                    <td>{c.industry || '—'}</td>
                    <td>{c.size ? `${c.size} emp.` : '—'}</td>
                    <td style={{fontFamily:'var(--mono)',fontSize:10}}>{c.domain || '—'}</td>
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
        <Modal title="Nueva empresa" onClose={() => setModal(null)}>
          <CompanyForm onSave={handleCreate} onClose={() => setModal(null)}/>
        </Modal>
      )}
      {modal === 'edit' && selected && (
        <Modal title={`Editar: ${selected.name}`} onClose={() => { setModal(null); setSelected(null) }}>
          <CompanyForm initial={selected} onSave={handleUpdate} onClose={() => { setModal(null); setSelected(null) }}/>
        </Modal>
      )}
    </>
  )
}
