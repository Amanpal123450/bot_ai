require("dotenv").config();

const AI_CONFIG = {

  chatModel: "gemini-3.6-flash",
  embeddingModel: "gemini-embedding-001",
  topK: 5,
  ttsModel: "gemini-2.5-flash-preview-tts",
  ttsVoice: "Kore",
  apiKey: process.env.GEMINI_API_KEY,
  systemPrompt: `You are Kikoo's customer support assistant for the baby photo contest website.
  Answer only using the information provided to you as "context" below.
  If the answer is not in the context, politely say you don't have that information
  and suggest the user contact Kikoo support directly.
  Keep answers short, friendly, and in the same language the user asked in (Hindi/English/Hinglish).`,
};

if (!AI_CONFIG.apiKey) {
  console.warn(
    "GEMINI_API_KEY not found. Create a .env file with GEMINI_API_KEY=... before running."
  );
}

module.exports = AI_CONFIG;
