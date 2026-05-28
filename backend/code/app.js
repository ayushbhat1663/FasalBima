/* ══════════════════════════════════════════
   CONSTANTS & DATA
══════════════════════════════════════════ */
const CROPS = [
  { e: '\u{1F33E}', k: 'wheat' },
  { e: '\u{1F359}', k: 'rice' },
  { e: '\u{1F33D}', k: 'maize' },
  { e: '\u{1F331}', k: 'soybean' },
  { e: '\u{1F33F}', k: 'cotton' },
  { e: '\u{1F38B}', k: 'sugarcane' },
  { e: '\u{1F954}', k: 'potato' },
  { e: '\u{1F345}', k: 'tomato' },
  { e: '\u{1F33C}', k: 'mustard' },
  { e: '\u{1F37A}', k: 'barley' },
  { e: '\u{1F9C5}', k: 'onion' },
  { e: '\u{1F9C4}', k: 'garlic' },
  { e: '\u{1F33B}', k: 'sunflower' },
  { e: '\u{1F34C}', k: 'banana' },
  { e: '\u{1F34E}', k: 'apple' }
];

const CAUSES = [
  { e: 'Baahd', k: 'flood' },
  { e: 'Sookha', k: 'drought' },
  { e: 'Olay', k: 'hail' },
  { e: 'Aag', k: 'fire' },
  { e: 'Keet', k: 'pest' },
  { e: 'Aandhi', k: 'cyclone' }
];

/*  claims are driven entirely by crop registrations */

/* ══════════════════════════════════════════
   STATE
══════════════════════════════════════════ */
let curScreen = 'screen-auth';
let appHistory = [];
let selCrop = null, area = 2.0, isRec = false, recog = null;
let userCrops = []; 
let selectedRegCropId = null; 

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 FasalBima (Frontend-Only): Initializing...");
    try {
        const userEmail = storage.get('userEmail');
        const isLoggedIn = storage.get('isLoggedIn') === 'true';
        const savedLang = storage.get('fasalbima_lang');

        if (userEmail && isLoggedIn) {
            if (!savedLang) {
                goTo('screen-language');
            } else {
                if (typeof setLanguage === 'function') {
                    try { setLanguage(savedLang); } catch(e) { }
                }
                goTo('screen-home');
                const nav = document.getElementById('bottomNav');
                if (nav) nav.style.display = 'block';
            }
        } else {
            storage.remove('isLoggedIn'); 
            goTo('screen-auth');
        }

        setTimeout(() => {
            safeInit(buildCropGrid, 'cropRegGrid');

            safeInit(buildAdvisory);
            safeInit(renderLangGrid);
            
            if (isLoggedIn) {
                fetchAndBuildClaims();
            }

            initWeather();
        }, 100);

    } catch (criticalError) {
        console.error("❌ CRITICAL INITIALIZATION FAILURE:", criticalError);
    }
});

function safeInit(fn, ...args) {
    try {
        if (typeof fn === 'function') fn(...args);
    } catch (err) {
        console.warn(`⚠️ safeInit failed:`, err.message);
    }
}

/* ══════════════════════════════════════════
   WEATHER + GEOLOCATION (Public API)
══════════════════════════════════════════ */

const DEFAULT_LAT = 32.7266;
const DEFAULT_LON = 74.8570;
const DEFAULT_CITY = 'Jammu';
const DEFAULT_STATE = 'Jammu & Kashmir';

async function initWeather() {
    let lat = DEFAULT_LAT;
    let lon = DEFAULT_LON;
    let cityName = DEFAULT_CITY;

    try {
        const pos = await getUserLocation();
        lat = pos.latitude;
        lon = pos.longitude;
        const place = await reverseGeocode(lat, lon);
        if (place) {
            cityName = place.city;
            updateLocationDisplay(place.city, place.state);
        }
    } catch (err) { }

    fetchWeather(lat, lon, cityName);
}

function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            (err) => reject(err),
            { timeout: 8000, maximumAge: 300000 }
        );
    });
}

async function reverseGeocode(lat, lon) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`;
        const res = await fetch(url, { headers: { 'User-Agent': 'FasalBimaApp/1.0' } });
        if (!res.ok) return null;
        const data = await res.json();
        const addr = data.address || {};
        const city = addr.city || addr.town || addr.village || addr.county || DEFAULT_CITY;
        const state = addr.state || DEFAULT_STATE;
        return { city, state };
    } catch (e) { return null; }
}

function updateLocationDisplay(city, state) {
    const locationEl = document.getElementById('locationText');
    const cityEl = document.getElementById('wCity');
    if (locationEl) locationEl.textContent = `📍 ${city}, ${state}`;
    if (cityEl) cityEl.textContent = city;
}

async function fetchWeather(lat, lon, cityName) {
    const iconEl = document.getElementById('wIcon');
    const tempEl = document.getElementById('wTemp');
    const descEl = document.getElementById('wDesc');
    const cityEl = document.getElementById('wCity');
    const alertPill = document.getElementById('wAlertPill');
    const alertEl = document.getElementById('wAlertText');

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network failure');
        const data = await response.json();
        const current = data.current;
        if (current) {
            const weather = mapWeatherCode(current.weather_code);
            if (iconEl) iconEl.textContent = weather.emoji;
            if (tempEl) tempEl.textContent = `${Math.round(current.temperature_2m)}°C`;
            if (descEl) descEl.textContent = `${weather.desc} · Humidity ${current.relative_humidity_2m}%`;
            if (cityEl) cityEl.textContent = cityName;
            if (alertPill && alertEl) {
                if ([95, 96, 99].includes(current.weather_code)) {
                    alertEl.textContent = t('w_thunderstorm_alert') || 'Thunderstorm Warning!';
                    alertPill.style.display = '';
                } else if ([61, 63, 65, 80, 81, 82].includes(current.weather_code)) {
                    alertEl.textContent = t('w_rain_alert') || 'Rain Forecasted';
                    alertPill.style.display = '';
                } else {
                    alertPill.style.display = 'none';
                }
            }
            buildAdvisory(current);
        }
    } catch (err) {
        if (descEl) descEl.textContent = 'Weather Unavailable';
        if (tempEl) tempEl.textContent = '--°C';
    }
}

function mapWeatherCode(code) {
    const mapping = {
        0: { emoji: '☀️', desc: 'Clear sky' },
        1: { emoji: '🌤️', desc: 'Mainly clear' },
        2: { emoji: '⛅', desc: 'Partly cloudy' },
        3: { emoji: '☁️', desc: 'Overcast' },
        45: { emoji: '🌫️', desc: 'Fog' },
        48: { emoji: '🌫️', desc: 'Depositing rime fog' },
        51: { emoji: '🌦️', desc: 'Light drizzle' },
        53: { emoji: '🌦️', desc: 'Moderate drizzle' },
        55: { emoji: '🌦️', desc: 'Dense drizzle' },
        61: { emoji: '🌧️', desc: 'Slight rain' },
        63: { emoji: '🌧️', desc: 'Moderate rain' },
        65: { emoji: '🌧️', desc: 'Heavy rain' },
        71: { emoji: '❄️', desc: 'Slight snow' },
        73: { emoji: '❄️', desc: 'Moderate snow' },
        75: { emoji: '❄️', desc: 'Heavy snow' },
        80: { emoji: '🌦️', desc: 'Slight rain showers' },
        81: { emoji: '🌧️', desc: 'Moderate rain showers' },
        82: { emoji: '🌧️', desc: 'Violent rain showers' },
        95: { emoji: '⛈️', desc: 'Thunderstorm' },
        96: { emoji: '⛈️', desc: 'Thunderstorm w/ slight hail' },
        99: { emoji: '⛈️', desc: 'Thunderstorm w/ heavy hail' }
    };
    return mapping[code] || { emoji: '🌡️', desc: 'Unknown' };
}

/* ══════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════ */
function goTo(id) {
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;

    const isLoggedIn = storage.get('isLoggedIn') === 'true';
    if (id === 'screen-auth' && isLoggedIn) {
        goTo('screen-home');
        return;
    }

    if (curScreen !== id && curScreen !== 'screen-language' && curScreen !== 'screen-auth') appHistory.push(curScreen);
    
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none'; 
    });
    
    target.classList.add('active');
    target.style.display = ''; 
    curScreen = id;
    
    updateNav(id);
    if (id === 'screen-report') handleReportNavigation();
    if (id === 'screen-crop') resetCropForm();
    if (id === 'screen-claims') fetchAndBuildClaims();
}

/**
 * MOCK: Handle Report Navigation without Backend
 */
function handleReportNavigation() {
    // Load crops from localStorage
    const savedCrops = storage.get('fb_user_crops');
    userCrops = savedCrops ? JSON.parse(savedCrops) : [];
    
    if (userCrops.length === 0) {
        alert("⚠️ You must register your crop first before reporting damage.");
        goTo('screen-crop');
        return;
    }
    
    const el = document.getElementById('cropPickGrid');
    if (el) {
        el.innerHTML = userCrops.map((c, i) => `
            <button class="crop-btn" id="cropPickGrid-c${i}" data-id="${c.id}" onclick="selectRegisteredCrop(${i})">
                <span class="crop-emoji">${getCropEmoji(c.crop_name)}</span>
                <span class="crop-name">${c.crop_name}</span>
                <span style="font-size:0.6rem; opacity:0.7; display:block;">${c.season} · ${c.land_area} Ac</span>
            </button>`).join('');
    }
    resetReport();
}

function getCropEmoji(type) {
    const found = CROPS.find(c => t(c.k) === type || c.k === (type ? type.toLowerCase() : ''));
    return found ? found.e : '🌱';
}

function selectRegisteredCrop(idx) {
    document.querySelectorAll('#cropPickGrid .crop-btn').forEach(b => b.classList.remove('sel'));
    const btn = document.getElementById(`cropPickGrid-c${idx}`);
    if (btn) btn.classList.add('sel');
    const crop = userCrops[idx];
    selectedRegCropId = crop.id;
    selCrop = CROPS.find(c => t(c.k) === crop.crop_name) || {e:'🌱', k: crop.crop_name};
}

function resetCropForm() {
    window.regSeason = '';
    window.regSelCrop = null;
    document.querySelectorAll('#screen-crop .s-btn').forEach(b => b.classList.remove('sel'));
    const cropSearch = document.getElementById('cropSearch');
    if (cropSearch) cropSearch.value = '';
    document.getElementById('regArea').value = '';
    document.getElementById('regLocation').value = '';
    document.getElementById('regDate').value = '';
    document.getElementById('regTerms').checked = false;
    document.getElementById('calcPremiumDisplay').textContent = '₹0';
    document.getElementById('calcCompDisplay').textContent = '₹0';
    filterCropGrid('');
    validateCropForm();
}

/**
 * Fetch and Build Claims from localStorage (real registered crops only)
 */
function fetchAndBuildClaims() {
    const el = document.getElementById('claimsList');
    if (!el) return;

    const savedCrops = storage.get('fb_user_crops');
    let crops = savedCrops ? JSON.parse(savedCrops) : [];

    if (typeof renderClaims === 'function') {
        renderClaims(crops);
    }
}

function goBack() {
    const prev = appHistory.pop() || 'screen-home';
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });
    const prevScreen = document.getElementById(prev);
    if (prevScreen) {
        prevScreen.classList.add('active');
        prevScreen.style.display = '';
    }
    curScreen = prev;
    updateNav(prev);
}

function updateNav(id) {
    const map = { 'screen-home': 'nb-home', 'screen-report': 'nb-report', 'screen-claims': 'nb-claims', 'screen-advisory': 'nb-advisory' };
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('act'));
    const btnId = map[id];
    if (btnId) {
        const btn = document.getElementById(btnId);
        if (btn) btn.classList.add('act');
    }
}

/* ══════════════════════════════════════════
   LANGUAGE SELECTION Flow
══════════════════════════════════════════ */
let pendingLang = null;

function renderLangGrid() {
    const grid = document.getElementById('langGrid');
    const enterBtn = document.getElementById('langEnterBtn');
    if (!grid) return;
    
    if (enterBtn) {
        enterBtn.disabled = true;
        enterBtn.style.opacity = '0.5';
    }
    
    const langs = [
        { code: 'en', name: 'English', native: 'English', flag: '🌐' },
        { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' }
    ];
    
    grid.innerHTML = langs.map(l => `
        <button class="lang-opt" id="lo-${l.code}" onclick="pickLang('${l.code}')">
            <span class="lf">${l.flag}</span>
            <div class="ln">${l.name}</div>
            <div class="lsub">${l.native}</div>
        </button>
    `).join('');
}

function pickLang(code) {
    pendingLang = code;
    document.querySelectorAll('.lang-opt').forEach(b => b.classList.remove('sel'));
    document.getElementById('lo-' + code).classList.add('sel');
    const enterBtn = document.getElementById('langEnterBtn');
    if (enterBtn) {
        enterBtn.disabled = false;
        enterBtn.style.opacity = '1';
    }
}

function enterApp() {
    if (!pendingLang) return;
    storage.set('fasalbima_lang', pendingLang);
    if (typeof setLanguage === 'function') setLanguage(pendingLang);
    goTo('screen-home');
    const nav = document.getElementById('bottomNav');
    if (nav) nav.style.display = 'block';
}

/* ══════════════════════════════════════════
   CROP / CAUSE GRIDS
══════════════════════════════════════════ */
function buildCropGrid(id, items = CROPS) {
    const el = document.getElementById(id);
    if (!el) return;

    if (!items.length) {
        el.innerHTML = `
            <div class="empty-state">No crops match your search. Try another name.</div>`;
        return;
    }

    el.innerHTML = items.map(c => `
        <button class="crop-btn" id="${id}-c${c.k}" onclick="selectCrop('${id}','${c.k}')">
            <span class="cb-emoji">${c.e}</span>
            <span class="cb-name">${t(c.k)}</span>
        </button>`).join('');
}

function selectCrop(gid, keyOrIndex) {
    document.querySelectorAll(`#${gid} .crop-btn`).forEach(b => b.classList.remove('sel'));
    const btn = document.getElementById(`${gid}-c${keyOrIndex}`);
    if (btn) btn.classList.add('sel');

    let selectedCrop = null;
    if (typeof keyOrIndex === 'number' || /^[0-9]+$/.test(String(keyOrIndex))) {
        selectedCrop = CROPS[Number(keyOrIndex)];
    } else {
        selectedCrop = CROPS.find(c => c.k === String(keyOrIndex));
    }

    if (!selectedCrop) return;

    if (gid === 'cropPickGrid') {
        selCrop = selectedCrop;
    }

    if (gid === 'cropRegGrid') {
        window.regSelCrop = selectedCrop;
        validateCropForm();
    }
}

function filterCropGrid(value = '') {
    const query = String(value).trim().toLowerCase();
    const filtered = query
        ? CROPS.filter(c => t(c.k).toLowerCase().includes(query) || c.k.toLowerCase().includes(query))
        : CROPS;

    buildCropGrid('cropRegGrid', filtered);

    if (window.regSelCrop && !filtered.some(c => c.k === window.regSelCrop.k)) {
        window.regSelCrop = null;
        validateCropForm();
    }
}

function buildCauseGrid() {
    const el = document.getElementById('causePickGrid');
    if (!el) return;
    el.innerHTML = CAUSES.map((c, i) => `
        <button class="cause-btn" id="cau${i}" onclick="selectCause(${i})">
            <span class="cau-emoji">${c.e.includes('Baahd') ? '🌊' : c.e.includes('Sookha') ? '🌵' : c.e.includes('Olay') ? '⛈️' : c.e.includes('Aag') ? '🔥' : c.e.includes('Keet') ? '🐛' : '🌪️'}</span>
            <span class="cau-name">${t(c.k)}</span>
        </button>`).join('');
}

function selectCause(i) {
    // Logic removed as Cause selection step is deleted
}

/* ══════════════════════════════════════════
   REPORT STEPS (MOCK)
══════════════════════════════════════════ */
function resetReport() { nextStep(1); }

function nextStep(n) {
    document.querySelectorAll('.rstep').forEach(s => s.classList.remove('active'));
    
    let targetId = 'rs' + n;
    const targetEl = document.getElementById(targetId);
    if (targetEl) targetEl.classList.add('active');

    [1, 2].forEach(i => {
        const d = document.getElementById('sp' + i);
        if (d) {
            d.classList.remove('active', 'done');
            if (i < n) d.classList.add('done');
            if (i === n) d.classList.add('active');
        }
    });
}

/**
 * MOCK: Simulating AI Damage Reporting with localStorage
 */
function runAI() {
    // Demo simulation disabled in production mode.
    // Please use the AI Damage Assessment step (Upload images in Step 2) to run real analysis.
    const sp = document.getElementById('aiSpinner'), res = document.getElementById('aiResult');
    if (sp) sp.classList.add('hidden');
    if (res) res.classList.remove('hidden');
    alert('Demo AI simulation is disabled. Use the AI Damage Assessment (Step 2) to upload images for real analysis.');
}

/* ══════════════════════════════════════════
   AREA / SLIDER
══════════════════════════════════════════ */
function changeArea(d) {
    area = Math.max(0.5, Math.min(50, area + d));
    document.getElementById('areaNum').textContent = area.toFixed(1);
}

/* ══════════════════════════════════════════
   PHOTOS
══════════════════════════════════════════ */
function handlePhotos(e) {
    const pre = document.getElementById('photoPreview');
    if (!pre) return;
    Array.from(e.target.files).forEach(f => {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(f); img.className = 'thumb'; img.alt = 'crop'; pre.appendChild(img);
    });
}

/* ══════════════════════════════════════════
   VOICE (Mock)
══════════════════════════════════════════ */
function toggleVoice() {
    const btn = document.getElementById('voiceBtn'), tx = document.getElementById('transcript'), lbl = document.getElementById('vBtnTxt');
    if (!isRec) {
        isRec = true; btn.classList.add('rec'); lbl.textContent = t('voice_stop') || 'Stop';
        tx.textContent = '...';
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SR) {
            recog = new SR(); recog.lang = getLanguage() === 'en' ? 'en-IN' : 'hi-IN';
            recog.onresult = ev => tx.textContent = ev.results[0][0].transcript;
            recog.onerror = () => stopVoice(); recog.onend = () => stopVoice(); recog.start();
        } else {
            setTimeout(() => { tx.textContent = t('voice_demo_text'); stopVoice(); }, 2500);
        }
    } else { if (recog) recog.stop(); stopVoice(); }
}

function stopVoice() {
    isRec = false;
    const btn = document.getElementById('voiceBtn');
    if (btn) btn.classList.remove('rec');
    const vTxt = document.getElementById('vBtnTxt');
    if (vTxt) vTxt.textContent = t('voice_start') || 'Start Speaking';
}

/* ══════════════════════════════════════════
   ADVISORY (Dynamic based on Weather)
══════════════════════════════════════════ */
function buildAdvisory(weatherData) {
    const el = document.getElementById('advList');
    if (!el) return;
    
    let dynamicAdvisories = [];
    let dStr = new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
    
    if (weatherData) {
        const temp = weatherData.temperature_2m;
        const hum = weatherData.relative_humidity_2m;
        const code = weatherData.weather_code;
        const isRain = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code);
        const isCloudy = [3, 45, 48].includes(code);
        
        if (isRain) dynamicAdvisories.push({ type: 'danger', tag: '🌧️ Weather', title: 'Rain Advisory', desc: 'Rain expected. Avoid pesticide spraying.', date: dStr });
        else if (isCloudy) dynamicAdvisories.push({ type: 'warning', tag: '☁️ Weather', title: 'Cloudy Advisory', desc: 'Cloudy weather detected. Delay spraying.', date: dStr });
        if (temp > 35) dynamicAdvisories.push({ type: 'danger', tag: '🌡️ Temperature', title: 'Heat Advisory', desc: 'Irrigate crops in early morning.', date: dStr });
        if (hum > 80) dynamicAdvisories.push({ type: 'warning', tag: '💧 Humidity', title: 'Humidity Advisory', desc: 'Disease risk high. Monitor crops.', date: dStr });
    }
    
    if (dynamicAdvisories.length === 0) {
        dynamicAdvisories.push({ type: 'info', tag: '🌾 Normal', title: 'Farm Conditions', desc: 'Conditions are normal. Continue practices.', date: dStr });
    }
    
    const col = { danger: '#e53935', warning: '#ff9800', info: '#2e7d32', scheme: '#1565c0' };
    el.innerHTML = dynamicAdvisories.map(a => `
        <div class="adv-card ${a.type}">
            <div class="adv-tag" style="color:${col[a.type]}">${a.tag}</div>
            <div class="adv-title">${a.title}</div>
            <div class="adv-desc">${a.desc}</div>
            <div class="adv-date">${a.date}</div>
        </div>`).join('');
}

/* ══════════════════════════════════════════
   CROP REGISTRATION (MOCK)
══════════════════════════════════════════ */
window.regSeason = '';
window.regSelCrop = null;

function selectRegSeason(s, btn) {
    document.querySelectorAll('#screen-crop .s-btn').forEach(b => b.classList.remove('sel'));
    if (btn) btn.classList.add('sel');
    window.regSeason = s;
    validateCropForm();
}

function detectRegLocation() {
    const locInput = document.getElementById('regLocation');
    locInput.value = "Detecting...";
    setTimeout(() => { locInput.value = "Jammu, J&K"; validateCropForm(); }, 1000);
}

function calcPremium() {
    // No longer needed for simplified registration
}

function validateCropForm() {
    const btn = document.getElementById('regSubmitBtn');
    const dateEl = document.getElementById('regDate');
    const dateVal = dateEl ? dateEl.value : '';
    const isValid = window.regSeason && window.regSelCrop && dateVal;
    if (btn) btn.style.opacity = isValid ? '1' : '0.7';
}
