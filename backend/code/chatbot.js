/* ══════════════════════════════════════════
   CHATBOT – Smart Rule-Based Intent Engine
══════════════════════════════════════════ */

let chatOpen = false;

/* ── Smart Intent Definitions ──────────────────────────── */
const INTENTS = [
    {
        // Matches "damage", "crop loss", "report issue", "report damage", "nuksan"
        keywords: [/damage/i, /loss/i, /report/i, /issue/i, /ruin/i, /destroy/i, /nuksan/i, /नुकसान/i],
        response: '📸 **Damage Reporting:**\nI can help you report your crop loss for insurance evaluation. Taking you to the **Report Damage** page where you can upload photos and details.',
        action: () => { goToScreen('screen-report'); }
    },
    {
        // Matches "register", "add crop", "fasal darz"
        keywords: [/register/i, /add crop/i, /new crop/i, /enroll/i, /darz/i, /दर्ज/i, /पंजीकरण/i],
        response: '🌱 **Crop Registration:**\nLet\'s get your crops covered under PMFBY. Opening the **Crop Registration** page where you can enter season and sowing details.',
        action: () => { goToScreen('screen-crop'); }
    },
    {
        // Matches "claim", "insurance money", "status"
        keywords: [/claim/i, /insurance money/i, /status/i, /payout/i, /get money/i, /daava/i, /दावे/i, /दावा/i],
        response: '📋 **Claims Status:**\nChecking on your insurance payout? You can track the progress of all your submitted reports in the **My Claims** section.',
        action: () => { goToScreen('screen-claims'); }
    },
    {
        // Matches "advisory", "advice", "alert", "pest"
        keywords: [/advisory/i, /advice/i, /alert/i, /pest/i, /disease/i, /सलाह/i, /बीमारी/i],
        response: '🧑‍🌾 **Advisory:**\nI will take you to your localized farming alerts and expert advice.',
        action: () => { goToScreen('screen-advisory'); }
    },
    {
        // Matches "satellite", "map", "ndvi"
        keywords: [/satellite/i, /map/i, /ndvi/i, /सैटेलाइट/i, /नक्शा/i],
        response: '🛰️ **Satellite Map:**\nOpening the map view so you can see your farm\'s health index (NDVI) and radar imagery.',
        action: () => { goToScreen('screen-satellite'); }
    },
    {
        // Matches "home", "dashboard", "main"
        keywords: [/home/i, /dashboard/i, /main/i, /weather/i, /होम/i],
        response: '🏠 **Home:**\nTaking you back to your main dashboard to see weather and quick actions.',
        action: () => { goToScreen('screen-home'); }
    },
    {
        // Greeting intents
        keywords: [/^hi/i, /^hello/i, /^hey/i, /namaste/i, /नमस्ते/i],
        response: '🌾 Namaste! I am your FasalBima Assistant.\n\nI can help you navigate to:\n• Damage Reporting\n• Crop Registration\n• Claim Status\n\nHow can I help you today?',
        action: null
    },
    {
        keywords: [/help/i, /what can you do/i, /guide/i, /मदद/i, /सहायता/i],
        response: '💡 **Help Guide:**\nYou can ask me things like:\n_"My crop is damaged"_\n_"I want to add a crop"_\n_"Where is my insurance money?"_\n\nOr just command me to go to Claims, Report, etc!',
        action: null
    }
];

// Helper to transition screens safely
function goToScreen(screenId) {
    setTimeout(() => {
        if (typeof goTo === 'function') {
            goTo(screenId);
            const nav = document.getElementById('bottomNav');
            if (nav) nav.style.display = 'block';
        }
    }, 1200); // Wait for the user to read the message briefly
}

/* ── Chat UI Controls ──────────────────────────────────── */

function toggleChat() {
    const panel = document.getElementById('chatPanel');
    const fab = document.getElementById('chatFab');
    chatOpen = !chatOpen;

    if (chatOpen) {
        panel.classList.add('open');
        fab.innerHTML = '✕';
        fab.classList.add('chat-fab-close');
        setTimeout(() => document.getElementById('chatInput')?.focus(), 300);
    } else {
        panel.classList.remove('open');
        fab.innerHTML = '💬';
        fab.classList.remove('chat-fab-close');
    }
}

function handleChatKeydown(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendChatMessage();
    }
}

/* ── Smart NLP Matching Logic ──────────────────────────── */

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;

    // Show user message immediately
    appendMessage(msg, 'user');
    input.value = '';

    // Simulate typing delay for realism
    const typingId = showTypingIndicator();

    setTimeout(() => {
        removeTypingIndicator(typingId);
        
        const match = analyzeIntent(msg);
        appendMessage(match.response, 'bot');
        
        if (match.action) {
            match.action();
        }
    }, 600 + Math.random() * 400); // 600 - 1000ms delay
}

function analyzeIntent(input) {
    // 1. Detect if the user wants to logout (special case)
    if (/(logout|sign out|log out|लॉगआउट)/i.test(input)) {
        return {
            response: '🔒 Logging you out...',
            action: () => { setTimeout(() => { if (typeof authLogout === 'function') authLogout(); }, 1000); }
        };
    }

    // 2. Score intents based on keyword matches
    // This allows flexible understanding (e.g. "my crop suffered huge loss" -> hits "loss")
    let bestMatch = null;
    let maxHits = 0;

    for (const intent of INTENTS) {
        let hits = 0;
        for (const regex of intent.keywords) {
            if (regex.test(input)) {
                hits++;
            }
        }
        
        if (hits > maxHits) {
            maxHits = hits;
            bestMatch = intent;
        }
    }

    // 3. Return best match, or fallback
    if (bestMatch && maxHits > 0) {
        return bestMatch;
    }

    // Fallback response strictly enforcing the requested rule
    return {
        response: '🤔 I can help with crop registration, damage reporting, and claims. Please try asking related questions.',
        action: null
    };
}

/* ── UI Rendering Utilities ────────────────────────────── */

function showTypingIndicator() {
    const container = document.getElementById('chatMessages');
    if (!container) return null;

    const id = 'typing-' + Date.now();
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble chat-bot chat-typing';
    bubble.id = id;
    bubble.innerHTML = '<span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>';
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
    return id;
}

function removeTypingIndicator(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.remove();
}

function appendMessage(text, sender) {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble chat-${sender}`;

    // Simple markdown bold support & newlines
    const formatted = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');

    bubble.innerHTML = formatted;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
}

/* ── Init ──────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        appendMessage('🌾 Namaste! I\'m your **FasalBima Assistant**.<br><br>I can instantly guide you to report damages, check claims, or register crops. What do you need help with?', 'bot');
    }, 1000);
});
