interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon = '◎', title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '60px 24px', textAlign: 'center', gap: 12,
    }}>
      <div style={{fontSize: 32, color: 'var(--t3)'}}>{icon}</div>
      <div style={{fontSize: 14, fontWeight: 600, color: 'var(--t2)'}}>{title}</div>
      {description && <div style={{fontSize: 12, color: 'var(--t3)', maxWidth: 300}}>{description}</div>}
      {action && <div style={{marginTop: 8}}>{action}</div>}
    </div>
  )
}
