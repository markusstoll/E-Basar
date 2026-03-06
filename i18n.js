/**
 * Simple i18n for E-Basar. Loads lang/de.json and lang/en.json.
 * Usage: t('key') or t('key', ['param1', 'param2']) for {0}, {1} substitution.
 */
(function (global) {
    const STORAGE_KEY = 'appLang';
    const DEFAULT_LANG = 'de';

    let currentLang = DEFAULT_LANG;
    let messages = {};

    /** Get stored language or browser preference. */
    function getStoredLanguage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored === 'de' || stored === 'en') return stored;
        } catch (e) {}
        const nav = global.navigator;
        const lang = (nav && (nav.language || nav.userLanguage || '').split('-')[0]) || '';
        return lang === 'en' ? 'en' : 'de';
    }

    /** Load translations via fetch. On failure (e.g. file://) messages stay empty; HTML default text is kept. */
    function loadLanguage(lang) {
        return fetch('lang/' + lang + '.json')
            .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('Not ok')); })
            .then(function (data) {
                messages = data || {};
                currentLang = lang;
                return messages;
            })
            .catch(function () {
                // file:// or network error: no translations; applyToPage will leave existing HTML text unchanged
                messages = {};
                currentLang = lang;
                return messages;
            });
    }

    /**
     * Translate key. Params can be array or single value for {0}.
     * Returns key if no translation (e.g. when lang files did not load).
     * @param {string} key - e.g. 'footer.sumPaid'
     * @param {Array|string|number} [params] - values for {0}, {1}, ...
     */
    function t(key, params) {
        let str = (messages && messages[key]) || key;
        if (params !== undefined && params !== null) {
            const arr = Array.isArray(params) ? params : [params];
            arr.forEach(function (val, i) {
                str = str.replace(new RegExp('\\{' + i + '\\}', 'g'), String(val));
            });
        }
        return str;
    }

    /** Like t(key, params) but returns fallback when no translation is available (e.g. file://). */
    function tOr(key, fallback, params) {
        const val = t(key, params);
        return val === key ? fallback : val;
    }

    function getLanguage() {
        return currentLang;
    }

    function setLanguage(lang) {
        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch (e) {}
        currentLang = lang;
    }

    /**
     * Initialize i18n: load stored language and return Promise when ready.
     */
    function init() {
        currentLang = getStoredLanguage();
        return loadLanguage(currentLang);
    }

    /**
     * Switch language, reload translations, apply to page. Returns Promise.
     */
    function switchLanguage(lang) {
        setLanguage(lang);
        return loadLanguage(lang).then(function () {
            applyToPage();
            return currentLang;
        });
    }

    /**
     * Apply translations to all elements with data-i18n="key". If no translation is loaded (e.g. file://),
     * leaves the existing German default text in the HTML unchanged.
     */
    function applyToPage() {
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            const key = el.getAttribute('data-i18n');
            const attr = el.getAttribute('data-i18n-attr');
            const value = t(key);
            if (value === key) return;
            if (attr) {
                attr.split(',').forEach(function (a) {
                    const name = a.trim();
                    if (name) el.setAttribute(name, value);
                });
            } else {
                el.textContent = value;
            }
        });
        if (global.document && global.document.documentElement) {
            global.document.documentElement.lang = currentLang === 'en' ? 'en' : 'de';
        }
        var titleEl = global.document && global.document.querySelector('title[data-i18n]');
        if (titleEl && t('app.title') !== 'app.title') titleEl.textContent = t('app.title');
    }

    global.i18n = {
        t: t,
        tOr: tOr,
        getLanguage: getLanguage,
        setLanguage: setLanguage,
        init: init,
        switchLanguage: switchLanguage,
        applyToPage: applyToPage,
        loadLanguage: loadLanguage
    };
})(typeof window !== 'undefined' ? window : this);
