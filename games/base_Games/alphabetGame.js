const START_TRIGGERS = ["alphabet game", "alphabet"];

function isStartAlphabetRequest(text) {
  const lower = text.toLowerCase();
  return START_TRIGGERS.some((k) => lower.includes(k));
}

function nextLetter(current) {
  const code = current.toUpperCase().charCodeAt(0);
  return code >= 90 ? "A" : String.fromCharCode(code + 1); // wraps Z -> A
}

// Loose check: accepts any answer starting with the right letter — this
// game has no single "correct" word, so we don't reject creative answers.
function startsWithLetter(userText, letter) {
  return userText.trim().toLowerCase().startsWith(letter.toLowerCase());
}

module.exports = { isStartAlphabetRequest, nextLetter, startsWithLetter };