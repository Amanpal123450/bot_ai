const LABELS = ["A", "B", "C", "D"];

function normalise(value) {
  return String(value ?? "").trim().toLowerCase();
}

function buildOptions(correctAnswer, candidates = []) {
  const correct = String(correctAnswer);
  const unique = [correct, ...candidates.map(String)]
    .filter((value, index, values) => normalise(value) && values.findIndex((v) => normalise(v) === normalise(value)) === index)
    .slice(0, 4);

  // Every game must expose four choices. Numeric fallbacks keep arithmetic
  // questions useful even when there is no natural distractor list.
  for (let offset = 1; unique.length < 4; offset += 1) {
    const numeric = Number(correct);
    const fallback = Number.isFinite(numeric) ? String(Math.max(0, numeric + (offset % 2 ? offset : -offset))) : `${correct}${"x".repeat(offset)}`;
    if (!unique.some((value) => normalise(value) === normalise(fallback))) unique.push(fallback);
  }

  return unique
    .sort(() => Math.random() - 0.5)
    .map((text, index) => ({ label: LABELS[index], text }));
}

function selectedOption(userText, options = []) {
  const input = normalise(userText);
  const letter = input.match(/^([a-d])(?:[).\s]|$)/i)?.[1]?.toUpperCase();
  if (letter) return options.find((option) => option.label === letter) || null;
  return options.find((option) => normalise(option.text) === input) || null;
}

function wordOptions(letter, usedWords = []) {
  const bank = {
    a: ["ant", "apple", "airplane", "astronaut"], b: ["ball", "banana", "book", "butterfly"],
    c: ["cat", "cake", "car", "candle"], d: ["dog", "duck", "drum", "dinosaur"],
    e: ["elephant", "egg", "engine", "eagle"], f: ["fish", "flower", "frog", "fan"],
    g: ["goat", "grape", "guitar", "garden"], h: ["hat", "horse", "house", "helicopter"],
    i: ["ice", "igloo", "insect", "island"], j: ["jam", "jellyfish", "jacket", "juice"],
    k: ["kite", "kangaroo", "king", "key"], l: ["lion", "lemon", "leaf", "lamp"],
    m: ["moon", "monkey", "mango", "mouse"], n: ["nest", "nose", "night", "net"],
    o: ["orange", "owl", "ocean", "octopus"], p: ["pen", "panda", "pizza", "penguin"],
    q: ["queen", "quilt", "question", "quail"], r: ["rainbow", "rabbit", "rocket", "ring"],
    s: ["sun", "star", "snake", "sand"], t: ["tree", "tiger", "train", "table"],
    u: ["umbrella", "uncle", "unicorn", "upstairs"], v: ["van", "violin", "vase", "vegetable"],
    w: ["water", "whale", "window", "watch"], x: ["xylophone", "x-ray", "xerox", "xenon"],
    y: ["yak", "yo-yo", "yarn", "yellow"], z: ["zebra", "zoo", "zipper", "zero"],
  };
  const targetLetter = String(letter).toLowerCase();
  const choices = (bank[targetLetter] || bank.a).filter((word) => !usedWords.includes(word));
  const correct = choices[0] || bank.a[0];

  // A word chain/alphabet question has one intended answer. The remaining
  // buttons deliberately begin with other letters, otherwise every button
  // would be a valid answer and this would not be a real multiple-choice game.
  const distractors = Object.entries(bank)
    .filter(([initial]) => initial !== targetLetter)
    .map(([, words]) => words.find((word) => !usedWords.includes(word)))
    .filter(Boolean)
    .slice(0, 3);

  return buildOptions(correct, distractors);
}

module.exports = { buildOptions, selectedOption, wordOptions };
