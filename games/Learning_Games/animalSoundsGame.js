const QUESTIONS = [
  { question: "Which animal says 'meow'?", answer: "Cat", choices: ["Cat", "Dog", "Cow", "Duck"] },
  { question: "Which animal says 'woof'?", answer: "Dog", choices: ["Dog", "Lion", "Sheep", "Horse"] },
  { question: "Which animal says 'moo'?", answer: "Cow", choices: ["Cow", "Cat", "Bee", "Frog"] },
  { question: "Which animal says 'quack'?", answer: "Duck", choices: ["Duck", "Pig", "Lion", "Goat"] },
  { question: "Which animal says 'roar'?", answer: "Lion", choices: ["Lion", "Mouse", "Fish", "Rabbit"] },
  { question: "Which animal says 'baa'?", answer: "Sheep", choices: ["Sheep", "Tiger", "Hen", "Elephant"] },
];

const START_TRIGGERS = ["animal sounds", "animal sound", "animal_sounds", "sounds game"];

function isStartAnimalSoundsRequest(text) {
  const lower = String(text || "").toLowerCase();
  return START_TRIGGERS.some((trigger) => lower.includes(trigger));
}

function pickQuestion(askedIndexes = []) {
  const available = QUESTIONS.map((_, index) => index).filter((index) => !askedIndexes.includes(index));
  const pool = available.length ? available : QUESTIONS.map((_, index) => index);
  const index = pool[Math.floor(Math.random() * pool.length)];
  return { index, question: QUESTIONS[index] };
}

module.exports = { isStartAnimalSoundsRequest, pickQuestion };
