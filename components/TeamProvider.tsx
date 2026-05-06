'use client'
import { createContext, ReactNode } from 'react'

export interface TeamCtx {
  teamId:   string
  teamName: string
  role:     string
}

export const TeamContext = createContext<TeamCtx>({
  teamId:   '',
  teamName: '',
  role:     'member',
})

export function TeamProvider({ teamId, teamName, role, children }: TeamCtx & { children: ReactNode }) {
  return (
    <TeamContext.Provider value={{ teamId, teamName, role }}>
      {children}
    </TeamContext.Provider>
  )
}
