const WebSocket = require("ws");
const { encode, decode } = require("@msgpack/msgpack");

const FISH_WS_URL = "wss://api.fish.audio/v1/tts/live";

function openFishLive({ onAudio, onEnd }) {
  const apiKey = process.env.FISH_API_KEY;
  if (!apiKey) throw new Error("FISH_API_KEY is missing");

  const ws = new WebSocket(FISH_WS_URL, {
    headers: { Authorization: `Bearer ${apiKey}`, model: "s2.1-pro-free" },
    handshakeTimeout: 5000,
  });

  const outbox = [];
  let open = false;
  let ended = false;

  const end = () => {
    if (ended) return;
    ended = true;
    onEnd?.();
  };
  // socket khulne se pehle bheje gaye messages queue mein rehte hain
  const send = (obj) => {
    const b = encode(obj);
    if (open) ws.send(b);
    else outbox.push(b);
  };

  ws.on("open", () => {
    open = true;
    outbox.splice(0).forEach((b) => ws.send(b));
  });

  ws.on("message", (data) => {
    let msg;
    try { msg = decode(data); } catch { return; }
    if (msg.event === "audio" && msg.audio) {
      onAudio(Buffer.from(msg.audio));
    } else if (msg.event === "finish") {
      if (msg.reason === "error") console.error("Fish WS finished with error");
      end();
      try { ws.close(); } catch {}
    }
    // unknown events ignore (docs bhi yahi kehte hain)
  });

  ws.on("error", (e) => { console.error("Fish WS error:", e.message); end(); });
  ws.on("close", end);

  // session start: text khali, baaki config HTTP jaisi
  send({
    event: "start",
    request: {
      text: "",
      reference_id: "7797621248c34c558d13e39b24c08915",
      format: "mp3",
      latency: "balanced",
    },
  });

  return {
    text: (t) => send({ event: "text", text: t }),
    flush: () => send({ event: "flush" }),
    stop: () => send({ event: "stop" }),
    kill: () => { ended = true; try { ws.terminate(); } catch {} },
  };
}

module.exports = { openFishLive }; 