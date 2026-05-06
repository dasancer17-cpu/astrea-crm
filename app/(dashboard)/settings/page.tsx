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

interface Profile {
  id: string
  email: string | null
  full_name: string | null
}

const ROLE_LABEL: Record<string, string> = { owner: 'Propietario', admin: 'Admin', member: 'Miembro' }

export default function SettingsPage() {
  const supabase = createClient()
  const { teamId, teamName, role } = useTeam()
  const [members,    setMembers]    = useState<Member[]>([])
  const [profileMap, setProfileMap] = useState<Record<string, string>>({})
  const [loading,    setLoading]    = useState(true)
  const [email,      setEmail]      = useState('')
  const [inviting,   setInviting]   = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [error,      setError]      = useState('')

  const [myProfile,   setMyProfile]   = useState<{ email: string; full_name: string | null } | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameValue,   setNameValue]   = useState('')
  const [savingName,  setSavingName]  = useState(false)

  const isOwnerOrAdmin = role === 'owner' || role === 'admin'

  const load = useCallback(async () => {
    if (!teamId) return
    setLoading(true)

    const { data: membersData } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at')

    const members = (membersData as Member[] | null) ?? []

    // Cargar perfiles de miembros activos para mostrar su email
    const userIds = members.filter(m => m.user_id).map(m => m.user_id!)
    const map: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds)
      ;(profiles as Profile[] | null)?.forEach(p => {
        map[p.id] = p.full_name || p.email || p.id.slice(0, 8) + '…'
      })
    }

    // Load own profile
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: prof } = await supabase.from('profiles').select('email, full_name').eq('id', user.id).single()
      if (prof) { setMyProfile(prof as any); setNameValue((prof as any).full_name ?? '') }
    }

    setMembers(members)
    setProfileMap(map)
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

        {/* My profile */}
        {myProfile && (
          <div className="crm-card" style={{ marginBottom: 1 }}>
            <div className="crm-card-header">
              <span className="crm-card-title">Mi perfil</span>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 12, fontFamily: 'var(--mono)' }}>{myProfile.email}</div>
              {editingName ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="form-input" style={{ flex: 1 }} placeholder="Tu nombre completo"
                    value={nameValue} onChange={e => setNameValue(e.target.value)}/>
                  <button className="btn btn-primary" disabled={savingName} onClick={async () => {
                    setSavingName(true)
                    const { data: { user } } = await supabase.auth.getUser()
                    await supabase.from('profiles').update({ full_name: nameValue || null }).eq('id', user!.id)
                    setSavingName(false)
                    setEditingName(false)
                    load()
                  }}>{savingName ? '⟳' : '▸ Guardar'}</button>
                  <button className="btn btn-ghost" onClick={() => setEditingName(false)}>Cancelar</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)' }}>
                    {myProfile.full_name || <span style={{ color: 'var(--t3)', fontStyle: 'italic' }}>Sin nombre</span>}
                  </span>
                  <button className="btn btn-ghost" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => setEditingName(true)}>✎ Editar</button>
                </div>
              )}
            </div>
          </div>
        )}

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
                {members.map(m => {
                  const displayName = m.user_id
                    ? (profileMap[m.user_id] ?? m.invite_email ?? m.user_id.slice(0, 8) + '…')
                    : (m.invite_email ?? '—')
                  return (
                    <tr key={m.id}>
                      <td>
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx)' }}>
                          {displayName}
                        </div>
                        {m.status === 'pending' && m.invite_email && (
                          <div style={{ fontSize: 10, color: 'var(--amber)', fontFamily: 'var(--mono)' }}>
                            ⏳ Invitación pendiente
                          </div>
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
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
