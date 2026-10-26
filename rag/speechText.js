const MAX_SPEECH_CHARS = 1000;
const FIRST_CHUNK_MIN = 25;
const REST_CHUNK_MAX = 220;
const MAX_CHUNKS = 4;

function cleanForSpeech(text) {
  return String(text || "")
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "") // emojis hatao
    .replace(/[*_#`~>]/g, "")                                   // markdown hatao
    .replace(/\\n/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SPEECH_CHARS);
}

function splitForSpeech(text) {
  const clean = cleanForSpeech(text);
  if (!clean) return [];

  const sentences = clean.split(/(?<=[.!?।])\s+/).filter(Boolean);
  if (sentences.length <= 1) return [clean];

  const chunks = [];
  let first = sentences.shift();
  while (first.length < FIRST_CHUNK_MIN && sentences.length) {
    first += " " + sentences.shift();
  }
  chunks.push(first);

  let buf = "";
  for (const s of sentences) {
    if (buf && (buf + " " + s).length > REST_CHUNK_MAX) {
      chunks.push(buf);
      buf = s;
    } else {
      buf = buf ? buf + " " + s : s;
    }
  }
  if (buf) chunks.push(buf);

  while (chunks.length > MAX_CHUNKS) {
    const last = chunks.pop();
    chunks[chunks.length - 1] += " " + last;
  }
  return chunks;
}

module.exports = { cleanForSpeech, splitForSpeech };