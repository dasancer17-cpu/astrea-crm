'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createClient } from '@/lib/supabase/client'
import type { Deal, DealInsert, DealStage, Contact, Company } from '@/lib/supabase/types'
import { Topbar } from '@/components/Topbar'
import { Modal } from '@/components/Modal'

import { fmt, STAGE_META } from '@/lib/utils'
import { useTeam } from '@/hooks/useTeam'
import { useProject } from '@/hooks/useProject'
import type { Project } from '@/lib/supabase/types'

const STAGES = Object.keys(STAGE_META) as DealStage[]

// ── Deal card (draggable) ─────────────────────────────────────────

function DealCard({
  deal, color, onClick,
}: {
  deal: Deal, color: string, onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id })
  const scCls = deal.probability >= 80 ? 'chip-g' : deal.probability >= 50 ? 'chip-a' : 'chip-b'

  const cardStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? .4 : 1,
    background: 'var(--s2)', border: '1px solid var(--b2)', padding: 10,
    cursor: 'grab',
  }

  return (
    <div ref={setNodeRef} style={cardStyle} {...attributes} {...listeners}
      onClick={onClick}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--t3)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--b2)')}
    >
      <div style={{fontSize:12,fontWeight:600,marginBottom:3,color:'var(--tx)'}}>{deal.title}</div>
      <div style={{fontFamily:'var(--mono)',fontSize:13,fontWeight:700,marginBottom:5,color}}>{fmt(deal.value)}</div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:10,color:'var(--t2)'}}>{deal.assigned_to || '—'}</span>
        <span className={`chip ${scCls}`}>{deal.probability}%</span>
      </div>
      {deal.expected_close && (
        <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t3)',marginTop:4}}>
          Cierre: {new Date(deal.expected_close).toLocaleDateString('es-ES')}
        </div>
      )}
    </div>
  )
}

// ── Kanban column ─────────────────────────────────────────────────

function KanbanColumn({
  stage, deals, color, onAdd, onCardClick,
}: {
  stage: DealStage
  deals: Deal[]
  color: string
  onAdd: () => void
  onCardClick: (d: Deal) => void
}) {
  const total = deals.reduce((s, d) => s + d.value, 0)
  const meta  = STAGE_META[stage]

  return (
    <div style={{
      background: 'var(--surface)', display: 'flex', flexDirection: 'column',
      border: '1px solid var(--border)', minWidth: 200,
    }}>
      <div style={{padding:'10px 12px',borderBottom:'1px solid var(--border)',borderTop:`2px solid ${color}`}}>
        <div style={{fontSize:9,fontWeight:700,letterSpacing:'.14em',textTransform:'uppercase',color}}>{meta.label}</div>
        <div style={{fontFamily:'var(--mono)',fontSize:11,marginTop:3,color}}>
          {fmt(total)} <span style={{color:'var(--t3)',fontSize:10}}>· {deals.length}</span>
        </div>
      </div>
      <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
        <div style={{flex:1,overflowY:'auto',padding:7,display:'flex',flexDirection:'column',gap:5}}>
          {deals.map(d => (
            <DealCard key={d.id} deal={d} color={color} onClick={() => onCardClick(d)}/>
          ))}
          <button className="btn btn-ghost" style={{
            width:'100%',fontSize:10,padding:6,color:'var(--t3)',
            borderColor:'var(--border)',justifyContent:'center',marginTop:3,
          }} onClick={onAdd}>+ Añadir</button>
        </div>
      </SortableContext>
    </div>
  )
}

// ── Deal form modal ───────────────────────────────────────────────

function DealForm({
  initial, contacts, companies, projects, defaultStage, defaultProjectId, onSave, onClose,
}: {
  initial?: Partial<Deal>
  contacts: Contact[]
  companies: Company[]
  projects: Project[]
  defaultStage?: DealStage
  defaultProjectId?: string
  onSave: (data: DealInsert) => Promise<void>
  onClose: () => void
}) {
  const [f, setF] = useState({
    title:          initial?.title          ?? '',
    value:          initial?.value          ?? 0,
    stage:          initial?.stage          ?? defaultStage ?? 'nuevo',
    probability:    initial?.probability    ?? STAGE_META[initial?.stage ?? defaultStage ?? 'nuevo'].prob,
    expected_close: initial?.expected_close ?? '',
    contact_id:     initial?.contact_id     ?? '',
    company_id:     initial?.company_id     ?? '',
    assigned_to:    initial?.assigned_to    ?? '',
    notes:          initial?.notes          ?? '',
    project_id:     initial?.project_id     ?? defaultProjectId ?? '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string | number) => setF(p => ({ ...p, [k]: v }))

  const handleStageChange = (stage: DealStage) => {
    setF(p => ({ ...p, stage, probability: STAGE_META[stage].prob }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSave({
      ...f,
      contact_id: f.contact_id || null,
      company_id: f.company_id || null,
      assigned_to: f.assigned_to || null,
      expected_close: f.expected_close || null,
    } as DealInsert)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="modal-body">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div style={{gridColumn:'1/-1'}}>
            <label className="form-label">Título del deal *</label>
            <input className="form-input" required placeholder="Acme Corp – Plan Enterprise"
              value={f.title} onChange={e => set('title', e.target.value)}/>
          </div>
          <div>
            <label className="form-label">Valor (€)</label>
            <input className="form-input" type="number" min={0} step={100}
              value={f.value} onChange={e => set('value', parseFloat(e.target.value)||0)}/>
          </div>
          <div>
            <label className="form-label">Probabilidad (%)</label>
            <input className="form-input" type="number" min={0} max={100}
              value={f.probability} onChange={e => set('probability', parseInt(e.target.value)||0)}/>
          </div>
          <div>
            <label className="form-label">Etapa</label>
            <select className="form-select" value={f.stage}
              onChange={e => handleStageChange(e.target.value as DealStage)}>
              {STAGES.map(s => <option key={s} value={s}>{STAGE_META[s].label}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Fecha cierre estimada</label>
            <input className="form-input" type="date"
              value={f.expected_close} onChange={e => set('expected_close', e.target.value)}/>
          </div>
          <div>
            <label className="form-label">Contacto</label>
            <select className="form-select" value={f.contact_id} onChange={e => set('contact_id', e.target.value)}>
              <option value="">Sin contacto</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Empresa</label>
            <select className="form-select" value={f.company_id} onChange={e => set('company_id', e.target.value)}>
              <option value="">Sin empresa</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{gridColumn:'1/-1'}}>
            <label className="form-label">Asignado a</label>
            <input className="form-input" placeholder="A. García"
              value={f.assigned_to} onChange={e => set('assigned_to', e.target.value)}/>
          </div>
          {projects.length > 0 && (
            <div>
              <label className="form-label">Proyecto</label>
              <select className="form-select" value={f.project_id} onChange={e => set('project_id', e.target.value)}>
                <option value="">Sin proyecto</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
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
          {saving ? '⟳ Guardando...' : '▸ Guardar deal'}
        </button>
      </div>
    </form>
  )
}

// ── Page ──────────────────────────────────────────────────────────

export default function DealsPage() {
  const supabase = createClient()
  const { teamId } = useTeam()
  const { projects, activeProject } = useProject()
  const [deals,    setDeals]    = useState<Deal[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [companies,setCompanies]= useState<Company[]>([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState<'create' | 'edit' | null>(null)
  const [selected, setSelected] = useState<Deal | null>(null)
  const [defaultStage, setDefaultStage] = useState<DealStage>('nuevo')
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('deals').select('*').order('created_at', { ascending: false })
    if (activeProject) q = q.eq('project_id', activeProject.id)
    const [{ data: ds }, { data: cts }, { data: cos }] = await Promise.all([
      q,
      supabase.from('contacts').select('*').order('first_name'),
      supabase.from('companies').select('*').order('name'),
    ])
    setDeals((ds as Deal[] | null) ?? [])
    setContacts((cts as Contact[] | null) ?? [])
    setCompanies((cos as Company[] | null) ?? [])
    setLoading(false)
  }, [activeProject])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const ch = supabase
      .channel('deals-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])

  const dealsByStage = STAGES.reduce((acc, s) => {
    acc[s] = deals.filter(d => d.stage === s)
    return acc
  }, {} as Record<DealStage, Deal[]>)

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string)

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const dealId  = active.id as string
    const overId  = over.id as string
    const newStage = STAGES.find(s => s === overId || dealsByStage[s].some(d => d.id === overId))
    if (!newStage) return
    const deal = deals.find(d => d.id === dealId)
    if (!deal || deal.stage === newStage) return

    // Optimistic update
    setDeals(prev => prev.map(d => d.id === dealId
      ? { ...d, stage: newStage, probability: STAGE_META[newStage].prob }
      : d
    ))
    await supabase.from('deals').update({
      stage: newStage, probability: STAGE_META[newStage].prob,
    } as any).eq('id', dealId)
  }

  const handleCreate = async (data: DealInsert) => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('deals').insert([{ ...data, user_id: user!.id, team_id: teamId || null, project_id: data.project_id || activeProject?.id || null }] as any)
    setModal(null)
    load()
  }

  const handleUpdate = async (data: DealInsert) => {
    await supabase.from('deals').update(data as any).eq('id', selected!.id)
    setModal(null)
    setSelected(null)
    load()
  }

  const handleDelete = async () => {
    if (!selected || !confirm('¿Eliminar este deal?')) return
    await supabase.from('deals').delete().eq('id', selected.id)
    setModal(null)
    setSelected(null)
    load()
  }

  const [search,       setSearch]       = useState('')
  const [filterAssigned, setFilterAssigned] = useState('')
  const [filterClose,    setFilterClose]    = useState<'all' | 'overdue' | 'week' | 'month'>('all')

  const assignees = Array.from(new Set(deals.map(d => d.assigned_to).filter(Boolean))) as string[]

  const filterDeal = (d: Deal) => {
    if (search && !d.title.toLowerCase().includes(search.toLowerCase())) return false
    if (filterAssigned && d.assigned_to !== filterAssigned) return false
    if (filterClose !== 'all' && d.expected_close) {
      const close = new Date(d.expected_close)
      const now   = new Date()
      const diff  = (close.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      if (filterClose === 'overdue' && diff >= 0) return false
      if (filterClose === 'week'    && (diff < 0 || diff > 7)) return false
      if (filterClose === 'month'   && (diff < 0 || diff > 30)) return false
    }
    return true
  }

  const filteredDeals = deals.filter(filterDeal)
  const filteredByStage = STAGES.reduce((acc, s) => {
    acc[s] = filteredDeals.filter(d => d.stage === s)
    return acc
  }, {} as Record<DealStage, Deal[]>)

  const totalPipeline = deals.filter(d => d.stage !== 'ganado' && d.stage !== 'perdido').reduce((s,d) => s+d.value, 0)
  const activeDeal = activeId ? deals.find(d => d.id === activeId) : null

  const hasFilters = search || filterAssigned || filterClose !== 'all'

  return (
    <>
      <Topbar
        title="Pipeline"
        subtitle={`${deals.length} deals · ${fmt(totalPipeline)} en pipeline activo`}
        actions={
          <button className="btn btn-primary" onClick={() => { setDefaultStage('nuevo'); setModal('create') }}>
            + Nuevo deal
          </button>
        }
      />

      {/* Filter bar */}
      <div style={{ padding: '8px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', background: 'var(--surface)', flexWrap: 'wrap' }}>
        <input className="form-input" style={{ maxWidth: 220, padding: '5px 8px', fontSize: 11 }}
          placeholder="Buscar deal..." value={search} onChange={e => setSearch(e.target.value)}/>
        <select className="form-select" style={{ width: 'auto', padding: '5px 8px', fontSize: 11 }}
          value={filterAssigned} onChange={e => setFilterAssigned(e.target.value)}>
          <option value="">Todos los asignados</option>
          {assignees.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="form-select" style={{ width: 'auto', padding: '5px 8px', fontSize: 11 }}
          value={filterClose} onChange={e => setFilterClose(e.target.value as any)}>
          <option value="all">Cualquier cierre</option>
          <option value="overdue">Vencidos</option>
          <option value="week">Próximos 7 días</option>
          <option value="month">Próximos 30 días</option>
        </select>
        {hasFilters && (
          <button className="btn btn-ghost" style={{ fontSize: 10, padding: '4px 8px' }}
            onClick={() => { setSearch(''); setFilterAssigned(''); setFilterClose('all') }}>
            ✕ Limpiar
          </button>
        )}
        {hasFilters && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', marginLeft: 4 }}>
            {filteredDeals.length} de {deals.length} deals
          </span>
        )}
      </div>

      {loading ? (
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--t3)',fontFamily:'var(--mono)',fontSize:11}}>
          ⟳ Cargando pipeline...
        </div>
      ) : (
        <div style={{flex:1,overflow:'auto',padding:'16px 24px 24px'}}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:1,minHeight:'calc(100vh - 160px)'}}>
              {STAGES.map(stage => (
                <KanbanColumn
                  key={stage}
                  stage={stage}
                  deals={hasFilters ? filteredByStage[stage] : dealsByStage[stage]}
                  color={STAGE_META[stage].color}
                  onAdd={() => { setDefaultStage(stage); setSelected(null); setModal('create') }}
                  onCardClick={d => { setSelected(d); setModal('edit') }}
                />
              ))}
            </div>

            <DragOverlay>
              {activeDeal && (
                <div style={{
                  background:'var(--s2)',border:'1px solid var(--green)',padding:10,
                  opacity:.9,cursor:'grabbing',minWidth:200,
                }}>
                  <div style={{fontSize:12,fontWeight:600,color:'var(--tx)'}}>{activeDeal.title}</div>
                  <div style={{fontFamily:'var(--mono)',fontSize:13,fontWeight:700,color:STAGE_META[activeDeal.stage].color}}>
                    {fmt(activeDeal.value)}
                  </div>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {modal === 'create' && (
        <Modal title="Nuevo deal" onClose={() => setModal(null)}>
          <DealForm
            defaultStage={defaultStage}
            contacts={contacts}
            companies={companies}
            projects={projects}
            defaultProjectId={activeProject?.id}
            onSave={handleCreate}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
      {modal === 'edit' && selected && (
        <Modal
          title={selected.title}
          onClose={() => { setModal(null); setSelected(null) }}
          footer={
            <button className="btn btn-danger" onClick={handleDelete} style={{marginRight:'auto'}}>
              ✕ Eliminar deal
            </button>
          }
        >
          <DealForm
            initial={selected}
            contacts={contacts}
            companies={companies}
            projects={projects}
            onSave={handleUpdate}
            onClose={() => { setModal(null); setSelected(null) }}
          />
        </Modal>
      )}
    </>
  )
}
