# User Guide – E-Basar

E-Basar handles the **cashless** side of a Basar: it extends the physical cash register (*Barkasse*) with real-time bank transfers for **sellers** (payouts) and **buyers** (Echtzeitüberweisung, optionally WERO). A **balancing function** helps you reconcile the cashless activity with the Barkasse (over- and under-amounts in the till).

This guide explains how to use the app and what the EPC QR Code format is.

## What is EPC QR Code?

**EPC QR Code** (European Payments Council Quick Response Code) is a standard for encoding SEPA credit transfer data in a QR code. Many European banking apps can scan this code and pre-fill the transfer form (recipient, IBAN, amount, reference).

The generator produces a QR code that contains:

- **Recipient name** and **IBAN**
- **Amount** (EUR)
- **Purpose/reference** (Verwendungszweck), e.g. "Rechnung 12345"
- Optional BIC (often omitted for domestic SEPA)

All data stays in your browser; nothing is sent to a server.

## First-time setup

1. Open the app (`index.html` in a browser or via a web server).
2. Click the **Settings** (gear) icon.
3. Enter or select:
   - **Language**: Deutsch or English (stored in your browser).
   - **Recipient name**: Name of the Barkasse/Basar (as it appears on the transfer).
   - **Recipient IBAN**: The Basar/Barkasse IBAN (used for buyer payments in direct transfer).
   - **Usage template**: Text for "Verwendungszweck". Use `$param` where the variable part (e.g. invoice number) should go, e.g. `Rechnung $param`.
   - **Parameter label**: Label for the input field (e.g. "bicycle no." for a bike basar).
   - **Commission %** (optional): Used in Seller mode for "An Verkäufer zahlen" calculation.
4. Save. Settings are stored in your browser.

## Direct transfer

- Switch to **Direktüberweisung**.
- Enter **Amount (EUR)** and **Parameter** (e.g. invoice number).
- Click **QR Code generieren**.
- The QR code and details are shown; the buyer scans with their banking app (Echtzeitüberweisung or WERO).

## Seller mode

- Switch to **Verkäufer erfassen**.
- **New object**: Add seller name, IBAN, parameter, price, phone. Mark items as paid (by buyer) and paid to seller. Generate QR codes for seller payouts (Echtzeitüberweisung).
- The footer shows sums and **Bilanz Kasse** (over- and under-amounts) for reconciliation with the Barkasse.
- Use the toolbar to filter and to show/hide paid or deleted items.

## Protocol (history)

- Click **Protokoll anzeigen** to see all generated transfers.
- Use **Export as PDF** to download the list (if your browser supports it).

## Backup (export/import)

- The app provides **export** and **import** functions to back up and restore all data stored in localStorage (settings, seller list, protocol).
- Use **Export** (in Settings or toolbar) to download a backup file. Use **Import** to restore from a previously exported file.
- This lets you keep a backup on another device or move data to a different browser.

## Data and privacy

- All data (settings, history, seller list) is stored in **localStorage** in your browser.
- No data is sent to any server. The app runs entirely in the browser.
- Use **Export/Import** (see Backup above) to create backups of localStorage.
- To reset everything, use **Alle Daten löschen** in Settings (danger zone).

## Troubleshooting

- **QR code not scanning**: Ensure good lighting and that the banking app supports EPC QR codes (most German/EU apps do).
- **Wrong character encoding**: The app uses UTF-8; special characters in names or reference should work in compliant readers.
- **History lost**: If you clear site data or use another browser/device, localStorage is separate; there is no cloud sync.
