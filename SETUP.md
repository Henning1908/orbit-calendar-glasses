# Orbit Calendar – Web-App-Setup

Orbit ist die reine Web-App-Variante. Für die Veröffentlichung und Nutzung brauchst du keine Meta-Developer-Secrets, keine Android-App, keine APK und kein Android Studio.

## 1. Auf Render veröffentlichen

1. In Render **New → Static Site** wählen.
2. Das private Repository `Henning1908/orbit-calendar-glasses` verbinden.
3. Branch `main` auswählen.
4. Diese Werte setzen:

```text
Build command:     npm ci && npm run build
Publish directory:  dist
```

Die Live-Seite ist:

<https://orbit-calendar-glasses.onrender.com/>

Jeder Push auf `main` startet automatisch einen neuen Render-Deploy.

## 2. Web-App auf dem Telefon oder der Brille öffnen

Öffne die Live-URL im Browser:

```text
https://orbit-calendar-glasses.onrender.com/
```

Ob die URL direkt auf deiner Meta Display glasses geöffnet werden kann, hängt vom konkreten Modell und dessen Web-App-/Browser-Unterstützung ab. Die Web-App selbst benötigt keine Meta-Zugangsdaten.

Für kleine Displays bietet Orbit:

- große, kontrastreiche Schaltflächen
- Wischen zum Wechseln des Monats
- `←` und `→` für den vorherigen/nächsten Monat
- `T` für den heutigen Tag
- sichtbare Fokusrahmen für Tastatur- oder Assistenzsteuerung

## 3. DAVx5 mit der Web-App verwenden

Die Web-App kann keine bestehende DAVx5-Anmeldung auf dem Telefon übernehmen. Sie kann auch nicht direkt den privaten Android Calendar Provider lesen.

### ICS-Feed laden

Wenn dein Kalenderdienst eine ICS-Feed-URL bereitstellt:

1. Orbit öffnen.
2. Oben rechts `☷` öffnen.
3. Die ICS-Feed-URL bei **CalDAV collection URL** eintragen.
4. **Save connection** klicken.
5. **Load DAVx5 updates** klicken.

Für automatische Updates muss die URL:

- direkt eine ICS-Datei zurückgeben,
- ohne zusätzliche Browser-Anmeldung erreichbar sein,
- CORS für die Render-Domain erlauben.

Orbit lädt beim Start, alle 60 Sekunden sowie bei Fokus-, Sichtbarkeits- und Online-Änderungen neu.

### ICS exportieren

Lokale Termine kannst du über **Export .ics** exportieren und danach in einen Kalenderdienst importieren, den DAVx5 synchronisiert.

### Private CalDAV-Konten

Eine normale private CalDAV-URL funktioniert meistens nicht direkt im Browser. Dafür brauchst du einen eigenen serverseitigen Proxy oder einen CORS-fähigen ICS-Endpunkt:

```text
Orbit im Browser → eigener Proxy/ICS-Endpunkt → CalDAV-Server
```

Die Zugangsdaten dürfen nur auf dem Server liegen und niemals in der Web-App oder in öffentlichen Logs.

## 4. Nicht erforderlich

Für diese Web-App brauchst du nicht:

- `mwdat_application_id`
- `mwdat_client_token`
- `MWDAT_APPLICATION_ID`
- `MWDAT_CLIENT_TOKEN`
- Android Studio
- Android SDK
- eine APK
- eine native Meta-Wearables-Integration

Die Web-App wird vollständig über Render ausgeliefert.
