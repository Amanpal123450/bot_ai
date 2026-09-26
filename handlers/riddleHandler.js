const riddleGame = require("../games/Riddles/riddleGame");
const { classifyAndReply, } = require("../games/Riddles/classifyAndReply");
const { handleRiddleIntent, } = require("../games/Riddles/riddleLogic");
const { phraseReply } = require("../services/aiService");
const { classifyIsAnswerAttempt } = require("../search/gameAnswerIntent");
const { answerOffTopicQuestion } = require("./generalHandler");


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
    const answer = await phraseReply(`
The child asked for a riddle, matching the language/tone of their message: "${userQuestion}".
Riddle to present: "${riddle.question}"
Do NOT reveal the answer. Invite them to guess. Keep it short, fun, and use 1-2 emojis.
`);
    return {
        answer,
        gameState: {
            mode: "riddle",
            currentRiddleIndex: index,
            askedIndexes: gameState.askedIndexes || [],
        },
    };
}
 
  return null;
}

module.exports = {
    handleRiddle,
};