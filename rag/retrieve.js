const fs = require("fs");
const path = require("path");
const AI_CONFIG = require("../config/ai-config");
const { embeddingModel } = require("./ai");

const VECTOR_STORE_FILE = path.join(__dirname, "vector-store.json");
let cachedVectorStore = null;

function loadVectorStore() {
  if (cachedVectorStore) return cachedVectorStore;

  if (!fs.existsSync(VECTOR_STORE_FILE)) {
    throw new Error(
      "vector-store.json not found. Run `node rag/ingest.js` first."
    );
  }

  try {
    const raw = fs.readFileSync(VECTOR_STORE_FILE, "utf-8");
    cachedVectorStore = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Failed to read/parse vector-store.json: ${err.message}. Try re-running \`node rag/ingest.js\`.`
    );
  }

  return cachedVectorStore;
}

function reloadVectorStore() {
  cachedVectorStore = null;
  return loadVectorStore();
}

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

async function embedQuery(text) {
  try {
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  } catch (err) {
    throw new Error(`Failed to generate embedding for the question: ${err.message}`);
  }
}

async function retrieve(question, topK = AI_CONFIG.topK) {
  if (!question || typeof question !== "string" || !question.trim()) {
    throw new Error("A non-empty question string is required.");
  }

  const vectorStore = loadVectorStore();
  const queryEmbedding = await embedQuery(question);

  const scored = vectorStore.map((entry) => ({
    ...entry,
    score: cosineSimilarity(queryEmbedding, entry.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topK);
}

module.exports = { retrieve, reloadVectorStore };