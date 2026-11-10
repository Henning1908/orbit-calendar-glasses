# Orbit Calendar

Orbit is a glance-first calendar inspired by the supplied 10-year planner reference. It is designed for a narrow, high-contrast display such as Meta Display glasses while remaining usable as a responsive web app.

## Features

- Large, glanceable month grid with keyboard-friendly navigation
- Local event presets and browser persistence
- ICS export for importing the calendar into DAVx5
- CalDAV collection URL field and setup guidance for DAVx5
- No credentials are stored by the web app

## Development

```bash
npm install
npm run dev
```

## DAVx5 workflow

DAVx5 is the Android CalDAV/CardDAV sync client, so the browser app does not authenticate directly against it. Configure your CalDAV provider in DAVx5, then use Orbit's **Export .ics** action to import plans into that calendar. The saved collection URL is only a local reminder for the account/collection you use.

For production, the next integration step is a small same-origin CalDAV proxy or serverless function. It should keep provider credentials server-side and expose only the user's authenticated calendar collection to the app.
