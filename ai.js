const { GoogleGenerativeAI } = require("@google/generative-ai");
const AI_CONFIG = require("./config/ai-config");
const { getLang } = require("./services/langContext");
const { languageDirective } = require("./services/language");

const genAI = new GoogleGenerativeAI(AI_CONFIG.apiKey);

const rawChatModel = genAI.getGenerativeModel({
  model: AI_CONFIG.chatModel,
  systemInstruction: AI_CONFIG.systemPrompt,
});

function withLanguage(request) {
  const lang = getLang();
  if (!lang) return request;
  const req =
    typeof request === "string"
      ? { contents: [{ role: "user", parts: [{ text: request }] }] }
      : request;
  if (!req || req.systemInstruction) return request;
  return { ...req, systemInstruction: `${AI_CONFIG.systemPrompt}\n${languageDirective(lang)}` };
}

const chatModel = new Proxy(rawChatModel, {
  get(target, prop) {
    if (prop === "generateContent") return (req, opts) => target.generateContent(withLanguage(req), opts);
    if (prop === "generateContentStream") return (req, opts) => target.generateContentStream(withLanguage(req), opts);
    const v = target[prop];
    return typeof v === "function" ? v.bind(target) : v;
  },
});

const embeddingModel = genAI.getGenerativeModel({
  model: AI_CONFIG.embeddingModel,
});

module.exports = { chatModel, embeddingModel };