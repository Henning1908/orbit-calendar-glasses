# Orbit Calendar

Orbit Calendar runs as one Cloudflare Worker. The Worker serves the calendar website and the API used by the Meta display glasses; Cloudflare D1 stores device pairings and encrypted CalDAV credentials.

## Live app

- Calendar: <https://orbit-calendar.henning-orbit-calendar.workers.dev/>
- Meta display glasses: <https://orbit-calendar.henning-orbit-calendar.workers.dev/glasses.html>

## Calendar sync

The browser can sync a public ICS feed. For a private calendar, pair the glasses from the app settings using the CalDAV server URL, username, and an app password. Orbit checks that connection on the server and stores its credentials encrypted with AES-GCM; the glasses receive only a device token and calendar events. The glasses page requests updated events every 60 seconds and when it becomes active again.

## Local development

```sh
npm install
npm run dev
```

The local Vite preview serves the UI only. The production API runs in the Cloudflare Worker.

## Cloudflare deployment

This repository is configured for the existing Cloudflare Worker and D1 database. Install dependencies and authenticate Wrangler, then set the encryption secret once:

```sh
npm install
npx wrangler login
npx wrangler secret put ORBIT_STORAGE_KEY
npm run deploy:cloudflare
```

Use a long random value for `ORBIT_STORAGE_KEY` and keep it stable after users connect calendars. Never commit it. Database schema changes live in `migrations/` and are applied with `npx wrangler d1 migrations apply orbit-calendar --remote`.

## Free tier

The app uses Workers and D1 without a paid Render service. Cloudflare's free limits apply: Workers has a daily request limit, and D1 has daily row read/write and storage limits. Requests stop working when a free limit is reached until it resets, so usage must stay within those limits to remain free. See Cloudflare's [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) and [D1 pricing and included usage](https://developers.cloudflare.com/d1/platform/pricing/).
