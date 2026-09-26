const { chatModel } = require("../../rag/ai");

// Uses AI to understand ANY phrasing — single words, Hindi/Hinglish, full
// sentences — and decides whether the child named something specific to
// draw, or just wants a random drawing idea.
async function classifyDrawingRequest({ userQuestion }) {
  const instructionText = `
A child is asking for something to draw. Their message: "${userQuestion}"

Decide:
- If they mentioned ANY specific thing to draw — even just one word, in any
  language (e.g. "laptop", "ghar", "mummy", "road", "a dragon eating pizza",
  "blue elephant in space") — extract it as a short, simple English drawing
  subject (translate if needed).
- If they did NOT mention anything specific and are just asking for a random
  drawing idea (e.g. "give me a drawing idea", "next idea", "kuch drawing de do",
  "koi bhi drawing"), mark it as generic.

Respond ONLY with JSON:
{"type": "specific"|"generic", "subject": "short English drawing subject, or empty string if generic"}
`;

  const result = await chatModel.generateContent({
    contents: [{ role: "user", parts: [{ text: instructionText }] }],
    generationConfig: {
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: "minimal" }, // keep this fast
    },
  });

  try {
    return JSON.parse(result.response.text());
  } catch {
    return { type: "generic", subject: "" };
  }
}

module.exports = { classifyDrawingRequest };