const AI_CONFIG = require("../config/ai-config");

function pcmToWav(
  base64Pcm,
  sampleRate = 24000,
  channels = 1,
  bitDepth = 16
) {
  const pcmBuffer = Buffer.from(base64Pcm, "base64");
  const byteRate = (sampleRate * channels * bitDepth) / 8;
  const blockAlign = (channels * bitDepth) / 8;

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmBuffer.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmBuffer.length, 40);

  return Buffer.concat([header, pcmBuffer]);
}

async function textToSpeech(text) {
  if (!AI_CONFIG.apiKey) {
    throw new Error("Gemini API key is missing");
  }

  if (!AI_CONFIG.ttsModel) {
    throw new Error("TTS model is missing");
  }

  if (!AI_CONFIG.ttsVoice) {
    throw new Error("TTS voice is missing");
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${AI_CONFIG.ttsModel}:generateContent?key=${AI_CONFIG.apiKey}`;

  const body = {
    contents: [
      {
        parts: [{ text }],
      },
    ],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: AI_CONFIG.ttsVoice,
          },
        },
      },
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error("Gemini TTS error:", responseText);
    throw new Error(`Gemini TTS request failed: ${responseText}`);
  }

  let data;

  try {
    data = JSON.parse(responseText);
  } catch (err) {
    throw new Error("Gemini returned invalid JSON");
  }

  const base64Pcm =
    data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

  if (!base64Pcm) {
    console.error("Unexpected Gemini TTS response:", JSON.stringify(data));
    throw new Error("No audio data received from Gemini");
  }

  const wavBuffer = pcmToWav(base64Pcm);

  return wavBuffer.toString("base64");
}

module.exports = { textToSpeech };