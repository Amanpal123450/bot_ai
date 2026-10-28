const NAMES = {
  en: "English",
  hi: "Hindi, written in Devanagari script",
  hinglish: 'Hinglish (Hindi written in Roman/English letters, e.g. "Wah! Tumne sahi jawab diya!"; never Devanagari, never pure English)',
};

const toSet = (s) => new Set(s.split(/\s+/));
const HINGLISH = toSet("hai hain kya kyun kaise kahan kab kaun kitna mujhe mera meri mere tum tumhe aap aapka ye wo aur nahi nahin haan acha theek batao bolo sunao dikhao karo kar karna chalo khelo samjhao dobara phir abhi bahut thoda kuch koi sab bhi mein mei jawab sawaal");
const ENGLISH = toSet("the is are was what who how why when where can will does did you your me my tell give show play start want please and but of in on for with about this that it game quiz joke story");

// Suggestion buttons hamesha English bhejte hain: inse language mat badlo
const CANNED = /^(start an? .+ (game|challenge)|tell me a (riddle|joke)|draw something for me|play a poem)$/i;

function detect(text) {
  const deva = (text.match(/[\u0900-\u097F]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  const other = (text.match(/[^\u0000-\u024F\u0900-\u097F\u2000-\u2BFF\s]/gu) || []).length; // Tamil, Arabic, Chinese...
  if (deva > latin && deva >= other) return "hi";
  if (other > latin) return "auto";   // koi aur language: "user ki language mein hi jawab do"

  const tokens = (text.toLowerCase().match(/[a-z']+/g) || []).filter((t) => t.length > 1 || t === "i");
  let e = 0, h = 0;
  for (const t of tokens) { if (HINGLISH.has(t)) h++; else if (ENGLISH.has(t)) e++; }
  const n = tokens.length;
  if (h >= 2 && h >= e) return "hinglish";
  if (h >= 1 && e === 0 && n <= 4) return "hinglish";
  if (e >= 2 && e > h) return "en";
  if (e >= 1 && h === 0 && n >= 3) return "en";
  return null;   // chhota/neutral message (A, 5, lion...) -> purani language
}

// "Hindi mein batao" / "speak in English"
function explicitRequest(text) {
  const t = text.toLowerCase();
  if (/how (do|to) (you )?say|translate|word for|meaning of/.test(t)) return null;
  const m = t.match(/\b(hindi|english|hinglish)\s*(mein|mei|me|main)\b/) || t.match(/\b(?:in|to)\s+(hindi|english|hinglish)\b/);
  return m ? { hindi: "hi", english: "en", hinglish: "hinglish" }[m[1]] : null;
}

function resolveLanguage(text, prev) {
  const t = String(text || "").trim();
  // const lang = ... (purana)
  const lang = explicitRequest(t) || (CANNED.test(t) ? prev : detect(t)) || prev || "en";

  // Hinglish mein pucha to jawab Hindi (Devanagari) mein
  return lang === "hinglish" ? "hi" : lang;
}

function languageDirective(lang) {
  const name = NAMES[lang] || "the same language the child is writing in";
  return `
LANGUAGE RULE (highest priority; overrides any other instruction about language, including "match the child's language/tone"):
- Reply in: ${name}.
- Write EVERY user-facing word (replies, questions, options, hints, feedback, game instructions) in this language, even if the child's latest message is a single word, a number, or an option letter (A/B/C), and even if the context text is in another language.
- Never switch language on your own; the system updates it when the child changes language.
- Keep names (Kikoo), emojis and numbers as they are. If you output JSON, keep keys and fixed values exactly as specified.
`;
}

module.exports = { resolveLanguage, languageDirective };