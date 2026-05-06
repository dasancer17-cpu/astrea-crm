import { useContext } from 'react'
import { TeamContext } from '@/components/TeamProvider'

export function useTeam() {
  return useContext(TeamContext)
}
