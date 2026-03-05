# E-Basar

**[Deutsche Version](README.de.md)**

**E-Basar** is the **cashless** part of a Basar (bazaar/flea market) setup. The physical cash register (*Barkasse*) is extended with cashless payment for both **sellers** and **buyers**; this application handles only the cashless side.

- **Sellers**: Real-time bank transfer (*Echtzeitüberweisung*) for payouts.
- **Buyers**: Real-time transfer and optionally **WERO** for payments.
- **Reconciliation**: A built-in **balancing function** computes over- and under-amounts in the till so you can align the cashless activity with the Barkasse.

The app is **serverless** (runs in the browser, no backend). It generates **EPC QR codes** for SEPA transfers; buyers/sellers scan the code with their banking app.

### Use directly from GitHub

Once the repo has [GitHub Pages](https://docs.github.com/en/pages) enabled, you can use the app in your browser without cloning:

**https://*OWNER*.github.io/E-Basar/**  
*(Replace *OWNER* with the GitHub username or org that hosts the repo.)*

To enable GitHub Pages: repo **Settings → Pages → Source**: deploy from branch `main` (or `master`), folder **/ (root)**. After a short delay, the link above will serve `index.html`.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Features

- **Direct transfer mode**: Enter amount and parameter; generate a QR code for the configured recipient (e.g. Basar IBAN, usage template). Used for buyer payments (Echtzeitüberweisung, optionally WERO).
- **Seller mode**: Manage sellers/items (IBAN, parameter, price, phone); track “paid by buyer” and “paid to seller”; optional commission. Supports seller payouts via real-time transfer.
- **Balancing**: Over- and under-amounts in the till for reconciliation with the Barkasse.
- **EPC QR Code**: Standard SEPA Credit Transfer format—scannable by most banking apps.
- **History / protocol**: All generated transfers stored locally with optional PDF export.
- **Responsive**: Works on desktop and mobile.
- **Privacy**: All data stays in your browser (localStorage); no server, no tracking.

## Quick Start

1. **Clone or download** this repository.
2. Open `index.html` in a modern web browser (or serve the folder with any static file server).
3. Open **Settings** (gear icon) and enter the **Barkasse/Basar** details: recipient name, IBAN, usage template (e.g. `Rechnung $param`), and parameter label.
4. **Direct transfer** (buyer pays): enter amount and parameter, click **QR Code generieren**; the buyer scans the QR code with their banking app (Echtzeitüberweisung or WERO).
5. **Seller mode**: add sellers/items and generate QR codes for payouts; use the balancing view to reconcile with the Barkasse.

No build step required for basic use. For development (e.g. rebuilding the QR library), see [Development](#development) below.

## Usage

### Direct transfer (buyer pays)

- Enter **Amount (EUR)** and **Parameter** (e.g. invoice or item reference).
- The usage text is built from your settings template (e.g. `Rechnung $param`).
- Click **QR Code generieren**; the buyer scans the QR with their app (Echtzeitüberweisung or WERO).

### Seller mode

- **New object**: Add seller name, IBAN, parameter, price, phone.
- Mark items as **Paid (by buyer)** and **Paid to seller**; optional commission % for “An Verkäufer zahlen”.
- Generate QR codes for seller payouts (Echtzeitüberweisung).
- Filter and show/hide paid or deleted items via the toolbar.

### Balancing (reconciliation with Barkasse)

- The app computes **over- and under-amounts** in the till (e.g. in the footer) so you can match cashless activity with the physical Barkasse.

### Protocol (history)

- **Protokoll anzeigen**: View all generated transfers.
- **Export as PDF**: Download the protocol (if supported by your browser).

## Technical details

- **QR format**: EPC QR Code for SEPA Credit Transfer.
- **Storage**: Browser `localStorage` for settings, transfer history, and seller list.
- **QR library**: [qrcode](https://www.npmjs.com/package/qrcode) (bundled as `lib/qrcode.min.js`); supports long EPC strings and works with `file://`.

### Browser support

- Modern browsers with ES6, `localStorage`, and Canvas API.

### File structure

```
.
├── index.html          # Main HTML
├── style.css           # Styles
├── script.js           # Application logic
├── lib/
│   └── qrcode.min.js   # QR library (browser bundle)
├── package.json
├── LICENSE
├── CONTRIBUTING.md
├── CHANGELOG.md
└── docs/               # Additional documentation
```

## Development

- **Rebuild QR library** (after `npm install`):
  ```bash
  npx browserify node_modules/qrcode/lib/browser.js -s QRCode -o lib/qrcode.min.js
  ```
- **Version**: Bump in `package.json` and run `npm run update-version` to sync version in `script.js` and `index.html`.

## Documentation

- [User guide & EPC format](docs/USER_GUIDE.md)
- [Changelog](CHANGELOG.md)

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines and how to submit issues or pull requests.

## License

This project is licensed under the [MIT License](LICENSE).
