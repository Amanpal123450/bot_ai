const TIMEOUT_MS = 4000;

const DETECT_PROMPT = `You detect the language of a child's chat message.
Return ONLY JSON: {"lang":"en"|"hi"|"hinglish"|"auto"|"keep"}

- "en": message is English.
- "hi": Hindi in Devanagari script.
- "hinglish": Hindi written in Roman letters, even if it contains some English words
  (e.g. "kikoo ek joke suno", "mujhe quiz khelna hai", "kya haal hai", "ek kahani sunao").
- "auto": any other language (Tamil, Arabic, Spanish, Chinese...).
- "keep": message is too short/neutral to tell (a single word like "lion", a number, an option letter A/B/C, "ok", emojis, a name).
Judge by the language the user's OWN words are written in, not by the topic.`;

const VALID = new Set(["en", "hi", "hinglish", "auto", "keep"]);

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, rej) => {
    timer = setTimeout(() => rej(new Error("lang-detect timeout")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function detectLanguageAI(text, prevLang) {
  const { chatModel } = require("../ai"); // lazy: circular import se bachne ke liye
  const prompt = `Previous language: ${prevLang || "none"}\nMessage: ${JSON.stringify(text.slice(0, 300))}`;
  const t0 = Date.now();

  const res = await withTimeout(
    chatModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: DETECT_PROMPT, // apna hai, to proxy directive nahi jodega
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 200,
        responseMimeType: "application/json",
      },
    }),
    TIMEOUT_MS
  );

  const raw = res.response.text();
  console.log(`LANG AI ${Date.now() - t0}ms: ${raw}`);
  const { lang } = JSON.parse(raw);
  if (!VALID.has(lang)) throw new Error("bad lang from AI: " + raw);
  return lang === "keep" ? null : lang;
}

async function warmLangDetector() {
  try {
    await detectLanguageAI("hello there friend", null);
    console.log("Lang detector warmed up");
  } catch (e) {
    console.warn("Lang detector warm-up failed:", e.message);
  }
}

module.exports = { detectLanguageAI, warmLangDetector };