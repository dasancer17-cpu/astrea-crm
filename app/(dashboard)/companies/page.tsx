'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Company, CompanyInsert } from '@/lib/supabase/types'
import { Topbar } from '@/components/Topbar'
import { Modal } from '@/components/Modal'
import { EmptyState } from '@/components/EmptyState'
import { initials, relativeTime } from '@/lib/utils'
import { useTeam } from '@/hooks/useTeam'

const INDUSTRIES = ['SaaS','FinTech','DevTools','E-commerce','Healthcare','Legal','Consulting','Retail','Manufacturing','Otro']
const SIZES = ['1-50','51-200','201-1000','1000+']

function CompanyForm({ initial, onSave, onClose }: { initial?: Partial<Company>; onSave: (data: CompanyInsert) => Promise<void>; onClose: () => void }) {
  const [f, setF] = useState({
    name: initial?.name ?? '', domain: initial?.domain ?? '', industry: initial?.industry ?? '',
    size: initial?.size ?? '', website: initial?.website ?? '', phone: initial?.phone ?? '',
    address: initial?.address ?? '', notes: initial?.notes ?? '',
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1/-1' }}><label className="form-label">Nombre *</label><input className="form-input" required value={f.name} onChange={e => set('name', e.target.value)}/></div>
          <div><label className="form-label">Dominio</label><input className="form-input" value={f.domain} onChange={e => set('domain', e.target.value)}/></div>
          <div><label className="form-label">Sitio web</label><input className="form-input" value={f.website} onChange={e => set('website', e.target.value)}/></div>
          <div>
            <label className="form-label">Industria</label>
            <select className="form-select" value={f.industry} onChange={e => set('industry', e.target.value)}>
              <option value="">Seleccionar...</option>
              {INDUSTRIES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Tamaño</label>
            <select className="form-select" value={f.size} onChange={e => set('size', e.target.value)}>
              <option value="">Seleccionar...</option>
              {SIZES.map(o => <option key={o} value={o}>{o} empleados</option>)}
            </select>
          </div>
          <div><label className="form-label">Teléfono</label><input className="form-input" value={f.phone} onChange={e => set('phone', e.target.value)}/></div>
          <div><label className="form-label">Dirección</label><input className="form-input" value={f.address} onChange={e => set('address', e.target.value)}/></div>
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
function CsvImportModal({ teamId, userId, onDone, onClose }: { teamId: string; userId: string; onDone: () => void; onClose: () => void }) {
  const supabase = createClient()
  const fileRef  = useRef<HTMLInputElement>(null)
  const [rows,   setRows]   = useState<Record<string, string>[]>([])
  const [status, setStatus] = useState<'idle' | 'preview' | 'importing' | 'done'>('idle')
  const [error,  setError]  = useState('')
  const [count,  setCount]  = useState(0)

  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n').filter(l => l.trim())
    if (lines.length < 2) { setError('El archivo necesita al menos una cabecera y una fila.'); return }
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase()
      .replace('nombre', 'name').replace('dominio', 'domain')
      .replace('industria', 'industry').replace('tamaño', 'size').replace('tamano', 'size')
      .replace('sitio web', 'website').replace('teléfono', 'phone').replace('telefono', 'phone')
      .replace('dirección', 'address').replace('direccion', 'address').replace('notas', 'notes'))
    const parsed = lines.slice(1).map(line => {
      const vals = line.split(',')
      return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? '').trim()]))
    }).filter(r => r.name)
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
      name: r.name, domain: r.domain || null, industry: r.industry || null,
      size: r.size || null, website: r.website || null, phone: r.phone || null,
      address: r.address || null, notes: r.notes || null,
      user_id: userId, team_id: teamId || null,
    }))
    const { error: err } = await supabase.from('companies').insert(inserts as any)
    if (err) { setError(err.message); setStatus('preview'); return }
    setCount(inserts.length)
    setStatus('done')
    onDone()
  }

  return (
    <Modal title="Importar empresas desde CSV" onClose={onClose}>
      <div className="modal-body">
        {status === 'done' ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: 32, color: 'var(--green)', marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)' }}>{count} empresas importadas</div>
          </div>
        ) : (
          <>
            <div style={{ padding: '12px 14px', background: 'var(--s2)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--t2)' }}>
              <div style={{ fontWeight: 600, color: 'var(--tx)', marginBottom: 4 }}>Formato esperado del CSV:</div>
              <code style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>
                Nombre, Dominio, Industria, Tamaño, Sitio web, Teléfono, Dirección, Notas
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
                  <span style={{ color: 'var(--green)', fontWeight: 700 }}>{rows.length} empresas</span> listas para importar. Vista previa:
                </div>
                <table className="crm-table" style={{ fontSize: 10 }}>
                  <thead><tr><th>Nombre</th><th>Dominio</th><th>Industria</th></tr></thead>
                  <tbody>
                    {rows.slice(0, 5).map((r, i) => (
                      <tr key={i}><td style={{ color: 'var(--tx)' }}>{r.name}</td><td>{r.domain || '—'}</td><td>{r.industry || '—'}</td></tr>
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
        {status === 'preview' && <button className="btn btn-primary" onClick={handleImport} disabled={rows.length === 0}>▸ Importar {rows.length} empresas</button>}
      </div>
    </Modal>
  )
}

export default function CompaniesPage() {
  const supabase = createClient()
  const router   = useRouter()
  const { teamId } = useTeam()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [modal,     setModal]     = useState<'create' | 'csv' | null>(null)
  const [userId,    setUserId]    = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data }, { data: { user } }] = await Promise.all([
      supabase.from('companies').select('*').order('created_at', { ascending: false }),
      supabase.auth.getUser(),
    ])
    setCompanies((data as Company[] | null) ?? [])
    setUserId(user?.id ?? '')
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const ch = supabase.channel('companies')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])

  const handleCreate = async (data: CompanyInsert) => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('companies').insert([{ ...data, user_id: user!.id, team_id: teamId || null }] as any)
    setModal(null)
    load()
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
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
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => setModal('csv')}>⊕ Importar CSV</button>
            <button className="btn btn-primary" onClick={() => setModal('create')}>+ Nueva empresa</button>
          </div>
        }
      />

      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <input className="form-input" style={{ maxWidth: 320 }} placeholder="Buscar empresas..."
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>

        <div className="crm-card">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 11 }}>⟳ Cargando...</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon="▣" title="Sin empresas" description="Añade tu primera empresa."
              action={<button className="btn btn-primary" onClick={() => setModal('create')}>+ Nueva empresa</button>}/>
          ) : (
            <table className="crm-table">
              <thead><tr><th>Empresa</th><th>Industria</th><th>Tamaño</th><th>Dominio</th><th>Creada</th><th></th></tr></thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} onClick={() => router.push(`/companies/${c.id}`)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, background: 'var(--gd)', border: '1px solid rgba(0,232,122,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color: 'var(--green)', flexShrink: 0 }}>
                          {initials(c.name)}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx)' }}>{c.name}</div>
                          {c.website && <div style={{ fontSize: 10, color: 'var(--t3)' }}>{c.website}</div>}
                        </div>
                      </div>
                    </td>
                    <td>{c.industry || '—'}</td>
                    <td>{c.size ? `${c.size} emp.` : '—'}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>{c.domain || '—'}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>{relativeTime(c.created_at)}</td>
                    <td><button className="btn btn-danger" style={{ padding: '3px 8px', fontSize: 10 }} onClick={e => handleDelete(e, c.id)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal === 'create' && <Modal title="Nueva empresa" onClose={() => setModal(null)}><CompanyForm onSave={handleCreate} onClose={() => setModal(null)}/></Modal>}
      {modal === 'csv' && <CsvImportModal teamId={teamId} userId={userId} onDone={load} onClose={() => setModal(null)}/>}
    </>
  )
}
