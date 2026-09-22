const { chatModel } = require("../../rag/ai");


async function askAIForJSON(instructionText, conversationTurns = []) {
  const result = await chatModel.generateContent({
    contents: [
      ...conversationTurns,
      {
        role: "user",
        parts: [{ text: instructionText }],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const raw = result.response.text();

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function classifyAndReply({
  userQuestion,
  riddleQuestion,
  riddleAnswer,
  hintFact,
  conversationTurns,
}) {
  const instructionText = `
You are Kikoo's kids riddle-game assistant. You already know the correct answer.

Current riddle: "${riddleQuestion}"
Correct answer (secret — only reveal it when the rules below say to): "${riddleAnswer}"
A hint fact you may use if needed: ${hintFact}

The child just said: "${userQuestion}"

Decide the child's intent — choose exactly ONE from this list:
- "correct_answer": their message correctly answers the riddle (accept close matches, synonyms, minor spelling mistakes)
- "wrong_answer": they attempted an answer but it's incorrect
- "give_up": they are giving up or asking YOU to reveal the answer
- "hint_request": they are asking for a hint or clue
- "repeat_request": they didn't understand and want the riddle repeated
- "language_change": they want the SAME riddle repeated in a different language/style
- "new_riddle_request": they explicitly want a different/new riddle instead of this one
- "other": anything else

Then write a short, warm, child-friendly "reply" in the SAME language/style as the child's message, using 1-2 emojis.

- correct_answer: confirm they're right, state the answer, celebrate, ask if they want another riddle or something else fun.
- wrong_answer: encourage warmly, do NOT reveal the answer, ask if they'd like a hint or the riddle repeated.
- give_up: kindly reveal the correct answer, then ask if they want another riddle.
- hint_request: give the hint fact above, without revealing the full answer.
- repeat_request / language_change: repeat or rephrase the riddle QUESTION only — never reveal the answer.
- new_riddle_request: just say something short like "Sure, let's try a new one!" — do not invent a riddle here.
- other: respond briefly and naturally, then gently steer back to the riddle game.

Respond ONLY with JSON:
{"intent": "correct_answer|wrong_answer|give_up|hint_request|repeat_request|language_change|new_riddle_request|other", "reply": "..."}
`;

  const parsed = await askAIForJSON(
    instructionText,
    conversationTurns
  );

  return (
    parsed || {
      intent: "other",
      reply: "Oops, my robot brain got confused! Can you say that in a different way?",
    }
  );
}

module.exports = {
  classifyAndReply,
};