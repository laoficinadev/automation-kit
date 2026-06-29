import { Hono } from 'hono'
import { corsResponse, corsHtml, handleOptions } from './lib/cors'
import { getClientBySlug } from './lib/client'
import { Env } from './lib/db'

import cotizacionesModule, { renderQuoteForm } from './modules/cotizaciones/index'
import bookingModule, { renderBookingForm } from './modules/booking/index'
import leadsModule, { renderLeadForm } from './modules/leads/index'

const app = new Hono<{ Bindings: Env }>()

app.options('*', (c) => handleOptions())

app.get('/health', (c) => {
  return corsResponse({ status: 'ok', app: c.env.APP_NAME })
})

app.route('/api/cotizaciones', cotizacionesModule)
app.route('/api/booking', bookingModule)
app.route('/api/leads', leadsModule)

app.get('/embed/:slug/cotizaciones', async (c) => {
  const client = await getClientBySlug(c.env, c.req.param('slug'))
  if (!client) return corsResponse({ error: 'Client not found' }, 404)
  if (!client.config.cotizaciones?.enabled) return corsResponse({ error: 'Quotes not enabled' }, 400)
  return corsHtml(renderQuoteForm(client))
})

app.get('/embed/:slug/booking', async (c) => {
  const client = await getClientBySlug(c.env, c.req.param('slug'))
  if (!client) return corsResponse({ error: 'Client not found' }, 404)
  if (!client.config.booking?.enabled) return corsResponse({ error: 'Booking not enabled' }, 400)
  return corsHtml(renderBookingForm(client))
})

app.get('/embed/:slug/leads', async (c) => {
  const client = await getClientBySlug(c.env, c.req.param('slug'))
  if (!client) return corsResponse({ error: 'Client not found' }, 404)
  if (!client.config.leads?.enabled) return corsResponse({ error: 'Leads not enabled' }, 400)
  return corsHtml(renderLeadForm(client))
})

app.get('/', (c) => {
  return corsHtml(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Automation Kit</title></head>
<body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc">
<div style="text-align:center">
  <h1 style="color:#2563eb">Automation Kit</h1>
  <p style="color:#64748b">Embeddable automation modules for your business.</p>
  <p style="color:#94a3b8;font-size:14px">Use /embed/:slug/:module to access forms.</p>
</div>
</body>
</html>`)
})

export default app
