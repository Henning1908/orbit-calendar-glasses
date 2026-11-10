import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { randomBytes, randomInt } from 'node:crypto'

const root = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(root, 'public')
const distDir = path.join(root, 'dist')
const port = Number(process.env.PORT || 3000)
const pairings = new Map()
const devices = new Map()
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
}

function json(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(body))
}

async function readJson(request) {
  let raw = ''
  for await (const chunk of request) raw += chunk
  return raw ? JSON.parse(raw) : {}
}

function createPair() {
  let code
  do code = String(randomInt(100000, 1000000))
  while ([...pairings.values()].some((pair) => pair.code === code))
  const id = randomBytes(18).toString('base64url')
  pairings.set(id, { id, code, createdAt: Date.now() })
  return { id, code }
}

function validFeedUrl(value) {
  try {
    const url = new URL(String(value || ''))
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null
  } catch {
    return null
  }
}

function unescapeIcs(value) {
  return value.replace(/\\n/gi, '\n').replace(/\\([\\;,])/g, '$1')
}

function parseIcs(text) {
  const events = []
  const blocks = text.split(/BEGIN:VEVENT/i).slice(1)
  blocks.forEach((block, index) => {
    const dateMatch = block.match(/(?:^|\r?\n)DTSTART(?:;[^:]*)?:([0-9]{8})(?:T([0-9]{4,6}))?/i)
    const titleMatch = block.match(/(?:^|\r?\n)SUMMARY(?:;[^:]*)?:([^\r\n]*)/i)
    if (!dateMatch || !titleMatch) return
    const date = `${dateMatch[1].slice(0, 4)}-${dateMatch[1].slice(4, 6)}-${dateMatch[1].slice(6, 8)}`
    events.push({
      id: `${date}-${index}`,
      date,
      title: unescapeIcs(titleMatch[1].trim()),
      time: dateMatch[2] ? `${dateMatch[2].slice(0, 2)}:${dateMatch[2].slice(2, 4)}` : '',
      type: 'synced',
      icon: '↻',
    })
  })
  return events
}

async function fetchCalendar(feedUrl) {
  const response = await fetch(feedUrl, {
    cache: 'no-store',
    headers: { Accept: 'text/calendar, text/plain, application/octet-stream' },
  })
  if (!response.ok) throw new Error(`ICS feed antwortet mit HTTP ${response.status}`)
  const body = await response.text()
  if (!body.includes('BEGIN:VCALENDAR')) throw new Error('Die URL liefert keinen ICS-Kalenderfeed.')
  return parseIcs(body)
}

async function serveFile(response, filename) {
  let content
  try {
    content = await readFile(filename)
  } catch (error) {
    if (error.code === 'ENOENT') return json(response, 404, { error: 'Nicht gefunden.' })
    throw error
  }
  response.writeHead(200, {
    'Content-Type': mimeTypes[path.extname(filename)] || 'application/octet-stream',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  })
  response.end(content)
}

async function route(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`)
  try {
    if (request.method === 'POST' && url.pathname === '/api/glasses/pair') {
      const body = await readJson(request)
      const existing = body.deviceId && devices.has(body.deviceId)
      if (existing) return json(response, 200, { id: body.deviceId, connected: true })
      const pair = createPair()
      return json(response, 200, pair)
    }

    if (request.method === 'GET' && url.pathname === '/api/pair/status') {
      const pair = pairings.get(url.searchParams.get('id'))
      const device = devices.get(url.searchParams.get('id'))
      if (device) return json(response, 200, { status: 'connected', connected: true })
      if (!pair) return json(response, 404, { error: 'Pairing nicht gefunden oder abgelaufen.' })
      if (Date.now() - pair.createdAt > 10 * 60 * 1000) {
        pairings.delete(pair.id)
        return json(response, 410, { status: 'expired', connected: false, error: 'Pairing abgelaufen.' })
      }
      return json(response, 200, {
        status: 'waiting',
        code: pair.code,
        connected: false,
      })
    }

    if (request.method === 'POST' && url.pathname === '/api/pair/claim') {
      const body = await readJson(request)
      const pair = [...pairings.values()].find((item) => item.code === String(body.code || '').replace(/\s/g, ''))
      const feedUrl = validFeedUrl(body.feedUrl)
      if (!pair || Date.now() - pair.createdAt > 10 * 60 * 1000) {
        return json(response, 400, { error: 'Code ungültig oder abgelaufen.' })
      }
      if (!feedUrl) return json(response, 400, { error: 'Bitte eine gültige http(s)-ICS-URL eingeben.' })
      await fetchCalendar(feedUrl)
      devices.set(pair.id, { feedUrl, updatedAt: Date.now() })
      pairings.delete(pair.id)
      return json(response, 200, { connected: true, deviceId: pair.id })
    }

    if (request.method === 'GET' && url.pathname === '/api/glasses/status') {
      const device = devices.get(url.searchParams.get('deviceId'))
      return json(response, 200, { connected: Boolean(device) })
    }

    if (request.method === 'GET' && url.pathname === '/api/glasses/calendar') {
      const device = devices.get(url.searchParams.get('deviceId'))
      if (!device) return json(response, 401, { error: 'Brille noch nicht gekoppelt.' })
      const events = await fetchCalendar(device.feedUrl)
      device.updatedAt = Date.now()
      return json(response, 200, { events, updatedAt: device.updatedAt })
    }

    if (request.method === 'POST' && url.pathname === '/api/disconnect') {
      const body = await readJson(request)
      if (body.deviceId) devices.delete(body.deviceId)
      return json(response, 200, { connected: false })
    }

    if (request.method === 'GET') {
      const relative = url.pathname === '/' ? '/index.html' : url.pathname
      const baseDir = relative === '/glasses.html'
        || relative === '/manifest.webmanifest'
        || relative.startsWith('/.well-known/')
        ? publicDir
        : distDir
      const filename = path.normalize(path.join(baseDir, relative))
      if (!filename.startsWith(`${baseDir}${path.sep}`) && filename !== baseDir) {
        return json(response, 403, { error: 'Nicht erlaubt.' })
      }
      return serveFile(response, filename)
    }
    return json(response, 404, { error: 'Nicht gefunden.' })
  } catch (error) {
    console.error(error)
    return json(response, 502, { error: error.message || 'Anfrage fehlgeschlagen.' })
  }
}

http.createServer(route).listen(port, () => {
  console.log(`Orbit Calendar server listening on port ${port}`)
})
