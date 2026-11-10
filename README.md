# Orbit Calendar

Orbit is a **web app**: a glance-first calendar inspired by the supplied planner reference and optimized for a narrow, high-contrast screen such as Meta Display glasses. It runs in a normal browser and can be published as a static site on Render.

[Deutsche Setup-Anleitung: **SETUP.md**](SETUP.md)

## Features

- Large, glanceable month grid with keyboard-friendly navigation
- Local event presets and browser persistence
- ICS export for importing or sharing calendar data with DAVx5
- CalDAV/ICS URL refresh with manual sync and automatic reload on focus, visibility, and reconnect
- Responsive layout suitable for phone, desktop, and browser-based wearable experiences
- No calendar credentials stored by the app

## Development

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

## Deploy on Render

This repository includes `render.yaml` for a static-site deployment:

- **Build command:** `npm ci && npm run build`
- **Publish directory:** `dist`

The site is intentionally a client-side web app. Render hosts the interface; it does not receive DAVx5 passwords or CalDAV credentials.

## DAVx5 and browser limitations

DAVx5 remains the calendar sync app on Android. A browser cannot read DAVx5's private Android Calendar Provider or reuse the DAVx5 login session. Orbit therefore supports two web-safe flows:

1. Configure an ICS feed or a public/CORS-enabled calendar endpoint in the settings and use **Load DAVx5 updates**.
2. Use **Export .ics** and import the file into DAVx5.

Most authenticated CalDAV collections return WebDAV XML and do not allow browser CORS requests. For a production connection to a private CalDAV server, add a same-origin server-side proxy or use an ICS feed. The proxy must keep credentials server-side and must never expose them to the browser.

## Meta Display glasses

The project is intentionally the **web-app option**, not a native Android application or an APK. The calendar is displayed by opening the deployed site in a browser environment supported by the glasses. The web app cannot use Meta's native Device Access Toolkit directly, so native-only capabilities such as direct device pairing, background delivery, or reading DAVx5's Android provider are outside this repository's scope.

The UI is designed to remain readable on a narrow display: high contrast, large type, compact event cards, and no dependency on hover interactions.
