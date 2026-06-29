export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  })
}

export function corsResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  })
}

export function corsHtml(html: string): Response {
  return new Response(html, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}

export function corsPdf(bytes: Uint8Array, filename: string): Response {
  return new Response(bytes, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  })
}
