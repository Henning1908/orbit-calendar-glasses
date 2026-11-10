# Orbit Calendar

Orbit is a glance-first calendar inspired by the supplied 10-year planner reference. It is designed for a narrow, high-contrast display such as Meta Display glasses while remaining usable as a responsive web app.

## Features

- Large, glanceable month grid with keyboard-friendly navigation
- Local event presets and browser persistence
- ICS export for importing the calendar into DAVx5
- DAVx5 handoff link, manual sync, and automatic refresh on focus/visibility/online events
- No credentials are stored by the web app

## Development

```bash
npm install
npm run dev
```

## DAVx5 workflow

DAVx5 is the Android CalDAV/CardDAV sync client. Use **Open DAVx5** to hand the saved collection URL to the Android app, then let DAVx5 synchronize the account. Orbit automatically tries to reload the configured URL on startup, every 60 seconds, and whenever the page regains focus, becomes visible, or comes back online. **Load DAVx5 updates** also triggers an immediate reload.

The browser can only import updates directly when the URL returns an ICS feed and permits CORS. A standard authenticated CalDAV collection usually returns WebDAV XML rather than ICS, so production should add a same-origin CalDAV proxy/serverless function. It must keep provider credentials server-side and expose only the user's authenticated calendar collection to the app. ICS export remains available as a safe fallback.
