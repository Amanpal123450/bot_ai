const riddleGame = require("../games/Riddles/riddleGame");
const { classifyAndReply, } = require("../games/Riddles/classifyAndReply");
const { handleRiddleIntent, } = require("../games/Riddles/riddleLogic");
const { phraseReply } = require("../services/aiService");
const { classifyIsAnswerAttempt } = require("../search/gameAnswerIntent");
const { answerOffTopicQuestion } = require("./generalHandler");
const { buildOptions, selectedOption } = require("../games/Learning_Games/multipleChoice");

function riddleOptions(answer) {
    return buildOptions(answer, riddleGame.riddles.map((riddle) => riddle.answer));
}


async function handleRiddle(
    userQuestion,
    conversationTurns,
    gameState
) { 

const riddleActive =
    gameState.mode === "riddle" && gameState.currentRiddleIndex !== undefined;

if (riddleActive) {
    const current = riddleGame.riddles[gameState.currentRiddleIndex];
    const hintFact = riddleGame.generateHint(current.answer);
    const selected = selectedOption(userQuestion, gameState.options);

    // Button answers use a deterministic path: feedback and the next riddle
    // are generated together so voice playback is never replaced mid-sentence.
    if (selected) {
        const isCorrect = selected.text.trim().toLowerCase() === current.answer.trim().toLowerCase();
        const { index, riddle: nextRiddle } = riddleGame.pickNewRiddle([
            ...(gameState.askedIndexes || []),
            gameState.currentRiddleIndex,
        ]);
        const options = riddleOptions(nextRiddle.answer);
        const answer = await phraseReply(`
The child answered this riddle: "${current.question}".
Their selected answer was "${selected.text}". They were ${isCorrect ? "CORRECT" : "WRONG"}.
${isCorrect ? "Celebrate them briefly." : `Kindly reveal that the answer was "${current.answer}".`}
Then ask this new riddle: "${nextRiddle.question}".
Do not read or list answer choices; the child will see them after you finish speaking.
Keep it short, fun, and child-friendly. Use 1-2 emojis.
`);
        return {
            answer,
            gameState: {
                mode: "riddle",
                currentRiddleIndex: index,
                askedIndexes: [...(gameState.askedIndexes || []), gameState.currentRiddleIndex],
                options,
            },
            options,
        };
    }

    const isAnswer = await classifyIsAnswerAttempt({ userQuestion, currentQuestion: `Riddle: "${current.question}"
   The child should try to guess the answer to this riddle.
   They may give a guess or say they don't know.`, conversationTurns });

    if (!isAnswer) {
        const answer = await answerOffTopicQuestion({
            userQuestion,
            conversationTurns
        });
        return {
            answer,
            gameState
        };
    }

    const { intent, reply } = await classifyAndReply({
        userQuestion,
        riddleQuestion: current.question,
        riddleAnswer: current.answer,
        hintFact,
        conversationTurns,
    });

    return await handleRiddleIntent({
        intent,
        reply,
        userQuestion,
        gameState,
        riddleGame,
        phraseReply,
    });

}

if (riddleGame.isStartRiddleRequest(userQuestion)) {
    const { index, riddle } = riddleGame.pickNewRiddle(gameState.askedIndexes || []);
    const options = riddleOptions(riddle.answer);
    const answer = await phraseReply(`
The child asked for a riddle, matching the language/tone of their message: "${userQuestion}".
Riddle to present: "${riddle.question}"
Do NOT reveal the answer. Invite them to guess. Keep it short, fun, and use 1-2 emojis.
Do not read or list answer choices; the child will see them after you finish speaking.
`);
    return {
        answer,
        gameState: {
            mode: "riddle",
            currentRiddleIndex: index,
            askedIndexes: gameState.askedIndexes || [],
            options,
        },
        options,
    };
}
 
  return null;
}

module.exports = {
    handleRiddle,
};
