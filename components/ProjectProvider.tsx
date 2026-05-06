'use client'
import { createContext, ReactNode, useState, useEffect, useCallback } from 'react'
import type { Project } from '@/lib/supabase/types'

interface ProjectCtx {
  projects:         Project[]
  activeProject:    Project | null
  setProjects:      (ps: Project[]) => void
  setActiveProject: (p: Project | null) => void
}

export const ProjectContext = createContext<ProjectCtx>({
  projects:         [],
  activeProject:    null,
  setProjects:      () => {},
  setActiveProject: () => {},
})

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects,      setProjectsState]  = useState<Project[]>([])
  const [activeProject, setActiveState]    = useState<Project | null>(null)
  const [ready,         setReady]          = useState(false)

  // Restore last active project from localStorage on first load
  useEffect(() => { setReady(true) }, [])

  useEffect(() => {
    if (!ready || projects.length === 0) return
    const savedId = localStorage.getItem('activeProjectId')
    if (savedId) {
      const found = projects.find(p => p.id === savedId)
      setActiveState(found ?? null)
    }
  }, [ready, projects])

  const setProjects = useCallback((ps: Project[]) => {
    setProjectsState(ps)
  }, [])

  const setActiveProject = useCallback((p: Project | null) => {
    setActiveState(p)
    if (p) localStorage.setItem('activeProjectId', p.id)
    else   localStorage.removeItem('activeProjectId')
  }, [])

  return (
    <ProjectContext.Provider value={{ projects, activeProject, setProjects, setActiveProject }}>
      {children}
    </ProjectContext.Provider>
  )
}
