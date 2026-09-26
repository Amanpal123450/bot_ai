const quizGame = require("../games/Quiz_Zone/quizGame");
const riddleGame = require("../games/Riddles/riddleGame");
const wordChainGame = require("../games/Learning_Games/wordChainGame");
const mathGame = require("../games/Learning_Games/mathGame");
const spellingGame = require("../games/Learning_Games/spellingGame");
const guessAnimalGame = require("../games/Learning_Games/guessAnimalGame");
const logicPuzzleGame = require("../games/Learning_Games/logicPuzzleGame");
const creativeCorner = require("../games/Creative_Corner/creativeCornerGame");
const countingGame = require("../games/base_Games/countingGame");
const colorsShapesGame = require("../games/base_Games/colorsShapesGame");
const alphabetGame = require("../games/base_Games/alphabetGame");

const { isVocabRequest } = require("./vocab");

function checkGameSwitch(userQuestion, gameState) {
  if (!gameState.mode) {
    return gameState;
  }

  const wantsToSwitch =
    quizGame.isStartQuizRequest(userQuestion) ||
    riddleGame.isStartRiddleRequest(userQuestion) ||
    wordChainGame.isStartWordChainRequest(userQuestion) ||
    mathGame.isStartMathRequest(userQuestion) ||
    spellingGame.isStartSpellingRequest(userQuestion) ||
    guessAnimalGame.isStartGuessAnimalRequest(userQuestion) ||
    logicPuzzleGame.isStartLogicPuzzleRequest(userQuestion) ||
    creativeCorner.isCreativeMenuRequest(userQuestion) ||
    !!creativeCorner.detectSubtype(userQuestion) ||
    countingGame.isStartCountingRequest(userQuestion) ||
    colorsShapesGame.isStartColorsShapesRequest(userQuestion) ||
    alphabetGame.isStartAlphabetRequest(userQuestion) ||
    isVocabRequest(userQuestion)||
    logicPuzzleGame.isStartLogicPuzzleRequest(userQuestion);

  if (wantsToSwitch) {
    return {};
  }

  return gameState;
}

module.exports = {
  checkGameSwitch,
};