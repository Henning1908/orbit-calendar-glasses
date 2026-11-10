# Cloudflare deployment

This project serves its website and API from one Cloudflare Worker. D1 stores small pairing and encrypted connection records. The hosted app uses the Workers Free and D1 Free quotas; check current [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) and [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) before changing the deployment.

## Requirements

- Node.js 20 or newer and npm
- A Cloudflare account with the Workers Free plan available
- Wrangler CLI, installed by `npm install`

## Existing Orbit deployment

The repository's `wrangler.jsonc` points to the existing `orbit-calendar` Worker and D1 database. For a fresh Cloudflare account, create a D1 database, update `database_id` in `wrangler.jsonc`, and apply the migration before deployment.

```sh
npm install
npx wrangler login
npx wrangler d1 migrations apply orbit-calendar --remote
```

Set the encryption key once. Generate a long random value and keep it in a password manager. **Do not rotate or lose the key while devices are connected**, and never add it to Git.

```sh
npx wrangler secret put ORBIT_STORAGE_KEY
```

Build and publish:

```sh
npm run deploy:cloudflare
```

The build creates `dist/`, then packages the static files into an ignored generated module at `src/cloudflare-assets.js` for the Worker. `wrangler.jsonc` binds D1 as `DB`; `ORBIT_STORAGE_KEY` is a Worker secret, not a checked-in variable.

The Meta display web app manifest is served at `/.well-known/meta-wearables-manifest.json`. Keep its icon URL on HTTPS and use transparent monochrome artwork; the current 512 × 512 PNG is generated from `docs/assets/meta-display-apps-monochrome.svg` and served as binary PNG data by the Worker.

## Verify the deployment

- Open `/` and `/glasses.html` on the Worker URL.
- Confirm the app can read a public test ICS feed.
- Pair a glasses browser and confirm `/api/glasses/calendar` returns events.
- Disconnect the device and verify that it no longer reports as connected.

Never use real calendar credentials in test fixtures. CalDAV provider behavior varies; validate with a dedicated test calendar before relying on a new provider.

## Local development

```sh
npm install
npm run dev
```

Vite serves the interface only. For a local API, use Wrangler's local Worker environment and a local D1 database; do not use `vite preview` to test API routes.

## Data and operations

- D1 schema changes belong in `migrations/` and should be applied with `wrangler d1 migrations apply orbit-calendar --remote`.
- Keep `ORBIT_STORAGE_KEY` backed up. A replacement key cannot decrypt connection records encrypted with the old key.
- Pairing codes expire after 10 minutes. Old pending codes are cleaned up when a new code is created.
- If a Free quota is reached, requests can fail until the quota resets. Do not switch to a paid plan without reviewing the expected cost first.

