'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTeam } from '@/hooks/useTeam'
import { Topbar } from '@/components/Topbar'
import { relativeTime } from '@/lib/utils'

interface Member {
  id: string
  user_id: string | null
  role: string
  status: string
  invite_email: string | null
  joined_at: string | null
  created_at: string
}

const ROLE_LABEL: Record<string, string> = { owner: 'Propietario', admin: 'Admin', member: 'Miembro' }

export default function SettingsPage() {
  const supabase = createClient()
  const { teamId, teamName, role } = useTeam()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [error, setError] = useState('')

  const isOwnerOrAdmin = role === 'owner' || role === 'admin'

  const load = useCallback(async () => {
    if (!teamId) return
    setLoading(true)
    const { data } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at')
    setMembers((data as Member[] | null) ?? [])
    setLoading(false)
  }, [teamId])

  useEffect(() => { load() }, [load])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamId) return
    setInviting(true)
    setError('')
    setInviteLink(null)
    const token = crypto.randomUUID()
    const { error: ie } = await supabase.from('team_members').insert([{
      team_id:      teamId,
      invite_email: email.trim(),
      invite_token: token,
      status:       'pending',
      role:         'member',
    }] as any)
    if (ie) { setError(ie.message); setInviting(false); return }
    const link = `${window.location.origin}/join?token=${token}`
    setInviteLink(link)
    setEmail('')
    setInviting(false)
    load()
  }

  const handleRemove = async (memberId: string, memberRole: string) => {
    if (memberRole === 'owner') { alert('No puedes eliminar al propietario del equipo.'); return }
    if (!confirm('¿Eliminar este miembro?')) return
    await supabase.from('team_members').delete().eq('id', memberId)
    load()
  }

  const copyLink = () => {
    if (inviteLink) navigator.clipboard.writeText(inviteLink)
  }

  return (
    <>
      <Topbar title="Configuración" subtitle="Gestiona tu equipo e invitaciones"/>

      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {/* Team info */}
        <div className="crm-card" style={{ marginBottom: 1 }}>
          <div className="crm-card-header">
            <span className="crm-card-title">Equipo</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>
              {ROLE_LABEL[role] ?? role}
            </span>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--tx)', marginBottom: 4 }}>{teamName}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>ID: {teamId}</div>
          </div>
        </div>

        {/* Invite form */}
        {isOwnerOrAdmin && (
          <div className="crm-card" style={{ marginBottom: 1 }}>
            <div className="crm-card-header">
              <span className="crm-card-title">Invitar compañero</span>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <form onSubmit={handleInvite} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input
                  className="form-input"
                  type="email"
                  required
                  placeholder="compañero@empresa.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ flex: 1, minWidth: 240 }}
                />
                <button type="submit" className="btn btn-primary" disabled={inviting} style={{ whiteSpace: 'nowrap' }}>
                  {inviting ? '⟳ Generando...' : '+ Generar invitación'}
                </button>
              </form>

              {error && (
                <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', color: '#EF4444', fontSize: 12 }}>
                  {error}
                </div>
              )}

              {inviteLink && (
                <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--s2)', border: '1px solid var(--green)', borderLeft: '3px solid var(--green)' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--green)', marginBottom: 8 }}>
                    Enlace de invitación generado
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <code style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)', flex: 1, wordBreak: 'break-all' }}>
                      {inviteLink}
                    </code>
                    <button onClick={copyLink} className="btn btn-ghost" style={{ fontSize: 10, padding: '4px 10px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      ⧉ Copiar
                    </button>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 8 }}>
                    Comparte este enlace. Quien lo abra podrá unirse a tu equipo.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Members list */}
        <div className="crm-card">
          <div className="crm-card-header">
            <span className="crm-card-title">Miembros del equipo</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>
              {members.filter(m => m.status === 'active').length} ACTIVOS · {members.filter(m => m.status === 'pending').length} PENDIENTES
            </span>
          </div>

          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 11 }}>⟳ Cargando...</div>
          ) : (
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Miembro</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Unido</th>
                  {isOwnerOrAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx)' }}>
                        {m.user_id ? m.user_id.slice(0, 8) + '…' : '—'}
                      </div>
                      {m.invite_email && (
                        <div style={{ fontSize: 10, color: 'var(--t3)' }}>{m.invite_email}</div>
                      )}
                    </td>
                    <td>
                      <span className={`chip ${m.role === 'owner' ? 'chip-g' : m.role === 'admin' ? 'chip-b' : ''}`}>
                        {ROLE_LABEL[m.role] ?? m.role}
                      </span>
                    </td>
                    <td>
                      <span className={`chip ${m.status === 'active' ? 'chip-g' : 'chip-a'}`}>
                        {m.status === 'active' ? 'Activo' : 'Pendiente'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>
                      {m.joined_at ? relativeTime(m.joined_at) : '—'}
                    </td>
                    {isOwnerOrAdmin && (
                      <td>
                        {m.role !== 'owner' && (
                          <button className="btn btn-danger" style={{ padding: '3px 8px', fontSize: 10 }}
                            onClick={() => handleRemove(m.id, m.role)}>✕</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
