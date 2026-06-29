import { Hono } from 'hono'
import { getDb, type Env } from '../../lib/db'
import { getClientBySlug } from '../../lib/client'
import { sendEmail, buildNotificationHtml } from '../../lib/email'
import { generateQuotePdf } from '../../lib/pdf'
import { corsResponse } from '../../lib/cors'

const app = new Hono<{ Bindings: Env }>()

app.post('/', async (c) => {
  const env = c.env
  const body = await c.req.json<{
    client_slug: string
    customer_name: string
    customer_email: string
    customer_phone: string
    service_type: string
    description: string
    estimated_budget: number
  }>()

  const client = await getClientBySlug(env, body.client_slug)
  if (!client) return corsResponse({ error: 'Client not found' }, 404)
  if (!client.config.cotizaciones?.enabled) return corsResponse({ error: 'Quotes not enabled for this client' }, 400)

  const db = getDb(env)

  const { data: rawQuote, error } = await db
    .from('quotes')
    .insert({
      client_id: client.id,
      customer_name: body.customer_name,
      customer_email: body.customer_email,
      customer_phone: body.customer_phone,
      service_type: body.service_type,
      description: body.description,
      estimated_budget: body.estimated_budget,
      status: 'pending',
    } as any)
    .select()
    .single() as any

  if (error || !rawQuote) return corsResponse({ error: 'Failed to create quote' }, 500)
  const quote: any = rawQuote

  try {
    const pdfBytes = await generateQuotePdf(client.name, {
      quoteId: quote.id,
      customerName: body.customer_name,
      customerEmail: body.customer_email,
      customerPhone: body.customer_phone,
      serviceType: body.service_type,
      description: body.description,
      estimatedBudget: body.estimated_budget,
      currency: client.config.cotizaciones?.currency || 'USD',
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    })

    const pdfName = `quote-${quote.id.slice(0, 8)}.pdf`
    const { error: uploadError } = await db.storage
      .from('pdfs')
      .upload(`quotes/${client.slug}/${pdfName}`, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      } as any)

    let pdfUrl = ''
    if (!uploadError) {
      const { data: urlData } = db.storage.from('pdfs').getPublicUrl(`quotes/${client.slug}/${pdfName}`)
      pdfUrl = urlData.publicUrl
      await db.from('quotes' as never).update({ pdf_url: pdfUrl, status: 'completed' } as never).eq('id' as never, quote.id)
    }

    const html = buildNotificationHtml('New Quote Request', [
      { label: 'Client', value: client.name },
      { label: 'Customer', value: body.customer_name },
      { label: 'Email', value: body.customer_email },
      { label: 'Phone', value: body.customer_phone || '-' },
      { label: 'Service', value: body.service_type },
      { label: 'Budget', value: `${client.config.cotizaciones?.currency || 'USD'} ${body.estimated_budget.toFixed(2)}` },
      { label: 'View Quote', value: pdfUrl ? `<a href="${pdfUrl}" style="color:#2563eb">Download PDF</a>` : 'Pending' },
    ])

    const notifyEmail = client.config.cotizaciones?.notification_email
    if (notifyEmail) {
      c.executionCtx.waitUntil(
        sendEmail(
          env,
          notifyEmail,
          `New Quote from ${body.customer_name}`,
          html,
          client.name,
          body.customer_email
        )
      )
    }
  } catch (err) {
    console.error('PDF/email generation failed:', err)
  }

  return corsResponse({ id: quote.id, status: 'completed' }, 201)
})

app.get('/:id', async (c) => {
  const env = c.env
  const db = getDb(env)
  const { data, error } = await db.from('quotes').select('*').eq('id', c.req.param('id')).single() as any
  if (error || !data) return corsResponse({ error: 'Quote not found' }, 404)
  return corsResponse(data)
})

app.get('/:id/pdf', async (c) => {
  const env = c.env
  const db = getDb(env)
  const { data, error } = await db.from('quotes').select('*').eq('id', c.req.param('id')).single() as any
  if (error || !data) return corsResponse({ error: 'Quote not found' }, 404)
  if (data.pdf_url) {
    return Response.redirect(data.pdf_url, 302)
  }
  return corsResponse({ error: 'PDF not available' }, 404)
})

export function renderQuoteForm(client: { name: string; slug: string; config: { brand?: any; cotizaciones?: any } }): string {
  const brand = client.config.brand || {}
  const cfg = client.config.cotizaciones || {}
  const services = cfg.services || []
  const currency = cfg.currency || 'USD'
  const primary = brand.primary_color || '#2563eb'
  const secondary = brand.secondary_color || '#1e40af'
  const company = brand.company_name || client.name

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Get a Quote - ${company}</title>
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
  input, select, textarea { width: 100%; padding: 10px 12px; font-size: 14px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; transition: border-color .15s; font-family: inherit; }
  input:focus, select:focus, textarea:focus { outline: none; border-color: ${primary}; box-shadow: 0 0 0 3px ${primary}22; }
  textarea { resize: vertical; min-height: 80px; }
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
    <h1>Get a Quote</h1>
    <p>Fill out the form and we'll get back to you shortly</p>
  </div>
  <div class="card" id="form-card">
    <form id="quote-form">
      <input type="hidden" name="client_slug" value="${client.slug}">
      <div class="form-group">
        <label for="customer_name">Full Name *</label>
        <input type="text" id="customer_name" name="customer_name" required>
      </div>
      <div class="form-group">
        <label for="customer_email">Email *</label>
        <input type="email" id="customer_email" name="customer_email" required>
      </div>
      <div class="form-group">
        <label for="customer_phone">Phone</label>
        <input type="tel" id="customer_phone" name="customer_phone">
      </div>
      <div class="form-group">
        <label for="service_type">Service *</label>
        <select id="service_type" name="service_type" required>
          <option value="">Select a service...</option>
          ${services.map((s: string) => `<option value="${s}">${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label for="description">Describe your project *</label>
        <textarea id="description" name="description" required placeholder="Tell us about your project, goals, timeline..."></textarea>
      </div>
      <div class="form-group">
        <label for="estimated_budget">Estimated Budget (${currency})</label>
        <input type="number" id="estimated_budget" name="estimated_budget" min="0" step="0.01" placeholder="e.g. 1000">
      </div>
      <div class="error" id="form-error"></div>
      <button type="submit" class="btn" id="submit-btn">
        <span id="btn-text">Submit Request</span>
      </button>
    </form>
    <div class="success" id="success-message">
      <h2>✓ Request Sent!</h2>
      <p>We've received your quote request and will get back to you within 24 hours.</p>
    </div>
  </div>
</div>
<script>
document.getElementById('quote-form').addEventListener('submit', async (e) => {
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
    const res = await fetch('/api/cotizaciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (!res.ok) throw new Error('Failed to submit')
    document.getElementById('form-card').querySelector('form').style.display = 'none'
    document.getElementById('success-message').style.display = 'block'
  } catch (err) {
    errorEl.textContent = 'Something went wrong. Please try again.'
    errorEl.style.display = 'block'
    btn.disabled = false
    btnText.textContent = 'Submit Request'
  }
})
</script>
</body>
</html>`
}

export default app
