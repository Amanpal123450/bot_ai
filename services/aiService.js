const { chatModel } = require("../ai");
const { getStream } = require("./streamContext");

const FAST = { thinkingConfig: { thinkingLevel: "minimal" } };

async function generateAnswer(input) {
  const request =
    typeof input === "string"
      ? { contents: [{ role: "user", parts: [{ text: input }] }] }
      : input;
  const req = { ...request, generationConfig: { ...FAST, ...(request.generationConfig || {}) } };

  const ctx = getStream();
  if (!ctx || ctx.used) {
    const result = await chatModel.generateContent(req);
    return result.response.text().trim();
  }

  ctx.used = true; // is request mein pehla call hi stream hoga
  const { stream } = await chatModel.generateContentStream(req);
  let full = "";
  for await (const chunk of stream) {
    const t = chunk.text();
    if (t) {
      full += t;
      ctx.onDelta?.(t);
    }
  }
  ctx.onEnd?.();
  return full.trim();
}

async function phraseReply(instruction) {
  return generateAnswer(instruction);
}

module.exports = { phraseReply, generateAnswer };