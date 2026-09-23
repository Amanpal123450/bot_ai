const START_WORD_CHAIN_TRIGGERS = ["word chain"];

function isStartWordChainRequest(text) {
  const lower = text.toLowerCase();
  return START_WORD_CHAIN_TRIGGERS.some((k) => lower.includes(k));
}

function lastLetter(word) {
  return word.trim().slice(-1).toLowerCase();
}

// Deterministic check: word must start with the required letter, be a
// single real-looking word, and not repeat a word already used.
function checkWordChainMove(userWord, requiredLetter, usedWords) {
  const cleaned = userWord.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (!cleaned) return { valid: false, reason: "empty" };
  if (cleaned[0] !== requiredLetter.toLowerCase()) return { valid: false, reason: "wrong_letter" };
  if (usedWords.includes(cleaned)) return { valid: false, reason: "repeated" };
  return { valid: true, word: cleaned };
}

module.exports = { isStartWordChainRequest, lastLetter, checkWordChainMove };