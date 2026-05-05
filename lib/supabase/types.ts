export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type DealStage = 'nuevo' | 'calificado' | 'propuesta' | 'negociacion' | 'ganado' | 'perdido'
export type ActivityType = 'note' | 'call' | 'email' | 'meeting' | 'task'

export interface CompanyRow {
  id: string; name: string; domain: string | null; industry: string | null
  size: string | null; website: string | null; phone: string | null
  address: string | null; notes: string | null; user_id: string
  created_at: string; updated_at: string
}
export interface CompanyInsert {
  name: string; domain?: string | null; industry?: string | null
  size?: string | null; website?: string | null; phone?: string | null
  address?: string | null; notes?: string | null; user_id: string
}
export interface CompanyUpdate {
  name?: string; domain?: string | null; industry?: string | null
  size?: string | null; website?: string | null; phone?: string | null
  address?: string | null; notes?: string | null
}

export interface ContactRow {
  id: string; first_name: string; last_name: string; email: string | null
  phone: string | null; title: string | null; company_id: string | null
  lead_score: number; source: string | null; notes: string | null
  user_id: string; created_at: string; updated_at: string
}
export interface ContactInsert {
  first_name: string; last_name: string; email?: string | null
  phone?: string | null; title?: string | null; company_id?: string | null
  lead_score?: number; source?: string | null; notes?: string | null; user_id: string
}
export interface ContactUpdate {
  first_name?: string; last_name?: string; email?: string | null
  phone?: string | null; title?: string | null; company_id?: string | null
  lead_score?: number; source?: string | null; notes?: string | null
}

export interface DealRow {
  id: string; title: string; value: number; stage: DealStage
  probability: number; expected_close: string | null; contact_id: string | null
  company_id: string | null; assigned_to: string | null; notes: string | null
  user_id: string; created_at: string; updated_at: string
}
export interface DealInsert {
  title: string; value?: number; stage?: DealStage; probability?: number
  expected_close?: string | null; contact_id?: string | null
  company_id?: string | null; assigned_to?: string | null
  notes?: string | null; user_id: string
}
export interface DealUpdate {
  title?: string; value?: number; stage?: DealStage; probability?: number
  expected_close?: string | null; contact_id?: string | null
  company_id?: string | null; assigned_to?: string | null; notes?: string | null
}

export interface ActivityRow {
  id: string; type: ActivityType; title: string; description: string | null
  contact_id: string | null; deal_id: string | null; company_id: string | null
  user_id: string; created_at: string
}
export interface ActivityInsert {
  type: ActivityType; title: string; description?: string | null
  contact_id?: string | null; deal_id?: string | null
  company_id?: string | null; user_id: string
}

export interface Database {
  public: {
    Tables: {
      companies: {
        Row:           CompanyRow
        Insert:        CompanyInsert
        Update:        CompanyUpdate
        Relationships: never[]
      }
      contacts: {
        Row:           ContactRow
        Insert:        ContactInsert
        Update:        ContactUpdate
        Relationships: never[]
      }
      deals: {
        Row:           DealRow
        Insert:        DealInsert
        Update:        DealUpdate
        Relationships: never[]
      }
      activities: {
        Row:           ActivityRow
        Insert:        ActivityInsert
        Update:        Partial<ActivityInsert>
        Relationships: never[]
      }
    }
    Views:     {}
    Functions: {}
    Enums:     {}
  }
}

// Convenience aliases
export type Company  = CompanyRow
export type Contact  = ContactRow
export type Deal     = DealRow
export type Activity = ActivityRow
