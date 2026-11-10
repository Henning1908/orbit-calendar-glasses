# Orbit Calendar

Orbit has two parts:

- a glance-first web app for the calendar UI and Render preview
- an Android companion that reads calendars synchronized by DAVx5 and sends them to Meta Display glasses

## Data flow

```text
DAVx5 on phone
      ↓ CalDAV sync
Android Calendar Provider
      ↓ READ_CALENDAR
Orbit Android companion
      ↓ Meta Wearables Device Access Toolkit
Meta Display glasses
```

DAVx5 remains the only component that stores the CalDAV login. Orbit does not ask for or store your DAVx5 password.

## Web app

```bash
npm install
npm run dev
npm run build
```

The web preview is published at <https://orbit-calendar-glasses.onrender.com/>. It is useful for the calendar UI, local events, ICS export, and optional CORS-enabled ICS feeds. It cannot itself read the Android Calendar Provider or keep a phone-to-glasses connection in the background.

## Android companion

The `androidApp` module is the actual phone connection:

1. Install and sign in to DAVx5 on the phone.
2. Let DAVx5 synchronize the desired calendars.
3. Install the Orbit debug APK from the GitHub Actions artifact.
4. Allow calendar and Bluetooth permissions.
5. Press **Connect Meta display glasses**.
6. Orbit reads the Android Calendar Provider and republishes changes to the glasses automatically.

Builds are produced by `.github/workflows/build-android.yml`. Android Studio is only needed for local development; normal users can download the APK artifact from GitHub Actions.

See [SETUP.md](SETUP.md) for the complete setup.
