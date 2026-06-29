import { createClient } from '@supabase/supabase-js'

export interface Env {
  APP_NAME: string
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  RESEND_API_KEY: string
  FROM_EMAIL?: string
}

let supabase: ReturnType<typeof createClient> | null = null

export function getDb(env: { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }) {
  if (!supabase) {
    supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      global: { fetch: (...args) => fetch(...args) },
    })
  }
  return supabase
}

export interface ClientConfig {
  brand: {
    company_name: string
    logo_url: string
    primary_color: string
    secondary_color: string
  }
  cotizaciones?: {
    enabled: boolean
    notification_email: string
    services: string[]
    currency: string
  }
  booking?: {
    enabled: boolean
    notification_email: string
    services: string[]
    duration_minutes: number
    available_days: string[]
    available_hours: { start: string; end: string }
    timezone: string
  }
  leads?: {
    enabled: boolean
    notification_email: string
    welcome_email_subject: string
    welcome_email_body: string
    follow_up_days: number
  }
}

export interface Client {
  id: string
  name: string
  slug: string
  config: ClientConfig
  active_modules: string[]
  created_at: string
}

export interface Quote {
  id: string
  client_id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  service_type: string
  description: string
  estimated_budget: number
  status: string
  pdf_url: string
  created_at: string
}

export interface Booking {
  id: string
  client_id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  service: string
  booking_date: string
  booking_time: string
  notes: string
  status: string
  created_at: string
}

export interface Lead {
  id: string
  client_id: string
  name: string
  email: string
  phone: string
  message: string
  source: string
  status: string
  email_sequence_step: number
  created_at: string
}
