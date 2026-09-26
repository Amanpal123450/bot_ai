const fs = require("fs");
const path = require("path");

// const QUIZ_FILE = path.join(__dirname, "..", "knowledge-base", "quiz.json");
const QUIZ_FILE = path.join(__dirname, "quiz.json");
const quizData = JSON.parse(fs.readFileSync(QUIZ_FILE, "utf-8"));

const CATEGORIES = Object.keys(quizData); // ["animals", "space", "dinosaurs", "general"]

// Entry trigger only — low stakes, simple keyword check is fine here
// (same pattern as riddleGame's isStartRiddleRequest).
const START_QUIZ_TRIGGERS = ["quiz", "quiz game", "qui"];

function isStartQuizRequest(text) {
  const lower = text.toLowerCase();
  return START_QUIZ_TRIGGERS.some((k) => lower.includes(k));
}

// Picks 5 questions — from one category, or mixed across all categories.
function buildRound(category) {
  let pool;
  if (category && quizData[category]) {
    pool = quizData[category].map((q) => ({ ...q, category }));
  } else {
    pool = CATEGORIES.flatMap((cat) => quizData[cat].map((q) => ({ ...q, category: cat })));
  }
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 5);
}

// Builds 3 MCQ options (A/B/C): correct answer + 2 distractors from the
// same category, so wrong options are still plausible/related.
function buildOptions(correctAnswer, category) {
  const sameCategory = quizData[category] || [];
  const otherAnswers = sameCategory
    .map((q) => q.answer)
    .filter((a) => a.toLowerCase() !== correctAnswer.toLowerCase());

  const distractors = [...otherAnswers].sort(() => Math.random() - 0.5).slice(0, 2);
  while (distractors.length < 2) distractors.push("None of these");

  const options = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);
  const labels = ["A", "B", "C"];
  return options.map((text, i) => ({ label: labels[i], text }));
} 

// Deterministic — MCQ answers are unambiguous (a letter or exact option text),
// so this never needs AI judgment, unlike open-ended riddle/quiz answers.
function checkMCQAnswer(userText, options, correctAnswer) {
  const lower = userText.trim().toLowerCase();
  const byLetter = options.find((o) => o.label.toLowerCase() === lower);
  if (byLetter) return byLetter.text.toLowerCase() === correctAnswer.toLowerCase();

  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  return normalize(userText).includes(normalize(correctAnswer)) ||
         normalize(correctAnswer).includes(normalize(userText));
}

function isPerfectScore(correctCount) {
  return correctCount === 5;
}

module.exports = {
  CATEGORIES,
  isStartQuizRequest,
  buildRound,
  buildOptions,
  checkMCQAnswer,
  isPerfectScore,
};