# Orbit Calendar

Orbit is a glance-first calendar web app for phone, desktop, and supported Meta display web environments.

## Live app

<https://orbit-calendar-glasses.onrender.com/>

The site is deployed as a Render Static Site from the `main` branch:

- Build command: `npm ci && npm run build`
- Publish directory: `dist`

## Features

- High-contrast month calendar with large controls
- Touch and swipe-friendly navigation
- Keyboard navigation with `←`, `→`, and `T` for today
- Local event presets stored in the browser
- ICS export
- Optional ICS feed refresh with automatic reload on focus, reconnect, visibility changes, and a 60-second interval
- Responsive layout for narrow displays

## Local development

```bash
npm install
npm run dev
npm run build
```

## DAVx5

The web app does not need Meta Developer credentials, an Android project, or an APK.

A browser cannot directly reuse a DAVx5 login on an Android phone or read the phone's private Android Calendar Provider. To load updates in the web app, use an ICS feed that is reachable from the browser and allows CORS:

See the complete step-by-step guide in [SETUP.md – ICS-Feed einrichten](SETUP.md#3-ics-feed-einrichten).

The feed is refreshed on startup, every 60 seconds, and when the page becomes active again. A normal private CalDAV collection usually cannot be loaded directly from a browser; it requires a server-side proxy or a CORS-enabled ICS endpoint.

## Meta display glasses

Open the live URL in a browser or web-app environment supported by the specific glasses:

<https://orbit-calendar-glasses.onrender.com/>

The web app uses standard HTML, CSS, and JavaScript. It does not use the Meta Wearables Device Access Toolkit and therefore does not require `mwdat_application_id`, `mwdat_client_token`, GitHub Actions secrets, Bluetooth permissions, or Android Studio.
