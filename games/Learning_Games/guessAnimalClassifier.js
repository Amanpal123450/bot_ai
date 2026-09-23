const { chatModel } = require("../../rag/ai");

const KNOWN_ATTRIBUTES = ["flies", "livesInWater", "hasFourLegs", "isPet", "eatsMeat"];

async function classifyGuessAnimalMessage({ userQuestion, conversationTurns }) {
  const instructionText = `
The child is playing "Guess the Animal" (20 Questions). They can ask yes/no
questions about a secret animal, or try to guess its name directly.

Known attributes you can check: ${KNOWN_ATTRIBUTES.join(", ")}
(flies, livesInWater, hasFourLegs, isPet, eatsMeat)

The child just said: "${userQuestion}"

Decide what they're doing:
- "attribute_question": they're asking a yes/no question that maps to one of the known attributes. Set "attribute" to the matching key.
- "guess": they're guessing the animal's name directly.
- "unmappable_question": a yes/no question that doesn't map to any known attribute.
- "give_up": they want to give up or be told the answer.

Respond ONLY with JSON: {"type": "attribute_question|guess|unmappable_question|give_up", "attribute": "flies|livesInWater|hasFourLegs|isPet|eatsMeat|null"}
`;
  const result = await chatModel.generateContent({
    contents: [...conversationTurns, { role: "user", parts: [{ text: instructionText }] }],
    generationConfig: { responseMimeType: "application/json" },
  });
  try {
    return JSON.parse(result.response.text());
  } catch {
    return { type: "unmappable_question", attribute: null };
  }
}

module.exports = { classifyGuessAnimalMessage };