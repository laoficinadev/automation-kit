# Automation Kit

Embeddable automation modules for your clients:
- **Cotizaciones** - Quote request → PDF → Email notification
- **Booking** - Online scheduling with real-time availability
- **Leads** - Contact form → Auto-reply → Email notification

Built with Cloudflare Workers + Supabase (free tier).

## Deployment

### 1. Prerequisites

- [Cloudflare account](https://dash.cloudflare.com) (free)
- [Supabase account](https://supabase.com) (free, no credit card)
- [Resend account](https://resend.com) (free, 100 emails/day)

### 2. Supabase Setup

1. Go to [supabase.com](https://supabase.com) → New project
2. Pick region closest to your clients (e.g. `us-east-1`)
3. Once created, go to **SQL Editor** and paste the contents of `schema.sql`
4. Go to **Project Settings** → **API** and copy your `URL` and `anon public key`
5. Go to **Storage** → verify the `pdfs` bucket was created

### 3. Resend Setup

1. Go to [resend.com](https://resend.com) → Add domain
2. Verify your domain (add DNS records)
3. Create an API key → copy it

### 4. Deploy Worker

```bash
# Clone/download this project and cd into it
cd automation-kit

# Install dependencies
npm install

# Login to Cloudflare
npx wrangler login

# Optional: update the sender email in wrangler.jsonc
# Change "noreply@yourdomain.com" to your verified Resend domain

# Set secrets (you'll be prompted for values)
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler secret put RESEND_API_KEY

# Deploy
npm run deploy
```

After deployment you'll see a URL like: `https://automation-kit.your-subdomain.workers.dev`

### 5. Add Your First Client

Go to Supabase **SQL Editor** and run:

```sql
INSERT INTO clients (name, slug, active_modules, config) VALUES (
  'Acme Corp',
  'acme-corp',
  ARRAY['cotizaciones', 'booking', 'leads'],
  '{
    "brand": {
      "company_name": "Acme Corp",
      "logo_url": "",
      "primary_color": "#2563eb",
      "secondary_color": "#1e40af"
    },
    "cotizaciones": {
      "enabled": true,
      "notification_email": "owner@acme.com",
      "services": ["Web Development", "Design", "Consulting"],
      "currency": "USD"
    },
    "booking": {
      "enabled": true,
      "notification_email": "owner@acme.com",
      "services": ["Consultation", "Design Review"],
      "duration_minutes": 60,
      "available_days": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
      "available_hours": {"start": "09:00", "end": "17:00"},
      "timezone": "America/New_York"
    },
    "leads": {
      "enabled": true,
      "notification_email": "owner@acme.com",
      "welcome_email_subject": "Thanks for reaching out!",
      "welcome_email_body": "We received your message and will get back to you within 24 hours.",
      "follow_up_days": 3
    }
  }'::jsonb
);
```

### 6. Give the Client Their Embed Code

Each module has a form the client can embed on their website:

```html
<!-- Cotizaciones -->
<iframe src="https://automation-kit.your-subdomain.workers.dev/embed/acme-corp/cotizaciones"
  width="100%" height="750" frameborder="0"></iframe>

<!-- Booking -->
<iframe src="https://automation-kit.your-subdomain.workers.dev/embed/acme-corp/booking"
  width="100%" height="750" frameborder="0"></iframe>

<!-- Leads -->
<iframe src="https://automation-kit.your-subdomain.workers.dev/embed/acme-corp/leads"
  width="100%" height="600" frameborder="0"></iframe>
```

## Adding a New Client

For each new client:
1. Insert a row in the `clients` table (SQL or Table Editor)
2. Configure their modules in the `config` JSONB column
3. Give them the embed code with their unique slug

That's it. No code changes, no redeploy needed.

## Local Development

```bash
# Create .dev.vars file with your secrets
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
RESEND_API_KEY=re_xxxxxxxxxxxx

# Run locally
npm run dev
```
