# Benutzerhandbuch – E-Basar

E-Basar übernimmt die **bargeldlose** Seite eines Basars: Es erweitert die physische Kasse (*Barkasse*) um Echtzeitüberweisungen für **Verkäufer** (Auszahlungen) und **Käufer** (Echtzeitüberweisung, optional WERO). Eine **Bilanzfunktion** hilft dabei, die bargeldlosen Vorgänge mit der Barkasse abzugleichen (Über- und Unterbeträge in der Kasse).

Diese Anleitung erklärt, wie Sie die App nutzen und was das EPC-QR-Code-Format ist.

## Was ist der EPC-QR-Code?

**EPC-QR-Code** (European Payments Council Quick Response Code) ist ein Standard zur Kodierung von SEPA-Überweisungsdaten in einem QR-Code. Viele europäische Banking-Apps können diesen Code scannen und das Überweisungsformular vorausfüllen (Empfänger, IBAN, Betrag, Verwendungszweck).

Der Generator erzeugt einen QR-Code mit:

- **Empfängername** und **IBAN**
- **Betrag** (EUR)
- **Verwendungszweck**, z. B. „Rechnung 12345“
- Optional BIC (bei Inlands-SEPA oft weggelassen)

Alle Daten bleiben in Ihrem Browser; es wird nichts an einen Server gesendet.

## Ersteinrichtung

1. App öffnen (`index.html` im Browser oder über einen Webserver).
2. Auf das **Einstellungen**-Symbol (Zahnrad) tippen.
3. Eingeben bzw. wählen:
   - **Sprache**: Deutsch oder English (wird im Browser gespeichert).
   - **Empfängername**: Name der Barkasse/des Basars (wie auf der Überweisung erscheinen soll).
   - **Empfänger-IBAN**: Die IBAN der Barkasse/des Basars (für Käuferzahlungen per Direktüberweisung).
   - **Verwendungszweck-Vorlage**: Text für „Verwendungszweck“. Verwenden Sie `$param` dort, wo der variable Teil (z. B. Rechnungsnummer) stehen soll, z. B. `Rechnung $param`.
   - **Parameter-Beschriftung**: Beschriftung des Eingabefelds (z. B. „Fahrrad-Nr“ bei einem Fahrradbasar).
   - **Provision %** (optional): Wird im Verkäufermodus für die Berechnung „An Verkäufer zahlen“ verwendet.
4. Speichern. Die Einstellungen werden im Browser gespeichert.

## Direktüberweisung

- Auf **Direktüberweisung** wechseln.
- **Betrag (EUR)** und **Parameter** (z. B. Rechnungsnummer) eingeben.
- Auf **QR-Code generieren** tippen.
- Der QR-Code und die Details werden angezeigt; der Käufer scannt mit seiner Banking-App (Echtzeitüberweisung oder WERO).

## Verkäufermodus

- Auf **Verkäufer erfassen** wechseln.
- **Neuer Eintrag**: Verkäufername, IBAN, Parameter, Preis, Telefon eintragen. Artikel als „vom Käufer bezahlt“ und „an Verkäufer gezahlt“ markieren. QR-Codes für Verkäufer-Auszahlungen (Echtzeitüberweisung) erzeugen.
- In der Fußzeile werden Summen und **Bilanz Kasse** (Über- und Unterbeträge) zur Abstimmung mit der Barkasse angezeigt.
- Über die Symbolleiste können Sie filtern und bezahlte bzw. gelöschte Einträge ein- oder ausblenden.

## Protokoll (Verlauf)

- **Protokoll anzeigen** öffnet alle erzeugten Überweisungen.
- **Als PDF exportieren** lädt die Liste herunter (wenn der Browser es unterstützt).

## Backup (Export/Import)

- Die App bietet **Export-** und **Import-**Funktionen, um alle im localStorage gespeicherten Daten (Einstellungen, Verkäuferliste, Protokoll) zu sichern und wiederherzustellen.
- **Export** (in Einstellungen oder Symbolleiste) erzeugt eine Backup-Datei zum Herunterladen. **Import** stellt die Daten aus einer zuvor exportierten Datei wieder her.
- So können Sie ein Backup auf einem anderen Gerät aufbewahren oder Daten in einen anderen Browser übertragen.

## Daten und Datenschutz

- Alle Daten (Einstellungen, Verlauf, Verkäuferliste) werden im **localStorage** Ihres Browsers gespeichert.
- Es werden keine Daten an einen Server übertragen. Die App läuft vollständig im Browser.
- **Export/Import** (siehe Backup oben) ermöglicht Backups des localStorage.
- Zum Zurücksetzen alles: **Alle Daten löschen** in den Einstellungen (Gefahrenzone).

## Fehlerbehebung

- **QR-Code wird nicht gescannt**: Gute Beleuchtung prüfen und sicherstellen, dass die Banking-App EPC-QR-Codes unterstützt (die meisten deutschen/europäischen Apps tun das).
- **Falsche Zeichenkodierung**: Die App nutzt UTF-8; Sonderzeichen in Namen oder Verwendungszweck sollten in konformen Lesegeräten funktionieren.
- **Verlauf weg**: Wenn Sie Websitedaten löschen oder einen anderen Browser/andere Geräte nutzen, ist der localStorage getrennt; es gibt keine Cloud-Synchronisation.
