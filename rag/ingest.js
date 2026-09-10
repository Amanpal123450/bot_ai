const fs = require("fs");
const path = require("path");
const { embeddingModel } = require("./ai");

const KB_DIR = path.join(__dirname, "..", "knowledge-base");
const OUTPUT_FILE = path.join(__dirname, "vector-store.json");

function chunkText(text, chunkSize = 500) {
  const chunks = [];
  const paragraphs = text.split(/\n\s*\n/); // split by blank lines
  let current = "";

  for (const para of paragraphs) {
    if ((current + para).length > chunkSize && current.length > 0) {
      chunks.push(current.trim());
      current = "";
    }
    current += para + "\n\n";
  }
  if (current.trim().length > 0) chunks.push(current.trim());

  return chunks;
}

async function embedText(text) {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

async function ingest() {
  const files = fs.readdirSync(KB_DIR).filter((f) => f.endsWith(".txt"));
  const vectorStore = [];

  for (const file of files) {
    const filePath = path.join(KB_DIR, file);
    const text = fs.readFileSync(filePath, "utf-8");
    const chunks = chunkText(text);

    console.log(`Processing ${file} — ${chunks.length} chunk(s)`);

    for (const chunk of chunks) {
      const embedding = await embedText(chunk);
      vectorStore.push({
        source: file,
        text: chunk,
        embedding,
      });
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(vectorStore, null, 2));
  console.log(`\n✅ Done. Saved ${vectorStore.length} chunks to ${OUTPUT_FILE}`);
}

ingest().catch((err) => {
  console.error("Ingest failed:", err.message);
});
