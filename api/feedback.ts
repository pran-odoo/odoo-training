// Vercel Serverless Function - keeps webhook secret server-side
import type { VercelRequest, VercelResponse } from '@vercel/node'

// Rate limiting store (in-memory, resets on cold start)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 5 // max requests
const RATE_WINDOW = 60 * 1000 // per minute

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(ip)

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_WINDOW })
    return false
  }

  if (record.count >= RATE_LIMIT) {
    return true
  }

  record.count++
  return false
}

function sanitizeString(str: string, maxLength: number): string {
  return str
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Remove potential HTML
    .trim()
}

function isValidDiscordUsername(username: string): boolean {
  // Discord usernames: 2-32 chars, alphanumeric, underscore, period
  return /^[a-zA-Z0-9_.]{2,32}$/.test(username)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Get client IP for rate limiting
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
             req.socket?.remoteAddress ||
             'unknown'

  // Check rate limit
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a minute.' })
  }

  // Validate request body
  const { type, message, discordUsername, email, page } = req.body

  // Validate type
  const validTypes = ['question', 'suggestion', 'issue', 'praise']
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid feedback type' })
  }

  // Sanitize inputs
  const sanitizedMessage = message ? sanitizeString(message, 2000) : ''
  const sanitizedDiscord = discordUsername ? sanitizeString(discordUsername, 32) : ''
  const sanitizedEmail = email ? sanitizeString(email, 254) : ''
  const sanitizedPage = page ? sanitizeString(page, 200) : '/'

  // Validate: need either message (10+ chars) or valid Discord username
  const hasValidMessage = sanitizedMessage.length >= 10
  const hasValidDiscord = sanitizedDiscord && isValidDiscordUsername(sanitizedDiscord)

  if (!hasValidMessage && !hasValidDiscord) {
    return res.status(400).json({
      error: 'Please provide a message (10+ characters) or valid Discord username'
    })
  }

  // Email validation (basic)
  if (sanitizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
    return res.status(400).json({ error: 'Invalid email format' })
  }

  // Get webhook URL from server-side env (NOT exposed to client)
  const webhookUrl = process.env.DISCORD_WEBHOOK
  if (!webhookUrl) {
    console.error('DISCORD_WEBHOOK not configured')
    return res.status(500).json({ error: 'Service temporarily unavailable' })
  }

  // Build Discord embed
  const typeConfig: Record<string, { icon: string; label: string; color: number }> = {
    question: { icon: '❓', label: 'Question', color: 0x3B82F6 },
    suggestion: { icon: '💡', label: 'Suggestion', color: 0x10B981 },
    issue: { icon: '🐛', label: 'Issue', color: 0xEF4444 },
    praise: { icon: '🌟', label: 'Praise', color: 0xF59E0B }
  }

  const { icon, label, color } = typeConfig[type]
  const description = sanitizedMessage || `User provided Discord contact: ${sanitizedDiscord}`

  const payload = {
    embeds: [{
      title: `${icon} New ${label}`,
      description,
      color,
      fields: [
        { name: '📄 Page', value: sanitizedPage, inline: true },
        ...(sanitizedDiscord ? [{ name: '🎮 Discord', value: sanitizedDiscord, inline: true }] : []),
        ...(sanitizedEmail ? [{ name: '📧 Email', value: sanitizedEmail, inline: true }] : [])
      ],
      timestamp: new Date().toISOString(),
      footer: { text: `IP: ${ip.slice(0, 10)}...` } // Partial IP for abuse tracking
    }]
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`)
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Feedback submission error:', error)
    return res.status(500).json({ error: 'Failed to submit feedback' })
  }
}
