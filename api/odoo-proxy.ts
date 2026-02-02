import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Serverless proxy for Odoo JSON/2 API requests.
 * Handles CORS by making the request server-side.
 *
 * POST /api/odoo-proxy
 * Body: { odooUrl, apiKey, model, method, body }
 */

// Block internal/private networks (SSRF protection)
function isBlockedHost(hostname: string): boolean {
  const blocked = [
    /^localhost$/i,
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^0\./,
    /^::1$/,
    /^fc00:/i,
    /^fe80:/i,
  ]
  return blocked.some(pattern => pattern.test(hostname))
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ _status: 405, data: { error: 'Method not allowed' } })
  }

  const { odooUrl, apiKey, model, method, body } = req.body || {}

  // Validate required fields
  if (!odooUrl || !apiKey || !model || !method) {
    return res.status(400).json({
      _status: 400,
      data: { error: 'Missing required fields: odooUrl, apiKey, model, method' }
    })
  }

  // Validate model format (module.model, lowercase with dots/underscores)
  if (typeof model !== 'string' || !/^[a-z_]+(\.[a-z_]+)+$/.test(model)) {
    return res.status(400).json({
      _status: 400,
      data: { error: 'Invalid model format. Use: module.model (e.g., res.partner)' }
    })
  }

  // Validate method (must start with letter, no leading underscore - private methods blocked)
  if (typeof method !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(method)) {
    return res.status(400).json({
      _status: 400,
      data: { error: 'Invalid method name. Must start with a letter, no underscores at start.' }
    })
  }

  // Normalize URL
  let normalizedUrl = String(odooUrl).trim().replace(/\/+$/, '')
  const pathsToStrip = ['/web/login', '/web', '/odoo', '/jsonrpc', '/xmlrpc']
  for (const path of pathsToStrip) {
    if (normalizedUrl.endsWith(path)) {
      normalizedUrl = normalizedUrl.slice(0, -path.length)
    }
  }

  // Validate URL format and protocol
  let parsedUrl: URL
  try {
    parsedUrl = new URL(normalizedUrl)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid protocol')
    }
  } catch {
    return res.status(400).json({
      _status: 400,
      data: { error: 'Invalid Odoo URL. Must be a valid HTTP/HTTPS URL.' }
    })
  }

  // SSRF protection - block internal networks
  if (isBlockedHost(parsedUrl.hostname)) {
    return res.status(400).json({
      _status: 400,
      data: { error: 'Cannot proxy to internal/private networks.' }
    })
  }

  const targetUrl = `${normalizedUrl}/json/2/${model}/${method}`

  try {
    const startTime = Date.now()

    // Create AbortController for timeout (30 seconds)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    let response: Response
    try {
      response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'OdooTrainingPlayground/1.0',
        },
        body: JSON.stringify(body || {}),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    const elapsed = Date.now() - startTime

    // Get response data
    const contentType = response.headers.get('content-type') || ''
    let data: any

    if (contentType.includes('application/json')) {
      data = await response.json()
    } else {
      const text = await response.text()
      data = { _raw: text.slice(0, 1000), _note: 'Non-JSON response from Odoo' }
    }

    // Return consistent response structure
    return res.status(200).json({
      _status: response.status,
      _time: elapsed,
      _proxied: true,
      data
    })

  } catch (error: any) {
    // Handle timeout
    if (error.name === 'AbortError') {
      return res.status(504).json({
        _status: 504,
        data: { error: 'Request timed out. Odoo server took too long to respond.' }
      })
    }

    // Handle network errors
    return res.status(502).json({
      _status: 502,
      data: { error: 'Failed to reach Odoo server. Check the URL and try again.' }
    })
  }
}
