export function fmt(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `€${(n / 1_000).toFixed(0)}K`
  return `€${n}`
}

export function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export function relativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'ahora mismo'
  if (m < 60) return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  return `hace ${d}d`
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export const STAGE_META = {
  nuevo:       { label: 'Nuevo Lead',     color: '#60A5FA', prob: 10  },
  calificado:  { label: 'Calificado',     color: '#A78BFA', prob: 30  },
  propuesta:   { label: 'Propuesta',      color: '#F59E0B', prob: 60  },
  negociacion: { label: 'Negociación',    color: '#FB923C', prob: 80  },
  ganado:      { label: 'Cerrado Ganado', color: '#00E87A', prob: 100 },
  perdido:     { label: 'Cerrado Perdido',color: '#EF4444', prob: 0   },
} as const

export const SOURCE_LABELS: Record<string, string> = {
  demo:       'Demo solicitada',
  precios:    'Página de precios',
  whitepaper: 'Whitepaper',
  linkedin:   'LinkedIn',
  web:        'Sitio web',
  referido:   'Referido',
}

export const ACTIVITY_META = {
  note:    { icon: '◆', label: 'Nota'     },
  call:    { icon: '📞', label: 'Llamada'  },
  email:   { icon: '✉',  label: 'Email'    },
  meeting: { icon: '📅', label: 'Reunión'  },
  task:    { icon: '✓',  label: 'Tarea'    },
} as const
