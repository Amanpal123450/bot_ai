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


async function classifyQuizCategory({ userQuestion, conversationTurns }) {
  const instructionText = `
You are Kikoo's kids quiz assistant setting up a new quiz round.
Available categories: animals, space, dinosaurs, general (general knowledge), or mixed (a surprise mix of all).

The child just said: "${userQuestion}"

Decide which category they picked — one of: "animals", "space", "dinosaurs", "general", "mixed", or "unclear"
(use "unclear" if their message doesn't clearly indicate a category).

Then write a short, warm "reply" in the child's language/style:
- If a category or "mixed" was understood: confirm it enthusiastically, then ask whether they want
  multiple choice questions (A/B/C) or to type their own answers.
- If "unclear": gently ask again, listing the options: Animals 🐘, Space 🚀, Dinosaurs 🦖, General Knowledge 🌍, or "surprise me" for a mix.
Use 1-2 emojis.

Respond ONLY with JSON: {"category": "animals|space|dinosaurs|general|mixed|unclear", "reply": "..."}
`;
  const parsed = await askAIForJSON(instructionText, conversationTurns);
  return parsed || { category: "unclear", reply: "Which category would you like — Animals 🐘, Space 🚀, Dinosaurs 🦖, or General Knowledge 🌍?" };
}

async function classifyQuizMode({ userQuestion, conversationTurns }) {
  const instructionText = `
You are Kikoo's kids quiz assistant. The child is choosing how they want to answer quiz questions:
either multiple choice (A/B/C options given) or typing their own open answer.

The child just said: "${userQuestion}"

Decide their choice — one of: "mcq", "open", or "unclear".

Then write a short, excited "reply" in the child's language/style confirming we're starting the quiz now
(if mode is mcq or open), or asking again (if unclear — remind them they can pick multiple choice or
type their own answers). Use 1-2 emojis. Do NOT include the actual first question here.

Respond ONLY with JSON: {"mode": "mcq|open|unclear", "reply": "..."}
`;
  const parsed = await askAIForJSON(instructionText, conversationTurns);
  return parsed || { mode: "unclear", reply: "Multiple choice or type your own answer — which do you prefer? 😊" };
}

async function judgeOpenAnswer({
  question,
  correctAnswer,
  userAnswer,
}) {
  const instructionText = `
You are checking a child's quiz answer.

Question: "${question}"
Correct answer: "${correctAnswer}"
Child's answer: "${userAnswer}"

Is the child's answer correct?

Accept close matches, synonyms, and minor spelling mistakes as correct.

Respond ONLY with JSON:
{"correct": true|false}
`;

  const parsed = await askAIForJSON(instructionText);

  return parsed?.correct === true;
}

module.exports = {
  classifyQuizCategory,
  classifyQuizMode,
  judgeOpenAnswer,
};
