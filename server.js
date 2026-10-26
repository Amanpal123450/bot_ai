require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { textToSpeech } = require("./rag/tts");
const { splitForSpeech, cleanForSpeech } = require("./rag/speechText");
const { runWithStream } = require("./services/streamContext");
const { search } = require("./search/search");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const MAX_HISTORY = 8;

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

// LLM tokens -> sentence -> turant TTS -> audio order mein
function createSpeaker(send, isClosed) {
  const FIRST_MIN = 20;
  const NEXT_MIN = 90;
  const CAP = 1000;
  const MAX_PARALLEL = 3; // Fish 429 de to 2 kar do

  let buf = "", idx = 0, spoken = 0, epoch = 0, chain = Promise.resolve();
  let active = 0;
  const waiters = [];

  const limited = async (fn) => {
    if (active >= MAX_PARALLEL) await new Promise((r) => waiters.push(r));
    active++;
    try { return await fn(); } finally { active--; waiters.shift()?.(); }
  };

  const speak = (text) => {
    const clean = cleanForSpeech(text);
    if (!clean || spoken >= CAP) return;
    spoken += clean.length;
    const i = idx++;
    const ep = epoch;
    const job = limited(() => textToSpeech(clean)).catch((e) => {
      console.error("TTS chunk failed:", e.message);
      return null;
    });
    chain = chain.then(async () => {
      const audio = await job;
      if (audio && ep === epoch && !isClosed()) send({ type: "audio", i, audio });
    });
  };

  const takeChunk = () => {
    const re = /[.!?।]["')\]]*\s|\n/g;
    const minLen = idx === 0 ? FIRST_MIN : NEXT_MIN;
    let m;
    while ((m = re.exec(buf))) {
      const end = m.index + m[0].length;
      if (cleanForSpeech(buf.slice(0, end)).length >= minLen) {
        const chunk = buf.slice(0, end);
        buf = buf.slice(end);
        return chunk;
      }
    }
    return null;
  };

  return {
    speak,
    push(delta) {
      buf += delta;
      let c;
      while ((c = takeChunk())) speak(c);
    },
    flush() { if (buf.trim()) speak(buf); buf = ""; },
    reset() { epoch++; buf = ""; spoken = 0; },
    done: () => chain,
  };
}

// NAYA: text + voice ek hi request mein (NDJSON stream)
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

  const speaker = createSpeaker(send, () => closed);
  const ctx = {
    used: false,
    text: "",
    onDelta: (d) => { ctx.text += d; send({ type: "text", delta: d }); speaker.push(d); },
    onEnd: () => speaker.flush(),
  };
  const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();

  try {
    const result = await runWithStream(ctx, () => search(message, history, gameState));
    if (closed) return;

    send({ type: "answer", ...result });

    if (!ctx.used) {
      splitForSpeech(result.answer).forEach((c) => speaker.speak(c));
    } else if (norm(ctx.text) !== norm(result.answer)) {
      send({ type: "replace" });
      speaker.reset();
      splitForSpeech(result.answer).forEach((c) => speaker.speak(c));
    }

    await speaker.done();
    send({ type: "done" });
  } catch (err) {
    console.error("Chat-voice Error:", err);
    send({ type: "error", error: "Something went wrong. Please try again." });
  } finally {
    if (!closed) res.end();
  }
});

// Replay button ke liye
app.post("/api/speak", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }
    res.json({ audio: await textToSpeech(text) });
  } catch (err) {
    res.status(500).json({ error: "Voice generation failed.", details: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Kikoo chatbot API running at http://localhost:${PORT}`);
});