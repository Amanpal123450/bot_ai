const { retrieve } = require("../rag/retrieve");
const { classifyGeneralIntent, isRepeatOrTranslateRequest } = require("../search/generalIntent");
const { phraseReply, generateAnswer } = require("../services/aiService");

async function handleGeneral(userQuestion, history, conversationTurns, gameState) {
  const lastBotMessage = [...history].reverse().find((m) => m.sender !== "user")?.text;

  // RAG search turant shuru (intent check ke saath parallel)
  const matchesPromise = retrieve(userQuestion);
  matchesPromise.catch(() => {});

  // Intent LLM call sirf tab jab message repeat/translate jaisa lage
  const REPEAT_HINT = /\b(hindi|english|hinglish|repeat|again|translate|dobara|phir se|samajh|simple|meaning|explain)\b/i;
  let generalIntent = { type: "new_topic" };
  if (lastBotMessage && (isRepeatOrTranslateRequest(userQuestion) || REPEAT_HINT.test(userQuestion))) {
    generalIntent = await classifyGeneralIntent({ userQuestion, lastBotMessage, conversationTurns });
  }

  if (generalIntent.type === "repeat_or_translate" && lastBotMessage) {
    const answer = await phraseReply(`
The child wants your PREVIOUS message repeated or said in a different
language/style, based on their request: "${userQuestion}".

Your previous message was: "${lastBotMessage}"

Repeat or rephrase THAT SAME message in the language/style they asked for.
Do NOT introduce a new topic, joke, or activity — only restate what you
already said. Keep it short and use 1-2 emojis.
`);
    return { answer, gameState };
  }

  const matches = await matchesPromise;
  const context = matches.map((m) => `From ${m.source}:\n${m.text}`).join("\n\n---\n\n");

  const prompt = `
Use the Context to answer the User.

Rules:
- For Kikoo facts, use only the Context.
- For jokes, poems, stories and creative requests, use relevant Context content.
- Give one short item at a time.
- Keep the response short, friendly and child-safe.
- Reply in the same language/style the user is using.
- If a Kikoo fact is missing from Context, say:
"Sorry, I don't have this information. Please contact Kikoo support at info@kikoo.in."

Context:
${context}

User:
${userQuestion}

Answer:
`;

  const answer = await generateAnswer({
    contents: [...conversationTurns, { role: "user", parts: [{ text: prompt }] }],
  });

  return { answer, gameState: { mode: null } };
}

async function answerOffTopicQuestion({ userQuestion, conversationTurns }) {
  let context = "";
  try {
    const matches = await retrieve(userQuestion);
    context = matches.map((m) => `From ${m.source}:\n${m.text}`).join("\n\n---\n\n");
  } catch {
    context = "";
  }

  return phraseReply(`
The child asked: "${userQuestion}"

Use this Context if it's relevant to a Kikoo-related question (otherwise use
your own general knowledge to answer):
${context || "(no relevant Kikoo context found)"}

Answer ONLY their question, clearly and simply. Do NOT mention any game,
activity, or anything else — just a clean, direct, child-friendly answer.
Keep it short, friendly, use 1-2 emojis.
`);
}

module.exports = {
  handleGeneral,
  answerOffTopicQuestion,
};