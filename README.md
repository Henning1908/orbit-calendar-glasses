# Orbit Calendar

Orbit is a glance-first calendar inspired by the supplied 10-year planner reference. It is designed for a narrow, high-contrast display such as Meta Display glasses while remaining usable as a responsive web app.

## Features

- Large, glanceable month grid with keyboard-friendly navigation
- Local event presets and browser persistence
- ICS export for importing the calendar into DAVx5
- DAVx5 handoff link, manual sync, and automatic refresh on focus/visibility/online events
- Native Android companion that reads DAVx5-synced events from Android Calendar Provider
- No credentials are stored by the web app

## Development

```bash
npm install
npm run dev
```

## DAVx5 workflow

DAVx5 is the Android CalDAV/CardDAV sync client. Use **Open DAVx5** to hand the saved collection URL to the Android app, then let DAVx5 synchronize the account. Orbit automatically tries to reload the configured URL on startup, every 60 seconds, and whenever the page regains focus, becomes visible, or comes back online. **Load DAVx5 updates** also triggers an immediate reload.

The browser can only import updates directly when the URL returns an ICS feed and permits CORS. A standard authenticated CalDAV collection usually returns WebDAV XML rather than ICS, so production should add a same-origin CalDAV proxy/serverless function. It must keep provider credentials server-side and expose only the user's authenticated calendar collection to the app. ICS export remains available as a safe fallback.

## Native Android companion

The `androidApp` module is the real phone integration for DAVx5:

```text
DAVx5 login + sync
        ↓
Android Calendar Provider
        ↓  READ_CALENDAR permission
Orbit Android companion
        ↓
Meta wearable bridge
```

DAVx5 remains logged in and owns the CalDAV credentials. Orbit does not authenticate against DAVx5 and does not store those credentials. The companion requests `READ_CALENDAR`, queries `CalendarContract.Instances`, and registers a `ContentObserver`, so changes made by DAVx5 are reflected automatically. The `GlassesBridge` interface is intentionally isolated in `androidApp/src/main/java/.../GlassesBridge.kt`; replace `NoOpGlassesBridge` with the Meta Wearables Device Access Toolkit adapter once the Meta app identifiers and SDK dependency are configured.

Open the repository in Android Studio and run the `androidApp` configuration on an Android phone. After installing, grant calendar access; the app then displays the events DAVx5 has already synchronized. A Meta glasses adapter is the final device-specific step and cannot be tested from the browser-only Vite preview.
