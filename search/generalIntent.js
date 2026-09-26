const { chatModel } = require("../ai");

async function classifyGeneralIntent({
    userQuestion,
    lastBotMessage,
    conversationTurns,
}) {
    if (!lastBotMessage) {
        return { type: "new_topic" };
    }

    const instructionText = `
You are Kikoo's kids assistant.

Your previous message to the child was:
"${lastBotMessage}"

The child just replied:
"${userQuestion}"

Decide what the child wants:

- "repeat_or_translate":
  They want your PREVIOUS message repeated,
  translated, or rephrased.

- "new_topic":
  This is a new question, request, or topic.

Respond ONLY with JSON:

{
  "type": "repeat_or_translate" | "new_topic"
}
`;

    const result = await chatModel.generateContent({
        contents: [
            ...conversationTurns,
            {
                role: "user",
                parts: [{ text: instructionText }],
            },
        ],
        generationConfig: {
            responseMimeType: "application/json",
        },
    });

    try {
        return JSON.parse(result.response.text());
    } catch {
        return {
            type: "new_topic",
        };
    }
}

function isRepeatOrTranslateRequest(text) {
    const lower = text.toLowerCase().trim();

    const triggers = [
        "hinglish mei batao",
        "hinglish mein batao",
        "hinglish me batao",

        "hindi mei batao",
        "hindi mein batao",
        "hindi me batao",

        "english mei batao",
        "english mein batao",
        "english me batao",

        "repeat karo",
        "repeat kar",
        "dobara batao",
        "phir se batao",

        "simple language mein batao",
        "simple language mei batao",
        "simple mein batao",

        "samajh nahi aaya",
        "samajh nahi aya",
    ];

    return triggers.some((trigger) =>
        lower.includes(trigger)
    );
}

module.exports = {
    classifyGeneralIntent,
    isRepeatOrTranslateRequest,
};