'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Deal, Activity, Contact } from '@/lib/supabase/types'
import { Topbar } from '@/components/Topbar'
import { fmt, STAGE_META, ACTIVITY_META } from '@/lib/utils'

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function Bar({ label, value, max, color, count }: { label: string; value: number; max: number; color: string; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 80, fontSize: 10, fontWeight: 500, color, flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: 6, background: 'var(--s3)' }}>
        <div style={{ width: max > 0 ? `${value / max * 100}%` : '0%', height: '100%', background: color, opacity: .85, transition: 'width .5s ease' }}/>
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, width: 64, textAlign: 'right', color, flexShrink: 0 }}>{fmt(value)}</div>
      {count !== undefined && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', width: 20, textAlign: 'right' }}>{count}</div>}
    </div>
  )
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 16, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color }}/>
      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 7 }}>{label}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function ReportsPage() {
  const supabase = createClient()
  const [deals,      setDeals]      = useState<Deal[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [contacts,   setContacts]   = useState<Contact[]>([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('deals').select('*'),
      supabase.from('activities').select('*'),
      supabase.from('contacts').select('id, first_name, last_name, lead_score, company_id'),
    ]).then(([{ data: ds }, { data: acts }, { data: cts }]) => {
      setDeals((ds as Deal[] | null) ?? [])
      setActivities((acts as Activity[] | null) ?? [])
      setContacts((cts as Contact[] | null) ?? [])
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 11 }}>
      ⟳ Cargando reportes...
    </div>
  )

  // ── KPIs ──────────────────────────────────────────────────────────
  const now       = new Date()
  const thisMonth = deals.filter(d => d.stage === 'ganado' && new Date(d.updated_at).getMonth() === now.getMonth() && new Date(d.updated_at).getFullYear() === now.getFullYear())
  const lastMonth = deals.filter(d => {
    const dt = new Date(d.updated_at)
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return d.stage === 'ganado' && dt.getMonth() === lm.getMonth() && dt.getFullYear() === lm.getFullYear()
  })
  const wonThisMonth = thisMonth.reduce((s, d) => s + d.value, 0)
  const wonLastMonth = lastMonth.reduce((s, d) => s + d.value, 0)
  const activeDeals  = deals.filter(d => d.stage !== 'ganado' && d.stage !== 'perdido')
  const pipeline     = activeDeals.reduce((s, d) => s + d.value, 0)
  const avgDeal      = activeDeals.length > 0 ? pipeline / activeDeals.length : 0
  const closedTotal  = deals.filter(d => d.stage === 'ganado' || d.stage === 'perdido').length
  const convRate     = closedTotal > 0 ? Math.round(deals.filter(d => d.stage === 'ganado').length / closedTotal * 100) : 0
  const momChange    = wonLastMonth > 0 ? ((wonThisMonth - wonLastMonth) / wonLastMonth * 100).toFixed(0) : '—'

  // ── Stage funnel ──────────────────────────────────────────────────
  const stageData = (['nuevo','calificado','propuesta','negociacion','ganado','perdido'] as const).map(s => ({
    stage: s,
    label: STAGE_META[s].label,
    color: STAGE_META[s].color,
    value: deals.filter(d => d.stage === s).reduce((sum, d) => sum + d.value, 0),
    count: deals.filter(d => d.stage === s).length,
  }))
  const maxStageVal = Math.max(...stageData.map(s => s.value), 1)

  // ── Monthly revenue (last 6 months) ───────────────────────────────
  const monthlyData = Array.from({ length: 6 }).map((_, i) => {
    const d   = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const won = deals.filter(deal => {
      const dt = new Date(deal.updated_at)
      return deal.stage === 'ganado' && dt.getMonth() === d.getMonth() && dt.getFullYear() === d.getFullYear()
    })
    return { label: MONTHS[d.getMonth()], value: won.reduce((s, deal) => s + deal.value, 0), count: won.length }
  })
  const maxMonthly = Math.max(...monthlyData.map(m => m.value), 1)

  // ── Activities breakdown ──────────────────────────────────────────
  const actTypeData = Object.entries(ACTIVITY_META).map(([type, meta]) => ({
    type, label: meta.label, icon: meta.icon,
    count: activities.filter(a => a.type === type).length,
  })).sort((a, b) => b.count - a.count)
  const maxActCount = Math.max(...actTypeData.map(a => a.count), 1)
  const actColors: Record<string, string> = {
    note: 'var(--purple)', call: 'var(--green)', email: 'var(--blue)', meeting: 'var(--amber)', task: 'var(--t2)',
  }

  // ── Top contacts ──────────────────────────────────────────────────
  const topContacts = [...contacts].sort((a, b) => b.lead_score - a.lead_score).slice(0, 8)

  return (
    <>
      <Topbar
        title="Reportes"
        subtitle={`${deals.length} deals · ${activities.length} actividades · ${contacts.length} contactos`}
      />

      <div style={{ flex: 1, overflow: 'auto', padding: 24 }} className="ai">

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, marginBottom: 1 }}>
          <MetricCard label="Cerrado este mes"  value={fmt(wonThisMonth)} sub={`vs ${fmt(wonLastMonth)} mes anterior · ${momChange !== '—' ? (Number(momChange) >= 0 ? '+' : '') + momChange + '%' : '—'}`} color="var(--green)"/>
          <MetricCard label="Pipeline activo"   value={fmt(pipeline)}     sub={`${activeDeals.length} deals activos`} color="var(--blue)"/>
          <MetricCard label="Valor medio deal"  value={fmt(Math.round(avgDeal))} sub="pipeline activo" color="var(--amber)"/>
          <MetricCard label="Tasa de conversión" value={`${convRate}%`}   sub={`${deals.filter(d => d.stage === 'ganado').length} ganados de ${closedTotal} cerrados`} color="var(--purple)"/>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, marginBottom: 1 }}>

          {/* Funnel por etapa */}
          <div className="crm-card">
            <div className="crm-card-header">
              <span className="crm-card-title">Funnel por etapa</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>{deals.length} DEALS</span>
            </div>
            <div style={{ padding: '8px 16px 4px' }}>
              {stageData.map(s => <Bar key={s.stage} label={s.label} value={s.value} max={maxStageVal} color={s.color} count={s.count}/>)}
            </div>
          </div>

          {/* Monthly revenue */}
          <div className="crm-card">
            <div className="crm-card-header">
              <span className="crm-card-title">Ingresos mensuales</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>ÚLTIMOS 6 MESES</span>
            </div>
            <div style={{ padding: '12px 16px' }}>
              {/* Bar chart */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, marginBottom: 8 }}>
                {monthlyData.map(m => (
                  <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--green)', textAlign: 'center' }}>
                      {m.value > 0 ? fmt(m.value) : ''}
                    </div>
                    <div style={{ width: '100%', background: 'var(--s3)', position: 'relative', flex: 1, display: 'flex', alignItems: 'flex-end' }}>
                      <div style={{
                        width: '100%',
                        height: maxMonthly > 0 ? `${m.value / maxMonthly * 100}%` : '0%',
                        background: m.value > 0 ? 'var(--green)' : 'var(--s3)',
                        opacity: m.value > 0 ? .85 : .3,
                        transition: 'height .5s ease',
                        minHeight: 2,
                      }}/>
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)' }}>{m.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)' }}>Total 6 meses</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--green)' }}>
                  {fmt(monthlyData.reduce((s, m) => s + m.value, 0))}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>

          {/* Activities breakdown */}
          <div className="crm-card">
            <div className="crm-card-header">
              <span className="crm-card-title">Actividades por tipo</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>{activities.length} TOTAL</span>
            </div>
            <div style={{ padding: '8px 16px 4px' }}>
              {actTypeData.map(a => (
                <div key={a.type} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 80, fontSize: 10, fontWeight: 500, color: actColors[a.type], flexShrink: 0 }}>
                    {a.icon} {a.label}
                  </div>
                  <div style={{ flex: 1, height: 6, background: 'var(--s3)' }}>
                    <div style={{ width: `${a.count / maxActCount * 100}%`, height: '100%', background: actColors[a.type], opacity: .85 }}/>
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: actColors[a.type], width: 24, textAlign: 'right' }}>{a.count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top contacts by score */}
          <div className="crm-card">
            <div className="crm-card-header">
              <span className="crm-card-title">Top contactos por lead score</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>TOP 8</span>
            </div>
            <table className="crm-table">
              <thead><tr><th>#</th><th>Contacto</th><th>Score</th><th>Tipo</th></tr></thead>
              <tbody>
                {topContacts.map((c, i) => {
                  const sc = c.lead_score >= 75 ? 'var(--green)' : c.lead_score >= 50 ? 'var(--amber)' : 'var(--blue)'
                  const lb = c.lead_score >= 75 ? 'SQL' : c.lead_score >= 50 ? 'MQL' : 'Lead'
                  return (
                    <tr key={c.id}>
                      <td style={{ fontFamily: 'var(--mono)', color: 'var(--t3)', width: 24 }}>{i + 1}</td>
                      <td style={{ color: 'var(--tx)', fontWeight: 500 }}>{c.first_name} {c.last_name}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 40, height: 3, background: 'var(--s3)' }}>
                            <div style={{ width: `${c.lead_score}%`, height: '100%', background: sc }}/>
                          </div>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color: sc }}>{c.lead_score}</span>
                        </div>
                      </td>
                      <td><span className="chip" style={{ background: sc + '18', color: sc, border: `1px solid ${sc}33` }}>{lb}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
