# Orbit Calendar – Web-App-Setup

Orbit ist die **Web-App-Variante** für eine kalenderbasierte Anzeige auf Telefon, Desktop und einem unterstützten Browser auf Meta Display glasses. Es gibt in diesem Repository keine Android-App und keine APK.

## 1. Lokal starten

Voraussetzung ist Node.js 18 oder neuer:

```powershell
git clone https://github.com/Henning1908/orbit-calendar-glasses.git
cd orbit-calendar-glasses
npm install
npm run dev
```

Danach die lokale URL aus Vite im Browser öffnen.

Für den Produktionsbuild:

```powershell
npm run build
npm run preview
```

## 2. Auf Render veröffentlichen

1. In Render **New → Static Site** wählen.
2. Das private GitHub-Repository `Henning1908/orbit-calendar-glasses` verbinden.
3. Diese Werte verwenden:

```text
Build command:    npm ci && npm run build
Publish directory: dist
```

Die Datei `render.yaml` enthält dieselbe Konfiguration für einen Blueprint-Deploy.

Die veröffentlichte URL kannst du anschließend im Browser des Telefons oder in einer von den Meta Display glasses unterstützten Browser-Umgebung öffnen. Die Darstellung ist responsiv und für kleine, kontrastreiche Displays ausgelegt.

### Auf der Brille öffnen

Das funktioniert nur, wenn dein konkretes Meta-Display-Modell Web-Apps bzw. Web-URLs unterstützt. Öffne auf dem Telefon die Meta-Begleit-App beziehungsweise den verfügbaren **Explore/Web-App**-Bereich, füge diese URL hinzu und starte sie auf der Brille:

```text
https://orbit-calendar-glasses.onrender.com/
```

Falls deine Brille keinen Web-App-/Browser-Bereich anbietet, kann sie die Render-Webseite nicht selbst öffnen. Dann bleibt sie auf dem Telefon sichtbar; die Web-App kann nicht über eine normale Website direkt Bluetooth oder die native Meta-Display-API ansprechen.

Für die Bedienung auf kleinen Displays sind große Touch-Flächen und hoher Kontrast aktiviert. Zwischen Monaten wechselst du per Wischgeste oder mit `←`/`→`; `T` springt zu heute. Falls die Brille nur Tippen oder Sprache unterstützt, nutze die sichtbaren **‹**, **Today** und **›**-Flächen.

## 3. DAVx5 verwenden

Eine Web-App kann nicht auf die private Android-Kalenderdatenbank zugreifen und kann keine bestehende DAVx5-Anmeldung auf dem Telefon übernehmen. Orbit speichert deshalb keine DAVx5-Passwörter.

### ICS-Feed laden

1. In Orbit die Einstellungen öffnen.
2. Eine URL zu einem ICS-Feed eintragen.
3. **Save connection** wählen.
4. **Load DAVx5 updates** drücken.

Orbit lädt beim Start, alle 60 Sekunden sowie bei Fokus-, Sichtbarkeits- und Online-Änderungen erneut. Der Server muss eine ICS-Datei zurückgeben und Browser-CORS erlauben.

### ICS-Datei exportieren

Lokale Orbit-Termine können über **Export .ics** gespeichert und anschließend in DAVx5 importiert werden.

### Privater CalDAV-Server

Eine normale, authentifizierte CalDAV-Collection liefert üblicherweise WebDAV-XML und blockiert direkte Browser-CORS-Anfragen. Für eine echte private Verbindung brauchst du einen eigenen same-origin Proxy oder einen ICS-Feed:

```text
Browser → eigener Proxy ohne sichtbare Zugangsdaten → CalDAV-Server
```

Der Proxy darf keine Zugangsdaten an das Frontend, in JavaScript-Bundles oder in öffentliche Logs weitergeben.

## 4. Meta Display glasses

Die Web-App ist die gewünschte Integrationsoption. Öffne die Render-URL in der Browser-Umgebung beziehungsweise im Web-App-/Explore-Bereich, der auf deinem Meta-Display-Gerät verfügbar ist.

Die Web-App verwendet keine native Meta Wearables Device Access Toolkit-API. Daher sind folgende Funktionen bewusst nicht Bestandteil dieser Web-App:

- direkte Geräteregistrierung oder Bluetooth-Pairing
- Hintergrundübertragung bei geschlossenem Browser
- Zugriff auf den Android Calendar Provider
- direkte Wiederverwendung einer DAVx5-Login-Session

Wenn diese nativen Funktionen später erforderlich sind, wäre dafür ein separates Android-Projekt nötig; es gehört nicht zur Web-App dieses Repositorys.
