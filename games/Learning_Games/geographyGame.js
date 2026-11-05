const QUESTIONS = [
  { question: "I have the shape of a high-heeled boot and I am famous for pizza. Which country am I?", answer: "Italy", choices: ["Italy", "India", "Japan", "Brazil"] },
  { question: "Which country has the Eiffel Tower?", answer: "France", choices: ["France", "Egypt", "Canada", "Australia"] },
  { question: "Which country is home to the Taj Mahal?", answer: "India", choices: ["India", "China", "Spain", "Mexico"] },
  { question: "Which country has pyramids and the River Nile?", answer: "Egypt", choices: ["Egypt", "Greece", "Norway", "Argentina"] },
  { question: "Which country is famous for kangaroos?", answer: "Australia", choices: ["Australia", "Germany", "Kenya", "Thailand"] },
  { question: "Which country has Mount Fuji?", answer: "Japan", choices: ["Japan", "Italy", "South Africa", "Peru"] },
];

const START_TRIGGERS = ["geography challenge", "geography game", "geography_game", "geography"];

function isStartGeographyRequest(text) {
  const lower = String(text || "").toLowerCase();
  return START_TRIGGERS.some((trigger) => lower.includes(trigger));
}

function pickQuestion(askedIndexes = []) {
  const available = QUESTIONS.map((_, index) => index).filter((index) => !askedIndexes.includes(index));
  const pool = available.length ? available : QUESTIONS.map((_, index) => index);
  const index = pool[Math.floor(Math.random() * pool.length)];
  return { index, question: QUESTIONS[index] };
}

module.exports = { isStartGeographyRequest, pickQuestion };
