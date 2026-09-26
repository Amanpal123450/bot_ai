require("dotenv").config();

const express = require("express");
const cors = require("cors");
// const { search } = require("./rag/search");
const { textToSpeech } = require("./rag/tts");
const { search } = require("./search/search");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  try {
    const { message,history = [], gameState = {},} = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Message is required",
      });
    }

    const result = await search( message, history,gameState);
    res.json(result);

  } catch (err) {
    console.error("Chat API Error:", err);
    res.status(500).json({
      error: "Something went wrong. Please try again.",
    });
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

    res.status(500).json({
      error: "Voice generation failed.",
      details: err.message,
    });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Kikoo chatbot API running at http://localhost:${PORT}`);
});
