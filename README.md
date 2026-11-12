<div align="center">

<img src="docs/assets/orbit-hero.svg" alt="Orbit Calendar with a month view for the web and Meta display glasses" width="100%">

# Orbit Calendar

### Your calendar, in one clear glance.

A calm, glance-first calendar for the web and Meta display glasses. Connect a read-only ICS feed or a private CalDAV calendar, pair the glasses with a short code, and keep upcoming plans close.

[Open Orbit Calendar](https://orbit-calendar.henning-orbit-calendar.workers.dev/) · [Read the guide](https://orbit-calendar.henning-orbit-calendar.workers.dev/guide.html)

Part of **Meta Display Apps** — explore [WebUntis Glasses](https://webuntis-glasses.henning-orbit-calendar.workers.dev/) for your school timetable.

[English guide](https://orbit-calendar.henning-orbit-calendar.workers.dev/guide.html) · [Anleitung auf Deutsch](https://orbit-calendar.henning-orbit-calendar.workers.dev/guide.de.html) · [☕ Buy me a coffee](https://gofund.me/89190630b)

</div>

---

## Start in a minute

For Meta glasses setup, open the [online guide](https://orbit-calendar.henning-orbit-calendar.workers.dev/guide.html) on your phone or computer. It includes a QR install link to add Orbit to the glasses, then walks you through calendar pairing. The glasses refresh events automatically. No Orbit account or payment is required.

> Need help finding your provider's CalDAV address? See the [step-by-step guide](https://orbit-calendar.henning-orbit-calendar.workers.dev/guide.html) or the [German version](https://orbit-calendar.henning-orbit-calendar.workers.dev/guide.de.html).

## What Orbit does

| Feature | How it works |
| --- | --- |
| Calendar at a glance | Navigate by month, select a day, add local plans, and export an `.ics` file. |
| Read-only calendar sync | Load a public ICS feed, or use a CalDAV URL and credentials. Orbit reads events; it does not write changes back to your provider. |
| Meta display glasses | Pair with a six-digit code and show upcoming events in a compact display view. |
| Automatic refresh | The glasses page fetches current events every 60 seconds and when reopened. |
| Privacy-aware storage | CalDAV credentials for a paired device are encrypted before storage. The glasses keep a device token, not your calendar password. |

![Orbit Calendar service diagram: browser and glasses connect to the Cloudflare Worker, which reads ICS or CalDAV events and stores encrypted pairing data in D1](docs/assets/architecture.svg)

## Privacy and data

- Calendar reads are **read-only**. Local plans stay in the browser and are not uploaded to CalDAV.
- A browser-only CalDAV password stays in the open page's memory and is not saved in browser storage.
- When you pair the glasses, Orbit stores the CalDAV connection encrypted on its secure Cloudflare-hosted service.
- Calendar events are fetched from your provider when requested; Orbit does not keep a copy of the event list in its secure storage.
- Disconnect the glasses from the glasses page to remove their saved server connection.

The hosted service runs on Cloudflare. The public guides explain setup and privacy without requiring developer documentation.

## Develop locally

```sh
npm install
npm run dev
```

Vite serves the interface locally. The production API runs in the Cloudflare Worker; the glasses pairing and sync flow therefore needs the deployed app or a local Worker environment.

To use the optional local Node API with Vite, set `ORBIT_STORAGE_KEY` and run `npm start` in a second terminal. It listens on loopback port 3000, matching Vite's `/api` proxy, and stores encrypted connections under the ignored `.data/` directory. This local fallback does not support Meta Display Apps account linking; use the deployed app or Wrangler local Worker for that flow.

For architecture, deployment, and maintenance details, see the maintainer docs: [architecture](docs/ARCHITECTURE.md) · [deployment](docs/DEPLOYMENT.md). Do not commit `.env.cloudflare-secret` or calendar credentials.

## License

Orbit Calendar is licensed under the [MIT License](LICENSE). You may use, modify, and redistribute the project, including commercially, provided you keep the copyright and license notice in copies or substantial portions. Credit: **Henning1908**. The license does not grant rights to third-party trademarks.

