'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Deal, Activity } from '@/lib/supabase/types'
import { Topbar } from '@/components/Topbar'
import { fmt, STAGE_META, ACTIVITY_META, relativeTime } from '@/lib/utils'

interface Metrics {
  pipeline:  number
  mqls:      number
  sqls:      number
  forecast:  number
  contacts:  number
  companies: number
  deals:     number
  wonValue:  number
}

function MetricCard({ label, value, change, color }: { label: string; value: string; change?: string; color: string }) {
  return (
    <div style={{background:'var(--surface)',border:'1px solid var(--border)',padding:16,position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:color}}/>
      <div style={{fontSize:9,fontWeight:600,letterSpacing:'.14em',textTransform:'uppercase',color:'var(--t3)',marginBottom:7}}>
        {label}
      </div>
      <div style={{fontFamily:'var(--mono)',fontSize:28,fontWeight:700,lineHeight:1,color}}>{value}</div>
      {change && <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)',marginTop:5}}>{change}</div>}
    </div>
  )
}

function StageBar({ label, value, pct, color, count }: { label: string; value: number; pct: number; color: string; count: number }) {
  return (
    <div style={{background:'var(--surface)',padding:'11px 16px',display:'flex',alignItems:'center',gap:10,borderBottom:'1px solid var(--border)'}}>
      <div style={{fontSize:11,fontWeight:500,color,width:96,flexShrink:0}}>{label}</div>
      <div style={{flex:1,height:4,background:'var(--s3)'}}>
        <div style={{width:`${pct}%`,height:'100%',background:color,opacity:.8}}/>
      </div>
      <div style={{fontFamily:'var(--mono)',fontSize:11,fontWeight:700,width:58,textAlign:'right',flexShrink:0,color}}>{fmt(value)}</div>
      <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)',width:24,textAlign:'right'}}>{count}</div>
    </div>
  )
}

export default function DashboardPage() {
  const supabase = createClient()
  const [metrics,    setMetrics]    = useState<Metrics | null>(null)
  const [deals,      setDeals]      = useState<Deal[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading,    setLoading]    = useState(true)

  const loadData = async () => {
    const [
      { data: contacts },
      { data: companies },
      { data: dealsData },
      { data: activitiesData },
    ] = await Promise.all([
      supabase.from('contacts').select('lead_score,id'),
      supabase.from('companies').select('id'),
      supabase.from('deals').select('*').order('created_at', { ascending: false }),
      supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(10),
    ]) as [
      { data: Array<{id:string;lead_score:number}> | null },
      { data: Array<{id:string}> | null },
      { data: Deal[] | null },
      { data: Activity[] | null },
    ]

    const activeDeals = (dealsData ?? []).filter(d => d.stage !== 'ganado' && d.stage !== 'perdido')
    const pipeline  = activeDeals.reduce((s, d) => s + d.value, 0)
    const forecast  = (dealsData ?? []).filter(d => d.stage === 'negociacion' || d.stage === 'propuesta')
                        .reduce((s, d) => s + d.value * d.probability / 100, 0)
    const wonValue  = (dealsData ?? []).filter(d => d.stage === 'ganado').reduce((s,d)=>s+d.value,0)
    const mqls      = (contacts ?? []).filter(c => c.lead_score >= 50 && c.lead_score < 75).length
    const sqls      = (contacts ?? []).filter(c => c.lead_score >= 75).length

    setMetrics({
      pipeline, forecast, mqls, sqls, wonValue,
      contacts:  contacts?.length  ?? 0,
      companies: companies?.length ?? 0,
      deals:     dealsData?.length ?? 0,
    })
    setDeals(dealsData ?? [])
    setActivities(activitiesData ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    const ch = supabase
      .channel('dashboard-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  // Stage bars data
  const stageData = (['nuevo','calificado','propuesta','negociacion'] as const).map(s => {
    const stageDeals = deals.filter(d => d.stage === s)
    const val = stageDeals.reduce((sum, d) => sum + d.value, 0)
    return { stage: s, val, count: stageDeals.length, color: STAGE_META[s].color, label: STAGE_META[s].label }
  })
  const maxVal = Math.max(...stageData.map(s => s.val), 1)

  const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  const week  = `Semana ${Math.ceil(new Date().getDate() / 7)} · ${today}`

  return (
    <>
      <Topbar title="Dashboard" subtitle={week}/>

      <div style={{flex:1,overflow:'auto',padding:24}} className="ai">
        {loading ? (
          <div style={{textAlign:'center',paddingTop:80,color:'var(--t3)',fontFamily:'var(--mono)',fontSize:11}}>
            ⟳ Cargando dashboard...
          </div>
        ) : metrics && (
          <>
            {/* Metric cards */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:1,marginBottom:1}}>
              <MetricCard label="Pipeline Total"  value={fmt(metrics.pipeline)}  color="var(--green)" change={`${metrics.deals} deals activos`}/>
              <MetricCard label="MQL"             value={String(metrics.mqls)}   color="var(--amber)" change="score ≥ 50"/>
              <MetricCard label="SQL"             value={String(metrics.sqls)}   color="var(--blue)"  change="score ≥ 75"/>
              <MetricCard label="Pronóstico"      value={fmt(metrics.forecast)}  color="var(--purple)"change="pipeline ponderado"/>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:1,marginBottom:1}}>
              <MetricCard label="Cerrado Ganado"  value={fmt(metrics.wonValue)}  color="var(--green)" />
              <MetricCard label="Contactos"       value={String(metrics.contacts)}color="var(--blue)" />
              <MetricCard label="Empresas"        value={String(metrics.companies)}color="var(--amber)"/>
              <MetricCard label="Deals Totales"   value={String(metrics.deals)}  color="var(--purple)"/>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,marginBottom:1}}>
              {/* Stage bars */}
              <div className="crm-card">
                <div className="crm-card-header">
                  <span className="crm-card-title">Pipeline por Etapa</span>
                  <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)'}}>EN VIVO</span>
                </div>
                <div style={{borderBottom:'1px solid var(--border)'}}>
                  {stageData.map(s => (
                    <StageBar key={s.stage} label={s.label} value={s.val}
                      pct={s.val / maxVal * 100} color={s.color} count={s.count}/>
                  ))}
                </div>
              </div>

              {/* Live activity */}
              <div className="crm-card">
                <div className="crm-card-header">
                  <span className="crm-card-title">Actividad Reciente</span>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <div className="dot dot-g glow"/>
                    <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--green)'}}>EN DIRECTO</span>
                  </div>
                </div>
                <div className="crm-card-body" style={{padding:'6px 16px'}}>
                  {activities.length === 0 ? (
                    <div style={{padding:24,textAlign:'center',color:'var(--t3)',fontSize:11}}>
                      Aún no hay actividades
                    </div>
                  ) : activities.map((a, i) => {
                    const meta = ACTIVITY_META[a.type]
                    return (
                      <div key={a.id} style={{
                        display:'flex',alignItems:'flex-start',gap:9,
                        padding:'7px 0',borderBottom:'1px solid var(--border)',
                        opacity: i === 0 ? 1 : i < 3 ? .88 : .55,
                      }}>
                        <div style={{
                          width:22,height:22,display:'flex',alignItems:'center',justifyContent:'center',
                          fontSize:11,flexShrink:0,background:'var(--s3)',color:'var(--t3)',
                        }}>{meta.icon}</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:11,lineHeight:1.4,color:'var(--tx)'}}>{a.title}</div>
                          <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t3)',marginTop:2}}>
                            {meta.label} · {relativeTime(a.created_at)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Recent deals */}
            <div className="crm-card" style={{marginTop:1}}>
              <div className="crm-card-header">
                <span className="crm-card-title">Deals Recientes</span>
                <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)'}}>
                  {deals.filter(d => d.stage !== 'ganado' && d.stage !== 'perdido').length} ACTIVOS
                </span>
              </div>
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Deal</th><th>Etapa</th><th>Valor</th><th>Prob.</th><th>Asignado</th><th>Cierre</th>
                  </tr>
                </thead>
                <tbody>
                  {deals.slice(0, 8).map(d => {
                    const meta = STAGE_META[d.stage]
                    return (
                      <tr key={d.id}>
                        <td style={{color:'var(--tx)',fontWeight:500}}>{d.title}</td>
                        <td>
                          <span className="chip" style={{
                            background: meta.color + '18',
                            color: meta.color,
                            border: `1px solid ${meta.color}33`,
                          }}>{meta.label}</span>
                        </td>
                        <td style={{fontFamily:'var(--mono)',fontWeight:700,color:meta.color}}>{fmt(d.value)}</td>
                        <td style={{fontFamily:'var(--mono)'}}>{d.probability}%</td>
                        <td>{d.assigned_to || '—'}</td>
                        <td style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)'}}>
                          {d.expected_close ? new Date(d.expected_close).toLocaleDateString('es-ES') : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  )
}
