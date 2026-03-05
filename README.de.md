# E-Basar

**[English version](README.md)**

**E-Basar** ist der **bargeldlose** Teil eines Basar-Setups. Die physische Barkasse wird um bargeldlose Zahlung für **Verkäufer** und **Käufer** ergänzt; diese Anwendung kümmert sich nur um den bargeldlosen Teil.

- **Verkäufer**: Echtzeitüberweisung für Auszahlungen.
- **Käufer**: Echtzeitüberweisung und optional **WERO** für Zahlungen.
- **Abgleich**: Eine eingebaute **Bilanzierungsfunktion** berechnet Über- und Unterbestände in der Kasse, damit Sie die bargeldlosen Vorgänge mit der Barkasse abgleichen können.

Die App ist **serverlos** (läuft im Browser, kein Backend). Sie erzeugt **EPC-QR-Codes** für SEPA-Überweisungen; Käufer bzw. Verkäufer scannen den Code mit ihrer Banking-App.

### Direkt von GitHub nutzen

Sobald für das Repository [GitHub Pages](https://docs.github.com/de/pages) aktiviert ist, können Sie die App im Browser nutzen, ohne es zu klonen:

**https://*OWNER*.github.io/E-Basar/**  
*(Ersetzen Sie *OWNER* durch den GitHub-Benutzernamen bzw. die Organisation, der das Repo gehört.)*

GitHub Pages aktivieren: **Einstellungen → Pages → Source**: Branch `main` (oder `master`), Ordner **/ (root)**. Nach kurzer Zeit ist die App unter der obigen Adresse erreichbar.

[![Lizenz: MIT](https://img.shields.io/badge/Lizenz-MIT-blau.svg)](LICENSE)

## Funktionen

- **Modus Direktüberweisung**: Betrag und Parameter eingeben; QR-Code für den konfigurierten Empfänger erzeugen (z. B. Basar-IBAN, Verwendungszweck-Vorlage). Wird für Käuferzahlungen genutzt (Echtzeitüberweisung, optional WERO).
- **Verkäufer-Modus**: Verkäufer/Objekte verwalten (IBAN, Parameter, Preis, Telefon); „vom Käufer bezahlt“ und „an Verkäufer ausgezahlt“ erfassen; optionale Provision. Unterstützt Verkäufer-Auszahlungen per Echtzeitüberweisung.
- **Bilanzierung**: Über- und Unterbestände in der Kasse für den Abgleich mit der Barkasse.
- **EPC-QR-Code**: Standard SEPA-Überweisungsformat – von den meisten Banking-Apps scannbar.
- **Protokoll**: Alle erzeugten Überweisungen werden lokal gespeichert, optional PDF-Export.
- **Responsiv**: Nutzbar auf Desktop und Mobilgeräten.
- **Datenschutz**: Alle Daten bleiben im Browser (localStorage); kein Server, kein Tracking.

## Schnellstart

1. Repository **klonen oder herunterladen**.
2. `index.html` in einem modernen Webbrowser öffnen (oder den Ordner mit einem beliebigen statischen Dateiserver ausliefern).
3. **Einstellungen** (Zahnrad) öffnen und die **Barkasse-/Basar-Daten** eintragen: Empfängername, IBAN, Verwendungszweck-Vorlage (z. B. `Rechnung $param`) und Bezeichnung des Parameters.
4. **Direktüberweisung** (Käufer zahlt): Betrag und Parameter eingeben, **QR Code generieren** klicken; der Käufer scannt den QR-Code mit seiner Banking-App (Echtzeitüberweisung oder WERO).
5. **Verkäufer-Modus**: Verkäufer/Objekte anlegen und QR-Codes für Auszahlungen erzeugen; die Bilanzansicht nutzen, um mit der Barkasse abzugleichen.

Für die normale Nutzung ist kein Build-Schritt nötig. Für die Entwicklung (z. B. Neubau der QR-Bibliothek) siehe [Entwicklung](#entwicklung) unten.

## Nutzung

### Direktüberweisung (Käufer zahlt)

- **Betrag (EUR)** und **Parameter** (z. B. Rechnungs- oder Artikelnummer) eingeben.
- Der Verwendungszweck wird aus Ihrer Vorlage erzeugt (z. B. `Rechnung $param`).
- **QR Code generieren** klicken; der Käufer scannt den QR-Code mit seiner App (Echtzeitüberweisung oder WERO).

### Verkäufer-Modus

- **Neues Objekt**: Verkäufername, IBAN, Parameter, Preis, Telefon eintragen.
- Objekte als **vom Käufer bezahlt** bzw. **an Verkäufer ausgezahlt** markieren; optionale Provision % für „An Verkäufer zahlen“.
- QR-Codes für Verkäufer-Auszahlungen (Echtzeitüberweisung) erzeugen.
- Über die Symbolleiste bezahlte oder gelöschte Einträge ein- und ausblenden.

### Bilanzierung (Abgleich mit der Barkasse)

- Die App berechnet **Über- und Unterbestände** in der Kasse (z. B. in der Fußzeile), damit Sie die bargeldlosen Vorgänge mit der physischen Barkasse abgleichen können.

### Protokoll

- **Protokoll anzeigen**: Alle erzeugten Überweisungen anzeigen.
- **Als PDF exportieren**: Protokoll herunterladen (wenn vom Browser unterstützt).

## Technische Details

- **QR-Format**: EPC-QR-Code für SEPA-Überweisungen.
- **Speicherung**: Browser-`localStorage` für Einstellungen, Überweisungsverlauf und Verkäuferliste.
- **QR-Bibliothek**: [qrcode](https://www.npmjs.com/package/qrcode) (eingebunden als `lib/qrcode.min.js`); unterstützt lange EPC-Texte und funktioniert mit `file://`.

### Browserunterstützung

- Moderne Browser mit ES6, `localStorage` und Canvas-API.

### Dateistruktur

```
.
├── index.html          # Haupt-HTML
├── style.css           # Styles
├── script.js           # Anwendungslogik
├── lib/
│   └── qrcode.min.js   # QR-Bibliothek (Browser-Bundle)
├── package.json
├── LICENSE
├── CONTRIBUTING.md
├── CHANGELOG.md
└── docs/               # Weitere Dokumentation
```

## Entwicklung

- **QR-Bibliothek neu bauen** (nach `npm install`):
  ```bash
  npx browserify node_modules/qrcode/lib/browser.js -s QRCode -o lib/qrcode.min.js
  ```
- **Version**: In `package.json` anheben und `npm run update-version` ausführen, um die Version in `script.js` und `index.html` zu synchronisieren.

## Dokumentation

- [Benutzerhandbuch & EPC-Format](docs/USER_GUIDE.md)
- [Changelog](CHANGELOG.md)

## Mitwirken

Mitwirkung ist willkommen. Bitte [CONTRIBUTING.md](CONTRIBUTING.md) lesen für Richtlinien sowie zum Melden von Fehlern und Einreichen von Pull Requests.

## Lizenz

Dieses Projekt steht unter der [MIT-Lizenz](LICENSE).
