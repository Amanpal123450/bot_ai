const { GoogleGenerativeAI } = require("@google/generative-ai");
const AI_CONFIG = require("../config/ai-config");

const genAI = new GoogleGenerativeAI(AI_CONFIG.apiKey);

const chatModel = genAI.getGenerativeModel({
  model: AI_CONFIG.chatModel,
  systemInstruction: AI_CONFIG.systemPrompt,
});

const embeddingModel = genAI.getGenerativeModel({
  model: AI_CONFIG.embeddingModel,
});

module.exports = {
  chatModel,
  embeddingModel,
};