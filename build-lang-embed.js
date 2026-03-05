/**
 * Generates lang-embed.js from lang/de.json and lang/en.json.
 * Run: node build-lang-embed.js
 * Required so that i18n works when the app is opened via file:// (fetch is blocked).
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'lang');
const de = JSON.parse(fs.readFileSync(path.join(dir, 'de.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(dir, 'en.json'), 'utf8'));

const out = `// Embedded translations for file:// protocol (no fetch). Generated from lang/*.json
// Regenerate with: node build-lang-embed.js
window.__I18N_EMBEDDED = {
  de: ${JSON.stringify(de)},
  en: ${JSON.stringify(en)}
};
`;

fs.writeFileSync(path.join(__dirname, 'lang-embed.js'), out);
console.log('Written lang-embed.js');
