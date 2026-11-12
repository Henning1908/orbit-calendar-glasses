import staticAssets from './cloudflare-assets.js'

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const hash = async (value) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))].map((byte) => byte.toString(16).padStart(2, '0')).join('')

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

async function readJson(request) {
  try {
    return await request.json()
  } catch {
    throw new Error('Ungültige JSON-Anfrage.')
  }
}

function encodeBase64Url(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function encryptionKey(secret) {
  if (!secret) throw new Error('ORBIT_STORAGE_KEY fehlt in den Worker-Secrets.')
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret))
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

async function encrypt(value, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await encryptionKey(secret),
    encoder.encode(JSON.stringify(value)),
  )
  return JSON.stringify({ iv: encodeBase64Url(iv), data: encodeBase64Url(new Uint8Array(ciphertext)) })
}

async function decrypt(value, secret) {
  const payload = JSON.parse(value)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: decodeBase64Url(payload.iv) },
    await encryptionKey(secret),
    decodeBase64Url(payload.data),
  )
  return JSON.parse(decoder.decode(plaintext))
}

function validUrl(value, httpsOnly = false) {
  try {
    const url = new URL(String(value || ''))
    if (!['http:', 'https:'].includes(url.protocol)) return null
    if (httpsOnly && url.protocol !== 'https:') return null
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
    if (
      !host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
      host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')
    ) return null
    const ipv4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
    if (ipv4) {
      const [, a, b] = ipv4.map(Number)
      if (
        a === 0 || a === 10 || a === 127 || a >= 224 ||
        (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)
      ) return null
    }
    return url.toString()
  } catch {
    return null
  }
}

function validCredentials(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 512
}

function authHeaders(source) {
  if (!source.username || !source.password) return {}
  const bytes = encoder.encode(`${source.username}:${source.password}`)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return { Authorization: `Basic ${btoa(binary)}` }
}

function unescapeIcs(value) {
  return value.replace(/\\n/gi, '\n').replace(/\\([\\;,])/g, '$1')
}

function unescapeXml(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&amp;/g, '&')
}

function parseIcs(text) {
  const unfolded = text.replace(/\r?\n[ \t]/g, '')
  return unfolded.split(/BEGIN:VEVENT/i).slice(1).flatMap((block, index) => {
    const dateMatch = block.match(/(?:^|\r?\n)DTSTART(?:;[^:]*)?:([0-9]{8})(?:T([0-9]{4,6}))?/i)
    const titleMatch = block.match(/(?:^|\r?\n)SUMMARY(?:;[^:]*)?:([^\r\n]*)/i)
    if (!dateMatch || !titleMatch) return []
    const date = `${dateMatch[1].slice(0, 4)}-${dateMatch[1].slice(4, 6)}-${dateMatch[1].slice(6, 8)}`
    return [{
      id: `${date}-${index}`,
      date,
      title: unescapeIcs(titleMatch[1].trim()),
      time: dateMatch[2] ? `${dateMatch[2].slice(0, 2)}:${dateMatch[2].slice(2, 4)}` : '',
      type: 'synced',
      icon: '↻',
    }]
  })
}

async function fetchCalendar(feedUrl) {
  const response = await fetch(feedUrl, {
    cache: 'no-store',
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
    headers: { Accept: 'text/calendar, text/plain, application/octet-stream' },
  })
  if (!response.ok) throw new Error(`ICS-Feed antwortet mit HTTP ${response.status}.`)
  const body = await response.text()
  if (!body.toUpperCase().includes('BEGIN:VCALENDAR')) throw new Error('Die URL liefert keinen ICS-Kalenderfeed.')
  return parseIcs(body)
}

function xmlElement(xml, name) {
  const tag = `(?:[A-Za-z0-9_-]+:)?${name}`
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}\\s*>`, 'i'))
  return match ? match[1] : ''
}

function xmlPropertyHref(xml, name) {
  const property = xmlElement(xml, name)
  const href = xmlElement(property, 'href')
  return href ? unescapeXml(href.trim()) : null
}

function calendarHrefList(xml, baseUrl) {
  const responses = xml.match(/<(?:[A-Za-z0-9_-]+:)?response\b[^>]*>[\s\S]*?<\/(?:[A-Za-z0-9_-]+:)?response\s*>/gi) || []
  return responses.flatMap((response) => {
    const properties = xmlElement(response, 'prop')
    const resourceType = xmlElement(properties, 'resourcetype')
    if (!/<(?:[A-Za-z0-9_-]+:)?calendar(?:\s|\/|>)/i.test(resourceType)) return []
    const href = xmlElement(response, 'href')
    if (!href) return []
    try {
      return [new URL(unescapeXml(href.trim()), baseUrl).toString()]
    } catch {
      return []
    }
  })
}

async function propfind(source, url, depth, body) {
  const response = await fetch(url, {
    method: 'PROPFIND',
    cache: 'no-store',
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
    headers: {
      ...authHeaders(source),
      Accept: 'application/xml, text/xml',
      'Content-Type': 'application/xml; charset=utf-8',
      Depth: depth,
    },
    body,
  })
  const responseBody = await response.text()
  if (!response.ok && response.status !== 207) throw new Error(`CalDAV discovery antwortet mit HTTP ${response.status}.`)
  return responseBody
}

async function discoverCalendars(source) {
  const discoveryBody = '<?xml version="1.0" encoding="UTF-8"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:current-user-principal/><d:principal-URL/><c:calendar-home-set/></d:prop></d:propfind>'
  let discoveryUrl = source.url
  let rootResponse
  try {
    rootResponse = await propfind(source, discoveryUrl, '0', discoveryBody)
  } catch {
    discoveryUrl = new URL('/.well-known/caldav', new URL(source.url).origin).toString()
    rootResponse = await propfind(source, discoveryUrl, '0', discoveryBody)
  }

  let principal = xmlPropertyHref(rootResponse, 'current-user-principal')
    || xmlPropertyHref(rootResponse, 'principal-URL')
  let home = xmlPropertyHref(rootResponse, 'calendar-home-set')
  if (!home && principal) {
    const principalUrl = new URL(principal, discoveryUrl).toString()
    const principalResponse = await propfind(source, principalUrl, '0', discoveryBody)
    home = xmlPropertyHref(principalResponse, 'calendar-home-set')
  }
  if (!home) throw new Error('CalDAV-Server hat keine Kalenderadresse (calendar-home-set) geliefert.')

  const homeUrl = new URL(home, discoveryUrl).toString()
  const calendarsBody = '<?xml version="1.0" encoding="UTF-8"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:resourcetype/><d:displayname/></d:prop></d:propfind>'
  const calendarsResponse = await propfind(source, homeUrl, '1', calendarsBody)
  const calendars = calendarHrefList(calendarsResponse, homeUrl)
  if (!calendars.length) throw new Error('CalDAV-Server hat keine Kalender freigegeben.')
  return calendars
}

async function fetchCalDavReport(source, url) {
  const report = await fetch(url, {
    method: 'REPORT',
    cache: 'no-store',
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
    headers: {
      ...authHeaders(source),
      Accept: 'application/xml, text/xml',
      'Content-Type': 'application/xml; charset=utf-8',
      Depth: '1',
    },
    body: '<?xml version="1.0" encoding="UTF-8"?><c:calendar-query xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:d="DAV:"><d:prop><c:calendar-data/></d:prop><c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"/></c:comp-filter></c:filter></c:calendar-query>',
  })
  const reportBody = await report.text()
  if (!report.ok) return { ok: false, status: report.status }
  const calendars = [...reportBody.matchAll(/<(?:[A-Za-z0-9_-]+:)?calendar-data[^>]*>([\s\S]*?)<\/(?:[A-Za-z0-9_-]+:)?calendar-data>/gi)]
    .map((match) => unescapeXml(match[1]))
  return { ok: true, events: calendars.flatMap(parseIcs), hasCalendarData: calendars.length > 0 }
}

async function fetchCalDav(source) {
  const headers = { ...authHeaders(source), Accept: 'text/calendar, application/xml, text/xml' }
  const direct = await fetch(source.url, {
    cache: 'no-store',
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
    headers,
  })
  const directBody = await direct.text()
  if (direct.ok && directBody.toUpperCase().includes('BEGIN:VCALENDAR')) return parseIcs(directBody)
  const directReport = await fetchCalDavReport(source, source.url)
  if (directReport.ok && directReport.hasCalendarData) return directReport.events
  if (directReport.ok && /<(?:[A-Za-z0-9_-]+:)?multistatus\b/i.test(directBody)) return directReport.events

  const calendarUrls = await discoverCalendars(source)
  const eventLists = await Promise.all(calendarUrls.map((calendarUrl) => fetchCalDavReport(source, calendarUrl)))
  const successful = eventLists.filter((result) => result.ok)
  if (!successful.length) {
    const status = directReport.status || eventLists[0]?.status || 502
    throw new Error(`CalDAV antwortet mit HTTP ${status}.`)
  }
  return successful.flatMap((result) => result.events)
}

async function fetchSource(source) {
  return source.type === 'caldav' ? fetchCalDav(source) : fetchCalendar(source.url)
}

function normalizeSource(body) {
  const feedUrl = validUrl(body.feedUrl)
  if (body.caldav) {
    const source = {
      type: 'caldav',
      url: validUrl(body.caldav.url, true),
      username: body.caldav.username,
      password: body.caldav.password,
    }
    if (!source.url || !validCredentials(source.username) || !validCredentials(source.password)) {
      throw new Error('CalDAV-URL, Benutzername und Passwort werden benötigt.')
    }
    return source
  }
  if (!feedUrl) throw new Error('Bitte eine gültige ICS- oder CalDAV-URL eingeben.')
  return { type: 'ics', url: feedUrl }
}

function randomId() {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(18)))
}

function readCookie(request, name) {
  const value = request.headers.get('Cookie') || ''
  return value.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1] || ''
}

async function resolveGlassesDeviceId(request, env, requestedId) {
  const id = String(requestedId || '')
  if (id) {
    const direct = await env.DB.prepare('SELECT device_id FROM devices WHERE device_id = ?').bind(id).first()
    if (direct) return id
  }
  const deviceToken = readCookie(request, 'mda_device')
  return deviceToken ? hash(deviceToken) : id
}

function mdaCookie(value) {
  return `mda_device=${value}; Domain=henning-orbit-calendar.workers.dev; Path=/; Max-Age=31536000; Secure; HttpOnly; SameSite=Strict`
}

async function centralDeviceForSession(request) {
  const cookie = request.headers.get('Cookie') || ''
  if (!cookie) return null
  const response = await fetch('https://meta-display-apps.henning-orbit-calendar.workers.dev/api/device/me', { headers: { Cookie: cookie }, signal: AbortSignal.timeout(8000) })
  if (!response.ok) return null
  const data = await response.json().catch(() => null)
  return data?.connected && /^[a-f0-9]{64}$/.test(data.deviceHash || '') ? data.deviceHash : null
}

async function centralDeviceForToken(deviceToken, env) {
  if (!deviceToken || !env.MDA_LINK_SECRET) return null
  const response = await fetch('https://meta-display-apps.henning-orbit-calendar.workers.dev/api/device/resolve', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.MDA_LINK_SECRET}` },
    body: JSON.stringify({ deviceToken }), signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) return null
  const data = await response.json().catch(() => null)
  return data?.connected && /^[a-f0-9]{64}$/.test(data.deviceHash || '') ? data.deviceHash : null
}

async function createPair(env, deviceToken = randomId()) {
  await env.DB.prepare('DELETE FROM pairings WHERE created_at < ?').bind(Date.now() - 60 * 60 * 1000).run()
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = randomId()
    const code = String(100000 + crypto.getRandomValues(new Uint32Array(1))[0] % 900000)
    try {
      await env.DB.prepare('INSERT INTO pairings (id, code, created_at, mda_device_hash) VALUES (?, ?, ?, ?)')
        .bind(id, code, Date.now(), await hash(deviceToken)).run()
      return { id, code, deviceToken }
    } catch (error) {
      if (attempt === 4) throw error
    }
  }
  throw new Error('Es konnte kein Kopplungscode erstellt werden.')
}

async function route(request, env) {
  const url = new URL(request.url)
  try {
    if (request.method === 'POST' && url.pathname === '/api/glasses/pair') {
      const body = await readJson(request)
      const deviceToken = readCookie(request, 'mda_device') || randomId()
      const registeredDevice = await centralDeviceForToken(deviceToken, env).catch(() => null)
      if (registeredDevice) {
        const existing = await env.DB.prepare('SELECT device_id FROM devices WHERE device_id = ?').bind(registeredDevice).first()
        return json({ id: registeredDevice, connected: Boolean(existing), registered: true, setupRequired: !existing }, 200, { 'Set-Cookie': mdaCookie(deviceToken) })
      }
      if (body.deviceId && readCookie(request, 'mda_device')) {
        const existing = await env.DB.prepare('SELECT device_id FROM devices WHERE device_id = ?').bind(body.deviceId).first()
        if (existing) return json({ id: body.deviceId, connected: true }, 200, { 'Set-Cookie': mdaCookie(deviceToken) })
      }
      const pair = await createPair(env, deviceToken)
      return json({ id: pair.id, code: pair.code }, 200, { 'Set-Cookie': mdaCookie(pair.deviceToken) })
    }

    if (request.method === 'POST' && url.pathname === '/api/mda/resolve-code') {
      if (!env.MDA_LINK_SECRET || request.headers.get('Authorization') !== `Bearer ${env.MDA_LINK_SECRET}`) return json({ error: 'Unauthorized.' }, 401)
      const body = await readJson(request)
      const code = String(body.code || '').replace(/\s/g, '')
      if (!/^\d{6}$/.test(code)) return json({ error: 'Enter the six-digit code shown in Orbit Calendar.' }, 400)
      const pair = await env.DB.prepare('SELECT id, created_at, mda_device_hash FROM pairings WHERE code = ?').bind(code).first()
      if (!pair || !pair.mda_device_hash || Date.now() - pair.created_at > 10 * 60 * 1000) return json({ error: 'That Orbit Calendar code is invalid or has expired.' }, 400)
      return json({ deviceId: pair.id, deviceHash: pair.mda_device_hash })
    }

    if (request.method === 'GET' && url.pathname === '/api/pair/status') {
      const id = url.searchParams.get('id')
      const device = await env.DB.prepare('SELECT device_id FROM devices WHERE device_id = ?').bind(id).first()
      if (device) return json({ status: 'connected', connected: true })
      const pair = await env.DB.prepare('SELECT id, code, created_at FROM pairings WHERE id = ?').bind(id).first()
      if (!pair) return json({ error: 'Pairing nicht gefunden oder abgelaufen.' }, 404)
      if (Date.now() - pair.created_at > 10 * 60 * 1000) {
        await env.DB.prepare('DELETE FROM pairings WHERE id = ?').bind(id).run()
        return json({ status: 'expired', connected: false, error: 'Pairing abgelaufen.' }, 410)
      }
      return json({ status: 'waiting', code: pair.code, connected: false })
    }

    if (request.method === 'POST' && url.pathname === '/api/pair/claim') {
      const body = await readJson(request)
      const code = String(body.code || '').replace(/\s/g, '')
      let deviceId
      if (code) {
        const pair = await env.DB.prepare('SELECT id, created_at, mda_device_hash FROM pairings WHERE code = ?').bind(code).first()
        if (!pair || Date.now() - pair.created_at > 10 * 60 * 1000) return json({ error: 'Code ungültig oder abgelaufen.' }, 400)
        deviceId = pair.mda_device_hash || pair.id
      } else {
        deviceId = await centralDeviceForSession(request).catch(() => null)
        if (!deviceId) return json({ error: 'Sign in to Meta Display Apps and link your glasses first, or enter the glasses code.' }, 401)
      }
      const source = normalizeSource(body)
      await fetchSource(source)
      const encrypted = await encrypt({ source, updatedAt: Date.now() }, env.ORBIT_STORAGE_KEY)
      await env.DB.batch([
        env.DB.prepare('INSERT OR REPLACE INTO devices (device_id, encrypted_data, updated_at) VALUES (?, ?, ?)')
          .bind(deviceId, encrypted, Date.now()),
        ...(code ? [env.DB.prepare('DELETE FROM pairings WHERE code = ?').bind(code)] : []),
      ])
      return json({ connected: true, deviceId })
    }

    if (request.method === 'POST' && url.pathname === '/api/calendar/fetch') {
      const source = normalizeSource(await readJson(request))
      return json({ events: await fetchSource(source), updatedAt: Date.now() })
    }

    if (request.method === 'GET' && url.pathname === '/api/glasses/status') {
      const deviceId = await resolveGlassesDeviceId(request, env, url.searchParams.get('deviceId'))
      const device = await env.DB.prepare('SELECT device_id FROM devices WHERE device_id = ?')
        .bind(deviceId).first()
      return json({ connected: Boolean(device) })
    }

    if (request.method === 'GET' && url.pathname === '/api/glasses/calendar') {
      const deviceId = await resolveGlassesDeviceId(request, env, url.searchParams.get('deviceId'))
      const device = await env.DB.prepare('SELECT encrypted_data FROM devices WHERE device_id = ?')
        .bind(deviceId).first()
      if (!device) return json({ error: 'Brille noch nicht gekoppelt.' }, 401)
      const state = await decrypt(device.encrypted_data, env.ORBIT_STORAGE_KEY)
      const events = await fetchSource(state.source)
      return json({ events, updatedAt: Date.now() })
    }

    if (request.method === 'POST' && url.pathname === '/api/disconnect') {
      const body = await readJson(request)
      if (body.deviceId) await env.DB.prepare('DELETE FROM devices WHERE device_id = ?').bind(body.deviceId).run()
      return json({ connected: false })
    }

    return json({ error: 'Nicht gefunden.' }, 404)
  } catch (error) {
    console.error(error)
    return json({ error: error.message || 'Anfrage fehlgeschlagen.' }, 502)
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) return route(request, env)
    let assetPath = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)
    let asset = staticAssets[assetPath]
    if (!asset && !pathExtension(assetPath)) {
      assetPath = '/index.html'
      asset = staticAssets[assetPath]
    }
    if (!asset) return new Response('Not found', { status: 404 })
    const body = asset.encoding === 'base64'
      ? Uint8Array.from(atob(asset.body), (character) => character.charCodeAt(0))
      : asset.body
    return new Response(body, {
      headers: {
        'Content-Type': asset.contentType,
        'Cache-Control': assetPath.startsWith('/assets/')
          ? 'public, max-age=31536000, immutable'
          : 'no-cache',
      },
    })
  },
}

function pathExtension(pathname) {
  return /\.[a-z0-9]+$/i.test(pathname)
}

