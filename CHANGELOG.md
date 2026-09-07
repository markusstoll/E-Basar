# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

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

[Unreleased]: https://github.com/markusstoll/E-Basar/compare/1.0.0...HEAD
[1.0.0]: https://github.com/markusstoll/E-Basar/compare/0.9.9...1.0.0
[0.9.9]: https://github.com/markusstoll/E-Basar/compare/0.9.7...0.9.9
[0.9.7]: https://github.com/markusstoll/E-Basar/compare/0.9.6...0.9.7
[0.9.6]: https://github.com/markusstoll/E-Basar/compare/0.9.3...0.9.6
[0.9.3]: https://github.com/markusstoll/E-Basar/compare/0.9.1...0.9.3
[0.9.1]: https://github.com/markusstoll/E-Basar/compare/0.9.0...0.9.1
[0.9.0]: https://github.com/markusstoll/E-Basar/compare/0.8.1...0.9.0
[0.8.1]: https://github.com/markusstoll/E-Basar/compare/0.8.0...0.8.1
[0.8.0]: https://github.com/markusstoll/E-Basar/releases/tag/0.8.0
