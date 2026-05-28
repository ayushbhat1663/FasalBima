/**
 * ═══════════════════════════════════════════════════════════
 *  FasalBima – Bilingual Language Engine
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Safe localStorage access wrapper
 */
const storage = {
    get(key) {
        try { return localStorage.getItem(key); }
        catch (e) { return null; }
    },
    set(key, val) {
        try { localStorage.setItem(key, val); }
        catch (e) { console.warn("Storage failed:", e.message); }
    },
    remove(key) {
        try { localStorage.removeItem(key); }
        catch (e) { }
    }
};

let currentLang = storage.get('fasalbima_lang') || 'en';

/**
 * Get translation for a key
 */
function t(key) {
    const dictionary = currentLang === 'hi' ? locales_hi : locales_en;
    return dictionary[key] || key;
}

/**
 * Set the application language
 */
function setLanguage(code) {
    if (code !== 'en' && code !== 'hi') return;
    currentLang = code;
    storage.set('fasalbima_lang', code);
    applyTranslations();
}

/**
 * Apply translations to all elements with data-i18n attribute
 */
function applyTranslations() {
    try {
        // 1. Update all elements with data-i18n
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translated = t(key);
            
            // Handle different element types
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translated;
            } else {
                el.textContent = translated;
            }
        });

        // 2. Update specific UI components that don't fit the simple data-i18n pattern
        const pill = document.getElementById('langPillBtn');
        if (pill) pill.textContent = currentLang === 'en' ? 'EN' : 'हि';

        // 3. Update HTML lang attribute for accessibility/SEO
        document.documentElement.lang = currentLang;

        // 4. Update dynamic labels in auth (if visible)
        updateAuthDynamicText();
    } catch (err) {
        console.warn("⚠️ applyTranslations failed:", err.message);
    }
}

/**
 * Initialize language engine on load
 */
document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();
});

function updateAuthDynamicText() {
    // This is for error messages that were previously hardcoded
    // For example, if a span with id 'authEmailError' is showing, we can't easily data-i18n it
}
