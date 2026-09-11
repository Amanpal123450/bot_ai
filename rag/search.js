
const { retrieve } = require("./retrieve");
const { chatModel } = require("./ai");

async function search(userQuestion) {

  const matches = await retrieve(userQuestion);
  // const context = matches.map((m) => `From ${m.source}:\n${m.text}`).join("\n\n---\n\n");


  // const result = await chatModel.generateContent(
  //   `Context:\n${context}\n\nQuestion: ${userQuestion}`
  // );

  // return result.response.text();

  const context = matches
    .map((m) => `From ${m.source}:\n${m.text}`)
    .join("\n\n---\n\n");

  // context + question to Gemini
  const prompt = `
You are Kikoo's AI customer support assistant .

Use only the information provided in the Context to answer the user's question.

Rules:
- Give a short and clear answer.
- Use simple language.
- Do not use Markdown formatting.
- Do not use ** for bold text.
- Do not use * for italic text.
- Do not use # headings.
- Do not add information that is not present in the Context.
- If the answer is not available in the Context, say:
  "Sorry, I don't have this information. Please contact Kikoo support at info@kikoo.in."
- Do not make up or guess information.

Context:
${context}

User Question:
${userQuestion}

Answer:
`;

  const result = await chatModel.generateContent(prompt);

  return result.response.text();
}

module.exports = { search };
