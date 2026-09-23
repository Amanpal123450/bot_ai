const fs = require("fs");
const path = require("path");

const animals = JSON.parse(fs.readFileSync(path.join(__dirname, "animals.json"), "utf-8"));

const START_TRIGGERS = ["guess the animal", "20 questions"];
const MAX_TRIES = 15;

function isStartGuessAnimalRequest(text) {
  const lower = text.toLowerCase();
  return START_TRIGGERS.some((k) => lower.includes(k));
}

function pickSecretAnimal() {
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return animal;
}

// Deterministic lookup — the ONLY source of truth for yes/no answers.
// AI's job (done in search.js) is just to map the child's free-form
// question to one of these known attribute keys.
function getAttributeValue(animal, attributeKey) {
  if (!(attributeKey in animal)) return null; // unknown attribute
  return animal[attributeKey];
}

function checkGuess(userText, animalName) {
  return userText.trim().toLowerCase().includes(animalName.toLowerCase());
}

module.exports = { isStartGuessAnimalRequest, pickSecretAnimal, getAttributeValue, checkGuess, MAX_TRIES };