# Orbit Calendar user guide

Orbit Calendar is a read-only calendar viewer for the web and supported Meta display browsers. You can connect a public ICS feed or a private CalDAV calendar. The calendar does not change events in your provider.

**Open the app:** [Calendar](https://orbit-calendar.henning-orbit-calendar.workers.dev/) · [Glasses view](https://orbit-calendar.henning-orbit-calendar.workers.dev/glasses.html) · [German guide](USER_GUIDE.de.md)

## Connect Meta display glasses

### 1. Open the glasses view

On the glasses, open:

<https://orbit-calendar.henning-orbit-calendar.workers.dev/glasses.html>

Keep that page open while pairing. It shows a six-digit code and checks whether the connection has been completed. Pairing codes expire after 10 minutes.

### 2. Add your calendar on a phone or computer

Open the [main calendar](https://orbit-calendar.henning-orbit-calendar.workers.dev/) on another device. Open **Settings** (the menu icon) and enter:

- **CalDAV base or calendar URL:** the HTTPS address supplied by your calendar provider.
- **CalDAV username:** your account name or email, as required by the provider.
- **CalDAV password:** use an app-specific password if the provider offers one.
- **Pairing code:** the six digits shown on the glasses.

Choose **Send calendar to glasses**. Orbit checks that it can read the calendar before saving the connection. The status on the glasses changes to **Connected** when pairing succeeds.

### 3. Keep the display current

Leave the glasses page open and connected to the internet. Orbit fetches updated events about once a minute. Reopening the page also fetches the latest events. The glasses show the next eight events from today in chronological order, with a date on each entry; events earlier today are hidden.

To remove the server connection, choose **Disconnect** on the glasses page. Pair the device again to reconnect it.

## Find the right calendar address

Use the CalDAV server or calendar URL from your provider's own setup instructions. Do not use the URL of a companion sync app such as DAVx5. Some providers require an app password instead of your regular account password.

If your provider gives you a public `.ics` feed but no CalDAV login, you can view that feed in the browser calendar. The glasses pairing screen currently asks for CalDAV credentials.

## Use Orbit in a browser

1. Open the [calendar](https://orbit-calendar.henning-orbit-calendar.workers.dev/).
2. Select a day. Use **‹**, **Today**, and **›** to move between months; on touchscreens, swipe left or right.
3. Open **Settings** and paste a public ICS URL, or enter a CalDAV URL and credentials for a one-session read.
4. Choose **Sync calendar**. The browser refreshes the feed every minute while the page is open.

Plans added with **Add plan** are stored in that browser only. **Export .ics** downloads a copy of those local plans; it does not upload them to your calendar provider.

## Privacy

- Calendar access is read-only. Orbit never writes events back to the provider.
- Browser-only credentials are held in page memory and are not saved in local storage.
- A paired glasses connection is encrypted before it is stored on the Orbit server. The glasses never receive the CalDAV password.
- Disconnecting the glasses deletes the saved pairing and encrypted connection.

## Troubleshooting

| What you see | What to check |
| --- | --- |
| The pairing code is rejected | Make sure it is six digits, is less than 10 minutes old, and is entered on the main app while both devices are online. Reload the glasses page for a new code. |
| CalDAV connection fails | Check the provider's CalDAV URL, username, and app password. Use HTTPS and the provider's calendar address, not a DAVx5 app URL. |
| No events appear | Confirm that the selected account has events and that the provider lets Orbit read that calendar. Try the provider's public ICS URL in the browser app. |
| The old Render address looks different | It redirects to the current Cloudflare app. Use the Cloudflare links above directly for the fastest path. |
| The page says the API is unavailable | Use the hosted Cloudflare app links above, not a local static preview. |

The glasses experience requires a supported web view, JavaScript, local storage, and an internet connection. Device and provider compatibility can vary.

