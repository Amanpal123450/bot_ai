const { chatModel } = require("../ai");

async function classifyIsAnswerAttempt({ userQuestion, currentQuestion, conversationTurns }) {
  const instructionText = `
The child is playing a game. The current question/prompt is: "${currentQuestion}"
The child just said: "${userQuestion}"

Decide: is this an ATTEMPT TO ANSWER the current question (even if wrong, a
guess, or "I don't know")? Or is it a DIFFERENT, unrelated question or
comment (e.g. asking about Kikoo, a general knowledge question, random chat)
that has nothing to do with answering?

Respond ONLY with JSON: {"isAnswerAttempt": true|false}
`;
  const result = await chatModel.generateContent({
    contents: [...conversationTurns, { role: "user", parts: [{ text: instructionText }] }],
    generationConfig: { responseMimeType: "application/json", thinkingConfig: { thinkingLevel: "minimal" } },
  });
  try {
    return JSON.parse(result.response.text()).isAnswerAttempt !== false;
  } catch {
    return true; // agar confuse ho, safe side pe answer hi maan lo
  }
}

module.exports = {
    classifyIsAnswerAttempt
};
