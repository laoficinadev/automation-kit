import { Hono } from 'hono'
import { getDb, type Env } from '../../lib/db'
import { getClientBySlug } from '../../lib/client'
import { sendEmail, buildNotificationHtml } from '../../lib/email'
import { corsResponse } from '../../lib/cors'

const app = new Hono<{ Bindings: Env }>()

app.post('/', async (c) => {
  const env = c.env
  const body = await c.req.json<{
    client_slug: string
    customer_name: string
    customer_email: string
    customer_phone: string
    service: string
    booking_date: string
    booking_time: string
    notes: string
  }>()

  const client = await getClientBySlug(env, body.client_slug)
  if (!client) return corsResponse({ error: 'Client not found' }, 404)
  if (!client.config.booking?.enabled) return corsResponse({ error: 'Booking not enabled for this client' }, 400)

  const db = getDb(env)

  const { data: existing } = await db
    .from('bookings')
    .select('*')
    .eq('client_id', client.id)
    .eq('booking_date', body.booking_date)
    .eq('booking_time', body.booking_time)
    .neq('status', 'cancelled') as any

  if (existing && (existing as any[]).length > 0) {
    return corsResponse({ error: 'This time slot is already booked' }, 409)
  }

  const { data: rawBooking, error } = await db
    .from('bookings')
    .insert({
      client_id: client.id,
      customer_name: body.customer_name,
      customer_email: body.customer_email,
      customer_phone: body.customer_phone,
      service: body.service,
      booking_date: body.booking_date,
      booking_time: body.booking_time,
      notes: body.notes,
      status: 'confirmed',
    } as any)
    .select()
    .single() as any

  if (error || !rawBooking) return corsResponse({ error: 'Failed to create booking' }, 500)
  const booking: any = rawBooking

  const html = buildNotificationHtml('New Booking', [
    { label: 'Client', value: client.name },
    { label: 'Customer', value: body.customer_name },
    { label: 'Email', value: body.customer_email },
    { label: 'Phone', value: body.customer_phone || '-' },
    { label: 'Service', value: body.service },
    { label: 'Date', value: body.booking_date },
    { label: 'Time', value: body.booking_time },
    { label: 'Notes', value: body.notes || '-' },
  ])

  const notifyEmail = client.config.booking?.notification_email
  if (notifyEmail) {
    c.executionCtx.waitUntil(
      sendEmail(
        env,
        notifyEmail,
        `New Booking: ${body.customer_name} - ${body.service}`,
        html,
        client.name,
        body.customer_email
      )
    )
  }

  return corsResponse({ id: booking.id, status: 'confirmed' }, 201)
})

app.get('/available', async (c) => {
  const env = c.env
  const slug = c.req.query('client_slug')
  const date = c.req.query('date')

  if (!slug || !date) return corsResponse({ error: 'client_slug and date are required' }, 400)

  const client = await getClientBySlug(env, slug)
  if (!client) return corsResponse({ error: 'Client not found' }, 404)
  if (!client.config.booking?.enabled) return corsResponse({ error: 'Booking not enabled' }, 400)

  const cfg = client.config.booking
  const dayOfWeek = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })

  if (!cfg.available_days.includes(dayOfWeek)) {
    return corsResponse({ available: [] })
  }

  const startMinutes = timeToMinutes(cfg.available_hours.start)
  const endMinutes = timeToMinutes(cfg.available_hours.end)
  const duration = cfg.duration_minutes

  const db = getDb(env)
  const { data: bookings } = await db
    .from('bookings')
    .select('booking_time')
    .eq('client_id', client.id)
    .eq('booking_date', date)
    .neq('status', 'cancelled') as any

  const bookedTimes = new Set((bookings || []).map((b: any) => b.booking_time))

  const slots: string[] = []
  for (let m = startMinutes; m + duration <= endMinutes; m += duration) {
    const time = minutesToTime(m)
    if (!bookedTimes.has(time)) {
      slots.push(time)
    }
  }

  return corsResponse({ date, day_of_week: dayOfWeek, available: slots })
})

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

export function renderBookingForm(client: { name: string; slug: string; config: { brand?: any; booking?: any } }): string {
  const brand = client.config.brand || {}
  const cfg = client.config.booking || {}
  const services = cfg.services || []
  const primary = brand.primary_color || '#2563eb'
  const secondary = brand.secondary_color || '#1e40af'
  const company = brand.company_name || client.name
  const duration = cfg.duration_minutes || 60

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Book a Session - ${company}</title>
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
  textarea { resize: vertical; min-height: 70px; }
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
    <h1>Book a Session</h1>
    <p>${duration}-minute session. Select a date and time below.</p>
  </div>
  <div class="card" id="form-card">
    <form id="booking-form">
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
        <label for="service">Service *</label>
        <select id="service" name="service" required>
          <option value="">Select a service...</option>
          ${services.map((s: string) => `<option value="${s}">${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label for="booking_date">Date *</label>
        <input type="date" id="booking_date" name="booking_date" required min="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-group">
        <label for="booking_time">Time *</label>
        <select id="booking_time" name="booking_time" required disabled>
          <option value="">Select a date first...</option>
        </select>
      </div>
      <div class="form-group">
        <label for="notes">Notes</label>
        <textarea id="notes" name="notes" placeholder="Any details you'd like to share..."></textarea>
      </div>
      <div class="error" id="form-error"></div>
      <button type="submit" class="btn" id="submit-btn">
        <span id="btn-text">Book Session</span>
      </button>
    </form>
    <div class="success" id="success-message">
      <h2>✓ Session Booked!</h2>
      <p>We've confirmed your booking. A confirmation will be sent to your email.</p>
    </div>
  </div>
</div>
<script>
const dateInput = document.getElementById('booking_date')
const timeSelect = document.getElementById('booking_time')
const clientSlug = '${client.slug}'

dateInput.addEventListener('change', async () => {
  const date = dateInput.value
  if (!date) return
  timeSelect.disabled = true
  timeSelect.innerHTML = '<option value="">Loading...</option>'
  try {
    const res = await fetch('/api/booking/available?client_slug=' + encodeURIComponent(clientSlug) + '&date=' + encodeURIComponent(date))
    const data = await res.json()
    if (data.available && data.available.length > 0) {
      timeSelect.innerHTML = '<option value="">Select a time...</option>' + data.available.map(t => '<option value="' + t + '">' + t + '</option>').join('')
      timeSelect.disabled = false
    } else {
      timeSelect.innerHTML = '<option value="">No slots available</option>'
    }
  } catch {
    timeSelect.innerHTML = '<option value="">Error loading times</option>'
  }
})

document.getElementById('booking-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const btn = document.getElementById('submit-btn')
  const btnText = document.getElementById('btn-text')
  const errorEl = document.getElementById('form-error')
  errorEl.style.display = 'none'
  btn.disabled = true
  btnText.innerHTML = '<span class="spinner"></span> Booking...'
  try {
    const form = e.target
    const data = Object.fromEntries(new FormData(form))
    const res = await fetch('/api/booking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (!res.ok) throw new Error(await res.text())
    document.getElementById('form-card').querySelector('form').style.display = 'none'
    document.getElementById('success-message').style.display = 'block'
  } catch (err) {
    errorEl.textContent = 'Something went wrong. Please try again.'
    errorEl.style.display = 'block'
    btn.disabled = false
    btnText.textContent = 'Book Session'
  }
})
</script>
</body>
</html>`
}

export default app
