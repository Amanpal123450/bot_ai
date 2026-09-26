const START_TRIGGERS = ["counting game", "counting"];

function isStartCountingRequest(text) {
  const lower = text.toLowerCase();
  return START_TRIGGERS.some((k) => lower.includes(k));
}

// Simple word-problem style: "I have X balloons and get Y more."
function generateProblem() {
  const a = Math.floor(Math.random() * 5) + 1;
  const b = Math.floor(Math.random() * 5) + 1;
  return {
    question: `I have ${a} balloons and get ${b} more. How many balloons do I have now?`,
    answer: a + b,
  };
}

function checkAnswer(userText, correctAnswer) {
  const num = parseInt(userText.replace(/[^0-9]/g, ""), 10);
  return num === correctAnswer;
}

module.exports = { isStartCountingRequest, generateProblem, checkAnswer };