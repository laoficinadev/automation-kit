export async function sendEmail(
  env: { RESEND_API_KEY: string; FROM_EMAIL?: string },
  to: string,
  subject: string,
  html: string,
  fromName = 'Automation Kit',
  replyTo?: string
) {
  const fromEmail = env.FROM_EMAIL || 'noreply@yourdomain.com'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html,
      replyTo: replyTo ? [replyTo] : undefined,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Email send failed:', err)
    throw new Error(`Email send failed: ${err}`)
  }

  return res.json()
}

export function buildNotificationHtml(title: string, fields: { label: string; value: string }[]) {
  const rows = fields
    .map((f) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;white-space:nowrap">${f.label}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280">${f.value}</td></tr>`)
    .join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#2563eb;padding:24px;text-align:center">
      <h1 style="margin:0;color:#ffffff;font-size:24px">${title}</h1>
    </div>
    <div style="padding:24px">
      <table style="width:100%;border-collapse:collapse">${rows}</table>
    </div>
  </div>
</body>
</html>`
}

export function buildWelcomeHtml(body: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#2563eb;padding:24px;text-align:center">
      <h1 style="margin:0;color:#ffffff;font-size:24px">Welcome!</h1>
    </div>
    <div style="padding:24px;color:#374151;line-height:1.6">
      <p>${body}</p>
    </div>
  </div>
</body>
</html>`
}
