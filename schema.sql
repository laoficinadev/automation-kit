-- =============================================
-- Automation Kit - Supabase Database Schema
-- Run this in Supabase SQL Editor to set up
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================
-- CLIENTS TABLE
-- ====================
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  active_modules TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ====================
-- QUOTES TABLE
-- ====================
CREATE TABLE quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT DEFAULT '',
  service_type TEXT NOT NULL,
  description TEXT NOT NULL,
  estimated_budget DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  pdf_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ====================
-- BOOKINGS TABLE
-- ====================
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT DEFAULT '',
  service TEXT NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ====================
-- LEADS TABLE
-- ====================
CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  message TEXT DEFAULT '',
  source TEXT DEFAULT 'web',
  status TEXT DEFAULT 'new',
  email_sequence_step INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ====================
-- STORAGE BUCKET
-- ====================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdfs',
  'pdfs',
  true,
  52428800,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to pdfs bucket
CREATE POLICY "Public read PDFs"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'pdfs');

-- Allow anon uploads to pdfs bucket (for quote PDFs from Worker)
CREATE POLICY "Anon upload PDFs"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'pdfs');

-- ====================
-- EXAMPLE CLIENT
-- (uncomment and customize for your first client)
-- ====================
-- INSERT INTO clients (name, slug, active_modules, config) VALUES (
--   'Your First Client',
--   'first-client',
--   ARRAY['cotizaciones'],
--   '{
--     "brand": {
--       "company_name": "Your First Client",
--       "logo_url": "",
--       "primary_color": "#2563eb",
--       "secondary_color": "#1e40af"
--     },
--     "cotizaciones": {
--       "enabled": true,
--       "notification_email": "admin@client.com",
--       "services": ["Web Design", "Web Development", "Mobile App", "Consulting"],
--       "currency": "USD"
--     }
--   }'::jsonb
-- );
