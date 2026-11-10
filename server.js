import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { mkdir, readFile as readStateFile, writeFile } from 'node:fs/promises'
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt } from 'node:crypto'

const root = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(root, 'public')
const distDir = path.join(root, 'dist')
const port = Number(process.env.PORT || 3000)
const dataDir = process.env.DATA_DIR || path.join(root, '.data')
const stateFile = path.join(dataDir, 'devices.enc')
const storageKey = createHash('sha256')
  .update(process.env.ORBIT_STORAGE_KEY || 'orbit-development-storage-key')
  .digest()
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

function validCredentials(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 512
}

function authHeaders(source) {
  if (!source.username || !source.password) return {}
  return { Authorization: `Basic ${Buffer.from(`${source.username}:${source.password}`).toString('base64')}` }
}

function encryptState(value) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', storageKey, iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return JSON.stringify({
    iv: iv.toString('base64url'),
    tag: cipher.getAuthTag().toString('base64url'),
    data: encrypted.toString('base64url'),
  })
}

function decryptState(value) {
  const payload = typeof value === 'string' ? JSON.parse(value) : value
  const decipher = createDecipheriv('aes-256-gcm', storageKey, Buffer.from(payload.iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64url'))
  return JSON.parse(Buffer.concat([
    decipher.update(Buffer.from(payload.data, 'base64url')),
    decipher.final(),
  ]).toString('utf8'))
}

async function loadDevices() {
  try {
    const saved = JSON.parse(await readStateFile(stateFile, 'utf8'))
    Object.entries(decryptState(saved)).forEach(([id, device]) => devices.set(id, device))
  } catch (error) {
    if (error.code !== 'ENOENT') console.error(`Could not load encrypted calendar connections: ${error.message}`)
  }
}

async function saveDevices() {
  await mkdir(dataDir, { recursive: true })
  await writeFile(stateFile, encryptState(Object.fromEntries(devices)), { mode: 0o600 })
}

function unescapeIcs(value) {
  return value.replace(/\\n/gi, '\n').replace(/\\([\\;,])/g, '$1')
}

function unescapeXml(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
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

async function fetchCalDav(source) {
  const headers = { ...authHeaders(source), Accept: 'text/calendar, application/xml, text/xml' }
  const direct = await fetch(source.url, { cache: 'no-store', headers })
  const directBody = await direct.text()
  if (direct.ok && directBody.includes('BEGIN:VCALENDAR')) return parseIcs(directBody)

  const report = await fetch(source.url, {
    method: 'REPORT',
    cache: 'no-store',
    headers: {
      ...authHeaders(source),
      Accept: 'application/xml, text/xml',
      'Content-Type': 'application/xml; charset=utf-8',
      Depth: '1',
    },
    body: `<?xml version="1.0" encoding="UTF-8"?><c:calendar-query xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:d="DAV:"><d:prop><c:calendar-data/></d:prop><c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"/></c:comp-filter></c:filter></c:calendar-query>`,
  })
  const reportBody = await report.text()
  if (!report.ok) throw new Error(`CalDAV antwortet mit HTTP ${report.status}`)
  const calendars = [...reportBody.matchAll(/<(?:[A-Za-z0-9_-]+:)?calendar-data[^>]*>([\s\S]*?)<\/(?:[A-Za-z0-9_-]+:)?calendar-data>/gi)]
    .map((match) => unescapeXml(match[1]))
  if (!calendars.length) throw new Error('Die CalDAV-URL lieferte keine Kalenderdaten.')
  return calendars.flatMap(parseIcs)
}

async function fetchCalendarSource(source) {
  if (source.type === 'caldav') return fetchCalDav(source)
  return fetchCalendar(source.url)
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
      const source = body.caldav
        ? {
            type: 'caldav',
            url: validFeedUrl(body.caldav.url),
            username: body.caldav.username,
            password: body.caldav.password,
          }
        : null
      if (!pair || Date.now() - pair.createdAt > 10 * 60 * 1000) {
        return json(response, 400, { error: 'Code ungültig oder abgelaufen.' })
      }
      if (!source && !feedUrl) return json(response, 400, { error: 'Bitte eine gültige ICS- oder CalDAV-URL eingeben.' })
      if (source && (!source.url || !validCredentials(source.username) || !validCredentials(source.password))) {
        return json(response, 400, { error: 'CalDAV-URL, Benutzername und Passwort werden benötigt.' })
      }
      const calendarSource = source || { type: 'ics', url: feedUrl }
      await fetchCalendarSource(calendarSource)
      devices.set(pair.id, { source: calendarSource, updatedAt: Date.now() })
      await saveDevices()
      pairings.delete(pair.id)
      return json(response, 200, { connected: true, deviceId: pair.id })
    }

    if (request.method === 'POST' && url.pathname === '/api/calendar/fetch') {
      const body = await readJson(request)
      const feedUrl = validFeedUrl(body.feedUrl)
      const source = body.caldav
        ? {
            type: 'caldav',
            url: validFeedUrl(body.caldav.url),
            username: body.caldav.username,
            password: body.caldav.password,
          }
        : null
      if (!source && !feedUrl) return json(response, 400, { error: 'Bitte eine gültige Kalender-URL eingeben.' })
      if (source && (!source.url || !validCredentials(source.username) || !validCredentials(source.password))) {
        return json(response, 400, { error: 'CalDAV-URL, Benutzername und Passwort werden benötigt.' })
      }
      const events = await fetchCalendarSource(source || { type: 'ics', url: feedUrl })
      return json(response, 200, { events, updatedAt: Date.now() })
    }

    if (request.method === 'GET' && url.pathname === '/api/glasses/status') {
      const device = devices.get(url.searchParams.get('deviceId'))
      return json(response, 200, { connected: Boolean(device) })
    }

    if (request.method === 'GET' && url.pathname === '/api/glasses/calendar') {
      const device = devices.get(url.searchParams.get('deviceId'))
      if (!device) return json(response, 401, { error: 'Brille noch nicht gekoppelt.' })
      const events = await fetchCalendarSource(device.source || { type: 'ics', url: device.feedUrl })
      device.updatedAt = Date.now()
      return json(response, 200, { events, updatedAt: device.updatedAt })
    }

    if (request.method === 'POST' && url.pathname === '/api/disconnect') {
      const body = await readJson(request)
      if (body.deviceId) {
        devices.delete(body.deviceId)
        await saveDevices()
      }
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

await loadDevices()
http.createServer(route).listen(port, () => {
  console.log(`Orbit Calendar server listening on port ${port}`)
})
