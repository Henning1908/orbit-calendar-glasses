# Orbit Calendar – Setup

Diese Anleitung beschreibt den aktuellen Aufbau für die Android-App auf dem Telefon. DAVx5 bleibt dabei die einzige App, die sich beim CalDAV-Server anmeldet.

## Schnellster Weg ohne Android Studio: APK aus GitHub herunterladen

Android Studio ist für die normale Nutzung nicht nötig. GitHub baut die APK automatisch:

1. Repository öffnen: <https://github.com/Henning1908/orbit-calendar-glasses>
2. Den Tab **Actions** öffnen.
3. Den Workflow **Build Android APK** auswählen.
4. Den letzten erfolgreichen Lauf öffnen.
5. Unter **Artifacts** `orbit-calendar-debug-apk` herunterladen.
6. Die ZIP-Datei auf dem Telefon entpacken.
7. `androidApp-debug.apk` öffnen und die Installation erlauben.

Bei jedem Push auf `main` wird automatisch ein neuer Build gestartet. Einen manuellen Build kannst du über **Actions → Build Android APK → Run workflow** starten.

Android blockiert möglicherweise die Installation aus dem Browser oder Dateimanager. Dann in den Android-Einstellungen für diese App **Install unknown apps / Unbekannte Apps installieren** erlauben. Die APK ist aktuell eine Debug-Testversion, keine Play-Store-Version.

## 1. Voraussetzungen für lokale Builds

- Android Studio Hedgehog oder neuer (nur nötig, wenn du lokal bauen oder den Code debuggen willst)
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

## 2. Projekt öffnen oder lokal bauen

1. Repository klonen:

   ```powershell
   git clone https://github.com/Henning1908/orbit-calendar-glasses.git
   cd orbit-calendar-glasses
   ```

2. Den Repository-Ordner in Android Studio öffnen, falls du lokal entwickeln möchtest.
3. Warten, bis Gradle synchronisiert ist.
4. In der Run-Konfiguration `androidApp` auswählen.
5. Ein angeschlossenes Telefon oder einen Emulator auswählen.
6. **Run** drücken.

Für einen lokalen Build ohne Android Studio kann die Debug-APK aus PowerShell gebaut werden, wenn JDK 17 und das Android SDK installiert sind:

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

Die Kalenderquelle ist jetzt mit der Meta Wearables Device Access Toolkit Display-API verbunden. Beim Start:

1. Orbit initialisiert das Meta Wearables SDK.
2. **Connect Meta display glasses** startet die Meta-Registrierung bzw. verbindet ein bereits registriertes Gerät.
3. Die App sucht automatisch ein verbundenes, displayfähiges Gerät.
4. Nach dem Aufbau der Display-Session wird ein kompakter Kalender mit den nächsten drei Terminen gesendet.
5. Änderungen am Android-Kalender werden erneut an die Brille gesendet.

Für die Meta-Registrierung brauchst du Zugangsdaten aus dem Meta Wearables Developer Center:

```text
mwdat_application_id=DEINE_APPLICATION_ID
mwdat_client_token=DEIN_CLIENT_TOKEN
```

Diese Werte gehören in `androidApp/local.properties` und dürfen nicht committed werden. Für den GitHub-APK-Workflow müssen sie als Repository-Secrets mit den Namen `MWDAT_APPLICATION_ID` und `MWDAT_CLIENT_TOKEN` hinterlegt werden:

**Repository → Settings → Secrets and variables → Actions → New repository secret**

Ohne diese Secrets lässt sich die APK bauen, aber die echte Brillenregistrierung funktioniert nicht.

Die Kalenderquelle und die Brillen-Ausgabe bleiben getrennt:

```kotlin
private val glassesBridge: GlassesBridge = MetaGlassesBridge(...)
```

Die konkrete Implementierung liegt in `GlassesBridge.kt`. Dort werden Session, Display-Capability, Verbindungsfehler und die Darstellung der nächsten Termine behandelt.

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

1. Prüfen, ob die Meta-Secrets im GitHub-Repository gesetzt sind.
2. Die Meta AI-/Wearables-Registrierung in der App abschließen.
3. Prüfen, ob die Brille gekoppelt, eingeschaltet und displayfähig ist.
4. Falls die App auf der Brille veraltet ist, zuerst das DAT-Update in der Meta-App durchführen.
5. In Orbit erneut **Connect Meta display glasses** drücken.
