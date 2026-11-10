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

## 3. ICS-Feed einrichten

Ein ICS-Feed ist eine Webadresse, die bei jedem Aufruf eine Kalenderdatei im iCalendar-Format zurückgibt. Orbit ruft diese Adresse regelmäßig ab und ersetzt die zuvor geladenen synchronisierten Termine.

### 3.1 ICS-URL beim Kalenderanbieter finden

DAVx5 selbst erzeugt normalerweise keine öffentliche ICS-Feed-URL. DAVx5 synchronisiert dein Konto nur auf dem Telefon. Die Feed-URL kommt vom Kalenderdienst, bei dem dein Kalender gespeichert ist.

Suche beim Anbieter nach einer dieser Bezeichnungen:

- **ICS**
- **iCal**
- **iCalendar**
- **Subscribe to calendar**
- **Kalender abonnieren**
- **Öffentlicher Kalender-Link**
- **Secret address in iCal format**

Typische Wege:

- **Nextcloud:** Kalender öffnen → gewünschten Kalender auswählen → Teilen/Veröffentlichen → ICS- oder iCal-Link kopieren.
- **Google Calendar:** Einstellungen → Kalender auswählen → **Kalender integrieren** → **Geheime Adresse im iCal-Format** kopieren. Verwende nicht die HTML-Adresse.
- **Apple/iCloud:** Einen öffentlichen Kalender-Link beziehungsweise eine abonnierbare Kalender-URL aktivieren und den ICS-Link kopieren.
- **Andere Anbieter:** In der Kalenderfreigabe nach einer URL suchen, die auf `.ics` endet oder beim Aufruf `BEGIN:VCALENDAR` liefert.

Wenn dein Anbieter keine ICS-URL anbietet, kannst du die Web-App nicht direkt mit diesem privaten Kalender verbinden. Dann brauchst du einen eigenen serverseitigen Proxy oder einen anderen Kalenderdienst mit ICS-Abonnement.

### 3.2 Prüfen, ob die URL wirklich ein ICS-Feed ist

Öffne die kopierte URL testweise in einem neuen Browser-Tab.

Richtig ist eine Antwort, die ungefähr so beginnt:

```text
BEGIN:VCALENDAR
VERSION:2.0
PRODID:...
```

Wenn stattdessen eine Login-Seite, HTML, JSON oder eine Fehlermeldung erscheint, ist es keine direkt nutzbare ICS-URL.

Die URL muss außerdem aus dem Browser geladen werden dürfen. Dafür muss der Server CORS erlauben, zum Beispiel mit:

```text
Access-Control-Allow-Origin: https://orbit-calendar-glasses.onrender.com
```

Eine URL kann im Browser-Tab funktionieren und trotzdem in Orbit blockiert werden, wenn CORS fehlt.

### 3.3 ICS-Feed in Orbit speichern

1. Orbit öffnen: <https://orbit-calendar-glasses.onrender.com/>
2. Oben rechts auf **☷** klicken.
3. Das Feld **CalDAV collection URL** öffnen.
4. Die vollständige ICS-URL einfügen. Nicht den Benutzernamen oder das DAVx5-Passwort eintragen.
5. **Save connection** klicken.
6. Das Einstellungsfenster erneut öffnen.
7. **Load updates** klicken.
8. Einen Tag auswählen, für den im Kalender ein Termin existiert.
9. Prüfen, ob der Termin in der Tagesansicht erscheint.

Die URL wird nur lokal im Browser gespeichert. Sie wird nicht von Orbit an einen eigenen Server übertragen.

### 3.4 Automatische Updates

Nach dem Speichern lädt Orbit den ICS-Feed:

- beim Start der Seite,
- ungefähr alle 60 Sekunden,
- wenn du zum Browser-Tab zurückkehrst,
- wenn die Seite wieder sichtbar wird,
- wenn die Internetverbindung zurückkommt,
- zusätzlich jederzeit über **sync now**.

Das funktioniert nur, solange der Browser beziehungsweise die Web-App geöffnet ist. Eine geschlossene Website kann keine regelmäßigen Browser-Anfragen ausführen.

### 3.5 DAVx5 und ICS zusammen

Der typische Datenweg ist:

```text
Kalenderanbieter
      ├── DAVx5 synchronisiert eine Kopie auf dem Telefon
      └── ICS-Feed liefert eine browserlesbare Kopie an Orbit
```

DAVx5 und Orbit melden sich nicht gegenseitig an. Die Web-App übernimmt nicht deine DAVx5-Sitzung und liest nicht den Android-Kalenderspeicher.

## 4. DAVx5 mit der Web-App verwenden

Die Web-App kann keine bestehende DAVx5-Anmeldung auf dem Telefon übernehmen. Sie kann auch nicht direkt den privaten Android Calendar Provider lesen.

### ICS-Feed laden

Wenn dein Kalenderdienst eine ICS-Feed-URL bereitstellt:

Die genaue ICS-Einrichtung steht in [Abschnitt 3](#3-ics-feed-einrichten). Für automatische Updates muss die URL direkt eine ICS-Datei zurückgeben, ohne zusätzliche Browser-Anmeldung erreichbar sein und CORS für die Render-Domain erlauben.

### ICS exportieren

Lokale Termine kannst du über **Export .ics** exportieren und danach in einen Kalenderdienst importieren, den DAVx5 synchronisiert.

### Private CalDAV-Konten

Eine normale private CalDAV-URL funktioniert meistens nicht direkt im Browser. Dafür brauchst du einen eigenen serverseitigen Proxy oder einen CORS-fähigen ICS-Endpunkt:

```text
Orbit im Browser → eigener Proxy/ICS-Endpunkt → CalDAV-Server
```

Die Zugangsdaten dürfen nur auf dem Server liegen und niemals in der Web-App oder in öffentlichen Logs.

## 5. Nicht erforderlich

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
