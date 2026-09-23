const START_MATH_TRIGGERS = ["math game", "beat the robot", "number puzzle", "times table", "tables"];

function isStartMathRequest(text) {
  const lower = text.toLowerCase();
  return START_MATH_TRIGGERS.some((k) => lower.includes(k));
}

// Fully deterministic — random arithmetic problem within safe kid-friendly ranges.
function generateProblem() {
  const ops = ["+", "-", "x"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a = Math.floor(Math.random() * 12) + 1;
  let b = Math.floor(Math.random() * 12) + 1;

  if (op === "-" && b > a) [a, b] = [b, a]; // avoid negative answers

  let answer;
  if (op === "+") answer = a + b;
  else if (op === "-") answer = a - b;
  else answer = a * b;

  return { question: `${a} ${op} ${b}`, answer };
}

function checkMathAnswer(userText, correctAnswer) {
  const num = parseInt(userText.replace(/[^0-9-]/g, ""), 10);
  return num === correctAnswer;
}

module.exports = { isStartMathRequest, generateProblem, checkMathAnswer };