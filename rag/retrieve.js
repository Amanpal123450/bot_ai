const fs = require("fs");
const path = require("path");
const AI_CONFIG = require("../config/ai-config");
const { embeddingModel } = require("./ai");
const VECTOR_STORE_FILE = path.join(__dirname, "vector-store.json");

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

async function embedQuery(text) {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

async function retrieve(question, topK = AI_CONFIG.topK) {
  if (!fs.existsSync(VECTOR_STORE_FILE)) {
    throw new Error(
      "vector-store.json not found. Run `node rag/ingest.js` first."
    );
  }

  const vectorStore = JSON.parse(fs.readFileSync(VECTOR_STORE_FILE, "utf-8"));
  const queryEmbedding = await embedQuery(question);

  const scored = vectorStore.map((entry) => ({
    ...entry,
    score: cosineSimilarity(queryEmbedding, entry.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topK);
}

module.exports = { retrieve };
