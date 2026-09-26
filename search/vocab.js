const VOCAB_TRIGGERS = [
  "vocabulary builder",
  "word of the day",
];

function isVocabRequest(text) {
  return VOCAB_TRIGGERS.some((k) =>
    text.toLowerCase().includes(k)
  );
}

module.exports = {
  isVocabRequest,
};