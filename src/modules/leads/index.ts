import { Hono } from 'hono'
import { getDb, type Env } from '../../lib/db'
import { getClientBySlug } from '../../lib/client'
import { sendEmail, buildNotificationHtml, buildWelcomeHtml } from '../../lib/email'
import { corsResponse } from '../../lib/cors'

const app = new Hono<{ Bindings: Env }>()

app.post('/', async (c) => {
  const env = c.env
  const body = await c.req.json<{
    client_slug: string
    name: string
    email: string
    phone: string
    message: string
  }>()

  const client = await getClientBySlug(env, body.client_slug)
  if (!client) return corsResponse({ error: 'Client not found' }, 404)
  if (!client.config.leads?.enabled) return corsResponse({ error: 'Leads not enabled for this client' }, 400)

  const db = getDb(env)

  const { data: rawLead, error } = await db
    .from('leads')
    .insert({
      client_id: client.id,
      name: body.name,
      email: body.email,
      phone: body.phone,
      message: body.message,
      source: 'web',
      status: 'new',
      email_sequence_step: 0,
    } as any)
    .select()
    .single() as any

  if (error || !rawLead) return corsResponse({ error: 'Failed to save lead' }, 500)
  const lead: any = rawLead

  const cfg = client.config.leads

  const notificationHtml = buildNotificationHtml('New Lead Captured', [
    { label: 'Client', value: client.name },
    { label: 'Name', value: body.name },
    { label: 'Email', value: body.email },
    { label: 'Phone', value: body.phone || '-' },
    { label: 'Message', value: body.message || '-' },
  ])

  c.executionCtx.waitUntil(
    (async () => {
      try {
        if (cfg?.notification_email) {
          await sendEmail(
            env,
            cfg.notification_email,
            `New Lead: ${body.name}`,
            notificationHtml,
            client.name,
            body.email
          )
        }
      } catch (err) {
        console.error('Notification email failed:', err)
      }
      try {
        await sendEmail(
          env,
          body.email,
          cfg?.welcome_email_subject || 'Thanks for reaching out!',
          buildWelcomeHtml(cfg?.welcome_email_body || "We've received your message and will get back to you within 24 hours."),
          client.name
        )
      } catch (err) {
        console.error('Welcome email failed:', err)
      }
    })()
  )

  return corsResponse({ id: lead.id, status: 'received' }, 201)
})

export function renderLeadForm(client: { name: string; slug: string; config: { brand?: any; leads?: any } }): string {
  const brand = client.config.brand || {}
  const cfg = client.config.leads || {}
  const primary = brand.primary_color || '#2563eb'
  const secondary = brand.secondary_color || '#1e40af'
  const company = brand.company_name || client.name

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Contact Us - ${company}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; line-height: 1.5; }
  .container { max-width: 560px; margin: 0 auto; padding: 24px 16px; }
  .header { text-align: center; margin-bottom: 28px; }
  .header h1 { font-size: 22px; color: ${primary}; margin-bottom: 4px; }
  .header p { font-size: 14px; color: #64748b; }
  .card { background: #fff; border-radius: 12px; padding: 28px; box-shadow: 0 1px 3px rgba(0,0,0,.08); border: 1px solid #e2e8f0; }
  .form-group { margin-bottom: 18px; }
  label { display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 4px; }
  input, textarea { width: 100%; padding: 10px 12px; font-size: 14px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; transition: border-color .15s; font-family: inherit; }
  input:focus, textarea:focus { outline: none; border-color: ${primary}; box-shadow: 0 0 0 3px ${primary}22; }
  textarea { resize: vertical; min-height: 100px; }
  .btn { width: 100%; padding: 12px; font-size: 15px; font-weight: 600; color: #fff; background: ${primary}; border: none; border-radius: 8px; cursor: pointer; transition: background .15s; }
  .btn:hover { background: ${secondary}; }
  .btn:disabled { opacity: .6; cursor: not-allowed; }
  .success { text-align: center; padding: 32px 16px; display: none; }
  .success h2 { color: #16a34a; font-size: 20px; margin-bottom: 8px; }
  .success p { color: #64748b; font-size: 14px; }
  .error { color: #dc2626; font-size: 13px; margin-top: 4px; display: none; }
  .spinner { display: inline-block; width: 18px; height: 18px; border: 2px solid #ffffff44; border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; vertical-align: middle; margin-right: 6px; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>Get in Touch</h1>
    <p>We'd love to hear from you. Send us a message and we'll reply promptly.</p>
  </div>
  <div class="card" id="form-card">
    <form id="lead-form">
      <input type="hidden" name="client_slug" value="${client.slug}">
      <div class="form-group">
        <label for="name">Full Name *</label>
        <input type="text" id="name" name="name" required>
      </div>
      <div class="form-group">
        <label for="email">Email *</label>
        <input type="email" id="email" name="email" required>
      </div>
      <div class="form-group">
        <label for="phone">Phone</label>
        <input type="tel" id="phone" name="phone">
      </div>
      <div class="form-group">
        <label for="message">Message *</label>
        <textarea id="message" name="message" required placeholder="Tell us about your project or question..."></textarea>
      </div>
      <div class="error" id="form-error"></div>
      <button type="submit" class="btn" id="submit-btn">
        <span id="btn-text">Send Message</span>
      </button>
    </form>
    <div class="success" id="success-message">
      <h2>✓ Message Sent!</h2>
      <p>Thanks for reaching out! We'll get back to you within 24 hours. Check your inbox for a confirmation.</p>
    </div>
  </div>
</div>
<script>
document.getElementById('lead-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const btn = document.getElementById('submit-btn')
  const btnText = document.getElementById('btn-text')
  const errorEl = document.getElementById('form-error')
  errorEl.style.display = 'none'
  btn.disabled = true
  btnText.innerHTML = '<span class="spinner"></span> Sending...'
  const form = e.target
  const data = Object.fromEntries(new FormData(form))
  try {
    const res = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (!res.ok) throw new Error('Failed to submit')
    document.getElementById('form-card').querySelector('form').style.display = 'none'
    document.getElementById('success-message').style.display = 'block'
  } catch (err) {
    errorEl.textContent = 'Something went wrong. Please try again.'
    errorEl.style.display = 'block'
    btn.disabled = false
    btnText.textContent = 'Send Message'
  }
})
</script>
</body>
</html>`
}

export default app
