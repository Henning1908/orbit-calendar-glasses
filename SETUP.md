# Orbit Calendar – Setup

Diese Anleitung beschreibt den aktuellen Aufbau für die Android-App auf dem Telefon. DAVx5 bleibt dabei die einzige App, die sich beim CalDAV-Server anmeldet.

## 1. Voraussetzungen

- Android Studio Hedgehog oder neuer
- Android SDK 35
- JDK 17
- Ein Android-Telefon mit aktivierter USB-Entwickleroption oder ein Android-Emulator
- DAVx5 auf dem Telefon
- Ein in DAVx5 eingerichtetes und synchronisiertes CalDAV-Konto

### JDK 17 in Android Studio einstellen

1. JDK 17 installieren, zum Beispiel Eclipse Temurin 17.
2. Android Studio öffnen.
3. **File → Settings → Build, Execution, Deployment → Build Tools → Gradle** öffnen.
4. Bei **Gradle JDK** das installierte JDK 17 auswählen.
5. Mit **Apply** und **OK** bestätigen.

Das Projekt benötigt aktuell JDK 17 für den Android-/Kotlin-Build. Java 25 oder 26 sollte für dieses Projekt nicht als Gradle-JDK verwendet werden.

## 2. Projekt öffnen

1. Repository klonen:

   ```powershell
   git clone https://github.com/Henning1908/orbit-calendar-glasses.git
   cd orbit-calendar-glasses
   ```

2. Den Repository-Ordner in Android Studio öffnen.
3. Warten, bis Gradle synchronisiert ist.
4. In der Run-Konfiguration `androidApp` auswählen.
5. Ein angeschlossenes Telefon oder einen Emulator auswählen.
6. **Run** drücken.

Alternativ kann die Debug-APK aus PowerShell gebaut werden:

```powershell
.\gradlew.bat :androidApp:assembleDebug
```

Die APK liegt danach unter:

```text
androidApp\build\outputs\apk\debug\androidApp-debug.apk
```

## 3. DAVx5 einrichten

1. DAVx5 aus dem F-Droid-Store oder der offiziellen Quelle installieren.
2. DAVx5 öffnen und **Add account** auswählen.
3. Den CalDAV-Server bzw. das Konto einrichten.
4. Die gewünschten Kalender aktivieren.
5. Eine manuelle Synchronisierung in DAVx5 auslösen.
6. In der Android-Kalender-App prüfen, ob die Termine sichtbar sind.

Orbit benötigt weder die DAVx5-Zugangsdaten noch eine direkte CalDAV-Verbindung:

```text
DAVx5 meldet sich an und synchronisiert
        ↓
Android Calendar Provider
        ↓
Orbit liest Kalender mit READ_CALENDAR
        ↓
GlassesBridge liefert Daten an die Brille
```

## 4. Orbit-Berechtigung erteilen

Beim ersten Start zeigt Orbit den Button **Allow calendar access**.

1. Button drücken.
2. Die Android-Berechtigung zum Lesen des Kalenders erlauben.
3. **Refresh from DAVx5 calendars** drücken.
4. Die von DAVx5 synchronisierten Termine sollten jetzt in Orbit erscheinen.

Die Berechtigung wird im Manifest deklariert:

```xml
<uses-permission android:name="android.permission.READ_CALENDAR" />
```

Orbit verwendet `CalendarContract.Instances`, damit auch wiederkehrende Termine als konkrete Vorkommen gelesen werden. Ein `ContentObserver` reagiert automatisch, wenn sich die Kalenderdaten auf dem Telefon ändern.

## 5. Was die aktuelle Android-App kann

- sichtbare Android-Kalender lesen
- DAVx5-synchronisierte Termine zusammen mit anderen sichtbaren Kalendern anzeigen
- kommende Termine für die nächsten 30 Tage laden
- bei Änderungen des Android Calendar Providers automatisch neu laden
- Kalenderdaten an eine isolierte `GlassesBridge` übergeben
- keine DAVx5-Passwörter oder CalDAV-Tokens speichern

Der zentrale Code liegt hier:

```text
androidApp/src/main/java/com/henning1908/orbitcalendar/CalendarRepository.kt
androidApp/src/main/java/com/henning1908/orbitcalendar/MainActivity.kt
androidApp/src/main/java/com/henning1908/orbitcalendar/GlassesBridge.kt
```

## 6. Meta Display Glasses

Die Kalenderquelle ist bereits fertig getrennt von der Brillen-Ausgabe. Aktuell verwendet die App:

```kotlin
private val glassesBridge: GlassesBridge = NoOpGlassesBridge()
```

Für die echte Meta-Brillen-Ausgabe wird `NoOpGlassesBridge` durch einen Adapter für das Meta Wearables Device Access Toolkit ersetzt. Dieser Adapter muss dann:

1. die Meta-App-ID und die freigegebene Wearables-SDK-Abhängigkeit verwenden,
2. die Verbindung zu den gekoppelten Brillen herstellen,
3. einen kompakten `CalendarSnapshot` senden,
4. Verbindungsabbrüche behandeln,
5. nur die vom Nutzer erlaubten Kalenderdaten anzeigen.

Die Android-Kalenderintegration muss dafür nicht geändert werden. Der Austausch passiert nur in `GlassesBridge.kt`.

## 7. Web-App lokal starten

Die Vite-Web-App bleibt als Design-Preview und Fallback erhalten:

```powershell
npm install
npm run dev
```

Die Web-App kann lokale Preset-Events verwalten und ICS-Dateien exportieren. Sie kann jedoch nicht auf den privaten Android Calendar Provider oder auf eine laufende DAVx5-Sitzung zugreifen. Für die echte DAVx5-Nutzung ist die native Android-App zuständig.

## 8. Fehlerbehebung

### Keine Termine sichtbar

1. In DAVx5 manuell synchronisieren.
2. In der Android-Kalender-App prüfen, ob der Kalender sichtbar und aktiviert ist.
3. In Android **Settings → Apps → Orbit Calendar → Permissions** prüfen, ob Kalenderzugriff erlaubt ist.
4. Orbit neu öffnen und **Refresh from DAVx5 calendars** drücken.

### Android-Build schlägt mit Java-Fehler fehl

Prüfen, ob Android Studio und Gradle wirklich JDK 17 verwenden:

```powershell
java -version
.\gradlew.bat --version
```

Wenn dort Java 25 oder Java 26 angezeigt wird, in Android Studio den **Gradle JDK** auf JDK 17 umstellen und den Build erneut starten.

### Brille zeigt noch nichts

Das ist im aktuellen Stand erwartbar: Die Kalenderquelle ist angebunden, aber `NoOpGlassesBridge` sendet noch keine Daten an die Brille. Dafür muss der Meta-Wearables-Adapter mit der für das Entwicklerkonto freigeschalteten Meta-SDK-Version ergänzt werden.
