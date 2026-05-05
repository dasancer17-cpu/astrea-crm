'use client'
import { useState, useEffect } from 'react'

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  const [time, setTime] = useState('')

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('es-ES', { hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header style={{
      height: 52, background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, flexShrink: 0,
    }}>
      <div style={{flex: 1}}>
        <div style={{fontSize: 16, fontWeight: 700, letterSpacing: '-.02em'}}>{title}</div>
        {subtitle && <div style={{fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', marginTop: 1}}>{subtitle}</div>}
      </div>

      <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
        {actions}
        <div style={{display: 'flex', alignItems: 'center', gap: 5}}>
          <div className="dot dot-g glow"/>
          <span style={{fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--green)'}}>EN VIVO</span>
        </div>
        <span style={{fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)'}}>{time}</span>
      </div>
    </header>
  )
}
