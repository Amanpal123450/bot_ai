const { checkGameSwitch, } = require("./gameSwitch");
const { handleQuiz, } = require("../handlers/quizHandler");
const { handleRiddle, } = require("../handlers/riddleHandler");
const { handleLearningGame, } = require("../handlers/learningGamesHandler");
const { handleCreative, } = require("../handlers/creativeHandler");
const { handleGeneral, } = require("../handlers/generalHandler");
const { resolveLanguage } = require("../services/language");
const { runWithLang } = require("../services/langContext");

async function route(
    userQuestion,
    history = [],
    gameState = {}
) {

    const conversationTurns = history.map((m) => ({
        role: m.sender === "user" ? "user" : "model",
        parts: [{ text: m.text }],
    }));

    // GAME SWITCH 
    gameState = checkGameSwitch(userQuestion, gameState);

    // QUIZ

    const quizResult = await handleQuiz(userQuestion, conversationTurns, gameState);

    if (quizResult) {
        return quizResult;
    }

       // LEARNING GAMES

    const learningResult = await handleLearningGame(userQuestion, conversationTurns, gameState);

    if (learningResult) {
        return learningResult;
    }

    // RIDDLE

    const riddleResult = await handleRiddle(userQuestion, conversationTurns, gameState);

    if (riddleResult) {
        return riddleResult;
    }


    // CREATIVE CORNER

    const creativeResult = await handleCreative(userQuestion, conversationTurns, gameState);

    if (creativeResult) {
        return creativeResult;
    }

    // GENERAL AI

    return handleGeneral(userQuestion, history, conversationTurns, gameState);

}

async function search(userQuestion, history = [], gameState = {}) {
    // language gameState.lang mein rehti hai; handlers ko wo dikhai nahi deti
    const { lang: prevLang, ...state } = gameState || {};
    const lang = resolveLanguage(userQuestion, prevLang);
    const result = await runWithLang(lang, () => route(userQuestion, history, state));
    return { ...result, gameState: { ...(result?.gameState || {}), lang } };
}

module.exports = {
  search,
};

