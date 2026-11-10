# Checkliste für eine öffentliche Veröffentlichung

Diese Liste hilft bei der Vorbereitung; sie ist keine individuelle Rechtsberatung. Ein öffentliches GitHub-Repository und ein öffentlich angebotener Kalenderdienst sind zwei verschiedene Veröffentlichungen.

## Was bisher im Repository steht

- Das Repository verwendet jetzt die MIT-Lizenz. Andere dürfen den Code verwenden, ändern und weitergeben, auch kommerziell, müssen aber Copyright- und Lizenzhinweis in Kopien oder wesentlichen Teilen beibehalten. Der Credit lautet derzeit **Henning1908**. [LICENSE](../LICENSE)
- Vor dem Wechsel auf öffentlich die gesamte Commit-Historie auf Zugangsschlüssel, Passwörter, private Kalenderadressen und persönliche Daten prüfen. Eine Datei nur im aktuellen Stand zu löschen entfernt frühere Commits nicht. Falls ein echter Schlüssel jemals eingecheckt wurde, ihn zuerst beim Anbieter widerrufen und ersetzen.
- Die Cloudflare-Verschlüsselungsvariable liegt außerhalb des Repositories. Die lokale Datei `.env.cloudflare-secret` ist ignoriert. Niemals echte Kalenderdaten oder Zugangsdaten in Beispielen, Screenshots, Issues oder Commits verwenden.
- Die MIT-Lizenz deckt nur Rechte ab, die der Rechteinhaber selbst vergeben darf. Vor dem Release prüfen, ob alle enthaltenen Logos, Bilder, Texte und Abhängigkeiten entsprechend weitergegeben werden dürfen. Die MIT-Lizenz überträgt keine Markenrechte.
- Vor einem öffentlichen Release auch die Lizenzen gebündelter npm-Abhängigkeiten und der verwendeten Bild- und Schriftdateien prüfen und erforderliche Hinweise beibehalten.

## Vor weiteren Nutzerkonten im gehosteten Dienst

Orbit kann CalDAV-Adressen und Benutzernamen verarbeiten, Zugangsdaten verschlüsselt in Cloudflare D1 ablegen und Kalenderdaten auf Anfrage lesen. Browserpläne und einige Einstellungen bleiben in `localStorage` auf dem jeweiligen Gerät. Deshalb sollte vor einer allgemeinen Einladung eine verständliche Datenschutzerklärung erstellt und direkt in der App verlinkt werden. Nach Art. 13 DSGVO gehören dazu unter anderem Verantwortlicher und Kontakt, Zweck und Rechtsgrundlage, Datenarten, Empfänger, Speicherdauer und Betroffenenrechte. [DSGVO, Art. 13](https://eur-lex.europa.eu/eli/reg/2016/679/ojv)

Vor dem Start konkret klären und dokumentieren:

- Wer für den Dienst verantwortlich ist und wie Nutzer diese Person erreichen.
- Welche Kalenderdaten, Verbindungsdaten und Gerätekennungen verarbeitet werden, wofür, wie lange und wann sie gelöscht werden.
- Cloudflare und andere beteiligte Anbieter, deren Auftragsverarbeitungsbedingungen sowie mögliche Drittlandübermittlungen.
- Wie Nutzer die gespeicherte Verbindung widerrufen und ihre Daten löschen lassen können. „Disconnect“ löscht die Serververbindung; lokale Browserpläne müssen separat behandelt werden.
- Ob das Speichern und Auslesen von `localStorage` nach § 25 TDDDG für jede Funktion unbedingt erforderlich ist. Das Gesetz kennt dafür eine Ausnahme; ein Cookie-Banner ist nicht automatisch für jede Website erforderlich. [§ 25 TDDDG](https://www.gesetze-im-internet.de/ttdsg/__25.html)
- Eine Anlaufstelle für Sicherheitsvorfälle, damit Zugangsdaten und Kalenderinformationen bei einer Fehlkonfiguration schnell geschützt werden können.

## Impressum und Anbieterangaben

§ 4 DDG sagt, dass digitale Dienste im Rahmen der Gesetze keiner allgemeinen Zulassung oder Anmeldung bedürfen. § 5 DDG enthält Anbieterinformationen für geschäftsmäßige, in der Regel gegen Entgelt angebotene digitale Dienste. Ob ein kostenloser persönlicher Kalenderdienst mit freiwilligem GoFundMe-Link darunter fällt, lässt sich nicht allein aus dem Code ableiten. Vor einem öffentlichen Angebot an fremde Nutzer sollte diese Einordnung einmal fachkundig geprüft werden. Falls ein Impressum erforderlich ist, müssen die echten Anbieter- und Kontaktdaten angegeben werden; Platzhalter oder erfundene Daten gehören nicht hinein. [§ 4 DDG](https://www.gesetze-im-internet.de/ddg/__4.html) · [§ 5 DDG](https://www.gesetze-im-internet.de/ddg/__5.html)

Ein öffentlicher Quellcode-Upload ist nicht dasselbe wie der Betrieb eines Kalenderdienstes. Das bloße Fehlen einer `LICENSE`-Datei bedeutet vor allem, dass andere den Code nicht allgemein weiterverwenden dürfen; es macht aus dem Projekt nicht automatisch eine Straftat. Es gibt auch keine allgemeine behördliche Genehmigungspflicht für einen gewöhnlichen digitalen Dienst nach § 4 DDG. Andere konkrete Pflichten bleiben davon unberührt.

## Spendenlink und Marken

- Der GoFundMe-Link sollte freiwillige Unterstützung klar benennen. Keine Aussage hinzufügen, dass Zahlungen steuerlich absetzbar seien, solange das nicht für diesen konkreten Aufruf bestätigt ist.
- Bei einer öffentlichen Beschreibung klarstellen, ob Orbit ein unabhängiges Projekt ist. Meta-Namen und -Marken nicht so einsetzen, dass eine offizielle Unterstützung oder Partnerschaft suggeriert wird.

## Freigabe-Check

- [ ] Entscheiden, ob nur der Quellcode oder auch der gehostete Dienst öffentlich werden soll.
- [ ] Repo-Sichtbarkeit bewusst festlegen; MIT-Lizenz und Credit-Hinweis sind vorbereitet.
- [ ] Commit-Historie und veröffentlichte Assets auf fremde Rechte, Schlüssel und persönliche Daten prüfen.
- [ ] Datenschutzhinweise und Datenlöschung für echte Nutzer festlegen.
- [ ] Impressumspflicht anhand der tatsächlichen Betriebs- und Finanzierungsform prüfen.
- [ ] Erst danach fremde Kalenderkonten zur Nutzung einladen.

