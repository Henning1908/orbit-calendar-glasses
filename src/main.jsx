import { useEffect, useMemo, useState } from 'react'
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
  return date.toISOString().slice(0, 10)
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
  const [syncMessage, setSyncMessage] = useState('Local calendar ready')
  const [isSyncing, setIsSyncing] = useState(false)

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
      const response = await fetch(caldavUrl, { cache: 'no-store', headers: { Accept: 'text/calendar, text/plain, application/xml' } })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = await response.text()
      if (!body.includes('BEGIN:VCALENDAR')) {
        throw new Error('The server did not return an ICS feed')
      }
      const remoteEvents = parseIcs(body)
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
      setSyncMessage(`Updated from DAVx5 · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
    } catch (error) {
      setSyncMessage(`Sync unavailable: ${error.message}`)
    } finally {
      setIsSyncing(false)
    }
  }

  function openDavx5() {
    if (!caldavUrl) {
      setSyncMessage('Save a CalDAV URL before opening DAVx5')
      return
    }
    const deepLink = `davx5://${caldavUrl.replace(/^https?:\/\//, '')}`
    window.location.href = deepLink
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
    setSyncMessage(caldavUrl ? 'DAVx5 connection details saved locally' : 'CalDAV URL cleared')
    setShowSettings(false)
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />
      <section className="app-frame">
        <header className="topbar">
          <div>
            <p className="eyebrow">ORBIT / GLANCE MODE</p>
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
            <div className="glance-footer">
              <span>← → navigate</span>
              <span>Enter select</span>
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
                <p className="eyebrow">SYNC / DAVX5</p>
                <h2>CalDAV bridge</h2>
              </div>
              <button className="icon-button" onClick={() => setShowSettings(false)} aria-label="Close settings">×</button>
            </div>
            <p className="muted">
              Orbit is a browser calendar for phone, desktop, and supported Meta display browser environments. Use an ICS feed for web refreshes or export an ICS file for DAVx5.
            </p>
            <label>
              CalDAV collection URL
              <input
                value={caldavUrl}
                onChange={(event) => setCaldavUrl(event.target.value)}
                placeholder="https://cloud.example.com/remote.php/dav/calendars/..."
              />
            </label>
            <div className="settings-actions">
              <button className="primary-action" onClick={saveCalDav}>Save connection</button>
              <button className="secondary-action" onClick={exportCalendar}>Export .ics</button>
            </div>
            <div className="settings-actions">
              <button className="secondary-action" onClick={syncFromCalendarFeed} disabled={isSyncing}>
                {isSyncing ? 'Loading…' : 'Load DAVx5 updates'}
              </button>
              <button className="secondary-action" onClick={openDavx5}>Open DAVx5</button>
            </div>
            <div className="davx5-note">
              <strong>DAVx5 setup</strong>
              <span>Orbit does not reuse a DAVx5 login. It can reload an ICS feed on focus, visibility, reconnect, and every 60 seconds. The feed must allow CORS; private CalDAV servers usually need a same-origin proxy.</span>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

createRoot(document.getElementById('root')).render(<App />)
