const express = require("express");
const cors = require("cors");
const { search } = require("./rag/search");

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

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Kikoo chatbot API running at http://localhost:${PORT}`);
});
