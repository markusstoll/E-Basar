const fs = require('fs');
const path = require('path');

// Pfad zur package.json, um die aktuelle Version zu lesen
const packageJsonPath = path.join(__dirname, 'package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = pkg.version;

const filesToUpdate = [
    {
        name: 'script.js',
        path: path.join(__dirname, 'script.js'),
        replacements: [
            {
                // Ersetzt: const APP_VERSION = '...';
                pattern: /const APP_VERSION = '[^']+';/,
                replacement: `const APP_VERSION = '${version}';`
            }
        ]
    },
    {
        name: 'index.html',
        path: path.join(__dirname, 'index.html'),
        replacements: [
            {
                // Ersetzt alle ?v=... Query Parameter in href/src
                pattern: /(\?v=)[^"'>\s]+/g,
                replacement: `$1${version}`
            },
            {
                // Ersetzt die Anzeige im Footer
                pattern: /(<span class="app-version">v)[^<]+(<\/span>)/,
                replacement: `$1${version}$2`
            }
        ]
    }
];

console.log(`Synchronisiere Version ${version}...`);

filesToUpdate.forEach(file => {
    if (fs.existsSync(file.path)) {
        let content = fs.readFileSync(file.path, 'utf8');
        let updatedContent = content;
        
        file.replacements.forEach(rep => {
            updatedContent = updatedContent.replace(rep.pattern, rep.replacement);
        });

        if (content !== updatedContent) {
            fs.writeFileSync(file.path, updatedContent);
            console.log(`✅ ${file.name} wurde aktualisiert.`);
        } else {
            console.log(`ℹ️ ${file.name} ist bereits aktuell.`);
        }
    } else {
        console.error(`❌ Datei nicht gefunden: ${file.path}`);
    }
});

console.log('Fertig.');
