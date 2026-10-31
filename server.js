require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const { WebSocketServer } = require("ws");
const { textToSpeech } = require("./rag/tts");
const { openFishLive } = require("./rag/fishLive");
const { cleanForSpeech } = require("./rag/speechText");
const { runWithStream } = require("./services/streamContext");
const { search } = require("./search/search");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const MAX_HISTORY = 8; // LLM ko poori history bhejna slow karta hai

function sanitize(b = {}) {
  const { message, history = [], gameState = {} } = b;
  return {
    message,
    history: Array.isArray(history) ? history.slice(-MAX_HISTORY) : [],
    gameState: gameState && typeof gameState === "object" ? gameState : {},
  };
}
const readBody = (req) => sanitize(req.body || {});

// Sirf text (purana endpoint)
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, gameState } = readBody(req);
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }
    res.json(await search(message, history, gameState));
  } catch (err) {
    console.error("Chat API Error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// Replay button ke liye (HTTP + cache, jaisa pehle tha)
app.post("/api/speak", async (req, res) => {
  try {
    const { text, lang } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }
    res.json({ audio: await textToSpeech(text, lang) }); // lang optional
  } catch (err) {
    res.status(500).json({ error: "Voice generation failed.", details: err.message });
  }
});

const FIRST_MIN = 12;        // pehla chunk: pehla sentence (kam se kam itne akshar)
const FIRST_CLAUSE = 40;     // pehla sentence lamba ho to comma par bhi tod do
const SECOND_MIN = 60;       // dusra chunk
const LATER_MIN = 150;       // uske baad ke chunks
const SPEECH_CAP = 1000;     // itna hi text bolna hai
const SEG_IDLE_MS = 200;     // itni der audio na aaye to ek segment poora maano
const MAX_SEG_BYTES = 48000; // ~3 sec mp3 (128kbps); isse bada ho to turant bhej do

function createSpeaker({ send, isClosed, onFirstAudio }) {
  let buf = "", idx = 0, spoken = 0, epoch = 0, audioIdx = 0;
  let firstSent = false, sent = false, session = null;

  const getSession = () => {
    if (session) return session;
    const ep = epoch;
    let chunks = [], bytes = 0, timer = null;
    let resolveDone;
    const done = new Promise((r) => (resolveDone = r));

    const emit = () => {
      clearTimeout(timer);
      timer = null;
      if (!bytes) return;
      const audio = Buffer.concat(chunks).toString("base64");
      chunks = [];
      bytes = 0;
      if (ep !== epoch || isClosed()) return;
      if (!firstSent) { firstSent = true; onFirstAudio?.(); }
      send({ type: "audio", i: audioIdx++, audio });
    };

    const live = openFishLive({
      onAudio: (b) => {
        chunks.push(b);
        bytes += b.length;
        if (bytes >= MAX_SEG_BYTES) return emit();
        clearTimeout(timer);
        timer = setTimeout(emit, SEG_IDLE_MS);
      },
      onEnd: () => { emit(); resolveDone(); },
    });

    session = {
      live,
      done,
      close: () => { clearTimeout(timer); live.kill(); resolveDone(); },
    };
    return session;
  };

  const speak = (text) => {
    const clean = cleanForSpeech(text);
    if (!clean || spoken >= SPEECH_CAP) return;
    spoken += clean.length;
    idx++;
    sent = true;
    const s = getSession();
    s.live.text(clean + " ");
    s.live.flush(); // sentence poora hote hi awaaz banao
  };

  const takeChunk = () => {
    const minLen = idx === 0 ? FIRST_MIN : idx === 1 ? SECOND_MIN : LATER_MIN;
    const re = /[.!?।]["')\]]*\s|\n/g;
    let m;
    while ((m = re.exec(buf))) {
      const end = m.index + m[0].length;
      if (cleanForSpeech(buf.slice(0, end)).length >= minLen) {
        const chunk = buf.slice(0, end);
        buf = buf.slice(end);
        return chunk;
      }
    }
    // pehla sentence bahut lamba: comma/semicolon par tod do (awaaz jaldi shuru ho)
    if (idx === 0) {
      const c = /[,;:—–-]\s/g;
      while ((m = c.exec(buf))) {
        const end = m.index + m[0].length;
        if (cleanForSpeech(buf.slice(0, end)).length >= FIRST_CLAUSE) {
          const chunk = buf.slice(0, end);
          buf = buf.slice(end);
          return chunk;
        }
      }
    }
    return null;
  };

  return {
    speak,
    warm() { getSession(); }, // LLM chalte waqt hi Fish socket khul jaye
    push(delta) {
      buf += delta;
      let c;
      while ((c = takeChunk())) speak(c);
    },
    flush() { if (buf.trim()) speak(buf); buf = ""; },
    reset() { // "replace" case: purani session band, nayi lazily khulegi
      epoch++; buf = ""; spoken = 0; audioIdx = 0; sent = false;
      session?.close(); session = null;
    },
    abort() { // client disconnect / cancel
      epoch++; buf = "";
      session?.close(); session = null;
    },
    get chunks() { return idx; },
    async done() {
      const s = session;
      if (!s) return;
      if (!sent) return s.close(); // kuch bola hi nahi: bas band kar do
      s.live.stop();               // Fish baaki audio bana ke finish bhejega
      await Promise.race([s.done, new Promise((r) => setTimeout(r, 10000))]);
      s.close();
    },
  };
}

function twoParts(text) {
  const clean = cleanForSpeech(text);
  if (!clean) return [];
  const m = clean.match(/^(.{12,}?[.!?।])\s+(.+)$/s);
  return m ? [m[1], m[2]] : [clean];
}

async function runVoiceChat(job, { message, history, gameState }, socket) {
  
  const isClosed = () => job.closed || socket.readyState !== 1;
  const send = (obj) => {
    if (!isClosed()) socket.send(JSON.stringify({ ...obj, id: job.id }));
  };

  if (!message || typeof message !== "string") {
    return send({ type: "error", error: "Message is required" });
  }

  // ---- timing: boss ko numbers dikhane ke liye ----
  const t0 = Date.now();
  const T = { firstToken: null, firstAudio: null };
  const onFirstAudio = () => { if (T.firstAudio === null) T.firstAudio = Date.now() - t0; };

  const spk = createSpeaker({ send, isClosed, onFirstAudio });
  job.spk = spk;
  spk.warm(); // search() se pehle Fish socket khol do

  const ctx = {
    used: false,
    text: "",
    onDelta: (d) => {
      if (T.firstToken === null) T.firstToken = Date.now() - t0;
      ctx.text += d;
      send({ type: "text", delta: d });
      spk.push(d);
    },
    onEnd: () => spk.flush(),
  };
  const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();

  try {
    const result = await runWithStream(ctx, () => search(message, history, gameState));
    if (isClosed()) return spk.abort();
    send({ type: "answer", ...result });

    if (!ctx.used) {
      twoParts(result.answer).forEach((c) => spk.speak(c));
    } else if (norm(ctx.text) !== norm(result.answer)) {
      send({ type: "replace" });
      spk.reset();
      twoParts(result.answer).forEach((c) => spk.speak(c));
    }

    await spk.done();
    send({ type: "done" });

    console.log(
      `⏱ first-text ${T.firstToken ?? "-"}ms | first-audio ${T.firstAudio ?? "-"}ms | total ${Date.now() - t0}ms | ` +
      `tts-chunks ${spk.chunks} | ${String(result.answer).length} chars`
    );
  } catch (err) {
    console.error("Chat-voice Error:", err);
    spk.abort();
    send({ type: "error", error: "Something went wrong. Please try again." });
  }
}

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (socket) => {
  socket.isAlive = true;
  socket.on("pong", () => (socket.isAlive = true));

  let active = null; // is socket par abhi chal raha jawab (ek time par ek hi)

  const cancelActive = () => {
    if (!active) return;
    active.closed = true;
    active.spk?.abort(); // Fish session band
    active = null;
  };

  socket.on("message", (raw) => {

    // console.log("WS message:", raw.toString());
    let m;
    try { m = JSON.parse(raw.toString()); } catch { return; }

    if (m.type === "cancel") {
      if (active && active.id === m.id) cancelActive();
      return;
    }
    if (m.type !== "chat") return;

    cancelActive(); // naya sawaal aaya to purana jawab band
    const job = { id: m.id, closed: false, spk: null };
    active = job;

    runVoiceChat(job, sanitize(m), socket)
      .catch((e) => console.error("WS job error:", e))
      .finally(() => { if (active === job) active = null; });
  });

  socket.on("close", cancelActive);
  socket.on("error", cancelActive);
});

// keepalive: proxy idle socket na kaate, aur mare hue sockets saaf hon
setInterval(() => {
  wss.clients.forEach((s) => {
    if (!s.isAlive) return s.terminate();
    s.isAlive = false;
    s.ping();
  });
}, 25000);

server.listen(PORT, () => {
  console.log(`Kikoo chatbot API running at http://localhost:${PORT} (ws: /ws)`);
});