const { chatModel } = require("../../rag/ai");
const { generateAnswer } = require("../../services/aiService");

function buildQuestionFacts(item, answerMode, questionNumber) {
    let facts = `Question ${questionNumber} of 5: "${item.question}"`;
    if (answerMode === "mcq") {
        facts += "\n Options: " + item.options.map((o) => `${o.label}) ${o.text}`).join(", ");
    }
    return facts;
}


async function phraseQuizQuestion({
  userQuestion,
  item,
  answerMode,
  questionNumber,
  conversationTurns,
  introText,
}) {
  const facts = buildQuestionFacts(
    item,
    answerMode,
    questionNumber
  );

  const instruction = `
${introText || `The child just said: "${userQuestion}".`}

Present this quiz question to the child, matching their language/tone.

Do NOT reveal the answer.

${facts}

Keep it short and fun, use 1-2 emojis.

If options are given, list them clearly as (A), (B), (C).
`;

    return generateAnswer({
    contents: [...conversationTurns, { role: "user", parts: [{ text: instruction }] }],
  });

  // return result.response.text().trim();
}


// async function phraseQuizQuestion({ userQuestion, item, answerMode, questionNumber, conversationTurns, introText }) {
//     const facts = buildQuestionFacts(item, answerMode, questionNumber);
//     const instruction = `
// ${introText || `The child just said: "${userQuestion}".`}
// Present this quiz question to the child, matching their language/tone. Do NOT reveal the answer.
// ${facts}
// Keep it short and fun, use 1-2 emojis. If options are given, list them clearly as (A), (B), (C).
// `;
//     return phraseReply.call(null, instruction) && (await chatModel.generateContent({
//         contents: [...conversationTurns, { role: "user", parts: [{ text: instruction }] }],
//     })).response.text().trim();
// }

module.exports = {
  buildQuestionFacts,
  phraseQuizQuestion,
};