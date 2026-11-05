const { chatModel } = require("../ai");
const { getStream } = require("./streamContext");

const FAST = { thinkingConfig: { thinkingLevel: "minimal" }, maxOutputTokens: 200 };

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

  ctx.used = true;
  let full = "";
  try {
    const { stream, response } = await chatModel.generateContentStream(req);
    response.catch(() => {}); // <-- crash rokne wali asli line

    for await (const chunk of stream) {
      const t = chunk.text();
      if (t) {
        full += t;
        ctx.onDelta?.(t);
      }
    }
  } catch (err) {
    console.error("Gemini stream error:", err.message, err.cause || "");
    if (!full) {
      // kuch bhi stream nahi hua: normal call se jawab lo
      const result = await chatModel.generateContent(req);
      full = result.response.text();
    }
    // agar thoda text aa chuka hai to wahi return hoga
  } finally {
    ctx.onEnd?.();
  }
  return full.trim();
}

async function phraseReply(instruction) {
  return generateAnswer(instruction);
}

module.exports = { phraseReply, generateAnswer };