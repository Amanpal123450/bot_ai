const fs = require("fs");
const path = require("path");

const RIDDLES_FILE = path.join(__dirname, "riddles.json");
const riddles = JSON.parse(fs.readFileSync(RIDDLES_FILE, "utf-8"));

// Only used to decide "should we START a riddle game" when none is active.
// Low stakes, so a simple keyword check here is fine.
const START_RIDDLE_TRIGGERS = ["riddle", "puzzle"];

function isStartRiddleRequest(text) {
  const lower = text.toLowerCase();
  return START_RIDDLE_TRIGGERS.some((k) => lower.includes(k));
}

function pickNewRiddle(askedIndexes = []) {
  const available = riddles.map((_, i) => i).filter((i) => !askedIndexes.includes(i));
  const pool = available.length > 0 ? available : riddles.map((_, i) => i);
  const index = pool[Math.floor(Math.random() * pool.length)];
  return { index, riddle: riddles[index] };
}

// A factual, deterministic hint — grounds the AI so it never invents a wrong hint.
function generateHint(answer) {
  const clean = answer.replace(/\(.*?\)/g, "").trim();
  const firstLetter = clean[0].toUpperCase();
  const letterCount = clean.replace(/\s/g, "").length;
  return `Starts with the letter "${firstLetter}" and has ${letterCount} letters.`;
}

module.exports = { riddles, isStartRiddleRequest, pickNewRiddle, generateHint };