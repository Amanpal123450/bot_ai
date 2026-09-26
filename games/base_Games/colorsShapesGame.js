const questions = [
  { question: "What color is a banana?", answer: "yellow" },
  { question: "What color is the sky on a sunny day?", answer: "blue" },
  { question: "What color is grass?", answer: "green" },
  { question: "Which shape has 3 sides?", answer: "triangle" },
  { question: "Which shape has 4 equal sides?", answer: "square" },
  { question: "Which shape has no corners at all?", answer: "circle" },
  { question: "What color is a strawberry?", answer: "red" },
  { question: "What color do you get by mixing blue and yellow?", answer: "green" },
];

const START_TRIGGERS = ["colors and shapes", "colours and shapes", "colors game", "shapes game", "color and shape"];

function isStartColorsShapesRequest(text) {
  const lower = text.toLowerCase();
  return START_TRIGGERS.some((k) => lower.includes(k));
}

function pickQuestion(askedIndexes = []) {
  const available = questions.map((_, i) => i).filter((i) => !askedIndexes.includes(i));
  const pool = available.length > 0 ? available : questions.map((_, i) => i);
  const index = pool[Math.floor(Math.random() * pool.length)];
  return { index, item: questions[index] };
}

function checkAnswer(userText, correctAnswer) {
  return userText.trim().toLowerCase().includes(correctAnswer.toLowerCase());
}

module.exports = { isStartColorsShapesRequest, pickQuestion, checkAnswer };