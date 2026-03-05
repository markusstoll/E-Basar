# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

- (Add new changes here before releasing)

## [0.2.0] - (date TBD)

### Added

- Direct transfer mode: amount + parameter, QR code for configured recipient.
- Seller mode: manage sellers/items with IBAN, parameter, price, phone; paid / paid-to-seller flags; commission.
- Settings: recipient name, IBAN, usage template with `$param`, parameter label, commission %.
- History/protocol with PDF export.
- Local storage for settings, history, and seller list.
- Responsive layout; overlay for QR code and settings; ESC to close.

### Technical

- EPC QR Code format (SEPA Credit Transfer).
- QR library: `qrcode` npm package, bundled as `lib/qrcode.min.js` for browser and `file://` support.

## [0.1.x] - (earlier)

- Initial version with basic QR code generation for SEPA transfers.

---

[Unreleased]: https://github.com/YOUR_USERNAME/E-Basar/compare/v0.2.0...HEAD  
[0.2.0]: https://github.com/YOUR_USERNAME/E-Basar/compare/v0.1.0...v0.2.0

**Note:** Replace `YOUR_USERNAME` with your actual GitHub username.
