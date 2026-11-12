const { detectLanguageAI } = require("./langDetectAI");

const NAMES = {
  en: "English",
  hi: "Hindi, written in Devanagari script",
};

// Suggestion buttons hamesha English bhejte hain: inse language mat badlo
const CANNED = /^(start an? .+ (game|challenge)|tell me a (riddle|joke)|draw something for me|play a poem)$/i;

// Sirf AI fail/timeout hone par kaam aata hai
const HINGLISH_HINT = /\b(hai|hain|kya|kyun|kaise|kahan|suno|sunao|batao|bolo|ek|mujhe|mera|meri|tum|aap|nahi|haan|acha|accha|karo|khelo|chalo|kahani|chutkula|jawab|sawaal|bahut|abhi|phir|dikhao|samjhao)\b/i;

function quickGuess(t) {
  return HINGLISH_HINT.test(t) ? "hi" : null;
}

// "Hindi mein batao" / "speak in English"
function explicitRequest(text) {
  const t = text.toLowerCase();
  if (/how (do|to) (you )?say|translate|word for|meaning of/.test(t)) return null;
  const m =
    t.match(/\b(hindi|english|hinglish)\s*(mein|mei|me|main)\b/) ||
    t.match(/\b(?:in|to)\s+(hindi|english|hinglish)\b/);
  return m ? { hindi: "hi", english: "en", hinglish: "hinglish" }[m[1]] : null;
}

// Hinglish ko hamesha "hi" (Devanagari) bana do
const toFinal = (l) => (l === "hinglish" ? "hi" : l);

async function resolveLanguage(text, prev) {
  const t = String(text || "").trim();

  // 1) Explicit request: "Hindi mein batao"
  const explicit = explicitRequest(t);
  if (explicit) return toFinal(explicit);

  // 2) Suggestion buttons: language mat badlo
  if (CANNED.test(t)) return prev || "en";

  // 3) Devanagari mila to seedha Hindi, AI call ki zaroorat nahi
  if (/[\u0900-\u097F]/.test(t)) return "hi";

  // 4) Bahut chhota message (A, 5, lion): purani language
  if (!/[A-Za-z]/.test(t) || t.length <= 3) return prev || "en";

  // 5) AI detection, fail ho to quick guess
  let lang;
  try {
    lang = await detectLanguageAI(t, prev);
  } catch (e) {
    console.warn("AI lang detect failed, using quick guess:", e.message);
    lang = quickGuess(t);
  }

  return toFinal(lang || prev || "en");
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