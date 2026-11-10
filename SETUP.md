# Orbit Calendar – DAVx5 und Meta Display Setup

## 1. DAVx5 auf dem Telefon einrichten

1. DAVx5 installieren.
2. Dein CalDAV-Konto in DAVx5 hinzufügen und anmelden.
3. Die gewünschten Kalender aktivieren.
4. Eine manuelle Synchronisierung auslösen.
5. In der normalen Android-Kalender-App prüfen, dass die Termine sichtbar sind.

DAVx5 synchronisiert die Termine in den gemeinsamen Android Calendar Provider. Orbit braucht deine DAVx5-Zugangsdaten nicht.

## 2. Orbit auf dem Telefon installieren

Android Studio ist für die normale Nutzung nicht erforderlich:

1. Repository öffnen: <https://github.com/Henning1908/orbit-calendar-glasses>
2. **Actions → Build Android APK** öffnen.
3. Den letzten erfolgreichen Lauf auswählen.
4. Das Artifact `orbit-calendar-debug-apk` herunterladen.
5. ZIP entpacken und `androidApp-debug.apk` installieren.
6. Falls Android fragt, die Installation aus dieser Quelle erlauben.

Bei jedem Push auf `main` wird eine neue APK gebaut. Die Web-App auf Render wird weiterhin automatisch aus `main` veröffentlicht.

## 3. Orbit mit DAVx5 und der Brille verbinden

1. Orbit auf dem Telefon öffnen.
2. **Allow calendar access** bestätigen.
3. Bluetooth-Zugriff erlauben.
4. Prüfen, dass DAVx5 bereits synchronisierte Termine in der Android-Kalender-App anzeigt.
5. In Orbit **Connect Meta display glasses** drücken.
6. Die Meta-Registrierung bestätigen, falls sie angezeigt wird.
7. Brille auswählen beziehungsweise die automatisch gefundene displayfähige Brille bestätigen.

Danach läuft die Verbindung so:

```text
DAVx5 aktualisiert den Android-Kalender
        ↓
Orbit erkennt Calendar-Provider-Änderungen
        ↓
Orbit lädt die nächsten Termine neu
        ↓
Orbit sendet sie an die Meta Display glasses
```

Die Android-App registriert einen `ContentObserver`. Änderungen durch DAVx5 werden dadurch automatisch erkannt. Die nächsten drei Termine werden an die Brille gesendet. Die App muss für eine zuverlässige Hintergrundaktualisierung geöffnet bleiben; Android kann Hintergrundprozesse sonst pausieren.

## 4. Meta-Zugangsdaten für den APK-Build

Für die Meta Wearables Device Access Toolkit-Integration werden diese Werte aus dem Meta Developer Center benötigt:

```text
mwdat_application_id=DEINE_APPLICATION_ID
mwdat_client_token=DEIN_CLIENT_TOKEN
```

Lokal gehören sie in `androidApp/local.properties` und dürfen nicht committed werden. Für GitHub Actions sind Repository-Secrets vorgesehen:

```text
MWDAT_APPLICATION_ID
MWDAT_CLIENT_TOKEN
```

Ohne diese Secrets kann der Android-Code eventuell gebaut werden, aber die echte Registrierung der Brille funktioniert nicht.

## 5. Render-Webseite

Die Web-App ist die sichtbare Browser-/Preview-Oberfläche:

<https://orbit-calendar-glasses.onrender.com/>

Render ist nicht die Verbindung zum Telefon. Die echte DAVx5-zu-Brille-Verbindung läuft über die Android-App, weil nur sie auf den Android Calendar Provider und das Meta Wearables SDK zugreifen kann.

## 6. Fehlerbehebung

### Keine Termine in Orbit

- DAVx5 manuell synchronisieren.
- In der Android-Kalender-App prüfen, ob der Kalender sichtbar ist.
- Orbit die Kalenderberechtigung geben.
- In Orbit **Refresh from DAVx5 calendars** drücken.

### Brille wird nicht gefunden

- Brille einschalten und mit dem Telefon koppeln.
- Bluetooth aktivieren.
- Meta-App und Brillen-Firmware aktualisieren.
- Meta-Secrets prüfen.
- Orbit erneut öffnen und **Connect Meta display glasses** drücken.

### Web-App zeigt keine DAVx5-Termine

Das ist erwartbar: Die Render-Webseite kann keine private DAVx5-Anmeldung oder den Android Calendar Provider lesen. Dafür die Android-App verwenden.
