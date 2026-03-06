const APP_VERSION = '0.8.0';

// Storage keys
const STORAGE_KEY = 'transferHistory';
const SETTINGS_KEY = 'transferSettings';
const MODE_KEY = 'appMode';
const SELLER_ITEMS_KEY = 'sellerItems';

// Default settings (used when none saved yet)
const DEFAULT_SETTINGS = {
    recipientName: '',
    iban: '',
    usageTemplate: 'Rechnung $objekt',
    paramLabel: 'Objekt',
    commissionPercent: 10,
    weroLink: '',
    appTitle: '',
    appSubtitle: '',
    appLogoDataUrl: ''
};

// DOM Elements
const overlay = document.getElementById('overlay');
const historyOverlay = document.getElementById('historyOverlay');
const settingsOverlay = document.getElementById('settingsOverlay');
const sellerFormOverlay = document.getElementById('sellerFormOverlay');
const closeOverlay = document.getElementById('closeOverlay');
const closeHistory = document.getElementById('closeHistory');
const closeSettings = document.getElementById('closeSettings');
const closeSellerForm = document.getElementById('closeSellerForm');
const viewHistoryBtn = document.getElementById('viewHistory');
const settingsBtn = document.getElementById('settingsBtn');
const btnResetAll = document.getElementById('btnResetAll');
const settingsForm = document.getElementById('settingsForm');
const sellerForm = document.getElementById('sellerForm');
const qrCanvas = document.getElementById('qrCanvas');
const qrOverlayTitle = document.getElementById('qrOverlayTitle');
const panelSeller = document.getElementById('panelSeller');
const sellerListEl = document.getElementById('sellerList');
const sellerFilterParamEl = document.getElementById('sellerFilterParam');
const sellerFilterSellerEl = document.getElementById('sellerFilterSeller');
const sellerEditIdInput = document.getElementById('sellerEditId');
const showPaidCheckbox = document.getElementById('showPaid');
const showDeletedCheckbox = document.getElementById('showDeleted');

// Current overlay data (for switching to WERO panel when "Bezahlung durch Käufer")
let currentOverlayData = null;
// Item IDs for overlay status buttons (Bezahlen / An Verkäufer zahlen)
let currentPayItemId = null;
let currentPaySellerItemId = null;
/** When paying multiple items to same seller: array of item ids. Single-item mode uses currentPaySellerItemId. */
let currentPaySellerItemIds = null;
/** Selected list item ids for "Alle selektierten an Verkäufer zahlen" (same seller only). */
let selectedSellerItemIds = new Set();

// Initialize (wait for i18n so translations are ready)
document.addEventListener('DOMContentLoaded', () => {
    const ready = window.i18n && typeof window.i18n.init === 'function'
        ? window.i18n.init()
        : Promise.resolve();
    ready.then(() => {
        if (window.i18n) {
            window.i18n.applyToPage();
            document.documentElement.lang = window.i18n.getLanguage();
        }
        applySettingsToMainForm();
        applySettingsToSellerForm();
        applyBrandingFromSettings();
        setModeUI(getMode());
        renderSellerList();
        updateFooterSums();
        setupEventListeners();
    });
});

function setupEventListeners() {
    // Version in Footer anzeigen
    const versionEl = document.querySelector('.app-version');
    if (versionEl) versionEl.textContent = 'v' + APP_VERSION;

    settingsForm.addEventListener('submit', handleSettingsSubmit);
    sellerForm.addEventListener('submit', handleSellerFormSubmit);

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => switchMode(btn.getAttribute('data-mode')));
    });
    document.getElementById('btnNewSeller').addEventListener('click', () => {
        if (getMode() === 'sell') openSellerQuickFormOverlay();
        else openSellerFormOverlay();
    });
    document.getElementById('btnFillFromLast').addEventListener('click', fillSellerFormFromLast);
    function syncShowPaidWithSearch() {
        const hasSearch = !!((sellerFilterParamEl && sellerFilterParamEl.value.trim()) || (sellerFilterSellerEl && sellerFilterSellerEl.value.trim()));
        if (showPaidCheckbox) showPaidCheckbox.checked = hasSearch;
    }
    if (sellerFilterParamEl) sellerFilterParamEl.addEventListener('input', () => {
        syncShowPaidWithSearch();
        renderSellerList();
    });
    if (sellerFilterSellerEl) sellerFilterSellerEl.addEventListener('input', () => {
        syncShowPaidWithSearch();
        renderSellerList();
    });
    const btnClearParam = document.getElementById('btnClearFilterParam');
    const btnClearSeller = document.getElementById('btnClearFilterSeller');
    if (btnClearParam) btnClearParam.addEventListener('click', () => {
        if (sellerFilterParamEl) { sellerFilterParamEl.value = ''; sellerFilterParamEl.focus(); syncShowPaidWithSearch(); renderSellerList(); }
    });
    if (btnClearSeller) btnClearSeller.addEventListener('click', () => {
        if (sellerFilterSellerEl) { sellerFilterSellerEl.value = ''; sellerFilterSellerEl.focus(); syncShowPaidWithSearch(); renderSellerList(); }
    });
    if (showPaidCheckbox) showPaidCheckbox.addEventListener('change', () => renderSellerList());
    if (showDeletedCheckbox) showDeletedCheckbox.addEventListener('change', () => renderSellerList());
    sellerListEl.addEventListener('click', handleSellerListClick);
    const btnPaySelectedToSeller = document.getElementById('btnPaySelectedToSeller');
    if (btnPaySelectedToSeller) btnPaySelectedToSeller.addEventListener('click', function () {
        if (selectedSellerItemIds.size === 0) return;
        const ids = Array.from(selectedSellerItemIds);
        const items = getSellerItems();
        const selected = ids.map(id => items.find(i => i.id === id)).filter(Boolean);
        const sameIban = selected.length > 0 && selected.every(i => normalizeIbanForCompare(i.sellerIban) === normalizeIbanForCompare(selected[0].sellerIban));
        if (!sameIban) return;
        openPaySellerOverlayMultiple(ids);
    });

    closeOverlay.addEventListener('click', closeQROverlay);
    const overlayPayDoneElectronic = document.getElementById('overlayPayDoneElectronic');
    const overlayPayDoneCash = document.getElementById('overlayPayDoneCash');
    const overlayPaySellerDone = document.getElementById('overlayPaySellerDone');
    if (overlayPayDoneElectronic) overlayPayDoneElectronic.addEventListener('click', function () {
        if (currentPayItemId) {
            setSellerPaid(currentPayItemId, 'elektronisch');
            currentPayItemId = null;
        }
        closeQROverlay();
    });
    if (overlayPayDoneCash) overlayPayDoneCash.addEventListener('click', function () {
        if (currentPayItemId) {
            setSellerPaid(currentPayItemId, 'bar');
            currentPayItemId = null;
        }
        closeQROverlay();
    });
    if (overlayPaySellerDone) overlayPaySellerDone.addEventListener('click', function () {
        if (currentPaySellerItemIds && currentPaySellerItemIds.length > 0) {
            currentPaySellerItemIds.forEach(function (id) {
                setSellerPaidSeller(id);
                selectedSellerItemIds.delete(id);
            });
            currentPaySellerItemIds = null;
            renderSellerList();
            updateFooterSums();
        } else if (currentPaySellerItemId) {
            setSellerPaidSeller(currentPaySellerItemId);
            currentPaySellerItemId = null;
        }
        closeQROverlay();
    });
    const overlayPaySellerNotify = document.getElementById('overlayPaySellerNotify');
    if (overlayPaySellerNotify) overlayPaySellerNotify.addEventListener('click', function () {
        if (!currentOverlayData || currentOverlayData.type !== 'paySeller') return;
        const items = getSellerItems();
        const item = currentPaySellerItemIds && currentPaySellerItemIds.length > 0
            ? items.find(i => i.id === currentPaySellerItemIds[0])
            : (currentPaySellerItemId ? items.find(i => i.id === currentPaySellerItemId) : null);
        const paramLabel = (currentOverlayData.paramLabel || getSettings().paramLabel || 'Objekt').trim() || 'Objekt';
        const param = (currentOverlayData.param || '').trim();
        const amount = typeof currentOverlayData.amount === 'number' ? currentOverlayData.amount : 0;
        const amountStr = amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const iban = (currentOverlayData.iban || '').trim();
        const ibanDisplay = iban ? formatIBAN(iban) : iban;
        const text = window.i18n ? window.i18n.t('sms.paymentConfirm', [amountStr, paramLabel, param, ibanDisplay]) : ('Die Bezahlung über ' + amountStr + ' EUR für ' + paramLabel + ' ' + param + ' wurde an ' + ibanDisplay + ' überwiesen, bitte bestätigen Sie den Zahlungseingang. Sie müssen nicht mehr zur Kasse kommen.');
        const phone = (item && (item.phone || '').trim()) ? (item.phone || '').trim().replace(/\s/g, '') : '';
        const url = phone ? 'sms:' + encodeURIComponent(phone) + '?body=' + encodeURIComponent(text) : 'sms:?body=' + encodeURIComponent(text);
        window.location.href = url;
    });

    closeHistory.addEventListener('click', closeHistoryOverlay);
    closeSettings.addEventListener('click', closeSettingsOverlay);
    closeSellerForm.addEventListener('click', closeSellerFormOverlay);
    const closeSellerQuickForm = document.getElementById('closeSellerQuickForm');
    if (closeSellerQuickForm) closeSellerQuickForm.addEventListener('click', closeSellerQuickFormOverlay);
    const sellerQuickForm = document.getElementById('sellerQuickForm');
    if (sellerQuickForm) sellerQuickForm.addEventListener('submit', handleSellerQuickFormSubmit);

    const sellerEditPaidCheckbox = document.getElementById('sellerEditPaid');
    const sellerPaidMethodRow = document.getElementById('sellerPaidMethodRow');
    if (sellerEditPaidCheckbox && sellerPaidMethodRow) {
        sellerEditPaidCheckbox.addEventListener('change', function () {
            sellerPaidMethodRow.classList.toggle('hidden', !sellerEditPaidCheckbox.checked);
        });
    }
    document.querySelectorAll('.btn-paid-method').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const method = btn.getAttribute('data-method');
            const input = document.getElementById('sellerEditPaidMethod');
            if (input) input.value = method;
            btn.parentElement.querySelectorAll('.btn-paid-method').forEach(function (b) {
                b.classList.toggle('active', b.getAttribute('data-method') === method);
            });
        });
    });

    settingsBtn.addEventListener('click', openSettingsOverlay);

    // Switch language immediately when dropdown changes (no need to save form – so user can change language with incomplete setup)
    const settingsLanguageEl = document.getElementById('settingsLanguage');
    if (settingsLanguageEl && window.i18n) {
        settingsLanguageEl.addEventListener('change', function () {
            var newLang = this.value;
            if (newLang !== window.i18n.getLanguage()) {
                window.i18n.switchLanguage(newLang).then(function () {
                    document.documentElement.lang = window.i18n.getLanguage();
                    applySettingsToMainForm();
                    applySettingsToSellerForm();
                    refreshSettingsFormTranslations();
                    applyBrandingFromSettings();
                    renderSellerList();
                    updateFooterSums();
                });
            }
        });
    }
    const logoInput = document.getElementById('settingsLogo');
    if (logoInput) {
        logoInput.addEventListener('change', handleLogoFileSelected);
    }
    const btnRemoveLogo = document.getElementById('btnRemoveLogo');
    if (btnRemoveLogo) {
        btnRemoveLogo.addEventListener('click', function () {
            const s = getSettings();
            const next = { ...s, appLogoDataUrl: '' };
            if (!saveSettings(next)) return;
            applyBrandingFromSettings();
            const input = document.getElementById('settingsLogo');
            if (input) input.value = '';
        });
    }

    const viewObjectsBtn = document.getElementById('viewObjects');
    const objectsOverlay = document.getElementById('objectsOverlay');
    if (viewObjectsBtn && objectsOverlay) {
        viewObjectsBtn.addEventListener('click', function () {
            if (objectsOverlay.classList.contains('hidden')) {
                showObjectsOverlay();
            } else {
                closeObjectsOverlay();
            }
        });
    }
    const closeObjects = document.getElementById('closeObjects');
    if (closeObjects) closeObjects.addEventListener('click', closeObjectsOverlay);
    const printObjectsBtn = document.getElementById('printObjects');
    if (printObjectsBtn) printObjectsBtn.addEventListener('click', function () {
        if (objectsOverlay && !objectsOverlay.classList.contains('hidden')) window.print();
    });

    viewHistoryBtn.addEventListener('click', showHistory);
    if (btnResetAll) btnResetAll.addEventListener('click', resetAllData);
    const btnExportData = document.getElementById('btnExportData');
    if (btnExportData) btnExportData.addEventListener('click', exportData);
    const btnImportData = document.getElementById('btnImportData');
    const importFileInput = document.getElementById('importFileInput');
    if (btnImportData && importFileInput) {
        btnImportData.addEventListener('click', function () { importFileInput.click(); });
        importFileInput.addEventListener('change', function () {
            const file = importFileInput.files[0];
            if (file) {
                const ok = confirm(window.i18n ? window.i18n.t('msg.overwriteConfirm') : 'Aktueller Bestand wird überschrieben. Fortfahren?');
                if (ok) importData(file);
                importFileInput.value = '';
            }
        });
    }

    const exportHistoryBtn = document.getElementById('exportHistory');
    if (exportHistoryBtn) exportHistoryBtn.addEventListener('click', exportHistoryToPDF);

    const btnScanWero = document.getElementById('btnScanWero');
    if (btnScanWero) btnScanWero.addEventListener('click', handleWeroScan);

    const sellerIbanInput = document.getElementById('sellerIban');
    const sellerIbanError = document.getElementById('sellerIbanError');
    if (sellerIbanInput && sellerIbanError) {
        sellerIbanInput.addEventListener('blur', validateSellerIbanField);
        sellerIbanInput.addEventListener('input', clearSellerIbanError);
    }
    const btnSellerTestSms = document.getElementById('btnSellerTestSms');
    if (btnSellerTestSms) btnSellerTestSms.addEventListener('click', handleSellerTestSms);
    const btnToggleSellerCapture = document.getElementById('btnToggleSellerCapture');
    if (btnToggleSellerCapture) btnToggleSellerCapture.addEventListener('click', function () {
        const block = document.getElementById('sellerFormSellerBlock');
        const isHidden = block && block.classList.contains('hidden');
        setSellerFormSellerBlockVisible(isHidden);
    });

    const sellerSwitch = document.getElementById('overlaySellerSwitch');
    if (sellerSwitch) {
        sellerSwitch.addEventListener('click', function (e) {
            const btn = e.target.closest('.overlay-switch-btn[data-panel]');
            if (!btn || btn.classList.contains('disabled')) return;
            e.preventDefault();
            e.stopPropagation();
            switchPaySellerPanel(btn.getAttribute('data-panel'));
        });
    }
}

// --- Settings ---
function getSettings() {
    const json = localStorage.getItem(SETTINGS_KEY);
    return json ? { ...DEFAULT_SETTINGS, ...JSON.parse(json) } : { ...DEFAULT_SETTINGS };
}

function saveSettings(settings) {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        return true;
    } catch (e) {
        alert(window.i18n ? window.i18n.t('msg.storageQuota') : 'Der Browser-Speicher ist voll. Bitte ein kleineres Logo verwenden oder Daten löschen.');
        return false;
    }
}

function applySettingsToMainForm() {
    const s = getSettings();
    const label = s.paramLabel || DEFAULT_SETTINGS.paramLabel;
    const paramFilterLabel = document.getElementById('sellerFilterParamLabel');
    if (paramFilterLabel) paramFilterLabel.textContent = label + ' (' + (window.i18n ? window.i18n.t('filter.exact') : 'exakt') + ')';
    if (sellerFilterParamEl) sellerFilterParamEl.placeholder = window.i18n ? window.i18n.t('filter.placeholderExact') : 'nur exakte Treffer';
    if (sellerFilterSellerEl) sellerFilterSellerEl.placeholder = (label || 'Objekt') + ', ' + (window.i18n ? window.i18n.t('table.seller') : 'Verkäufer') + ', IBAN';
    const btnNewSeller = document.getElementById('btnNewSeller');
    if (btnNewSeller) btnNewSeller.textContent = window.i18n ? window.i18n.t('button.newObject', [label]) : ('Neues ' + label + ' anlegen');
    const btnSellerSubmit = document.getElementById('btnSellerSubmit');
    if (btnSellerSubmit) btnSellerSubmit.textContent = window.i18n ? window.i18n.t('form.saveObject', [label]) : (label + ' speichern');
}

function applySettingsToSellerForm() {
    const s = getSettings();
    const label = s.paramLabel || DEFAULT_SETTINGS.paramLabel;
    const labelEl = document.getElementById('sellerParamLabel');
    const paramInput = document.getElementById('sellerParam');
    if (labelEl) labelEl.textContent = label + ' *';
    if (paramInput) paramInput.placeholder = window.i18n ? window.i18n.t('form.placeholderObject', [label]) : ('z.B. ' + label);
}

// --- Modus (Verkäufer erfassen / Direktüberweisung) ---
function getMode() {
    return localStorage.getItem(MODE_KEY) || 'sell';
}

function setMode(mode) {
    localStorage.setItem(MODE_KEY, mode);
    setModeUI(mode);
}

function setModeUI(mode) {
    if (mode === 'direct') {
        setMode('sell');
        return;
    }
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });
    if (panelSeller) panelSeller.classList.toggle('hidden', mode !== 'seller' && mode !== 'sell');
    if (mode === 'seller' || mode === 'sell') renderSellerList();
}

function switchMode(mode) {
    setMode(mode);
}

// --- Verkäufer-Objekte (persistiert) ---
function getSellerItems() {
    const json = localStorage.getItem(SELLER_ITEMS_KEY);
    const items = json ? JSON.parse(json) : [];
    // Migration: ältere Einträge ohne paid/deleted/sellerPaid/paidMethod
    let changed = false;
    items.forEach(item => {
        if (item.paid === undefined) { item.paid = false; changed = true; }
        if (item.deleted === undefined) { item.deleted = false; changed = true; }
        if (item.sellerPaid === undefined) { item.sellerPaid = false; changed = true; }
        if (item.paid && (item.paidMethod === undefined || item.paidMethod === null)) {
            item.paidMethod = 'elektronisch';
            changed = true;
        }
    });
    if (changed) saveSellerItems(items);
    return items;
}

function saveSellerItems(items) {
    localStorage.setItem(SELLER_ITEMS_KEY, JSON.stringify(items));
}

/** Returns true if another item (optionally excluding excludeId) already has this param value. */
function isParamInUse(paramValue, excludeId) {
    const param = (paramValue || '').trim();
    if (!param) return false;
    const items = getSellerItems();
    return items.some(function (item) {
        if (excludeId && item.id === excludeId) return false;
        return (item.param || '').trim() === param;
    });
}

function addSellerItem(item) {
    const items = getSellerItems();
    const entry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        sellerName: (item.sellerName || '').trim(),
        sellerIban: (item.sellerIban || '').trim().toUpperCase().replace(/\s/g, ''),
        param: (item.param || '').trim(),
        price: Number(item.price),
        phone: (item.phone || '').trim(),
        paid: false,
        sellerPaid: false,
        deleted: false,
        createdAt: new Date().toISOString()
    };
    items.push(entry);
    saveSellerItems(items);
    updateFooterSums();
    return entry;
}

function updateSellerItem(id, data) {
    const items = getSellerItems();
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return;
    items[idx] = {
        ...items[idx],
        sellerName: data.sellerName.trim(),
        sellerIban: data.sellerIban.trim().toUpperCase().replace(/\s/g, ''),
        param: data.param.trim(),
        price: Number(data.price),
        phone: data.phone.trim(),
        paid: data.paid,
        paidMethod: data.paidMethod,
        sellerPaid: data.sellerPaid
    };
    saveSellerItems(items);
    updateFooterSums();
}

function setSellerPaid(id, method) {
    const items = getSellerItems();
    const item = items.find(i => i.id === id);
    if (item) {
        item.paid = true;
        item.paidMethod = method === 'bar' ? 'bar' : 'elektronisch';
        saveSellerItems(items);
        renderSellerList();
        updateFooterSums();
    }
}

function setSellerPaidSeller(id) {
    const items = getSellerItems();
    const item = items.find(i => i.id === id);
    if (item) { 
        item.sellerPaid = true; 
        saveSellerItems(items); 
        renderSellerList(); 
        updateFooterSums();
    }
}

function setSellerDeleted(id) {
    const items = getSellerItems();
    const item = items.find(i => i.id === id);
    if (item) { 
        item.deleted = true; 
        saveSellerItems(items); 
        renderSellerList(); 
        updateFooterSums();
    }
}

function validateSellerIbanField() {
    const input = document.getElementById('sellerIban');
    const errorEl = document.getElementById('sellerIbanError');
    if (!input || !errorEl) return;
    const raw = input.value.trim().toUpperCase().replace(/\s/g, '');
    if (raw.length === 0) {
        input.classList.remove('input-error');
        errorEl.textContent = '';
        return;
    }
    if (validateIBAN(raw)) {
        input.classList.remove('input-error');
        errorEl.textContent = '';
    } else {
        input.classList.add('input-error');
        errorEl.textContent = window.i18n ? window.i18n.t('msg.invalidIban') : 'Ungültige IBAN';
    }
}

function clearSellerIbanError() {
    const input = document.getElementById('sellerIban');
    const errorEl = document.getElementById('sellerIbanError');
    if (input) input.classList.remove('input-error');
    if (errorEl) errorEl.textContent = '';
}

function handleSellerTestSms(e) {
    e.preventDefault();
    const name = (document.getElementById('sellerName') && document.getElementById('sellerName').value) || '';
    const iban = (document.getElementById('sellerIban') && document.getElementById('sellerIban').value.trim().toUpperCase().replace(/\s/g, '')) || '';
    const phone = (document.getElementById('sellerPhone') && document.getElementById('sellerPhone').value.trim()) || '';
    const message = window.i18n ? window.i18n.t('sms.sellerRegistered', [name, iban || window.i18n.t('sms.ibanNotGiven')]) : ('Verkäufer ' + name + ' mit IBAN ' + (iban || '(noch nicht angegeben)') + ' registriert');
    const smsBody = encodeURIComponent(message);
    const href = phone ? 'sms:' + phone.replace(/\s/g, '') + '?body=' + smsBody : 'sms:?body=' + smsBody;
    window.location.href = href;
}

function setSellerFormSellerBlockVisible(visible) {
    const block = document.getElementById('sellerFormSellerBlock');
    const sellerPaidRow = document.getElementById('sellerFormSellerPaidRow');
    const toggleRow = document.getElementById('sellerFormToggleSellerRow');
    const btnToggle = document.getElementById('btnToggleSellerCapture');
    const nameInput = document.getElementById('sellerName');
    const ibanInput = document.getElementById('sellerIban');
    const phoneInput = document.getElementById('sellerPhone');
    if (block) block.classList.toggle('hidden', !visible);
    if (sellerPaidRow) sellerPaidRow.classList.toggle('hidden', !visible);
    if (btnToggle) {
        btnToggle.textContent = window.i18n ? window.i18n.t(visible ? 'form.toggleSellerCaptureVisible' : 'form.toggleSellerCapture') : (visible ? 'Verkäufer nacherfassen (eingeblendet)' : 'Verkäufer nacherfassen');
        btnToggle.classList.toggle('active', visible);
    }
    [nameInput, ibanInput, phoneInput].forEach(function (el) {
        if (el) el.required = visible;
    });
    if (!visible) clearSellerIbanError();
}

function openSellerFormOverlay(editId) {
    sellerForm.reset();
    if (sellerEditIdInput) sellerEditIdInput.value = editId || '';
    clearSellerIbanError();
    const titleEl = document.getElementById('sellerFormTitle');
    const statusContainer = document.getElementById('sellerStatusContainer');
    const toggleRow = document.getElementById('sellerFormToggleSellerRow');
    const sellerBlock = document.getElementById('sellerFormSellerBlock');
    const label = (getSettings().paramLabel || 'Objekt').trim() || 'Objekt';

    if (titleEl) titleEl.textContent = window.i18n ? (editId ? window.i18n.t('form.sellerTitleEdit', [label]) : window.i18n.t('form.sellerTitleNew', [label])) : (editId ? (label + ' bearbeiten') : ('Neues ' + label + ' erfassen'));

    if (editId) {
        const items = getSellerItems();
        const item = items.find(i => i.id === editId);
        if (item) {
            document.getElementById('sellerName').value = item.sellerName;
            document.getElementById('sellerIban').value = formatIBAN(item.sellerIban);
            document.getElementById('sellerParam').value = item.param;
            document.getElementById('sellerPrice').value = item.price;
            document.getElementById('sellerPhone').value = item.phone;
            document.getElementById('sellerEditPaid').checked = !!item.paid;
            document.getElementById('sellerEditSellerPaid').checked = !!item.sellerPaid;
            const paidMethod = item.paidMethod === 'bar' ? 'bar' : 'elektronisch';
            const paidMethodInput = document.getElementById('sellerEditPaidMethod');
            if (paidMethodInput) paidMethodInput.value = paidMethod;
            const paidMethodRow = document.getElementById('sellerPaidMethodRow');
            if (paidMethodRow) paidMethodRow.classList.toggle('hidden', !item.paid);
            document.querySelectorAll('.btn-paid-method').forEach(function (btn) {
                btn.classList.toggle('active', btn.getAttribute('data-method') === paidMethod);
            });
        }
        if (statusContainer) statusContainer.classList.remove('hidden');
        const hasSeller = !!((item && (item.sellerIban || '').trim()));
        if (toggleRow) toggleRow.classList.toggle('hidden', hasSeller);
        if (hasSeller) {
            setSellerFormSellerBlockVisible(true);
        } else {
            setSellerFormSellerBlockVisible(false);
        }
    } else {
        if (statusContainer) statusContainer.classList.add('hidden');
        if (toggleRow) toggleRow.classList.add('hidden');
        setSellerFormSellerBlockVisible(true);
    }
    sellerFormOverlay.classList.remove('hidden');
}

function closeSellerFormOverlay() {
    sellerFormOverlay.classList.add('hidden');
    if (sellerEditIdInput) sellerEditIdInput.value = '';
}

function openSellerQuickFormOverlay() {
    const overlay = document.getElementById('sellerQuickFormOverlay');
    const form = document.getElementById('sellerQuickForm');
    const titleEl = document.getElementById('sellerQuickFormTitle');
    const label = (getSettings().paramLabel || 'Objekt').trim() || 'Objekt';
    if (titleEl) titleEl.textContent = window.i18n ? window.i18n.t('form.quickTitle', [label]) : ('Neues ' + label + ' anlegen');
    const quickParamLabel = document.getElementById('quickParamLabel');
    if (quickParamLabel) quickParamLabel.textContent = label + ' *';
    const quickParamInput = document.getElementById('quickParam');
    if (quickParamInput) quickParamInput.placeholder = window.i18n ? window.i18n.t('form.placeholderObject', [label]) : ('z.B. ' + label);
    const btnQuickSubmit = document.getElementById('btnQuickSellerSubmit');
    if (btnQuickSubmit) btnQuickSubmit.textContent = window.i18n ? window.i18n.t('form.saveObject', [label]) : (label + ' speichern');
    const quickForm = document.getElementById('sellerQuickForm');
    if (quickForm) quickForm.reset();
    if (overlay) overlay.classList.remove('hidden');
}

function closeSellerQuickFormOverlay() {
    const overlay = document.getElementById('sellerQuickFormOverlay');
    if (overlay) overlay.classList.add('hidden');
}

function handleSellerQuickFormSubmit(e) {
    e.preventDefault();
    const param = (document.getElementById('quickParam') && document.getElementById('quickParam').value) || '';
    const price = parseFloat(document.getElementById('quickPrice') && document.getElementById('quickPrice').value);
    if (!param.trim()) {
        alert(window.i18n ? window.i18n.t('msg.pleaseObject') : 'Bitte Objekt angeben.');
        return;
    }
    if (isNaN(price) || price <= 0) {
        alert(window.i18n ? window.i18n.t('msg.pleaseAmount') : 'Bitte einen gültigen Betrag eingeben.');
        return;
    }
    const label = (getSettings().paramLabel || 'Objekt').trim() || 'Objekt';
    if (isParamInUse(param, null)) {
        alert(window.i18n ? window.i18n.t('msg.duplicateParam', [label]) : ('Ein anderes Objekt hat bereits den gleichen ' + label + '-Wert. Bitte einen eindeutigen Wert verwenden.'));
        return;
    }
    addSellerItem({ sellerName: '', sellerIban: '', param: param.trim(), price, phone: '' });
    closeSellerQuickFormOverlay();
    if (sellerFilterParamEl) sellerFilterParamEl.value = param.trim();
    renderSellerList();
}

function normalizeIbanForCompare(iban) {
    return (iban || '').trim().toUpperCase().replace(/\s/g, '');
}

function toggleSellerSelection(id, checked) {
    const items = getSellerItems();
    const item = items.find(i => i.id === id);
    if (!item) return;
    if (checked) {
        if (selectedSellerItemIds.size > 0) {
            const firstId = selectedSellerItemIds.values().next().value;
            const first = items.find(i => i.id === firstId);
            if (first && normalizeIbanForCompare(first.sellerIban) !== normalizeIbanForCompare(item.sellerIban)) {
                alert(window.i18n ? window.i18n.t('msg.onlySameSeller') : 'Nur Objekte desselben Verkäufers (gleiche IBAN) auswählbar.');
                return;
            }
        }
        selectedSellerItemIds.add(id);
    } else {
        selectedSellerItemIds.delete(id);
    }
}

function updateSellerSelectionBar() {
    const bar = document.getElementById('sellerSelectionBar');
    const textEl = document.getElementById('sellerSelectionBarText');
    const btn = document.getElementById('btnPaySelectedToSeller');
    if (!bar || !textEl || !btn) return;
    const items = getSellerItems();
    const selected = Array.from(selectedSellerItemIds).map(id => items.find(i => i.id === id)).filter(Boolean);
    const sameIban = selected.length > 0 && selected.every(i => normalizeIbanForCompare(i.sellerIban) === normalizeIbanForCompare(selected[0].sellerIban));
    if (selected.length === 0) {
        bar.classList.add('hidden');
        return;
    }
    bar.classList.remove('hidden');
    if (sameIban) {
        textEl.textContent = window.i18n ? window.i18n.t('msg.selectedCount', [selected.length]) : (selected.length + ' ausgewählt');
        btn.disabled = false;
        btn.classList.remove('disabled');
    } else {
        textEl.textContent = window.i18n ? window.i18n.t('msg.selectedDifferentSellers') : 'Auswahl: unterschiedliche Verkäufer – nur ein Verkäufer auswählbar.';
        btn.disabled = true;
        btn.classList.add('disabled');
    }
}

function handleSellerListClick(e) {
    if (e.target.classList.contains('seller-select-cb')) {
        const id = e.target.getAttribute('data-id');
        if (id) {
            toggleSellerSelection(id, e.target.checked);
            updateSellerSelectionBar();
            renderSellerList();
        }
        return;
    }
    const btn = e.target.closest('[data-action][data-id]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const action = btn.getAttribute('data-action');
    if (action === 'edit') openSellerFormOverlay(id);
    else if (action === 'pay') openPayOverlay(id);
    else if (action === 'paySeller') openPaySellerOverlay(id);
    else if (action === 'delete') {
        if (confirm(window.i18n ? window.i18n.t('msg.confirmDeleteItem') : 'Dieses Objekt wirklich als gelöscht markieren?')) setSellerDeleted(id);
    }
}

function openPayOverlay(id) {
    const item = getSellerItems().find(i => i.id === id);
    if (!item) return;
    const s = getSettings();
    if (!s.recipientName || !s.iban) {
        alert(window.i18n ? window.i18n.t('msg.pleaseEnterRecipient') : 'Bitte in den Einstellungen Empfänger und IBAN eintragen.');
        return;
    }
    currentPayItemId = id;
    const subject = (s.usageTemplate || '').replace(/\$objekt/g, item.param);
    const transferData = {
        recipientName: s.recipientName,
        iban: s.iban,
        amount: item.price,
        subject,
        timestamp: new Date().toISOString(),
        type: 'pay',
        param: item.param,
        paramLabel: s.paramLabel || '',
        paidAlready: !!item.paid
    };
    generateQRCode(transferData);
    saveToHistory(transferData);
}

function openPaySellerOverlay(id) {
    const item = getSellerItems().find(i => i.id === id);
    if (!item) return;
    currentPaySellerItemId = id;
    currentPaySellerItemIds = null;
    const s = getSettings();
    const commission = (s.commissionPercent != null && s.commissionPercent !== '') ? Number(s.commissionPercent) : 10;
    const amount = Math.round(item.price * (1 - commission / 100) * 100) / 100;
    const subject = (s.usageTemplate || '').replace(/\$objekt/g, item.param);
    const transferData = {
        recipientName: item.sellerName,
        iban: item.sellerIban,
        amount,
        subject,
        timestamp: new Date().toISOString(),
        type: 'paySeller',
        param: item.param,
        paramLabel: s.paramLabel || '',
        sellerPaidAlready: !!item.sellerPaid
    };
    generateQRCode(transferData);
    saveToHistory(transferData);
}

function openPaySellerOverlayMultiple(ids) {
    if (!ids || ids.length === 0) return;
    const items = getSellerItems();
    const selected = ids.map(id => items.find(i => i.id === id)).filter(Boolean);
    if (selected.length === 0) return;
    const iban0 = normalizeIbanForCompare(selected[0].sellerIban);
    if (selected.some(i => normalizeIbanForCompare(i.sellerIban) !== iban0)) {
        alert(window.i18n ? window.i18n.t('sellerPaymentAllSame') : 'Alle ausgewählten Objekte müssen zum gleichen Verkäufer (IBAN) gehören.');
        return;
    }
    currentPaySellerItemId = null;
    currentPaySellerItemIds = ids;
    const s = getSettings();
    const commission = (s.commissionPercent != null && s.commissionPercent !== '') ? Number(s.commissionPercent) : 10;
    let totalAmount = 0;
    selected.forEach(i => {
        totalAmount += Math.round(i.price * (1 - commission / 100) * 100) / 100;
    });
    totalAmount = Math.round(totalAmount * 100) / 100;
    const subject = (s.usageTemplate || '').replace(/\$objekt/g, selected.map(i => i.param).join(', '));
    const first = selected[0];
    const transferData = {
        recipientName: first.sellerName,
        iban: first.sellerIban,
        amount: totalAmount,
        subject,
        timestamp: new Date().toISOString(),
        type: 'paySeller',
        param: subject,
        paramLabel: s.paramLabel || '',
        sellerPaidAlready: false,
        multipleItemIds: ids
    };
    generateQRCode(transferData);
    saveToHistory(transferData);
}

function fillSellerFormFromLast() {
    const items = getSellerItems();
    if (items.length === 0) {
        alert(window.i18n ? window.i18n.t('msg.noObjectsYet') : 'Noch keine Objekte erfasst. Legen Sie zuerst ein Objekt an.');
        return;
    }
    const last = items[items.length - 1];
    document.getElementById('sellerName').value = last.sellerName;
    document.getElementById('sellerIban').value = formatIBAN(last.sellerIban);
    document.getElementById('sellerPhone').value = last.phone;
    // Parameter und Preis werden bewusst nicht übernommen
}

function handleSellerFormSubmit(e) {
    e.preventDefault();
    const fd = new FormData(sellerForm);
    let sellerName = fd.get('sellerName').trim();
    let sellerIbanRaw = fd.get('sellerIban').trim().toUpperCase().replace(/\s/g, '');
    const param = fd.get('sellerParam').trim();
    const price = parseFloat(fd.get('sellerPrice'));
    let phone = fd.get('sellerPhone').trim();

    const editId = sellerEditIdInput && sellerEditIdInput.value ? sellerEditIdInput.value.trim() : '';
    const isNew = !editId;
    const sellerBlock = document.getElementById('sellerFormSellerBlock');
    const sellerBlockHidden = sellerBlock && sellerBlock.classList.contains('hidden');

    if (sellerBlockHidden) {
        sellerName = '';
        sellerIbanRaw = '';
        phone = '';
    } else {
        if (!sellerName) {
            alert(window.i18n ? window.i18n.t('msg.pleaseNameSeller') : 'Bitte Name Verkäufer angeben.');
            return;
        }
        if (!validateIBAN(sellerIbanRaw)) {
            alert(window.i18n ? window.i18n.t('msg.pleaseValidIban') : 'Bitte eine gültige IBAN eingeben.');
            return;
        }
        if (!phone) {
            alert(window.i18n ? window.i18n.t('msg.pleasePhone') : 'Bitte Mobilnummer angeben.');
            return;
        }
    }
    if (!param) {
        alert(window.i18n ? window.i18n.t('msg.pleaseObject') : 'Bitte Objekt angeben.');
        return;
    }
    if (isNaN(price) || price <= 0) {
        alert(window.i18n ? window.i18n.t('msg.pleasePrice') : 'Bitte einen gültigen Preis angeben.');
        return;
    }
    const paramLabel = (getSettings().paramLabel || 'Objekt').trim() || 'Objekt';
    if (isParamInUse(param, editId || null)) {
        alert(window.i18n ? window.i18n.t('msg.duplicateParam', [paramLabel]) : ('Ein anderes Objekt hat bereits den gleichen ' + paramLabel + '-Wert. Bitte einen eindeutigen Wert verwenden.'));
        return;
    }

    if (editId) {
        const paid = document.getElementById('sellerEditPaid').checked;
        const sellerPaid = sellerBlockHidden ? false : document.getElementById('sellerEditSellerPaid').checked;
        const paidMethodInput = document.getElementById('sellerEditPaidMethod');
        const paidMethod = paid ? (paidMethodInput ? paidMethodInput.value : 'elektronisch') : undefined;
        updateSellerItem(editId, { sellerName, sellerIban: sellerIbanRaw, param, price, phone, paid, paidMethod, sellerPaid });
    } else {
        addSellerItem({
            sellerName,
            sellerIban: sellerIbanRaw,
            param,
            price,
            phone
        });
    }
    closeSellerFormOverlay();
    renderSellerList();
}

function renderSellerList() {
    const paramFilter = (sellerFilterParamEl && sellerFilterParamEl.value) ? sellerFilterParamEl.value.trim().toLowerCase() : '';
    const sellerFilter = (sellerFilterSellerEl && sellerFilterSellerEl.value) ? sellerFilterSellerEl.value.trim().toLowerCase() : '';
    const hasFilter = !!(paramFilter || sellerFilter);
    const showPaid = showPaidCheckbox && showPaidCheckbox.checked;
    const showDeleted = showDeletedCheckbox && showDeletedCheckbox.checked;
    const paramLabel = (getSettings().paramLabel || 'Objekt');
    const items = getSellerItems();

    let filtered = items.filter(item => {
        if (!showPaid && item.paid && (item.sellerPaid || !(item.sellerIban || '').trim())) return false;
        if (item.deleted && !showDeleted) return false;
        if (paramFilter) {
            const itemParam = (item.param || '').trim().toLowerCase();
            if (itemParam !== paramFilter) return false;
        }
        if (sellerFilter) {
            const param = (item.param || '').toLowerCase();
            const name = (item.sellerName || '').toLowerCase();
            const iban = (item.sellerIban || '').toLowerCase().replace(/\s/g, '');
            const searchIn = param + ' ' + name + ' ' + iban;
            const match = searchIn.includes(sellerFilter) || (sellerFilter.indexOf(' ') !== -1 && searchIn.includes(sellerFilter.replace(/\s/g, '')));
            if (!match) return false;
        }
        return true;
    });

    if (!sellerListEl) return;
    if (filtered.length === 0) {
        const total = items.length;
        const emptyMsg = total === 0
            ? (window.i18n ? window.i18n.t('empty.noObjects', [paramLabel]) : ('Noch keine Objekte. Klicken Sie auf „Neues ' + paramLabel + ' anlegen".'))
            : (hasFilter ? (window.i18n ? window.i18n.t('empty.noMatches', [paramLabel]) : ('Keine Treffer. Exakte ' + paramLabel + '-Bezeichnung bzw. Suche anpassen oder Bezahlte/Gelöschte einblenden.')) : (window.i18n ? window.i18n.t('empty.noMatchesShort') : 'Keine Treffer.'));
        sellerListEl.innerHTML = '<div class="seller-empty">' + emptyMsg + '</div>';
        return;
    }
    sellerListEl.innerHTML = filtered.map(item => {
        const paramText = paramLabel + ': ' + escapeHtml(item.param);
        const badges = [];
        if (item.paid) {
            const methodKey = item.paidMethod === 'bar' ? 'form.bar' : 'form.electronic';
            const methodLabel = window.i18n ? window.i18n.t(methodKey) : (item.paidMethod === 'bar' ? 'Bar' : 'Elektronisch');
            badges.push('<span class="seller-badge seller-badge-paid">' + (window.i18n ? window.i18n.t('badge.paid', [methodLabel]) : ('Bezahlt (' + methodLabel.toLowerCase() + ')')) + '</span>');
        }
        if (item.sellerPaid) badges.push('<span class="seller-badge seller-badge-seller-paid">' + (window.i18n ? window.i18n.t('badge.sellerPaid') : 'an Verkäufer gezahlt') + '</span>');
        if (item.deleted) badges.push('<span class="seller-badge seller-badge-deleted">' + (window.i18n ? window.i18n.t('badge.deleted') : 'Gelöscht') + '</span>');
        const hasSeller = !!((item.sellerName || '').trim() && (item.sellerIban || '').trim());
        const canSelectForSellerPay = item.paid && !item.sellerPaid && hasSeller && !item.deleted;
        const selectLabel = window.i18n ? window.i18n.t('action.select') : 'Auswählen';
        const selectCb = canSelectForSellerPay
            ? `<label class="seller-item-select"><input type="checkbox" class="seller-select-cb" data-id="${escapeHtml(item.id)}" ${selectedSellerItemIds.has(item.id) ? 'checked' : ''}> ${escapeHtml(selectLabel)}</label>`
            : '';
        const paySellerLabel = window.i18n ? window.i18n.t('action.paySeller') : 'An Verkäufer zahlen';
        const paySellerBtn = hasSeller
            ? `<button type="button" class="btn-small btn-pay-seller" data-action="paySeller" data-id="${escapeHtml(item.id)}">${escapeHtml(paySellerLabel)}</button>`
            : '';
        const editLabel = window.i18n ? window.i18n.t('action.edit') : 'Bearbeiten';
        const payLabel = window.i18n ? window.i18n.t('action.pay') : 'Bezahlen';
        const deleteLabel = window.i18n ? window.i18n.t('action.delete') : 'Löschen';
        const actions = item.deleted ? '' : `
            <div class="seller-item-actions">
                <button type="button" class="btn-small btn-edit" data-action="edit" data-id="${escapeHtml(item.id)}">${escapeHtml(editLabel)}</button>
                <button type="button" class="btn-small btn-pay" data-action="pay" data-id="${escapeHtml(item.id)}">${escapeHtml(payLabel)}</button>
                ${paySellerBtn}
                <button type="button" class="btn-small btn-delete" data-action="delete" data-id="${escapeHtml(item.id)}">${escapeHtml(deleteLabel)}</button>
            </div>
        `;
        const displayName = (item.sellerName || '').trim() || '—';
        const displayIban = (item.sellerIban || '').trim() ? formatIBAN(item.sellerIban) : '—';
        const displayPhone = (item.phone || '').trim() || '—';
        return `
        <div class="seller-item ${item.deleted ? 'seller-item-deleted' : ''} ${item.paid ? 'seller-item-paid' : ''} ${item.sellerPaid ? 'seller-item-seller-paid' : ''}">
            <div class="seller-item-header">
                ${selectCb}
                <strong>${escapeHtml(displayName)}</strong>
                <span class="seller-item-badges">${badges.join('')}</span>
            </div>
            <div class="seller-item-meta">${paramText} · ${typeof item.price === 'number' ? formatAmountDE(item.price) : '—'} EUR</div>
            <div class="seller-item-details">
                <span>IBAN: ${displayIban}</span>
                <span>Tel: ${escapeHtml(displayPhone)}</span>
            </div>
            ${actions}
        </div>
    `;
    }).join('');
    updateSellerSelectionBar();
}

function openSettingsOverlay() {
    const s = getSettings();
    const langEl = document.getElementById('settingsLanguage');
    if (langEl && window.i18n) langEl.value = window.i18n.getLanguage();
    const appTitleEl = document.getElementById('settingsAppTitle');
    if (appTitleEl) appTitleEl.value = s.appTitle || '';
    const appSubtitleEl = document.getElementById('settingsAppSubtitle');
    if (appSubtitleEl) appSubtitleEl.value = s.appSubtitle || '';
    document.getElementById('settingsRecipientName').value = s.recipientName;
    document.getElementById('settingsIban').value = formatIBAN(s.iban);
    document.getElementById('settingsUsageTemplate').value = s.usageTemplate;
    document.getElementById('settingsParamLabel').value = s.paramLabel;
    const commissionEl = document.getElementById('settingsCommissionPercent');
    if (commissionEl) commissionEl.value = s.commissionPercent != null ? s.commissionPercent : 10;
    const weroLinkEl = document.getElementById('settingsWeroLink');
    if (weroLinkEl) weroLinkEl.value = s.weroLink || '';
    if (window.i18n) {
        const appTitleEl2 = document.getElementById('settingsAppTitle');
        if (appTitleEl2) appTitleEl2.placeholder = window.i18n.t('settings.placeholderAppTitle');
        const appSubtitleEl2 = document.getElementById('settingsAppSubtitle');
        if (appSubtitleEl2) appSubtitleEl2.placeholder = window.i18n.t('settings.placeholderAppSubtitle');
        document.getElementById('settingsRecipientName').placeholder = window.i18n.t('settings.placeholderName');
        document.getElementById('settingsIban').placeholder = window.i18n.t('settings.placeholderIban');
        document.getElementById('settingsUsageTemplate').placeholder = window.i18n.t('settings.placeholderUsage');
        document.getElementById('settingsParamLabel').placeholder = window.i18n.t('settings.placeholderParamLabel');
        document.getElementById('settingsWeroLink').placeholder = window.i18n.t('settings.placeholderWero');
    }
    const btnRemoveLogo = document.getElementById('btnRemoveLogo');
    if (btnRemoveLogo) btnRemoveLogo.disabled = !(s.appLogoDataUrl && String(s.appLogoDataUrl).trim());
    settingsOverlay.classList.remove('hidden');
}

function closeSettingsOverlay() {
    settingsOverlay.classList.add('hidden');
}

/** Update labels and placeholders in the settings form (e.g. after language switch). */
function refreshSettingsFormTranslations() {
    if (!window.i18n) return;
    const appTitleEl = document.getElementById('settingsAppTitle');
    if (appTitleEl) appTitleEl.placeholder = window.i18n.t('settings.placeholderAppTitle');
    const appSubtitleEl = document.getElementById('settingsAppSubtitle');
    if (appSubtitleEl) appSubtitleEl.placeholder = window.i18n.t('settings.placeholderAppSubtitle');
    document.getElementById('settingsRecipientName').placeholder = window.i18n.t('settings.placeholderName');
    document.getElementById('settingsIban').placeholder = window.i18n.t('settings.placeholderIban');
    document.getElementById('settingsUsageTemplate').placeholder = window.i18n.t('settings.placeholderUsage');
    document.getElementById('settingsParamLabel').placeholder = window.i18n.t('settings.placeholderParamLabel');
    document.getElementById('settingsWeroLink').placeholder = window.i18n.t('settings.placeholderWero');
}

function handleSettingsSubmit(e) {
    e.preventDefault();
    const fd = new FormData(settingsForm);
    const prev = getSettings();
    const iban = fd.get('iban').trim().toUpperCase().replace(/\s/g, '');
    if (!validateIBAN(iban)) {
        alert(window.i18n ? window.i18n.t('msg.enterValidIban') : 'Bitte geben Sie eine gültige IBAN ein.');
        return;
    }
    const commissionVal = fd.get('commissionPercent');
    const commissionPercent = (commissionVal !== '' && commissionVal !== null) ? parseFloat(commissionVal) : 10;
    const settings = {
        ...prev,
        recipientName: fd.get('recipientName').trim(),
        iban,
        usageTemplate: fd.get('usageTemplate').trim() || DEFAULT_SETTINGS.usageTemplate,
        paramLabel: fd.get('paramLabel').trim() || DEFAULT_SETTINGS.paramLabel,
        commissionPercent: isNaN(commissionPercent) ? 10 : Math.max(0, Math.min(100, commissionPercent)),
        weroLink: fd.get('weroLink').trim(),
        appTitle: (fd.get('appTitle') || '').toString().trim(),
        appSubtitle: (fd.get('appSubtitle') || '').toString().trim()
    };
    if (settings.usageTemplate.indexOf('$objekt') === -1) {
        alert(window.i18n ? window.i18n.t('msg.usageMustContain') : 'Der Verwendungszweck muss den Platzhalter $objekt enthalten.');
        return;
    }
    if (!saveSettings(settings)) return;
    applySettingsToMainForm();
    applySettingsToSellerForm();
    applyBrandingFromSettings();
    closeSettingsOverlay();
}

function applyBrandingFromSettings() {
    const s = getSettings();
    const titleDefault = window.i18n ? window.i18n.t('app.title') : 'E-Basar!';
    const subtitleDefault = window.i18n ? window.i18n.t('app.subtitle') : '';
    const title = (s.appTitle || '').trim() || titleDefault;
    const subtitle = (s.appSubtitle || '').trim() || subtitleDefault;

    const titleHeading = document.getElementById('appTitleHeading');
    if (titleHeading) titleHeading.textContent = title;
    const subtitleEl = document.getElementById('appSubtitleText');
    if (subtitleEl) subtitleEl.textContent = subtitle;
    document.title = title;

    const logoEl = document.getElementById('appLogo');
    const logoDataUrl = (s.appLogoDataUrl || '').toString().trim();
    if (logoEl) {
        if (logoDataUrl) {
            logoEl.src = logoDataUrl;
            logoEl.alt = title;
            logoEl.classList.remove('hidden');
        } else {
            logoEl.removeAttribute('src');
            logoEl.alt = '';
            logoEl.classList.add('hidden');
        }
    }
    const btnRemoveLogo = document.getElementById('btnRemoveLogo');
    if (btnRemoveLogo) btnRemoveLogo.disabled = !logoDataUrl;
}

function handleLogoFileSelected(e) {
    const input = e && e.target ? e.target : null;
    const file = input && input.files && input.files[0] ? input.files[0] : null;
    if (!file) return;
    if (!file.type || file.type.indexOf('image/') !== 0) {
        alert(window.i18n ? window.i18n.t('msg.invalidImage') : 'Bitte eine Bilddatei auswählen.');
        if (input) input.value = '';
        return;
    }
    processLogoFile(file).then(function (dataUrl) {
        const s = getSettings();
        const next = { ...s, appLogoDataUrl: dataUrl };
        if (!saveSettings(next)) return;
        applyBrandingFromSettings();
        if (input) input.value = '';
    }).catch(function () {
        alert(window.i18n ? window.i18n.t('msg.invalidImage') : 'Bitte eine Bilddatei auswählen.');
        if (input) input.value = '';
    });
}

function processLogoFile(file) {
    // Display size in CSS pixels; scale stored resolution for Retina (devicePixelRatio)
    const DISPLAY_MAX_WIDTH = 400;
    const DISPLAY_MAX_HEIGHT = 96;
    const dpr = Math.min(3, Math.max(1, Math.round((typeof window !== 'undefined' && window.devicePixelRatio) || 1)));
    const maxWidth = DISPLAY_MAX_WIDTH * dpr;
    const maxHeight = DISPLAY_MAX_HEIGHT * dpr;
    return readFileAsDataUrl(file).then(function (dataUrl) {
        return resizeImageDataUrl(dataUrl, file.type, maxWidth, maxHeight);
    });
}

function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onerror = function () { reject(new Error('read_error')); };
        reader.onload = function () { resolve(String(reader.result || '')); };
        reader.readAsDataURL(file);
    });
}

function resizeImageDataUrl(dataUrl, mimeType, maxWidth, maxHeight) {
    return new Promise(function (resolve, reject) {
        const img = new Image();
        img.onerror = function () { reject(new Error('img_error')); };
        img.onload = function () {
            const w = img.naturalWidth || img.width || 0;
            const h = img.naturalHeight || img.height || 0;
            if (!w || !h) {
                reject(new Error('img_empty'));
                return;
            }
            const scaleW = maxWidth / w;
            const scaleH = maxHeight / h;
            const scale = Math.min(1, scaleW, scaleH);
            const tw = Math.max(1, Math.round(w * scale));
            const th = Math.max(1, Math.round(h * scale));
            const canvas = document.createElement('canvas');
            canvas.width = tw;
            canvas.height = th;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(dataUrl);
                return;
            }
            ctx.drawImage(img, 0, 0, tw, th);
            const type = (mimeType === 'image/png') ? 'image/png' : 'image/jpeg';
            const out = type === 'image/jpeg' ? canvas.toDataURL(type, 0.85) : canvas.toDataURL(type);
            resolve(out);
        };
        img.src = dataUrl;
    });
}

function handleWeroScan() {
    // In einer echten Web-App würde hier die Kamera geöffnet, um einen QR-Code zu scannen.
    // Da dies eine terminalbasierte Umgebung ist, simulieren wir den Scan durch eine Eingabeaufforderung.
    const scannedLink = prompt(window.i18n ? window.i18n.t('msg.weroScanPrompt') : 'Bitte scannen Sie den WERO QR-Code oder geben Sie den Zahlungslink hier ein:');
    if (scannedLink) {
        const weroInput = document.getElementById('settingsWeroLink');
        if (weroInput) {
            weroInput.value = scannedLink.trim();
        }
    }
}

function validateIBAN(iban) {
    // 1. Grundformat prüfen (Landescode + Prüfziffer + BBAN)
    const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/;
    if (!ibanRegex.test(iban)) return false;

    // 2. IBAN für Modulo-97-Prüfung vorbereiten
    // Die ersten vier Zeichen ans Ende verschieben
    const rearranged = iban.slice(4) + iban.slice(0, 4);

    // Buchstaben in Zahlen umwandeln (A=10, B=11, ..., Z=35)
    const numericString = rearranged.split('').map(char => {
        const code = char.charCodeAt(0);
        if (code >= 65 && code <= 90) {
            return (code - 55).toString();
        }
        return char;
    }).join('');

    // 3. Modulo 97 berechnen (BigInt für große Zahlen erforderlich)
    try {
        const remainder = BigInt(numericString) % 97n;
        return remainder === 1n;
    } catch (e) {
        // Falls BigInt nicht unterstützt wird, einfaches Fallback (unwahrscheinlich in modernen Browsern)
        return true;
    }
}

function generateEPCQRCode(data) {
    // EPC QR Code für SEPA Credit Transfer (EPC069-12) – Feldreihenfolge laut Standard
    const lines = [
        'BCD',                          // 1. Service Tag
        '002',                          // 2. Version
        '1',                            // 3. Zeichensatz (UTF-8)
        'SCT',                          // 4. SEPA Credit Transfer
        '',                             // 5. BIC (optional)
        data.recipientName || '',       // 6. Empfängername
        data.iban,                      // 7. IBAN
        'EUR' + data.amount.toFixed(2), // 8. Betrag
        '',                             // 9. Purpose (4-Zeichen-Code, leer)
        '',                             // 10. Remittance structured (z. B. Creditor Reference)
        data.subject || '',             // 11. Remittance unstructured = Verwendungszweck
        ''                              // 12. Beneficiary to originator
    ];
    return lines.join('\n');
}

function generateQRCode(data) {
    currentOverlayData = data;
    const isPaySeller = data.type === 'paySeller';
    const s = getSettings();
    const hasWeroLink = (s.weroLink || '').trim().length > 0;
    const sellerSwitchEl = document.getElementById('overlaySellerSwitch');
    const panelSofort = document.getElementById('overlayPanelSofort');
    const panelWero = document.getElementById('overlayPanelWero');
    const btnSofort = document.getElementById('overlayBtnSofort');
    const btnWero = document.getElementById('overlayBtnWero');

    // Schalter nur bei "Bezahlung durch Käufer" (pay/direct), nie bei "Bezahlung an Verkäufer" (paySeller)
    if (sellerSwitchEl) sellerSwitchEl.classList.toggle('hidden', isPaySeller);
    if (btnWero) {
        btnWero.classList.toggle('disabled', !hasWeroLink);
        btnWero.setAttribute('aria-disabled', !hasWeroLink);
    }
    if (panelSofort) panelSofort.classList.remove('hidden');
    if (panelWero) panelWero.classList.add('hidden');
    if (btnSofort) btnSofort.classList.add('active');
    if (btnWero) btnWero.classList.remove('active');

    const overlayPayActions = document.getElementById('overlayPayActions');
    const overlayPaySellerAction = document.getElementById('overlayPaySellerAction');
    if (overlayPayActions) overlayPayActions.classList.toggle('hidden', data.type !== 'pay' || data.paidAlready);
    if (overlayPaySellerAction) overlayPaySellerAction.classList.toggle('hidden', data.type !== 'paySeller' || data.sellerPaidAlready);

    const qrData = generateEPCQRCode(data);
    const ctx = qrCanvas.getContext('2d');
    ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);

    QRCode.toCanvas(qrCanvas, qrData, {
        width: 300,
        margin: 2,
        errorCorrectionLevel: 'M'
    }, function (error) {
        if (error) {
            console.error('Error generating QR code:', error);
            alert(window.i18n ? window.i18n.t('msg.qrError') : 'Fehler beim Generieren des QR Codes.');
            return;
        }
        displayTransferDetails(data);
        overlay.classList.remove('hidden');
    });
}

function switchPaySellerPanel(panel) {
    const panelSofort = document.getElementById('overlayPanelSofort');
    const panelWero = document.getElementById('overlayPanelWero');
    const btnSofort = document.getElementById('overlayBtnSofort');
    const btnWero = document.getElementById('overlayBtnWero');
    if (!panelSofort || !panelWero) return;

    if (panel === 'sofort') {
        panelSofort.classList.remove('hidden');
        panelWero.classList.add('hidden');
        if (btnSofort) btnSofort.classList.add('active');
        if (btnWero) btnWero.classList.remove('active');
        return;
    }

    // WERO panel – only if WERO link is configured
    const s = getSettings();
    if (!(s.weroLink || '').trim()) return;
    panelSofort.classList.add('hidden');
    panelWero.classList.remove('hidden');
    if (btnSofort) btnSofort.classList.remove('active');
    if (btnWero) btnWero.classList.add('active');

    const weroLink = (s.weroLink || '').trim();
    const weroCanvas = document.getElementById('weroQrCanvas');
    const data = currentOverlayData;
    const nameEl = document.getElementById('weroDetailName');
    const amountEl = document.getElementById('weroDetailAmount');
    const paramLabelEl = document.getElementById('weroDetailParamLabel');
    const paramEl = document.getElementById('weroDetailParam');
    if (nameEl) nameEl.textContent = s.recipientName || '-';
    if (amountEl) amountEl.textContent = data && typeof data.amount === 'number' ? formatAmountDE(data.amount) + ' EUR' : '-';
    const paramLabel = s.paramLabel || (window.i18n ? window.i18n.t('table.object') : 'Objekt');
    if (paramLabelEl) paramLabelEl.textContent = paramLabel + ':';
    if (paramEl) paramEl.textContent = (data && data.param) || '-';

    if (weroCanvas) {
        const ctx = weroCanvas.getContext('2d');
        ctx.clearRect(0, 0, weroCanvas.width, weroCanvas.height);
        if (weroLink) {
            QRCode.toCanvas(weroCanvas, weroLink, {
                width: 300,
                margin: 2,
                errorCorrectionLevel: 'M'
            }, function (err) {
                if (err) console.error('WERO QR error:', err);
            });
        }
    }
}

function displayTransferDetails(data) {
    const titleEl = qrOverlayTitle || document.getElementById('qrOverlayTitle');
    if (titleEl) {
        if (data.type === 'pay' || data.type === 'direct') {
            titleEl.textContent = window.i18n ? window.i18n.t('overlay.payByBuyer') : 'Bezahlung durch Käufer';
            titleEl.style.color = '';
        } else if (data.type === 'paySeller') {
            titleEl.textContent = window.i18n ? window.i18n.t('overlay.payToSeller') : 'Bezahlung AN VERKÄUFER';
            titleEl.style.color = 'red';
        } else {
            titleEl.textContent = window.i18n ? window.i18n.t('overlay.titleQR') : 'QR Code für Überweisung';
            titleEl.style.color = '';
        }
    }
    document.getElementById('detailName').textContent = data.recipientName;
    document.getElementById('detailIban').textContent = formatIBAN(data.iban);
    document.getElementById('detailAmount').textContent = formatAmountDE(data.amount) + ' EUR';
    document.getElementById('detailSubject').textContent = data.subject || '-';
    document.getElementById('detailDate').textContent = data.timestamp ? formatDate(data.timestamp) : '-';
}

function formatAmountDE(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return '-';
    return amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatIBAN(iban) {
    // Format IBAN with spaces every 4 characters
    return iban.replace(/(.{4})/g, '$1 ').trim();
}

function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function closeQROverlay() {
    overlay.classList.add('hidden');
}

function closeHistoryOverlay() {
    historyOverlay.classList.add('hidden');
}

function showObjectsOverlay() {
    const label = (getSettings().paramLabel || 'Objekt').trim() || 'Objekt';
    const titleEl = document.getElementById('objectsOverlayTitle');
    if (titleEl) titleEl.textContent = label;
    const items = getSellerItems();
    const active = items.filter(function (i) { return !i.deleted; });
    const deleted = items.filter(function (i) { return i.deleted; });
    const deletedHeading = document.getElementById('objectsDeletedHeading');
    if (deletedHeading) deletedHeading.classList.toggle('hidden', deleted.length === 0);
    const listActive = document.getElementById('objectsListActive');
    const listDeleted = document.getElementById('objectsListDeleted');
    if (listActive) listActive.innerHTML = renderObjectsTable(active, label);
    if (listDeleted) listDeleted.innerHTML = renderObjectsTable(deleted, label);
    document.body.classList.add('print-objects');
    document.getElementById('objectsOverlay').classList.remove('hidden');
}

function closeObjectsOverlay() {
    document.body.classList.remove('print-objects');
    document.getElementById('objectsOverlay').classList.add('hidden');
}

function renderObjectsTable(items, paramLabel) {
    const emptyLabel = window.i18n ? window.i18n.t('objects.empty') : 'Keine Einträge';
    const yesLabel = window.i18n ? window.i18n.t('yes') : 'Ja';
    const noLabel = window.i18n ? window.i18n.t('no') : 'Nein';
    const thSeller = window.i18n ? window.i18n.t('table.seller') : 'Verkäufer';
    const thIban = window.i18n ? window.i18n.t('table.iban') : 'IBAN';
    const thAmount = window.i18n ? window.i18n.t('table.amount') : 'Betrag';
    const thTel = window.i18n ? window.i18n.t('table.tel') : 'Tel';
    const thPaid = window.i18n ? window.i18n.t('table.paid') : 'Bezahlt';
    const thPaidToSeller = window.i18n ? window.i18n.t('table.paidToSeller') : 'An Verkäufer gezahlt';
    if (!items.length) return '<p class="objects-empty">' + emptyLabel + '</p>';
    var rows = items.map(function (item) {
        return '<tr>' +
            '<td>' + escapeHtml(item.param || '—') + '</td>' +
            '<td>' + escapeHtml((item.sellerName || '').trim() || '—') + '</td>' +
            '<td>' + escapeHtml((item.sellerIban || '').trim() ? formatIBAN(item.sellerIban) : '—') + '</td>' +
            '<td>' + (typeof item.price === 'number' ? formatAmountDE(item.price) : '—') + ' EUR</td>' +
            '<td>' + escapeHtml((item.phone || '').trim() || '—') + '</td>' +
            '<td>' + (item.paid ? yesLabel : noLabel) + '</td>' +
            '<td>' + (item.sellerPaid ? yesLabel : noLabel) + '</td>' +
        '</tr>';
    }).join('');
    return '<table class="objects-table"><thead><tr>' +
        '<th>' + escapeHtml(paramLabel) + '</th><th>' + escapeHtml(thSeller) + '</th><th>' + escapeHtml(thIban) + '</th><th>' + escapeHtml(thAmount) + '</th><th>' + escapeHtml(thTel) + '</th><th>' + escapeHtml(thPaid) + '</th><th>' + escapeHtml(thPaidToSeller) + '</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table>';
}

function saveToHistory(data) {
    let history = getHistory();
    history.unshift(data); // Add to beginning
    
    // Limit history to last 100 entries
    if (history.length > 100) {
        history = history.slice(0, 100);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function getHistory() {
    const historyJson = localStorage.getItem(STORAGE_KEY);
    return historyJson ? JSON.parse(historyJson) : [];
}

function showHistory() {
    // Beim Öffnen sicherstellen, dass Export-Button existiert (falls DOM nachgeladen)
    // Listener wird in setupEventListeners gesetzt
    const history = getHistory();
    const historyList = document.getElementById('historyList');
    
    if (history.length === 0) {
        historyList.innerHTML = '<div class="history-empty">' + (window.i18n ? window.i18n.t('history.empty') : 'Noch keine QR Codes generiert') + '</div>';
    } else {
        historyList.innerHTML = history.map((item, index) => createHistoryItem(item, index)).join('');
    }
    
    historyOverlay.classList.remove('hidden');
}

function exportHistoryToPDF() {
    const history = getHistory();
    if (!history || history.length === 0) {
        alert(window.i18n ? window.i18n.t('msg.noHistoryExport') : 'Es gibt keine Einträge zum Exportieren.');
        return;
    }
    // Sicherstellen, dass die History sichtbar und gerendert ist
    if (historyOverlay.classList.contains('hidden')) {
        showHistory();
        // kleinen Delay, damit DOM gerendert ist, bevor gedruckt wird
        setTimeout(() => window.print(), 50);
    } else {
        window.print();
    }
}

function createHistoryItem(item, index) {
    const paramLabel = item.paramLabel || '';
    const param = item.param || '';
    const title = (item.type === 'paySeller')
        ? (window.i18n ? window.i18n.t('history.sellerPayment', [paramLabel, param]).trim() : ('Verkäuferbezahlung ' + paramLabel + (paramLabel && param ? ' ' : '') + param))
        : (paramLabel || param)
            ? (window.i18n ? window.i18n.t('history.payment', [paramLabel, param]).trim() : ('Bezahlung ' + paramLabel + (paramLabel && param ? ' ' : '') + param))
            : (window.i18n ? window.i18n.t('history.transfer', [index + 1]) : ('Überweisung #' + (index + 1)));
    const lblRecipient = window.i18n ? window.i18n.t('history.recipient') : 'Empfänger';
    const lblIban = window.i18n ? window.i18n.t('history.iban') : 'IBAN';
    const lblAmount = window.i18n ? window.i18n.t('history.amount') : 'Betrag';
    const lblSubject = window.i18n ? window.i18n.t('history.subject') : 'Betreff';
    return `
        <div class="history-item">
            <div class="history-item-header">
                <strong>${escapeHtml(title)}</strong>
                <span class="history-item-date">${formatDate(item.timestamp)}</span>
            </div>
            <div class="history-item-details">
                <div>
                    <strong>${escapeHtml(lblRecipient)}</strong>
                    <span>${escapeHtml(item.recipientName)}</span>
                </div>
                <div>
                    <strong>${escapeHtml(lblIban)}</strong>
                    <span>${formatIBAN(item.iban)}</span>
                </div>
                <div>
                    <strong>${escapeHtml(lblAmount)}</strong>
                    <span>${item.amount.toFixed(2)} EUR</span>
                </div>
                <div>
                    <strong>${escapeHtml(lblSubject)}</strong>
                    <span>${escapeHtml(item.subject) || '-'}</span>
                </div>
            </div>
        </div>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateFooterSums() {
    const items = getSellerItems().filter(item => !item.deleted);
    const s = getSettings();
    const commission = (s.commissionPercent != null && s.commissionPercent !== '') ? Number(s.commissionPercent) : 10;

    let totalPaidByBuyer = 0;
    let totalPaidToSeller = 0;
    let totalPendingToSeller = 0;

    let sumBar = 0;
    let sumElectronicNoIban = 0;

    items.forEach(item => {
        if (item.paid) {
            totalPaidByBuyer += item.price;
            if (item.paidMethod === 'bar') {
                sumBar += item.price;
            } else {
                const hasIban = (item.sellerIban || '').trim().length > 0;
                if (!hasIban) {
                    sumElectronicNoIban += item.price;
                }
            }
        }
        if (item.sellerPaid) {
            const amountToSeller = Math.round(item.price * (1 - commission / 100) * 100) / 100;
            totalPaidToSeller += amountToSeller;
        }
        if (!item.paid && (item.sellerIban || '').trim()) {
            totalPendingToSeller += item.price;
        }
    });

    const balance = Math.round((sumBar - sumElectronicNoIban * (1 - commission / 100)) * 100) / 100;

    const sumPaidEl = document.getElementById('sumPaid');
    const sumSellerPaidEl = document.getElementById('sumSellerPaid');
    const sumBarEl = document.getElementById('sumBar');
    const sumElectronicNoIbanEl = document.getElementById('sumElectronicNoIban');
    const balanceCashEl = document.getElementById('balanceCash');
    const sumPendingToSellerEl = document.getElementById('sumPendingToSeller');

    if (sumPaidEl) sumPaidEl.textContent = totalPaidByBuyer.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (sumSellerPaidEl) sumSellerPaidEl.textContent = totalPaidToSeller.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const sumElectronicNoIbanAfterProvision = Math.round(sumElectronicNoIban * (1 - commission / 100) * 100) / 100;
    const sumElectronicNoIbanDisplay = -sumElectronicNoIbanAfterProvision;

    if (sumBarEl) sumBarEl.textContent = sumBar.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (sumElectronicNoIbanEl) {
        sumElectronicNoIbanEl.textContent = sumElectronicNoIbanDisplay.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        sumElectronicNoIbanEl.classList.toggle('negative', sumElectronicNoIbanDisplay < 0);
    }
    if (balanceCashEl) {
        balanceCashEl.textContent = balance.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        balanceCashEl.classList.toggle('negative', balance < 0);
    }
    if (sumPendingToSellerEl) sumPendingToSellerEl.textContent = totalPendingToSeller.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const EXPORT_VERSION = 1;

function exportData() {
    const payload = {
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        appVersion: APP_VERSION,
        data: {
            [STORAGE_KEY]: localStorage.getItem(STORAGE_KEY),
            [SETTINGS_KEY]: localStorage.getItem(SETTINGS_KEY),
            [MODE_KEY]: localStorage.getItem(MODE_KEY),
            [SELLER_ITEMS_KEY]: localStorage.getItem(SELLER_ITEMS_KEY)
        }
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = 'SofortUeberw-Backup-' + timestamp + '.json';
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function importData(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
        try {
            const payload = JSON.parse(reader.result);
            if (payload.version !== EXPORT_VERSION || !payload.data) {
                alert(window.i18n ? window.i18n.t('msg.invalidBackup') : 'Ungültige oder veraltete Backup-Datei.');
                return;
            }
            const d = payload.data;
            if (d[STORAGE_KEY] != null) localStorage.setItem(STORAGE_KEY, typeof d[STORAGE_KEY] === 'string' ? d[STORAGE_KEY] : JSON.stringify(d[STORAGE_KEY]));
            if (d[SETTINGS_KEY] != null) localStorage.setItem(SETTINGS_KEY, typeof d[SETTINGS_KEY] === 'string' ? d[SETTINGS_KEY] : JSON.stringify(d[SETTINGS_KEY]));
            if (d[MODE_KEY] != null) localStorage.setItem(MODE_KEY, String(d[MODE_KEY]));
            if (d[SELLER_ITEMS_KEY] != null) localStorage.setItem(SELLER_ITEMS_KEY, typeof d[SELLER_ITEMS_KEY] === 'string' ? d[SELLER_ITEMS_KEY] : JSON.stringify(d[SELLER_ITEMS_KEY]));
            closeSettingsOverlay();
            alert(window.i18n ? window.i18n.t('msg.importSuccess') : 'Backup wurde eingelesen. Die Seite wird neu geladen.');
            location.reload();
        } catch (err) {
            alert(window.i18n ? window.i18n.t('msg.importError', [err.message || 'Ungültiges Format']) : ('Fehler beim Einlesen der Datei: ' + (err.message || 'Ungültiges Format')));
        }
    };
    reader.readAsText(file, 'UTF-8');
}

function resetAllData() {
    const confirmation = confirm(window.i18n ? window.i18n.t('msg.confirmResetAll') : 'Sind Sie sicher, dass Sie ALLE Daten unwiderruflich löschen möchten? Dies umfasst das Protokoll, alle Verkäufer-Objekte und Ihre Einstellungen.');
    if (confirmation) {
        localStorage.clear();
        alert(window.i18n ? window.i18n.t('msg.resetDone') : 'Alle Daten wurden gelöscht. Die Seite wird nun neu geladen.');
        location.reload();
    }
}

