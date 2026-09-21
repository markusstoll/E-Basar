# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [1.1.5] - 2026-09-21

### Fixed
- **Protokollierung nur bei tatsächlichem Abschluss mit Auswahl**:
  - `saveToHistory` wird nicht mehr beim bloßen Öffnen eines Overlays ausgeführt, sondern erst, wenn eine Auswahl getroffen wird (`overlayPayDoneElectronic`, `overlayPayDoneCash`, `overlayPaySellerDone`).
  - Schließen oder Abbrechen des Overlays ohne Zahlungsvermerk erzeugt keinen Protokolleintrag mehr.
  - Verwendung gültiger Test-IBANs aus `tests/test-ibans.txt` in den Test-Szenarien und Testfällen.

### Added
- **Protokollierung von Statusänderungen & Resets im Bearbeiten-Overlay**:
  - Zurücksetzen des Zahlungsstatus (`paymentReset`) oder des Auszahlungsstatus (`payoutReset`) im Bearbeiten-Dialog wird nun explizit protokolliert.
  - Manuelle nachträgliche Statusmarkierungen (`paymentSet`, `payoutSet`) werden ebenfalls im Protokoll erfasst.
  - Visuelle Hervorhebung im Protokoll (rote Randmarkierung für Resets/Stornos, orange Randmarkierung für manuelle Statusänderungen, grüne Randmarkierung für Verkäuferauszahlungen).
  - Anzeige der gewählten Zahlart (Bar / Elektronisch) in Protokoll-Einträgen.
- **Automatisierte Test-Suite 11 (12 Tests)**:
  - Umfassende automatisierte Tests für das Protokollverhalten bei Bezahlung, Auszahlung, Schließen ohne Auswahl sowie Status-Resets und Status-Setzungen im Bearbeiten-Overlay (Gesamtzahl: 57 Tests).

## [1.1.4] - 2026-09-20

### Fixed
- **Payout-Bestätigung im Overlay & Schließen-Warnung (Regression Fix)**:
  - Button `#overlayPaySellerDone` im Overlay mit Beschriftung *„Auszahlung an Verkäufer bestätigen“* (`overlay.paidToSeller`) ermöglicht nun das direkte Vermerken der Auszahlung mit Zeitstempel (`sellerPaid: true`, `sellerPaidAt`).
  - Beim Schließen des Overlays über den Schließen-Button (`#closeOverlay`) wird bei unbestätigter Zahlung oder Auszahlung eine Sicherheitswarnung angezeigt: *„Soll das Overlay ohne Zahlungsvermerk geschlossen werden?“* (`overlay.confirmCloseWithoutPayment`).
  - Direkte Weiterleitung auf das Payout-Overlay (`openPaySellerOverlay`), falls `openPayOverlay` für ein vom Käufer bereits bezahltes Objekt mit Verkäufer-IBAN aufgerufen wird.

### Added
- **Automatisierte Test-Suite 10**:
  - 4 neue automatisierte Tests in `tests/test_cases.js` (Gesamtzahl: 44 Tests) zur Absicherung der Payout-Bestätigung, der Schließen-Warnung und der Weiterleitungslogik.

## [1.1.3] - 2026-09-20

### Changed
- **Hinweis auf Datenüberschreibung bei Test-Szenarien**:
  - Button-Beschriftung und Bestätigungsdialog für „Test-Szenarien laden“ verdeutlichen nun explizit, dass der bestehende Datenbestand in der Datenbank dabei überschrieben wird.

## [1.1.2] - 2026-09-20

### Added
- **Test-Modus für alle 5 Szenarien in einer Datenbank**:
  - `loadTestScenario()` Funktion zur automatisierten Generierung aller 5 Kernszenarien in der gleichen Datenbank:
    1. Objekt mit IBAN registriert (noch unbezahlt)
    2. Objekt ohne IBAN registriert (noch unbezahlt)
    3. Registriertes Objekt bar bezahlt (Auszahlung offen)
    4. Nicht registriertes Objekt elektronisch bezahlt (Zahlungseingang Basar)
    5. Registriertes Objekt bar bezahlt und elektronisch ausbezahlt (abgeschlossen)
  - Neuer Button im Einstellungsmenü: *„Test-Szenarien laden (5 Testobjekte)“* zum direkten Testen in der Live-Web-App.
- **End-to-End Regression Suite (Suite 9)**:
  - 4 neue automatisierte Tests (Gesamtzahl: 40 Tests) zur umfassenden Verifikation aller Objektstatus in allen Modi (`seller`, `sell`, `payout`), aller Kassenabrechnungs-Summen (`updateFooterSums`) und aller 3 CSV-Report-Tabellen (`getReportData`).

## [1.1.1] - 2026-09-20

### Fixed
- **Hide Items Without IBAN in Payout Mode**:
  - In „An Verkäufer erstatten“ (`payout`) mode, items without a registered IBAN are now completely hidden (both open and already reimbursed), as payouts can only be processed to a valid bank account.
  - Items without IBAN remain visible as intended in „Verkaufen“ (`sell`) and „Verkäufer erfassen“ (`seller`) modes.
  - Updated empty-state counter for payout mode to only count items with an IBAN.
  - Added regression test in Suite 5 ensuring items without IBAN are excluded in payout mode under all filter states (total 36 tests).

## [1.1.0] - 2026-09-20

### Changed
- **Seller Notification Moved to Payment Step**:
  - Notification via SMS / iMessage moved from payout (`paySeller`) to buyer payment (`pay`).
  - **Mandatory Step (Pflichtschritt)**: For items registered for cashless reimbursement (IBAN and phone present), payment completion buttons are disabled until the seller notification is triggered.
  - **Updated Notification Template (`sms.paymentConfirm`)**: Announces transfer within 2 hours, specifying the net payout amount (price minus commission), item identifier, and formatted IBAN:
    > *"Ihr {0} wurde verkauft und wir werden die Überweisung über {1} EUR für {0} {2} auf Ihr Konto {3} in den nächsten 2 Stunden vornehmen. Sie müssen nicht mehr zur Kasse kommen. Bitte bestätigen Sie dann den Eingang des Geldes!"*

### Added
- **Visual Notification State in Payment Overlay**:
  - Status banner `#overlayPayNotifyRow` showing warning state (`⚠️`) when notification is required and success state (`✅`) with timestamp once sent.
- **Automated Regression Tests**:
  - Net payout calculation test after commission deduction (`buildSellerPaymentSmsText`).
  - Mandatory notification workflow test verifying button lock/unlock behavior (`openPayOverlay`).

## [1.0.1] - 2026-09-19

### Added
- **Status Timestamps for 4 Key Process Steps**:
  - `createdAt`: Captured when registering the object for sale.
  - `paidAt`: Captured on buyer payment (supported equally for both cash and electronic payment methods).
  - `notifiedAt`: Captured when notifying the seller via SMS / iMessage (`overlayPaySellerNotify`).
  - `sellerPaidAt`: Captured when recording payout to seller.
- **Right-Aligned Timestamps Display**:
  - Timestamps are displayed right-aligned and stacked vertically (`.seller-item-timestamps`) with tabular figures.
  - Responsive styling adjusting cleanly on mobile viewports (`max-width: 600px`).
- **Regression Tests**: Added 3 new tests in Suite 2 (total 33 tests) covering cash `paidAt`, `notifiedAt`, timestamp overwriting, and vertical rendering.

## [1.0.0] - 2026-09-07

### Added
- **Dedicated Payout Mode ("An Verkäufer erstatten" / `payout`)**:
  - Independent main navigation mode dedicated to reimbursing sellers.
  - Chronological sorting by payment timestamp (`paidAt`) with oldest payments displayed first.
  - Filter toggle "Bereits erstattete einblenden" (`showReimbursed`).
  - Hides edit, delete, and status controls during payout to prevent accidental modifications.
- **Smart Multi-Item Selection & Batch Payout**:
  - Selection checkboxes are only displayed when multiple open payable items share the same IBAN.
  - Selecting an item automatically sets the search filter to that formatted IBAN, isolating that seller's items.
  - Filter is automatically reset when all selections are cleared.
  - Strict IBAN validation: Items with different IBANs cannot be selected together and remain disabled with explanatory tooltips, even if the filter is manually cleared.
  - Batch payout and SMS notification for all selected items of a seller.
- **Automated Regression Test Suite**:
  - Zero-dependency automated test runner supporting both CLI (`npm test` via Node.js) and visual browser execution (`tests/test-runner.html` via `file://`).
  - 30 automated tests across 8 suites covering IBAN validation, persistence, timestamps, filters, cash balancing, form visibility, and batch payouts.
  - Memory-isolated storage virtualization ensuring test runs never modify browser `localStorage`.
- **Project Renaming**: Renamed project to **E-Basar**.
- Added test IBAN reference file (`tests/test-ibans.txt`).

### Changed
- **Sell Mode (`sell`) Filter**: Default view now displays only unsold/unpaid items (`showPaid=false`). The toggle "bezahlte einblenden" shows all sold items without filtering by seller reimbursement status.
- **Sell Mode Simplification**: Removed multi-selection checkboxes and the "An Verkäufer zahlen" button from Sell mode, restricting seller payouts strictly to Payout mode.

## [0.9.9] - 2026-03-08

### Added
- **Unpaid Item Warning on Payout**: Added a "bar bezahlt" (paid cash) confirmation checkbox when initiating a payout to a seller for items not yet marked as paid by the buyer, ensuring register cash balance is updated before payout.

## [0.9.7] - 2026-03-08

### Fixed
- Fixed false-positive unpaid warning when closing a payment overlay where payment had already been completed.

## [0.9.6] - 2026-03-08

### Added
- **Full Report**: Comprehensive overview and printable HTML report (`showFullReport`) with statistics, cash balances, commissions, and item lists.
- **Warning on Unmarked Payment**: Added confirmation warning when closing payment overlay without marking the item as paid.
- **Auto-Filter on Object Creation**: Automatically sets filter to newly created object after registration.
- **Internationalization (i18n)**: English and German translations for CSV export headers, summary rows, and printable report labels.
- Optional offline i18n mode (`lang-embed.js`) for direct `file://` usage.
- Header branding customization (custom logo and app titles in settings).

## [0.9.3] - 2026-03-07

### Changed
- **Structured CSV Export**: Split CSV export into three distinct accounting sections with sub-totals and balance impacts:
  1. Cash payment by buyer, electronic payout to seller (positive cash impact).
  2. Electronic payment by buyer, cash payout to seller (negative cash impact).
  3. Electronic payment by buyer, electronic payout to seller.

## [0.9.1] - 2026-03-07

### Added
- Added seller IBAN column (`Verkäufer IBAN`) to CSV export.

## [0.9.0] - 2026-03-07

### Added
- **CSV Export**: Added semicolon-separated CSV export (`btnCsvExport`) with UTF-8 BOM, German number formatting, and proper cell escaping.
- Reorganized footer layout into dedicated button groups.

## [0.8.1] - 2026-03-06

### Added
- **Reset Data Without Settings**: New function `resetAllDataExceptSettings` to wipe bazaar transactions while preserving organizer settings (IBAN, organizer name, fees, logo).
- Added `ROADMAP.md` documenting planned project features.

## [0.8.0] - 2026-03-05

### Added
- Initial release of E-Basar.
- EPC-QR-Code generation (GiroCode / SEPA Credit Transfer) for buyer payments and seller payouts.
- Object registration, price management, and sales recording.
- Cash reconciliation (Barkasse & Kartenzahlungen) with commission calculation.
- Event protocol and history log.
- Local browser storage (`localStorage`) persistence.

---

[Unreleased]: https://github.com/markusstoll/E-Basar/compare/1.1.5...HEAD
[1.1.5]: https://github.com/markusstoll/E-Basar/compare/1.1.4...1.1.5
[1.1.4]: https://github.com/markusstoll/E-Basar/compare/1.1.3...1.1.4
[1.1.3]: https://github.com/markusstoll/E-Basar/compare/1.1.2...1.1.3
[1.1.2]: https://github.com/markusstoll/E-Basar/compare/1.1.1...1.1.2
[1.1.1]: https://github.com/markusstoll/E-Basar/compare/1.1.0...1.1.1
[1.1.0]: https://github.com/markusstoll/E-Basar/compare/1.0.1...1.1.0
[1.0.1]: https://github.com/markusstoll/E-Basar/compare/1.0.0...1.0.1
[1.0.0]: https://github.com/markusstoll/E-Basar/compare/0.9.9...1.0.0
[0.9.9]: https://github.com/markusstoll/E-Basar/compare/0.9.7...0.9.9
[0.9.7]: https://github.com/markusstoll/E-Basar/compare/0.9.6...0.9.7
[0.9.6]: https://github.com/markusstoll/E-Basar/compare/0.9.3...0.9.6
[0.9.3]: https://github.com/markusstoll/E-Basar/compare/0.9.1...0.9.3
[0.9.1]: https://github.com/markusstoll/E-Basar/compare/0.9.0...0.9.1
[0.9.0]: https://github.com/markusstoll/E-Basar/compare/0.8.1...0.9.0
[0.8.1]: https://github.com/markusstoll/E-Basar/compare/0.8.0...0.8.1
[0.8.0]: https://github.com/markusstoll/E-Basar/releases/tag/0.8.0
