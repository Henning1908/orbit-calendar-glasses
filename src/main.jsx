import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const PRESETS = [
  { title: 'Focus block', type: 'focus', icon: '◒' },
  { title: 'Workout', type: 'personal', icon: '✦' },
  { title: 'Appointment', type: 'important', icon: '◈' },
  { title: 'Birthday', type: 'personal', icon: '✧' },
  { title: 'Reminder', type: 'urgent', icon: '!' },
]

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function dateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function buildCalendarDays(monthDate) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const start = new Date(year, month, 1 - firstDay.getDay())
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}

function escapeIcs(value) {
  return value.replace(/[\\;,]/g, (match) => `\\${match}`).replace(/\n/g, '\\n')
}

function makeIcs(events) {
  const rows = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Orbit Calendar//EN']
  Object.entries(events).forEach(([date, dayEvents]) => {
    dayEvents.forEach((event, index) => {
      rows.push(
        'BEGIN:VEVENT',
        `UID:${date}-${index}@orbit-calendar`,
        `DTSTAMP:${date.replaceAll('-', '')}T000000Z`,
        `DTSTART;VALUE=DATE:${date.replaceAll('-', '')}`,
        `SUMMARY:${escapeIcs(event.title)}`,
        `CATEGORIES:${event.type}`,
        'END:VEVENT',
      )
    })
  })
  rows.push('END:VCALENDAR')
  return rows.join('\r\n')
}

function unescapeIcs(value) {
  return value.replace(/\\n/gi, '\n').replace(/\\([\\;,])/g, '$1')
}

function parseIcs(text) {
  const parsed = {}
  const blocks = text.split(/BEGIN:VEVENT/i).slice(1)
  blocks.forEach((block) => {
    const dateMatch = block.match(/(?:^|\r?\n)DTSTART(?:;[^:]*)?:([0-9]{8})/i)
    const titleMatch = block.match(/(?:^|\r?\n)SUMMARY(?:;[^:]*)?:([^\r\n]*)/i)
    if (!dateMatch || !titleMatch) return
    const date = `${dateMatch[1].slice(0, 4)}-${dateMatch[1].slice(4, 6)}-${dateMatch[1].slice(6, 8)}`
    const title = unescapeIcs(titleMatch[1].trim())
    parsed[date] = [...(parsed[date] || []), { title, type: 'synced', icon: '↻' }]
  })
  return parsed
}

function App() {
  const today = useMemo(() => new Date(), [])
  const [monthDate, setMonthDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(today)
  const [events, setEvents] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('orbit-events') || '{}')
    } catch {
      return {}
    }
  })
  const [screen, setScreen] = useState('calendar')
  const [showSettings, setShowSettings] = useState(false)
  const [caldavUrl, setCaldavUrl] = useState(() => localStorage.getItem('orbit-caldav-url') || '')
  const [caldavUsername, setCaldavUsername] = useState('')
  const [caldavPassword, setCaldavPassword] = useState('')
  const [syncMessage, setSyncMessage] = useState('Local calendar ready')
  const [isSyncing, setIsSyncing] = useState(false)
  const [touchStart, setTouchStart] = useState(null)
  const [pairCode, setPairCode] = useState('')
  const [pairMessage, setPairMessage] = useState('')

  const days = useMemo(() => buildCalendarDays(monthDate), [monthDate])
  const selectedKey = dateKey(selectedDate)
  const selectedEvents = events[selectedKey] || []
  const monthLabel = `${MONTH_NAMES[monthDate.getMonth()]} ${monthDate.getFullYear()}`

  async function syncFromCalendarFeed() {
    if (!caldavUrl) {
      setSyncMessage('Add a CalDAV or ICS URL first')
      return
    }
    setIsSyncing(true)
    try {
      const response = await fetch('/api/calendar/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedUrl: caldavUsername && caldavPassword ? undefined : caldavUrl,
          caldav: caldavUsername && caldavPassword
            ? { url: caldavUrl, username: caldavUsername, password: caldavPassword }
            : undefined,
        }),
      })
      const rawBody = await response.text()
      if (!response.ok) {
        let detail = ''
        try {
          detail = JSON.parse(rawBody).error || ''
        } catch {
          detail = rawBody.slice(0, 120)
        }
        if (response.status === 401 || /HTTP 401/.test(detail)) {
          throw new Error('Calendar access denied (401). Check the calendar address and sign-in details.')
        }
        throw new Error(detail || `HTTP ${response.status}`)
      }
      if (!rawBody.trim()) {
        throw new Error('The API returned an empty response. Open the Cloudflare app URL, not a local static preview.')
      }
      let body
      try {
        body = JSON.parse(rawBody)
      } catch {
        throw new Error('The API returned an invalid response. Reload the Cloudflare app and try again.')
      }
      const remoteEvents = (body.events || []).reduce((result, event) => {
        result[event.date] = [...(result[event.date] || []), event]
        return result
      }, {})
      setEvents((current) => {
        const localOnly = Object.fromEntries(
          Object.entries(current).map(([date, dayEvents]) => [
            date,
            dayEvents.filter((event) => event.type !== 'synced'),
          ]).filter(([, dayEvents]) => dayEvents.length),
        )
        const next = { ...localOnly, ...remoteEvents }
        localStorage.setItem('orbit-events', JSON.stringify(next))
        return next
      })
      setSyncMessage(`Updated from calendar feed · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
    } catch (error) {
      setSyncMessage(`Sync unavailable: ${error.message}`)
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    if (!caldavUrl) return undefined
    syncFromCalendarFeed()
    const interval = window.setInterval(syncFromCalendarFeed, 60_000)
    const refresh = () => {
      if (document.visibilityState !== 'hidden') syncFromCalendarFeed()
    }
    window.addEventListener('focus', refresh)
    window.addEventListener('pageshow', refresh)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('online', refresh)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('pageshow', refresh)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('online', refresh)
    }
  }, [caldavUrl])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (showSettings || screen !== 'calendar') return
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        changeMonth(-1)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        changeMonth(1)
      } else if (event.key.toLowerCase() === 't') {
        event.preventDefault()
        jumpToToday()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [screen, showSettings])

  useEffect(() => {
    const refreshFromOtherTab = (event) => {
      if (event.key !== 'orbit-events' || !event.newValue) return
      try {
        setEvents(JSON.parse(event.newValue))
        setSyncMessage('Updated from another calendar tab')
      } catch {
        setSyncMessage('Calendar update could not be loaded')
      }
    }
    window.addEventListener('storage', refreshFromOtherTab)
    return () => window.removeEventListener('storage', refreshFromOtherTab)
  }, [])

  function handleTouchStart(event) {
    setTouchStart(event.changedTouches[0].clientX)
  }

  function handleTouchEnd(event) {
    if (touchStart === null || screen !== 'calendar' || showSettings) return
    const distance = event.changedTouches[0].clientX - touchStart
    if (Math.abs(distance) >= 55) changeMonth(distance > 0 ? -1 : 1)
    setTouchStart(null)
  }

  function changeMonth(offset) {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  function jumpToToday() {
    setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelectedDate(today)
  }

  function addEvent(preset) {
    const next = {
      ...events,
      [selectedKey]: [...(events[selectedKey] || []), { title: preset.title, type: preset.type }],
    }
    setEvents(next)
    localStorage.setItem('orbit-events', JSON.stringify(next))
    setScreen('calendar')
  }

  function deleteEvents() {
    const next = { ...events }
    delete next[selectedKey]
    setEvents(next)
    localStorage.setItem('orbit-events', JSON.stringify(next))
  }

  function exportCalendar() {
    const blob = new Blob([makeIcs(events)], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'orbit-calendar.ics'
    link.click()
    URL.revokeObjectURL(url)
    setSyncMessage('ICS export downloaded')
  }

  function saveCalDav() {
    localStorage.setItem('orbit-caldav-url', caldavUrl)
    setSyncMessage(caldavUrl ? 'Calendar address saved on this device' : 'Calendar address cleared')
    setShowSettings(false)
  }

  async function connectGlasses() {
    const normalizedCode = pairCode.replace(/\s/g, '')
    if (!/^\d{6}$/.test(normalizedCode)) {
      setPairMessage('Enter the 6-digit code shown on the glasses.')
      return
    }
    if (!caldavUrl) {
      setPairMessage('Enter the CalDAV base URL first.')
      return
    }
    if (!caldavUsername || !caldavPassword) {
      setPairMessage('Enter the CalDAV username and password.')
      return
    }
    setPairMessage('Checking the feed and connecting…')
    try {
      const response = await fetch('/api/pair/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: normalizedCode,
          caldav: {
            url: caldavUrl,
            username: caldavUsername,
            password: caldavPassword,
          },
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Pairing failed')
      setPairMessage('Connected. The glasses will refresh automatically.')
    } catch (error) {
      setPairMessage(error.message)
    }
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />
      <section className="app-frame" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <header className="topbar">
          <div>
            <div className="brand-kicker"><img className="brand-logo" src="/images/meta-display-apps-app-icon-v2.svg" alt="Meta Display Apps" /><p className="eyebrow">META DISPLAY APPS / ORBIT</p></div>
            <h1>{screen === 'calendar' ? monthLabel : 'New event'}</h1>
            <p className="subheading">
              {screen === 'calendar' ? '2026—2036 planner' : formatLongDate(selectedDate)}
            </p>
          </div>
          <button className="icon-button" onClick={() => setShowSettings(true)} aria-label="Open sync settings">
            <span>☷</span>
          </button>
        </header>

        {screen === 'calendar' ? (
          <>
            <section className="toolbar" aria-label="Calendar navigation">
              <button onClick={() => changeMonth(-1)} aria-label="Previous month">‹</button>
              <button onClick={jumpToToday}>Today</button>
              <button onClick={() => changeMonth(1)} aria-label="Next month">›</button>
            </section>

            <section className="weekdays">
              {DAY_NAMES.map((day) => <span key={day}>{day}</span>)}
            </section>

            <section className="calendar-grid" aria-label="Calendar month">
              {days.map((date) => {
                const key = dateKey(date)
                const isSelected = key === selectedKey
                const isCurrentMonth = date.getMonth() === monthDate.getMonth()
                const isToday = key === dateKey(today)
                return (
                  <button
                    className={`day-cell ${isSelected ? 'selected' : ''} ${!isCurrentMonth ? 'outside' : ''}`}
                    key={key}
                    onClick={() => setSelectedDate(date)}
                    aria-label={`${formatLongDate(date)}${events[key] ? `, ${events[key].length} events` : ''}`}
                  >
                    <span>{date.getDate()}</span>
                    {isToday && <i className="today-dot" />}
                    {events[key]?.length > 0 && <em>{events[key].length}</em>}
                  </button>
                )
              })}
            </section>

            <section className="detail-card">
              <div className="card-kicker"><span /> DAILY PLAN</div>
              <h2>{formatLongDate(selectedDate)}</h2>
              <p className="event-summary">
                <span className="status-dot" />
                {selectedEvents.length ? `${selectedEvents.length} plan${selectedEvents.length === 1 ? '' : 's'}` : 'No plans'}
                <small> · {selectedKey}</small>
              </p>
              <div className="event-list">
                {selectedEvents.map((event, index) => (
                  <div className={`event-pill ${event.type}`} key={`${event.title}-${index}`}>
                    <span>{event.title}</span><b>{event.icon || '•'}</b>
                  </div>
                ))}
              </div>
              <div className="actions">
                <button className="primary-action" onClick={() => setScreen('add')}>Add plan</button>
                <button className="danger-action" onClick={deleteEvents} disabled={!selectedEvents.length}>Delete</button>
              </div>
            </section>
            <div className="glance-footer" aria-live="polite">
              <span>Swipe or ← → month</span>
              <span>T = today</span>
              <a className="help-link" href="/guide.html">Setup guide</a>
              <a className="support-link" href="https://gofund.me/89190630b" target="_blank" rel="noopener noreferrer">☕ Buy me a coffee</a>
              <button className="sync-link" onClick={syncFromCalendarFeed} disabled={isSyncing}>
                {isSyncing ? 'syncing…' : '↻ sync now'}
              </button>
              <span className="sync-state">{syncMessage}</span>
            </div>
          </>
        ) : (
          <section className="add-screen">
            <p className="muted">Choose a preset for {formatLongDate(selectedDate)}</p>
            <div className="preset-list">
              {PRESETS.map((preset) => (
                <button className="preset-button" key={preset.title} onClick={() => addEvent(preset)}>
                  <span className={`preset-icon ${preset.type}`}>{preset.icon}</span>
                  <span>{preset.title}</span>
                  <b>＋</b>
                </button>
              ))}
            </div>
            <button className="back-button" onClick={() => setScreen('calendar')}>Cancel</button>
          </section>
        )}
      </section>

      {showSettings && (
        <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
          <section className="settings-card" onClick={(event) => event.stopPropagation()}>
            <div className="settings-heading">
              <div>
                <p className="eyebrow">SYNC / CALENDAR</p>
                <h2>Calendar feed</h2>
              </div>
              <button className="icon-button" onClick={() => setShowSettings(false)} aria-label="Close settings">×</button>
            </div>
            <p className="muted">
              Add a public ICS feed or a CalDAV server URL with your username and app password. Calendar sync is read-only. Your browser password is not saved; a glasses connection is stored encrypted on the Orbit server after pairing.
            </p>
            <label>
              CalDAV base or calendar URL
              <input
                value={caldavUrl}
                onChange={(event) => setCaldavUrl(event.target.value)}
                placeholder="https://cloud.example.com/remote.php/dav/calendars/..."
              />
            </label>
            <label>
              CalDAV username
              <input
                autoComplete="username"
                value={caldavUsername}
                onChange={(event) => setCaldavUsername(event.target.value)}
                placeholder="your username"
              />
            </label>
            <label>
              CalDAV password or app password
              <input
                type="password"
                autoComplete="current-password"
                value={caldavPassword}
                onChange={(event) => setCaldavPassword(event.target.value)}
                placeholder="Only sent over HTTPS"
              />
            </label>
            <div className="settings-actions">
              <button className="primary-action" onClick={saveCalDav}>Save address</button>
              <button className="secondary-action" onClick={exportCalendar}>Export .ics</button>
            </div>
            <div className="settings-actions">
              <button className="secondary-action" onClick={syncFromCalendarFeed} disabled={isSyncing}>
                {isSyncing ? 'Syncing…' : 'Sync calendar'}
              </button>
            </div>
            <div className="pairing-card">
              <strong>Connect glasses</strong>
              <span>Open <code>/glasses.html</code> on the glasses, then enter the 6-digit code shown there. The credentials stay on the Orbit server and are not sent to the glasses.</span>
              <input
                inputMode="numeric"
                maxLength="7"
                value={pairCode}
                onChange={(event) => setPairCode(event.target.value)}
                placeholder="123 456"
                aria-label="Six-digit glasses pairing code"
              />
              <button className="primary-action" onClick={connectGlasses}>Send calendar to glasses</button>
              {pairMessage && <span className="pair-message">{pairMessage}</span>}
            </div>
            <div className="davx5-note">
              <strong>CALDAV / ACCESS</strong>
              <span>Use the CalDAV server address from your calendar provider. Orbit reads events from the server; it cannot access the Android Calendar Provider directly. For a private glasses connection, use an app password when your provider offers one.</span>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

createRoot(document.getElementById('root')).render(<App />)

