import { getDb, type Client } from './db'

export async function getClientBySlug(env: { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }, slug: string): Promise<Client | null> {
  const db = getDb(env)
  const { data, error } = await db
    .from('clients')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !data) return null
  return data as Client
}
