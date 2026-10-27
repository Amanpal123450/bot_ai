require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { textToSpeech } = require("./rag/tts");
const { search } = require("./search/search");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const MAX_HISTORY = 8; // LLM ko poori history bhejna slow karta hai

function readBody(req) {
  const { message, history = [], gameState = {} } = req.body || {};
  return {
    message,
    history: Array.isArray(history) ? history.slice(-MAX_HISTORY) : [],
    gameState: gameState && typeof gameState === "object" ? gameState : {},
  };
}

// Purana endpoint (sirf text)
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, gameState } = readBody(req);
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }
    const result = await search(message, history, gameState);
    res.json(result);
  } catch (err) {
    console.error("Chat API Error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});


app.post("/api/chat-voice", async (req, res) => {
  const { message, history, gameState } = readBody(req);
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message is required" });
  }

  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  let closed = false;
  res.on("close", () => { closed = true; });
  const send = (obj) => { if (!closed) res.write(JSON.stringify(obj) + "\n"); };

  try {
    const t0 = Date.now();
    const result = await search(message, history, gameState);
    const llmMs = Date.now() - t0;
    if (closed) return;

    send({ type: "answer", ...result }); // text turant

    const t1 = Date.now();
    try {
      const audio = await textToSpeech(result.answer); // poora text, ek request
      if (!closed) send({ type: "audio", i: 0, audio });
    } catch (e) {
      console.error("TTS failed:", e.message);
    }
    console.log(
      `LLM ${llmMs}ms | TTS ${Date.now() - t1}ms | ${String(result.answer).length} chars`
    );

    send({ type: "done" });
  } catch (err) {
    console.error("Chat-voice Error:", err);
    send({ type: "error", error: "Something went wrong. Please try again." });
  } finally {
    if (!closed) res.end();
  }
});

// Replay button ke liye (ek text -> ek mp3)
app.post("/api/speak", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }
    const audioBase64 = await textToSpeech(text);
    res.json({ audio: audioBase64 });
  } catch (err) {
    res.status(500).json({ error: "Voice generation failed.", details: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Kikoo chatbot API running at http://localhost:${PORT}`);
});