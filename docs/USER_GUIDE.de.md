# Orbit Calendar – Benutzeranleitung

Orbit Calendar zeigt deinen Kalender im Browser und auf unterstützten Meta-Display-Browsern an. Du kannst einen öffentlichen ICS-Feed oder einen privaten CalDAV-Kalender verbinden. Die Synchronisierung ist **nur lesend**: Orbit ändert keine Termine bei deinem Anbieter.

**App öffnen:** [Kalender](https://orbit-calendar.henning-orbit-calendar.workers.dev/) · [Brillenansicht](https://orbit-calendar.henning-orbit-calendar.workers.dev/glasses.html) · [English guide](USER_GUIDE.md)

## Meta-Display-Brille verbinden

### 1. Brillenansicht öffnen

Öffne auf der Brille diese Adresse:

<https://orbit-calendar.henning-orbit-calendar.workers.dev/glasses.html>

Lass die Seite während der Kopplung geöffnet. Sie zeigt einen sechsstelligen Code und wartet auf die Verbindung. Der Code läuft nach 10 Minuten ab.

### 2. Kalender auf Handy oder Computer einrichten

Öffne auf einem zweiten Gerät den [Kalender](https://orbit-calendar.henning-orbit-calendar.workers.dev/). Öffne über das Menü die **Einstellungen** und trage ein:

- **CalDAV-Basis- oder Kalender-URL:** die HTTPS-Adresse deines Kalenderanbieters.
- **CalDAV-Benutzername:** Benutzername oder E-Mail-Adresse, wie vom Anbieter verlangt.
- **CalDAV-Passwort:** verwende ein App-Passwort, falls dein Anbieter eines anbietet.
- **Kopplungscode:** die sechs Ziffern auf der Brille.

Tippe auf **Send calendar to glasses**. Orbit prüft zuerst den Kalenderzugriff. Bei erfolgreicher Verbindung erscheint auf der Brille **Connected**.

### 3. Kalender aktuell halten

Lass die Brillenansicht geöffnet und die Brille mit dem Internet verbunden. Orbit lädt ungefähr jede Minute neue Termine. Beim erneuten Öffnen der Seite wird ebenfalls synchronisiert. Die Brille zeigt die nächsten acht Termine ab heute chronologisch sortiert und mit Datum; vergangene Termine von heute werden ausgeblendet.

Über **Disconnect** auf der Brillenansicht entfernst du die gespeicherte Serververbindung. Für eine erneute Verbindung koppelst du die Brille wieder.

## Richtige Kalenderadresse finden

Nutze die CalDAV-Server- oder Kalenderadresse aus der Anleitung deines Anbieters. Verwende nicht die URL einer Zusatz-App wie DAVx5. Manche Anbieter verlangen statt des normalen Kontopassworts ein eigenes App-Passwort.

Wenn dein Anbieter nur einen öffentlichen `.ics`-Feed anbietet, kannst du diesen im Browserkalender anzeigen lassen. Für die Kopplung der Brille fragt die App derzeit nach CalDAV-Zugangsdaten.

## Orbit im Browser verwenden

1. Öffne den [Kalender](https://orbit-calendar.henning-orbit-calendar.workers.dev/).
2. Wähle einen Tag aus. Mit **‹**, **Today** und **›** wechselst du den Monat; auf Touchscreens kannst du nach links oder rechts wischen.
3. Öffne die **Einstellungen** und füge einen öffentlichen ICS-Link ein oder gib für einen einmaligen CalDAV-Abruf URL und Zugangsdaten ein.
4. Tippe auf **Sync calendar**. Solange die Seite geöffnet ist, wird der Feed jede Minute aktualisiert.

Mit **Add plan** angelegte Pläne bleiben nur in diesem Browser gespeichert. **Export .ics** lädt eine Datei mit deinen lokalen Plänen herunter; sie wird nicht an den Kalenderanbieter zurückgeschrieben.

## Datenschutz

- Der Kalenderzugriff ist nur lesend. Orbit schreibt keine Termine an deinen Anbieter zurück.
- Zugangsdaten für die reine Browser-Synchronisierung bleiben im Arbeitsspeicher der geöffneten Seite und werden nicht im Browser gespeichert.
- Bei einer gekoppelten Brille wird die CalDAV-Verbindung verschlüsselt auf dem Orbit-Server gespeichert. Die Brille erhält nie das CalDAV-Passwort.
- **Disconnect** löscht die Kopplung und die verschlüsselte Verbindung.

## Fehlerbehebung

| Anzeige | Das kannst du prüfen |
| --- | --- |
| Der Kopplungscode wird abgelehnt | Code vollständig eingeben, höchstens 10 Minuten warten und beide Geräte online lassen. Lade die Brillen-Seite für einen neuen Code neu. |
| CalDAV-Verbindung schlägt fehl | URL, Benutzername und App-Passwort prüfen. HTTPS und die Kalenderadresse des Anbieters verwenden, nicht die DAVx5-App-URL. |
| Es erscheinen keine Termine | Prüfen, ob der Kalender Termine enthält und der Anbieter Orbit den Lesezugriff erlaubt. Teste den öffentlichen ICS-Link im Browserkalender. |
| Die alte Render-Adresse sieht anders aus | Sie leitet zur aktuellen Cloudflare-App weiter. Nutze am besten direkt die Cloudflare-Links oben. |
| Die API ist nicht erreichbar | Öffne die gehostete Cloudflare-App, nicht eine lokale statische Vorschau. |

Die Brillenansicht benötigt eine unterstützte Webansicht, JavaScript, lokalen Speicher und eine Internetverbindung. Die Kompatibilität hängt vom Gerät und Kalenderanbieter ab.

