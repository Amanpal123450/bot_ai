const { chatModel } = require("../ai");

async function phraseReply(instruction) {
  const result = await chatModel.generateContent(instruction);
  return result.response.text().trim();
}

module.exports = {
  phraseReply,
};