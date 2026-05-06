import { useContext } from 'react'
import { ProjectContext } from '@/components/ProjectProvider'

export function useProject() {
  return useContext(ProjectContext)
}
