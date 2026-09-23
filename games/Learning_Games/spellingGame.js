const fs = require("fs");
const path = require("path");

const WORDS_FILE = path.join(__dirname, "spellingWords.json");
const words = JSON.parse(fs.readFileSync(WORDS_FILE, "utf-8"));

const START_SPELLING_TRIGGERS = ["spelling challenge", "spell the word", "spelling game"];

function isStartSpellingRequest(text) {
  const lower = text.toLowerCase();
  return START_SPELLING_TRIGGERS.some((k) => lower.includes(k));
}

function pickWord(usedWords = []) {
  const available = words.filter((w) => !usedWords.includes(w));
  const pool = available.length > 0 ? available : words;
  return pool[Math.floor(Math.random() * pool.length)];
}

function checkSpelling(userText, correctWord) {
  return userText.trim().toLowerCase() === correctWord.toLowerCase();
}

module.exports = { isStartSpellingRequest, pickWord, checkSpelling };