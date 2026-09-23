const AI_CONFIG = require("../config/ai-config");

// TTS cache
const ttsCache = new Map();

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

  const cacheKey = text.trim().replace(/\s+/g, " ");

  // Cache HIT
  const cachedAudio = ttsCache.get(cacheKey);

  if (cachedAudio) {
    console.log("TTS CACHE HIT");
    return cachedAudio;
  }

  console.log("TTS CACHE MISS");

  // Gemini TTS request
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${AI_CONFIG.ttsModel}:generateContent?key=${AI_CONFIG.apiKey}`;

  const body = {
    contents: [
      {
        parts: [{ text: cacheKey }],
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
    throw new Error(`Gemini TTS request failed: ${responseText}`);
  }

  const data = JSON.parse(responseText);

  const base64Pcm =
    data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

  if (!base64Pcm) {
    throw new Error("No audio data received from Gemini");
  }

  const wavBuffer = pcmToWav(base64Pcm);

  const audioBase64 = wavBuffer.toString("base64");

  // Save in memory
  ttsCache.set(cacheKey, audioBase64);

  return audioBase64;
}

module.exports = {
  textToSpeech,
};







// require("dotenv").config();

// const ttsCache = new Map();

// async function textToSpeech(text) {
//   const apiKey = process.env.ELEVENLABS_API_KEY;

//   if (!apiKey) {
//     throw new Error("ELEVENLABS_API_KEY is missing");
//   }

//   const cacheKey = text.trim().replace(/\s+/g, " ");

//   // Cache HIT
//   const cachedAudio = ttsCache.get(cacheKey);

//   if (cachedAudio) {
//     console.log("ELEVENLABS TTS CACHE HIT");
//     return cachedAudio;
//   }

//   console.log("ELEVENLABS TTS CACHE MISS");

//   // TODO: yahan apni selected ElevenLabs voice ID lagani hai
//   const voiceId = "FZkK3TvQ0pjyDmT8fzIW";

//   const url =
//     `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}` +
//     `?output_format=mp3_44100_128`;

//   const response = await fetch(url, {
//     method: "POST",

//     headers: {
//       "Content-Type": "application/json",
//       "xi-api-key": apiKey,
//     },

//     body: JSON.stringify({
//       text: cacheKey,

//       model_id: "eleven_multilingual_v2",

//       voice_settings: {
//         stability: 0.35,
//         similarity_boost: 0.75,
//         style: 0.65,
//         use_speaker_boost: true,
//       },
//     }),
//   });

//   if (!response.ok) {
//     const errorText = await response.text();

//     throw new Error(
//       `ElevenLabs TTS request failed: ${response.status} ${errorText}`
//     );
//   }

//   // ElevenLabs returns audio bytes
//   const audioBuffer = Buffer.from(await response.arrayBuffer());

//   // Convert MP3 → Base64
//   const audioBase64 = audioBuffer.toString("base64");

//   // Save in cache
//   ttsCache.set(cacheKey, audioBase64);

//   return audioBase64;
// }

// module.exports = {
//   textToSpeech,
// };