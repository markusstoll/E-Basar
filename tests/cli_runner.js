#!/usr/bin/env node

/**
 * CLI Test Runner for E-Basar
 * Runs all test cases defined in test_cases.js in a mock DOM environment.
 * Zero external dependencies required.
 */

const fs = require('fs');
const path = require('path');

// --- 1. Setup lightweight DOM & Browser Mock ---
class MockClassList {
    constructor(element) {
        this.element = element;
        this.classes = new Set();
    }
    add(...names) {
        names.forEach(n => n && this.classes.add(n));
        this._sync();
    }
    remove(...names) {
        names.forEach(n => this.classes.delete(n));
        this._sync();
    }
    toggle(name, force) {
        if (force === true) {
            this.classes.add(name);
        } else if (force === false) {
            this.classes.delete(name);
        } else {
            if (this.classes.has(name)) this.classes.delete(name);
            else this.classes.add(name);
        }
        this._sync();
        return this.classes.has(name);
    }
    contains(name) {
        return this.classes.has(name);
    }
    _sync() {
        this.element.className = Array.from(this.classes).join(' ');
    }
}

class MockElement {
    constructor(tagName = 'div', id = '') {
        this.tagName = tagName.toUpperCase();
        this.id = id;
        this.className = '';
        this.classList = new MockClassList(this);
        this.attributes = new Map();
        this.eventListeners = new Map();
        this.value = '';
        this.checked = false;
        this.textContent = '';
        this._innerHTML = undefined;
        this.style = {};
        this.disabled = false;
        this.placeholder = '';
        this.required = false;
    }
    setAttribute(name, val) {
        this.attributes.set(name, String(val));
        if (name === 'id') this.id = String(val);
        if (name === 'class') {
            this.className = String(val);
            this.classList.classes = new Set(this.className.split(/\s+/).filter(Boolean));
        }
    }
    getAttribute(name) {
        return this.attributes.get(name) || null;
    }
    removeAttribute(name) {
        this.attributes.delete(name);
    }
    addEventListener(event, fn) {
        if (!this.eventListeners.has(event)) this.eventListeners.set(event, []);
        this.eventListeners.get(event).push(fn);
    }
    dispatchEvent(event) {
        const listeners = this.eventListeners.get(event.type || event);
        if (listeners) listeners.forEach(fn => fn(event));
    }
    get innerHTML() {
        if (this._innerHTML !== undefined) return this._innerHTML;
        return (this.textContent || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
    set innerHTML(val) {
        this._innerHTML = val;
    }
    focus() {}
    reset() {
        this.value = '';
        this.checked = false;
    }
    closest(selector) {
        return null;
    }
}

class MockDocument {
    constructor() {
        this.elementsById = new Map();
        this.eventListeners = new Map();
        this.documentElement = new MockElement('html');
    }
    createElement(tagName) {
        return new MockElement(tagName);
    }
    getElementById(id) {
        if (!this.elementsById.has(id)) {
            const el = new MockElement('div', id);
            this.elementsById.set(id, el);
        }
        return this.elementsById.get(id);
    }
    querySelectorAll(selector) {
        if (selector === '.mode-btn') {
            return [
                this.getElementById('modeSeller'),
                this.getElementById('modeSell'),
                this.getElementById('modePayout')
            ].filter(Boolean);
        }
        if (selector === '.btn-paid-method') {
            return [
                this.getElementById('btnPaidElectronic'),
                this.getElementById('btnPaidBar')
            ].filter(Boolean);
        }
        return [];
    }
    querySelector(selector) {
        return new MockElement('div');
    }
    addEventListener(event, fn) {
        if (!this.eventListeners.has(event)) this.eventListeners.set(event, []);
        this.eventListeners.get(event).push(fn);
    }
}

class MockLocalStorage {
    constructor() {
        this.store = new Map();
    }
    getItem(key) {
        return this.store.has(key) ? this.store.get(key) : null;
    }
    setItem(key, val) {
        this.store.set(key, String(val));
    }
    removeItem(key) {
        this.store.delete(key);
    }
    clear() {
        this.store.clear();
    }
}

// Read index.html to pre-populate elements with correct IDs and attributes
const indexPath = path.join(__dirname, '..', 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf-8');

const mockDoc = new MockDocument();
const idRegex = /id="([^"]+)"/g;
let match;
while ((match = idRegex.exec(indexHtml)) !== null) {
    mockDoc.getElementById(match[1]);
}

// Special attributes for mode-btns
const modeSeller = mockDoc.getElementById('modeSeller');
if (modeSeller) modeSeller.setAttribute('data-mode', 'seller');
const modeSell = mockDoc.getElementById('modeSell');
if (modeSell) modeSell.setAttribute('data-mode', 'sell');
const modePayout = mockDoc.getElementById('modePayout');
if (modePayout) modePayout.setAttribute('data-mode', 'payout');

const mockStorage = new MockLocalStorage();

global.window = global;
global.document = mockDoc;
global.localStorage = mockStorage;
global.alert = (msg) => {};
global.confirm = (msg) => true;
global.prompt = (msg, def) => def;
global.location = { reload: () => {}, href: '' };

// Minimal i18n mock fallback
global.window.i18n = {
    tOr: (key, fallback, args) => {
        if (!args || args.length === 0) return fallback;
        let res = fallback;
        args.forEach((a, i) => { res = res.replace(`{${i}}`, a); });
        return res;
    },
    getLanguage: () => 'de'
};

// --- 2. Load App Code ---
const scriptPath = path.join(__dirname, '..', 'script.js');
const app = require(scriptPath);

// --- 3. Load Test Cases ---
const importedSuites = require('./test_cases.js');
const testSuites = Array.isArray(importedSuites) ? importedSuites : importedSuites.testSuites;

// --- 4. Test Execution Engine ---
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

const startTime = Date.now();

console.log('\n========================================');
console.log('   E-Basar Automated Regression Suite   ');
console.log('========================================\n');

for (const suite of testSuites) {
    console.log(`\x1b[1m\x1b[36m▶ ${suite.name}\x1b[0m`);

    for (const test of suite.tests) {
        totalTests++;
        const testContext = {
            app,
            reset() {
                localStorage.clear();
                mockDoc.getElementById('sellerFilterParam').value = '';
                mockDoc.getElementById('sellerFilterSeller').value = '';
                mockDoc.getElementById('showPaid').checked = false;
                mockDoc.getElementById('showReimbursed').checked = false;
                mockDoc.getElementById('showDeleted').checked = false;
                mockDoc.getElementById('sellerList').innerHTML = '';
                app.setMode('sell');
            },
            setMode(mode) {
                app.setMode(mode);
            },
            setShowPaid(bool) {
                const cb = mockDoc.getElementById('showPaid');
                if (cb) cb.checked = bool;
                app.renderSellerList();
            },
            setShowReimbursed(bool) {
                const cb = mockDoc.getElementById('showReimbursed');
                if (cb) cb.checked = bool;
                app.renderSellerList();
            },
            setShowDeleted(bool) {
                const cb = mockDoc.getElementById('showDeleted');
                if (cb) cb.checked = bool;
                app.renderSellerList();
            },
            getRenderedItems() {
                app.renderSellerList();
                const html = mockDoc.getElementById('sellerList').innerHTML;
                if (!html || html.includes('seller-empty')) return [];
                const allItems = app.getSellerItems();
                // Extract item IDs in the exact order they were rendered
                const matches = Array.from(html.matchAll(/data-id="([^"]+)"/g));
                const seenIds = new Set();
                const orderedIds = [];
                for (const m of matches) {
                    if (!seenIds.has(m[1])) {
                        seenIds.add(m[1]);
                        orderedIds.push(m[1]);
                    }
                }
                return orderedIds.map(id => allItems.find(i => i.id === id)).filter(Boolean);
            },
            getFooterSum(id) {
                const el = mockDoc.getElementById(id);
                return el ? el.textContent.trim() : '';
            },
            getElementById(id) {
                return mockDoc.getElementById(id);
            },
            assert(condition, message = 'Assertion failed') {
                if (!condition) throw new Error(message);
            },
            assertTrue(val, message = 'Expected true') {
                if (val !== true) throw new Error(`${message} (erhalten: ${val})`);
            },
            assertFalse(val, message = 'Expected false') {
                if (val !== false) throw new Error(`${message} (erhalten: ${val})`);
            },
            assertEqual(actual, expected, message = '') {
                if (actual !== expected) {
                    throw new Error(`${message} - Erwartet: ${JSON.stringify(expected)}, Erhalten: ${JSON.stringify(actual)}`);
                }
            },
            assertDeepEqual(actual, expected, message = '') {
                const sActual = JSON.stringify(actual);
                const sExpected = JSON.stringify(expected);
                if (sActual !== sExpected) {
                    throw new Error(`${message} - Erwartet: ${sExpected}, Erhalten: ${sActual}`);
                }
            }
        };

        const testStart = Date.now();
        try {
            test.fn(testContext);
            passedTests++;
            const duration = Date.now() - testStart;
            console.log(`  \x1b[32m✔\x1b[0m ${test.name} \x1b[90m(${duration}ms)\x1b[0m`);
        } catch (err) {
            failedTests++;
            failures.push({
                suite: suite.name,
                test: test.name,
                error: err
            });
            console.log(`  \x1b[31m✖ ${test.name}\x1b[0m`);
            console.log(`    \x1b[31mError: ${err.message}\x1b[0m`);
        }
    }
    console.log('');
}

const totalDuration = Date.now() - startTime;

console.log('----------------------------------------');
if (failedTests === 0) {
    console.log(`\x1b[1m\x1b[32m✔ SUCCESS: Alle ${passedTests} Tests erfolgreich bestanden! (${totalDuration}ms)\x1b[0m\n`);
    process.exit(0);
} else {
    console.log(`\x1b[1m\x1b[31m✖ FAILURE: ${failedTests} von ${totalTests} Tests fehlgeschlagen! (${totalDuration}ms)\x1b[0m\n`);
    failures.forEach((f, i) => {
        console.log(`\x1b[31m${i + 1}) [${f.suite}] ${f.test}\x1b[0m`);
        console.log(`   ${f.error.stack || f.error.message}\n`);
    });
    process.exit(1);
}
