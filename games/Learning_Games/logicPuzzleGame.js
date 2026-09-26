const fs = require("fs");
const path = require("path");

const PUZZLES_FILE = path.join(__dirname, "logicPuzzles.json");
const puzzles = JSON.parse(fs.readFileSync(PUZZLES_FILE, "utf-8"));

const START_TRIGGERS = [
  "start logic puzzle",
  "start a logic puzzle",
  "start logic puzzles",
  "play logic puzzle",
  "play a logic puzzle",
  "play logic puzzles",
  "start brain teaser",
  "start a brain teaser",
  "play brain teaser",
  "start number pattern",
];

function isStartLogicPuzzleRequest(text) {
  const lower = String(text).toLowerCase().trim();

  return START_TRIGGERS.some((trigger) => {
    return lower === trigger || lower.includes(trigger);
  });
}

function pickPuzzle(askedIndexes = []) {
  const available = puzzles
    .map((_, i) => i)
    .filter((i) => !askedIndexes.includes(i));

  const pool =
    available.length > 0
      ? available
      : puzzles.map((_, i) => i);

  const index = pool[Math.floor(Math.random() * pool.length)];

  return {
    index,
    puzzle: puzzles[index],
  };
}

function checkAnswer(userAnswer, correctAnswer) {
  const user = String(userAnswer).trim().toLowerCase();
  const correct = String(correctAnswer).trim().toLowerCase();

  return user === correct || user.includes(correct);
}

module.exports = {
  puzzles,
  isStartLogicPuzzleRequest,
  pickPuzzle,
  checkAnswer,
};