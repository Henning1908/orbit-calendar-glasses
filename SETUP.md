# Orbit Calendar

## Für Nutzer

Orbit ist eine Web-App. Öffne einfach:

<https://orbit-calendar-glasses.onrender.com/>

Du musst nichts installieren.

### Bedienung

- Einen Tag anklicken, um die Tagesplanung zu sehen.
- Mit **‹**, **Today** und **›** zwischen Monaten wechseln.
- Auf Touch-Geräten nach links oder rechts wischen.
- Über `☷` die Kalenderoptionen öffnen.
- Eigene Pläne werden im verwendeten Browser gespeichert.

### ICS-Kalenderfeed

Wenn dein Kalenderanbieter eine ICS- oder iCal-URL anbietet:

1. Orbit öffnen.
2. `☷` anklicken.
3. Die ICS-URL einfügen.
4. **Save connection** anklicken.
5. **Load updates** anklicken.

Die URL muss im Browser erreichbar sein und CORS erlauben. Die Website kann keine bestehende DAVx5-Anmeldung auf deinem Telefon übernehmen.

### Meta Display glasses

1. Öffne auf der Brille:

   <https://orbit-calendar-glasses.onrender.com/glasses.html>

2. Die Brille zeigt einen sechsstelligen Code.
3. Öffne Orbit auf dem Telefon oder PC.
4. Öffne `☷`.
5. Trage die CalDAV-Server- oder Kalender-URL ein.
6. Trage den CalDAV-Benutzernamen ein.
7. Trage das CalDAV-Passwort oder App-Passwort ein.
8. Trage den sechsstelligen Brillencode ein.
9. Klicke **Send calendar to glasses**.

Die Brille lädt danach die Termine direkt vom Orbit-Server und aktualisiert sie regelmäßig. Die Zugangsdaten werden nicht an die Brille gesendet. Ein ICS-Link kann weiterhin für read-only Kalenderfeeds verwendet werden. Die Website benötigt dafür keine Meta-Developer-Secrets.
