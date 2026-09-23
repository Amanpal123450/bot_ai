const fs = require("fs");
const path = require("path");

const PUZZLES_FILE = path.join(__dirname, "logicPuzzles.json");
const puzzles = JSON.parse(fs.readFileSync(PUZZLES_FILE, "utf-8"));

const START_TRIGGERS = ["logic puzzle", "logic puzzles", "brain teaser", "number pattern"];

function isStartLogicPuzzleRequest(text) {
  const lower = text.toLowerCase();
  return START_TRIGGERS.some((k) => lower.includes(k));
}

function pickPuzzle(askedIndexes = []) {
  const available = puzzles.map((_, i) => i).filter((i) => !askedIndexes.includes(i));
  const pool = available.length > 0 ? available : puzzles.map((_, i) => i);
  const index = pool[Math.floor(Math.random() * pool.length)];
  return { index, puzzle: puzzles[index] };
}

module.exports = { puzzles, isStartLogicPuzzleRequest, pickPuzzle };