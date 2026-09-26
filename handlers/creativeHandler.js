const creativeCorner = require("../games/Creative_Corner/creativeCornerGame");
const { generateImage, } = require("../games/Creative_Corner/imageGenerator");
const { classifyDrawingRequest, } = require("../games/Creative_Corner/drawingClassifier");
const { phraseReply } = require("../services/aiService");
const { answerOffTopicQuestion } = require("./generalHandler");
const { classifyCreativeIntent } = require("../search/gameAnswerIntent");


async function handleCreative(
    userQuestion,
    conversationTurns,
    gameState
) {

    if (gameState.mode === "creative_corner") {
        const { subtype, prompt } = gameState;

        const intent = await classifyCreativeIntent({
        userQuestion,
        subtype,
        prompt,
        conversationTurns
               });

    if (intent.type === "new_topic") {
        const answer = await answerOffTopicQuestion({
            userQuestion,
            conversationTurns
        });

        return {
            answer,
            gameState
        };
    }


        const answer = await phraseReply(`
You are Kikoo's kids creative-activity assistant, running a "${subtype}" activity.
You gave this prompt: "${prompt}"
The child just responded: "${userQuestion}"

Follow this exact response pattern:
1. Praise something SPECIFIC from their idea (not generic — reference an actual
   detail they mentioned).
2. Add one small fun detail that builds on their idea.
3. Ask exactly ONE follow-up question to keep the activity going.

If the child seems finished or asks for something new, instead offer another
creative prompt or ask if they'd like to try a different creative activity.
Keep it short, warm, and use 1-2 emojis. Match their language/tone.
`);
        return { answer, gameState }; // stays in creative_corner mode — open-ended, no "win" state
    }

    if (creativeCorner.isCreativeMenuRequest(userQuestion)) {
        const answer = await phraseReply(`
The child wants to see Creative Corner activities, matching their language/tone: "${userQuestion}".
List these options with emojis: Drawing prompts 🎨, Story starters 📖, Make up a song 🎵,
Invent a superhero 🦸, Design a monster 👹, Paper craft ideas ✂️.
Ask which one they'd like to try. Keep it short and fun.
`);
        return { answer, gameState: { mode: null } };
    }

    const creativeSubtype = creativeCorner.detectSubtype(userQuestion);

    if (creativeSubtype) {
        let subtype = creativeSubtype;
        let prompt;

        if (creativeSubtype === "drawing") {

            const { type, subject } = await classifyDrawingRequest({ userQuestion });

            prompt = type === "specific" && subject
                ? subject // exactly what the child asked for, cleaned up by AI
                : creativeCorner.startActivity("drawing").prompt; // fallback: random idea
        } else {
            ({ subtype, prompt } = creativeCorner.startActivity(creativeSubtype));
        }

        // DRAWING
        if (subtype === "drawing") {
            try {
                const imageBuffer = await generateImage(
                    `A simple black and white children's coloring book page of ${prompt}.

  Style requirements:
  - black and white line art only
  - clean, thick, bold black outlines
  - white background
  - large empty areas for children to color
  - simple shapes
  - cute child-friendly cartoon style
  - printable coloring page
  - no colors
  - no shading
  - no gradients
  - no textures
  - no filled areas
  - no text
  - no letters
  - no words
  - no scary elements`
                );

                const imageBase64 = imageBuffer.toString("base64");

                const answer = await phraseReply(`
        Tell the child that their drawing idea is ready.
        Drawing activity: "${prompt}"
        Keep it short, exciting and use 1-2 emojis.
      `);

                return {
                    answer,
                    image: `data:image/png;base64,${imageBase64}`,
                    gameState: { mode: "creative_corner", subtype, prompt },
                };
            } catch (error) {
                console.error("Image generation error:", error);

                const answer = await phraseReply(`
        Give the child this drawing challenge:
        "${prompt}"
        Say it in a fun and encouraging way.
        Use 1-2 emojis.
      `);

                return {
                    answer,
                    gameState: { mode: "creative_corner", subtype, prompt },
                };
            }
        }

        // Other creative activities
        const answer = await phraseReply(`
    Present this creative activity prompt to the child,
    matching their language/tone: "${userQuestion}".

    Prompt: "${prompt}"

    Keep it short, exciting, and use 1-2 emojis.
  `);

        return {
            answer,
            gameState: { mode: "creative_corner", subtype, prompt },
        };
    }



}

module.exports = {
    handleCreative,
};