/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   FasalBima — React Voice Integration (Web Speech API)          ║
 * ║   Multilingual · TTS · STT · Voice Navigation · React Hooks     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Usage:
 *   import { VoiceProvider, useVoice, VoiceAssistant } from './VoiceIntegration';
 *
 *   <VoiceProvider language="hi" onNavigate={(screen) => navigate(screen)}>
 *     <App />
 *     <VoiceAssistant />
 *   </VoiceProvider>
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/* ─────────────────────────────────────────────────────────────────────
   1.  CONSTANTS
───────────────────────────────────────────────────────────────────── */

/** Supported languages with BCP-47 locale codes */
export const LANGUAGES = {
  hi: { name: "हिंदी",   locale: "hi-IN",  flag: "🇮🇳" },
  mr: { name: "मराठी",  locale: "mr-IN",  flag: "🟠" },
  te: { name: "తెలుగు", locale: "te-IN",  flag: "🔵" },
  ta: { name: "தமிழ்",  locale: "ta-IN",  flag: "🟡" },
  kn: { name: "ಕನ್ನಡ",  locale: "kn-IN",  flag: "🟤" },
  gu: { name: "ગુજરાતી",locale: "gu-IN",  flag: "🟢" },
  pa: { name: "ਪੰਜਾਬੀ", locale: "pa-IN",  flag: "🔴" },
  bn: { name: "বাংলা",  locale: "bn-IN",  flag: "🟣" },
  en: { name: "English", locale: "en-IN",  flag: "🌐" },
};

/**
 * Keyword map — every command key maps to trigger words
 * spanning all 9 Indian languages + English.
 */
export const VOICE_COMMANDS = {
  home:      ["home","होम","घर","मुख्य","মুখপৃষ্ঠ","முகப்பு","హోమ్","ಮನೆ","ਘਰ","मुखपृष्ठ"],
  report:    ["report","नुकसान","damage","नोंदव","সেতম","சேதம்","నష్టం","ಹಾನಿ","ਨੁਕਸਾਨ","রিপোর্ট"],
  claims:    ["claims","दावे","दावा","claim","দাবি","கோரல்","క్లెయిమ్","ಹಕ್ಕು","ਦਾਅਵੇ","মাझे"],
  advisory:  ["advisory","सलाह","सल्ला","advice","পরামর্শ","ஆலோசனை","సలహా","ಸಲಹೆ","ਸਲਾਹ"],
  helpline:  ["helpline","help","मदद","हेल्पलाइन","সাহায্য","உதவி","హెల్ప్","ಸಹಾಯ","ਮਦਦ"],
  satellite: ["satellite","सैटेलाइट","उपग्रह","ndvi","map","উপগ্রহ","செயற்கை","ఉపగ్రహ","ಉಪಗ್ರಹ"],
  crop:      ["crop","फसल","पीक","register","ফসল","பயிர்","పంట","ಬೆಳೆ","ਫਸਲ","दर्ज"],
  back:      ["back","वापस","मागे","ফিরে","பின்","వెనక","ಹಿಂದೆ","ਵਾਪਸ","পিছে"],
};

/** TTS greeting messages for each screen, in all languages */
export const SCREEN_MESSAGES = {
  "screen-home": {
    hi: "नमस्ते किसान! होम पेज पर आपका स्वागत है।",
    en: "Welcome home, farmer! How can I help you today?",
    mr: "स्वागत आहे शेतकरी! आज मी कशी मदत करू?",
    te: "స్వాగతం రైతు! నేను మీకు ఎలా సహాయపడగలను?",
    ta: "வரவேற்கிறோம் விவசாயி! நான் எவ்வாறு உதவ முடியும்?",
    kn: "ಸ್ವಾಗತ ರೈತ! ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
    gu: "સ્વાગત ખેડૂત! આજ હું કેવી રીતે મદદ કરી શકું?",
    pa: "ਸੁਆਗਤ ਕਿਸਾਨ! ਮੈਂ ਤੁਹਾਡੀ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?",
    bn: "স্বাগত কৃষক! আমি কীভাবে সাহায্য করতে পারি?",
  },
  "screen-report": {
    hi: "नुकसान रिपोर्ट करें। अपनी फसल और नुकसान का कारण चुनें।",
    en: "Report crop damage. Please select your crop and the cause of damage.",
    mr: "नुकसान नोंदवा. तुमचे पीक आणि नुकसानाचे कारण निवडा.",
    te: "నష్టాన్ని నివేదించండి. మీ పంట మరియు నష్టం కారణాన్ని ఎంచుకోండి.",
    ta: "சேதத்தை புகார் செய்யுங்கள். உங்கள் பயிரையும் காரணத்தையும் தேர்ந்தெடுங்கள்.",
  },
  "screen-claims": {
    hi: "आपके सभी बीमा दावे यहाँ दिखेंगे। स्क्रॉल करके देखें।",
    en: "Here are all your insurance claims. Scroll down to see details.",
    mr: "तुमचे सर्व दावे येथे आहेत.",
    te: "మీ అన్ని క్లెయిమ్‌లు ఇక్కడ ఉన్నాయి.",
    ta: "உங்கள் அனைத்து கோரல்களும் இங்கே.",
  },
  "screen-advisory": {
    hi: "कृषि सलाह और मौसम अपडेट यहाँ हैं।",
    en: "Agricultural advisory and latest weather updates for your region.",
    mr: "शेतकरी सल्ला आणि हवामान अपडेट.",
    te: "వ్యవసాయ సలహా మరియు వాతావరణ నవీకరణలు.",
    ta: "விவசாய ஆலோசனை மற்றும் வானிலை புதுப்பிப்புகள்.",
  },
  "screen-helpline": {
    hi: "सहायता के लिए हेल्पलाइन नंबर यहाँ हैं। PMFBY हेल्पलाइन: 14447",
    en: "Helpline numbers for assistance. PMFBY Helpline: 14447, available 24 by 7.",
    mr: "मदतीसाठी हेल्पलाइन नंबर. PMFBY: 14447",
    te: "సహాయానికి హెల్ప్‌లైన్ నంబర్లు. PMFBY: 14447",
    ta: "உதவிக்கான இலக்கங்கள். PMFBY: 14447",
  },
  "screen-satellite": {
    hi: "सैटेलाइट से आपके खेत का NDVI नक्शा देखें।",
    en: "View satellite NDVI crop health map for your field.",
    mr: "उपग्रह NDVI पीक आरोग्य नकाशा पहा.",
    te: "ఉపగ్రహ NDVI పంట ఆరోగ్య మ్యాప్ చూడండి.",
    ta: "செயற்கைக்கோள் NDVI பயிர் ஆரோக்கிய வரைபடம்.",
  },
  "screen-crop": {
    hi: "अपनी फसल दर्ज करें और PMFBY बीमा शुरू करें।",
    en: "Register your crop and start PMFBY insurance coverage.",
    mr: "तुमचे पीक नोंदवा आणि बीमा सुरू करा.",
    te: "మీ పంటను నమోదు చేసి బీమా ప్రారంభించండి.",
    ta: "உங்கள் பயிரை பதிவு செய்து காப்பீடு தொடங்குங்கள்.",
  },
};

/* ─────────────────────────────────────────────────────────────────────
   2.  CONTEXT
───────────────────────────────────────────────────────────────────── */

const VoiceContext = createContext(null);

/* ─────────────────────────────────────────────────────────────────────
   3.  CUSTOM HOOK — useVoiceRecognition
       Wraps the Web Speech API SpeechRecognition with React lifecycle.
───────────────────────────────────────────────────────────────────── */

/**
 * @param {object} opts
 * @param {string}   opts.locale         BCP-47 locale, e.g. "hi-IN"
 * @param {boolean}  opts.continuous      Keep listening after results
 * @param {boolean}  opts.interimResults  Fire onResult for partial text
 * @param {function} opts.onResult        (transcript: string, isFinal: boolean) => void
 * @param {function} opts.onError         (event) => void
 * @param {function} opts.onEnd           () => void
 * @returns {{ start, stop, isSupported, isListening }}
 */
export function useVoiceRecognition({
  locale = "hi-IN",
  continuous = false,
  interimResults = true,
  onResult,
  onError,
  onEnd,
} = {}) {
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);

  const isSupported =
    typeof window !== "undefined" &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const start = useCallback(() => {
    if (!isSupported || isListening) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = locale;
    rec.continuous = continuous;
    rec.interimResults = interimResults;

    rec.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const { transcript } = event.results[i][0];
        if (event.results[i].isFinal) finalTranscript += transcript;
        else interimTranscript += transcript;
      }
      if (finalTranscript) onResult?.(finalTranscript.trim(), true);
      else if (interimTranscript) onResult?.(interimTranscript.trim(), false);
    };

    rec.onerror = (e) => {
      setIsListening(false);
      onError?.(e);
    };

    rec.onend = () => {
      setIsListening(false);
      onEnd?.();
    };

    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  }, [isSupported, isListening, locale, continuous, interimResults, onResult, onError, onEnd]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Clean up on unmount
  useEffect(() => () => stop(), [stop]);

  return { start, stop, isSupported, isListening };
}

/* ─────────────────────────────────────────────────────────────────────
   4.  CUSTOM HOOK — useTTS
       Wraps the Web Speech API SpeechSynthesis.
───────────────────────────────────────────────────────────────────── */

/**
 * @returns {{ speak, cancel, isSpeaking, isSupported }}
 */
export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const isSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const speak = useCallback(
    ({ text, locale = "hi-IN", rate = 0.95, pitch = 1.05, volume = 1 } = {}) => {
      if (!isSupported || !text) return;
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = locale;
      utt.rate = rate;
      utt.pitch = pitch;
      utt.volume = volume;
      utt.onstart = () => setIsSpeaking(true);
      utt.onend = () => setIsSpeaking(false);
      utt.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utt);
    },
    [isSupported]
  );

  const cancel = useCallback(() => {
    if (isSupported) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  // Cancel on unmount
  useEffect(() => () => cancel(), [cancel]);

  return { speak, cancel, isSpeaking, isSupported };
}

/* ─────────────────────────────────────────────────────────────────────
   5.  VOICE COMMAND PROCESSOR
───────────────────────────────────────────────────────────────────── */

/**
 * Match a raw transcript string to a voice command key.
 * Returns the matched command key (e.g. "home") or null.
 */
export function matchVoiceCommand(transcript) {
  const lower = transcript.toLowerCase();
  for (const [cmd, keywords] of Object.entries(VOICE_COMMANDS)) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) return cmd;
  }
  return null;
}

/* ─────────────────────────────────────────────────────────────────────
   6.  VOICE PROVIDER — wraps your entire app
───────────────────────────────────────────────────────────────────── */

/**
 * @param {object} props
 * @param {string}   props.language    Current app language code (e.g. "hi")
 * @param {function} props.onNavigate  Called with screen name when voice nav fires
 * @param {function} props.onBack      Called when user says "back"
 * @param {React.ReactNode} props.children
 */
export function VoiceProvider({ language = "hi", onNavigate, onBack, children }) {
  const [lang, setLang] = useState(language);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isListeningNav, setIsListeningNav] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [toast, setToast] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [currentScreen, setCurrentScreen] = useState("screen-home");
  const toastTimerRef = useRef(null);

  const { speak, cancel: cancelTTS, isSpeaking } = useTTS();

  const locale = LANGUAGES[lang]?.locale ?? "hi-IN";

  // Show a toast message
  const showToast = useCallback((msg, duration = 3200) => {
    setToast(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  // Speak a message in the current language
  const speakMsg = useCallback(
    (text) => {
      if (!ttsEnabled || !text) return;
      speak({ text, locale });
    },
    [ttsEnabled, speak, locale]
  );

  // Announce a screen when navigating
  const announceScreen = useCallback(
    (screenId) => {
      const msgs = SCREEN_MESSAGES[screenId];
      if (!msgs) return;
      const msg = msgs[lang] ?? msgs["en"] ?? "";
      speakMsg(msg);
    },
    [lang, speakMsg]
  );

  // Navigate imperatively, automatically speak screen message
  const navigate = useCallback(
    (screen) => {
      setCurrentScreen(screen);
      onNavigate?.(screen);
      setTimeout(() => announceScreen(screen), 400);
    },
    [onNavigate, announceScreen]
  );

  // Handle recognized voice command
  const handleCommand = useCallback(
    (cmd) => {
      const SCREEN_MAP = {
        home:      "screen-home",
        report:    "screen-report",
        claims:    "screen-claims",
        advisory:  "screen-advisory",
        helpline:  "screen-helpline",
        satellite: "screen-satellite",
        crop:      "screen-crop",
      };
      if (cmd === "back") {
        onBack?.();
        showToast("◀️ Going back…");
        return;
      }
      if (SCREEN_MAP[cmd]) {
        navigate(SCREEN_MAP[cmd]);
        showToast(`✅ Navigated → ${cmd.charAt(0).toUpperCase() + cmd.slice(1)}`);
      }
    },
    [navigate, onBack, showToast]
  );

  // Voice recognition for navigation
  const { start: startRec, stop: stopRec, isListening, isSupported: sttSupported } =
    useVoiceRecognition({
      locale,
      continuous: false,
      interimResults: true,
      onResult: (text, isFinal) => {
        if (isFinal) {
          setTranscript(text);
          setInterimText("");
          const cmd = matchVoiceCommand(text);
          if (cmd) handleCommand(cmd);
          else showToast(`❓ Not recognized: "${text}"`);
        } else {
          setInterimText(text);
        }
      },
      onError: (e) => showToast(`⚠️ Mic error: ${e.error}`),
      onEnd: () => setIsListeningNav(false),
    });

  const startListening = useCallback(() => {
    if (!sttSupported) { showToast("⚠️ Speech recognition not supported"); return; }
    setIsListeningNav(true);
    setTranscript("");
    setInterimText("");
    startRec();
    showToast("🎙️ Listening… speak a command");
  }, [sttSupported, startRec, showToast]);

  const stopListening = useCallback(() => {
    stopRec();
    setIsListeningNav(false);
    setInterimText("");
  }, [stopRec]);

  const toggleListening = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  // Context value exposed to all children
  const ctx = {
    lang, setLang,
    ttsEnabled, setTtsEnabled,
    isListening, isListeningNav,
    transcript, interimText,
    toast, isPanelOpen, setIsPanelOpen,
    currentScreen, isSpeaking,
    sttSupported,
    // Actions
    speak: speakMsg,
    cancelTTS,
    announceScreen,
    navigate,
    toggleListening,
    startListening,
    stopListening,
    execCommand: handleCommand,
    showToast,
  };

  return (
    <VoiceContext.Provider value={ctx}>
      {children}
    </VoiceContext.Provider>
  );
}

/** Access all voice features from any child component */
export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error("useVoice must be used inside <VoiceProvider>");
  return ctx;
}

/* ─────────────────────────────────────────────────────────────────────
   7.  UI COMPONENTS
───────────────────────────────────────────────────────────────────── */

/* ── 7a. Animated Waveform ── */
function Waveform({ color = "#69f0ae", count = 7, style = {} }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, height: 22, ...style }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 4,
            borderRadius: 2,
            background: color,
            animation: `fasalWave 0.6s ease-in-out ${(i * 0.08).toFixed(2)}s infinite alternate`,
            height: [6, 12, 18, 14, 18, 10, 6][i] ?? 10,
          }}
        />
      ))}
    </div>
  );
}

/* ── 7b. Toast Notification ── */
function VoiceToast() {
  const { toast } = useVoice();
  if (!toast) return null;
  return (
    <div style={styles.toast}>
      {toast}
    </div>
  );
}

/* ── 7c. TTS Speaking Strip ── */
function TTSSpeakingStrip() {
  const { isSpeaking, transcript } = useVoice();
  if (!isSpeaking) return null;
  return (
    <div style={styles.ttsBanner}>
      <Waveform color="rgba(255,255,255,0.8)" count={5} />
      <span style={{ fontSize: "0.82rem", fontWeight: 700, margin: "0 10px" }}>
        🔊 {transcript?.substring(0, 40) || "Speaking…"}
      </span>
      <Waveform color="rgba(255,255,255,0.8)" count={5} />
    </div>
  );
}

/* ── 7d. Listening Banner ── */
function ListeningBanner() {
  const { isListening, interimText } = useVoice();
  if (!isListening) return null;
  return (
    <div style={styles.listeningBanner}>
      <Waveform color="#69f0ae" count={7} />
      <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)", fontWeight: 600, marginTop: 6 }}>
        🎙️ Listening…
      </div>
      <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem", textAlign: "center", maxWidth: 260, minHeight: 22 }}>
        {interimText || "Speak a command…"}
      </div>
    </div>
  );
}

/* ── 7e. Floating Action Button ── */
function VoiceFAB() {
  const { isListening, toggleListening } = useVoice();
  return (
    <button
      onClick={toggleListening}
      title={isListening ? "Stop listening" : "Voice Navigation"}
      style={{
        ...styles.fab,
        background: isListening
          ? "linear-gradient(135deg,#b71c1c,#c62828,#ef5350)"
          : "linear-gradient(135deg,#1b5e20,#2e7d32,#43a047)",
        animation: isListening ? "fabPulseRed 1s ease-out infinite" : "fabPulseGreen 3s ease-in-out infinite",
      }}
      aria-label={isListening ? "Stop voice navigation" : "Start voice navigation"}
    >
      {isListening
        ? <Waveform color="rgba(255,255,255,0.9)" count={5} />
        : <span style={{ fontSize: "1.5rem" }}>🎙️</span>
      }
    </button>
  );
}

/* ── 7f. Command Tile ── */
function CommandTile({ icon, label, sub, onClick }) {
  return (
    <button onClick={onClick} style={styles.commandTile}>
      <span style={{ fontSize: "1.4rem" }}>{icon}</span>
      <div style={{ flex: 1, textAlign: "left" }}>
        <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#2e7d32", lineHeight: 1.3 }}>
          {label}
        </div>
        <div style={{ fontSize: "0.7rem", color: "#80a07d", marginTop: 2 }}>{sub}</div>
      </div>
    </button>
  );
}

/* ── 7g. Language Chip ── */
function LangChip({ code }) {
  const { lang, setLang, showToast } = useVoice();
  const info = LANGUAGES[code];
  const active = lang === code;
  return (
    <button
      onClick={() => { setLang(code); showToast(`🌐 Language: ${info.name}`); }}
      style={{
        ...styles.langChip,
        background: active ? "#2e7d32" : "#e8f5e9",
        color: active ? "#fff" : "#2e7d32",
        border: `1.5px solid ${active ? "#2e7d32" : "transparent"}`,
      }}
    >
      {info.flag} {info.name}
    </button>
  );
}

/* ── 7h. Voice Commands Panel ── */
function VoiceCommandPanel() {
  const { isPanelOpen, setIsPanelOpen, execCommand, startListening, showToast } = useVoice();
  if (!isPanelOpen) return null;

  const navCmds = [
    { icon: "🏠", label: "Home / होम",          sub: '"home" · "होम"',       cmd: "home" },
    { icon: "📸", label: "Report Damage",         sub: '"report" · "नुकसान"',  cmd: "report" },
    { icon: "📋", label: "My Claims / दावे",      sub: '"claims" · "दावे"',    cmd: "claims" },
    { icon: "🌿", label: "Advisory / सलाह",       sub: '"advisory" · "सलाह"',  cmd: "advisory" },
    { icon: "📞", label: "Helpline / हेल्पलाइन",  sub: '"help" · "मदद"',       cmd: "helpline" },
    { icon: "🛰️", label: "Satellite Map",          sub: '"satellite" · "NDVI"', cmd: "satellite" },
    { icon: "🌱", label: "Register Crop / फसल",   sub: '"crop" · "फसल"',       cmd: "crop" },
    { icon: "◀️", label: "Go Back / वापस",        sub: '"back" · "वापस"',      cmd: "back" },
  ];

  return (
    <div style={styles.panelBackdrop} onClick={() => setIsPanelOpen(false)}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        {/* Handle bar */}
        <div style={styles.panelHandle} />

        {/* Header */}
        <div style={styles.panelHeader}>
          <span style={{ fontWeight: 800, fontSize: "1rem", color: "#1b2e1b" }}>
            🎙️ Voice Commands · आवाज़ कमांड
          </span>
          <button onClick={() => setIsPanelOpen(false)} style={styles.closeBtn}>✕</button>
        </div>

        {/* Start Listening Button */}
        <div style={{ padding: "12px 20px 0" }}>
          <button
            onClick={() => { setIsPanelOpen(false); startListening(); }}
            style={styles.listenBtn}
          >
            🎙️ Start Listening / बोलना शुरू करें
          </button>
        </div>

        {/* Navigation Commands */}
        <div style={styles.panelSection}>
          <div style={styles.panelSectionLabel}>📱 Navigation / नेविगेशन</div>
          <div style={styles.commandGrid}>
            {navCmds.map((c) => (
              <CommandTile
                key={c.cmd}
                icon={c.icon}
                label={c.label}
                sub={c.sub}
                onClick={() => { setIsPanelOpen(false); execCommand(c.cmd); }}
              />
            ))}
          </div>
        </div>

        {/* Language selector */}
        <div style={{ ...styles.panelSection, borderTop: "1px solid #f0f0f0", paddingTop: 12, paddingBottom: 4 }}>
          <div style={styles.panelSectionLabel}>🌐 Voice Language</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.keys(LANGUAGES).map((code) => (
              <LangChip key={code} code={code} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   8.  EXPORTED COMPOSITE COMPONENT — drop this inside VoiceProvider
───────────────────────────────────────────────────────────────────── */

/**
 * Drop <VoiceAssistant /> anywhere inside <VoiceProvider>.
 * It renders: FAB + Toast + Listening Banner + TTS Strip + Command Panel.
 */
export function VoiceAssistant({ showPanel = true }) {
  const { setIsPanelOpen } = useVoice();
  return (
    <>
      {/* Inject keyframe animations */}
      <style>{KEYFRAMES}</style>

      {/* TTS speaking indicator */}
      <TTSSpeakingStrip />

      {/* Voice command toast */}
      <VoiceToast />

      {/* Active listening banner */}
      <ListeningBanner />

      {/* Floating mic button — long-press opens panel, tap to listen */}
      <VoiceFAB />

      {/* Slide-up command panel */}
      {showPanel && <VoiceCommandPanel />}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   9.  EXAMPLE USAGE COMPONENT
───────────────────────────────────────────────────────────────────── */

/**
 * Standalone demo — shows how to wire VoiceProvider + VoiceAssistant
 * into your existing FasalBima screen router.
 */
export function FasalBimaVoiceDemo() {
  const [screen, setScreen] = useState("screen-home");
  const [lang, setLang] = useState("hi");
  const historyRef = useRef([]);

  const handleNavigate = (screenId) => {
    historyRef.current.push(screen);
    setScreen(screenId);
  };
  const handleBack = () => {
    const prev = historyRef.current.pop() ?? "screen-home";
    setScreen(prev);
  };

  const SCREEN_LABELS = {
    "screen-home":      "🏠 Home",
    "screen-report":    "📸 Report Damage",
    "screen-claims":    "📋 My Claims",
    "screen-advisory":  "🌿 Advisory",
    "screen-helpline":  "📞 Helpline",
    "screen-satellite": "🛰️ Satellite Map",
    "screen-crop":      "🌱 Register Crop",
  };

  return (
    <VoiceProvider language={lang} onNavigate={handleNavigate} onBack={handleBack}>
      <div style={{ maxWidth: 400, margin: "0 auto", minHeight: "100vh", background: "#f0f7f0", fontFamily: "sans-serif" }}>
        {/* Demo screen indicator */}
        <div style={{ background: "linear-gradient(135deg,#1b5e20,#2e7d32)", color: "#fff", padding: "16px 20px" }}>
          <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{SCREEN_LABELS[screen]}</div>
          <div style={{ fontSize: "0.78rem", opacity: 0.8, marginTop: 4 }}>
            FasalBima · Voice Navigation Demo
          </div>
        </div>

        {/* Language selector */}
        <div style={{ padding: "12px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(LANGUAGES).map(([code, info]) => (
            <button
              key={code}
              onClick={() => setLang(code)}
              style={{
                padding: "6px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                background: lang === code ? "#2e7d32" : "#e8f5e9",
                color: lang === code ? "#fff" : "#2e7d32",
                fontWeight: 700, fontSize: "0.8rem",
              }}
            >
              {info.flag} {info.name}
            </button>
          ))}
        </div>

        {/* Instructions */}
        <div style={{ padding: "0 16px 80px" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 4px 16px rgba(0,0,0,0.07)" }}>
            <h3 style={{ color: "#2e7d32", marginBottom: 12 }}>🎙️ Voice Commands</h3>
            {Object.entries(VOICE_COMMANDS).map(([cmd, kws]) => (
              <div key={cmd} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: "0.88rem" }}>
                <span style={{ fontWeight: 700, minWidth: 80, color: "#2e7d32" }}>{cmd}</span>
                <span style={{ color: "#666" }}>{kws.slice(0, 4).join(" · ")}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Voice assistant overlay components */}
        <VoiceAssistant />
      </div>
    </VoiceProvider>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   10. STYLES
───────────────────────────────────────────────────────────────────── */

const styles = {
  fab: {
    position: "fixed",
    bottom: 88,
    right: 18,
    zIndex: 200,
    width: 62,
    height: 62,
    borderRadius: "50%",
    border: "none",
    color: "#fff",
    fontSize: "1.5rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 6px 24px rgba(46,125,50,0.5)",
    transition: "all 0.25s cubic-bezier(.4,0,.2,1)",
  },
  toast: {
    position: "fixed",
    top: 68,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 300,
    background: "rgba(15,40,20,0.93)",
    color: "#fff",
    padding: "11px 20px",
    borderRadius: 50,
    fontSize: "0.88rem",
    fontWeight: 600,
    whiteSpace: "normal",
    textAlign: "center",
    maxWidth: "88vw",
    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.15)",
    animation: "toastIn 0.25s ease",
  },
  ttsBanner: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 201,
    background: "linear-gradient(90deg,#1b5e20,#2e7d32)",
    color: "#fff",
    padding: "8px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 12px rgba(46,125,50,0.4)",
    animation: "slideDown 0.3s ease",
  },
  listeningBanner: {
    position: "fixed",
    bottom: 160,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 199,
    background: "rgba(15,40,20,0.92)",
    borderRadius: 20,
    padding: "14px 24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
    border: "1px solid rgba(255,255,255,0.1)",
    backdropFilter: "blur(12px)",
    animation: "bannerIn 0.3s ease",
  },
  panelBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 250,
    background: "rgba(0,0,0,0.55)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "flex-end",
    animation: "fadeIn 0.2s ease",
  },
  panel: {
    width: "100%",
    maxWidth: 480,
    margin: "0 auto",
    background: "#fff",
    borderRadius: "28px 28px 0 0",
    maxHeight: "82vh",
    overflowY: "auto",
    paddingBottom: 28,
    boxShadow: "0 -8px 48px rgba(0,0,0,0.25)",
    animation: "sheetUp 0.35s cubic-bezier(.4,0,.2,1)",
  },
  panelHandle: {
    width: 48,
    height: 5,
    background: "#dee2e6",
    borderRadius: 3,
    margin: "14px auto 0",
  },
  panelHeader: {
    padding: "14px 20px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid #f0f0f0",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: "none",
    background: "#f0f0f0",
    color: "#555",
    fontSize: "1rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  listenBtn: {
    display: "block",
    width: "100%",
    padding: "15px",
    background: "linear-gradient(135deg,#1b5e20,#2e7d32)",
    color: "#fff",
    border: "none",
    borderRadius: 50,
    fontSize: "1rem",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(46,125,50,0.4)",
  },
  panelSection: {
    padding: "12px 20px 8px",
  },
  panelSectionLabel: {
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "#aaa",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    marginBottom: 10,
  },
  commandGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },
  commandTile: {
    background: "#f8faf8",
    border: "1.5px solid #e8f5e9",
    borderRadius: 12,
    padding: "10px 12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
    transition: "all 0.18s",
    textAlign: "left",
  },
  langChip: {
    padding: "7px 14px",
    borderRadius: 50,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "0.82rem",
    transition: "all 0.18s",
  },
};

/* ─────────────────────────────────────────────────────────────────────
   11. KEYFRAME ANIMATIONS (injected as <style>)
───────────────────────────────────────────────────────────────────── */

const KEYFRAMES = `
@keyframes fasalWave {
  from { transform: scaleY(1); }
  to   { transform: scaleY(0.25); }
}
@keyframes fabPulseGreen {
  0%,100% { box-shadow: 0 6px 24px rgba(46,125,50,0.5), 0 0 0 0   rgba(46,125,50,0.4); }
  50%      { box-shadow: 0 8px 32px rgba(46,125,50,0.6), 0 0 0 10px rgba(46,125,50,0.08); }
}
@keyframes fabPulseRed {
  0%   { box-shadow: 0 6px 24px rgba(198,40,40,0.55), 0 0 0 0   rgba(198,40,40,0.5); }
  70%  { box-shadow: 0 6px 24px rgba(198,40,40,0.3),  0 0 0 18px rgba(198,40,40,0); }
  100% { box-shadow: 0 6px 24px rgba(198,40,40,0.55), 0 0 0 0   rgba(198,40,40,0); }
}
@keyframes toastIn {
  from { opacity:0; transform: translateX(-50%) translateY(-8px); }
  to   { opacity:1; transform: translateX(-50%) translateY(0); }
}
@keyframes sheetUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
@keyframes bannerIn {
  from { opacity:0; transform: translateX(-50%) translateY(10px); }
  to   { opacity:1; transform: translateX(-50%) translateY(0); }
}
@keyframes slideDown {
  from { transform: translateY(-100%); }
  to   { transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity:0; }
  to   { opacity:1; }
}
`;

export default VoiceAssistant;
