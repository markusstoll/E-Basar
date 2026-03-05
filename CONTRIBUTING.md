# Contributing to E-Basar

Thank you for your interest in contributing. This document explains how to report issues, suggest features, and submit changes.

## Code of conduct

Be respectful and constructive. This project aims to stay simple and useful for SEPA QR code generation.

## How to contribute

### Reporting bugs

- Use the [GitHub issue tracker](https://github.com/markusstoll/E-Basar/issues) (replace `markusstoll` with the actual repo owner).
- Choose the **Bug report** template if available.
- Include:
  - Browser and OS
  - Steps to reproduce
  - Expected vs actual behaviour
  - Any console errors (if applicable)

### Suggesting features

- Open an issue with the **Feature request** template.
- Describe the use case and why it would help.

### Pull requests

1. **Fork** the repository and create a branch from `main` (or default branch).
2. **Make your changes** (keep the code style consistent; no build step required for the app itself).
3. **Rebuild the QR library** if you changed dependencies:
   ```bash
   npm install
   npx browserify node_modules/qrcode/lib/browser.js -s QRCode -o lib/qrcode.min.js
   ```
4. **Test** by opening `index.html` in a browser.
5. **Commit** with clear messages (e.g. "Fix IBAN validation", "Add export format X").
6. **Open a pull request** and describe what you changed and why.

### Development setup

- Clone the repo, run `npm install`.
- Edit `script.js`, `style.css`, or `index.html` as needed.
- Rebuild `lib/qrcode.min.js` only when `package.json` dependencies change.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
