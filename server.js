const express = require("express");
const cors = require("cors");
const { search } = require("./rag/search");
const { textToSpeech } = require("./rag/tts");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }
    const answer = await search(message);
    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

app.post("/api/speak", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }
    const audioBase64 = await textToSpeech(text);
    res.json({ audio: audioBase64 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Voice generation failed." });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Kikoo chatbot API running at http://localhost:${PORT}`);
});
