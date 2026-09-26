const wordChainGame = require("../games/Learning_Games/wordChainGame");
const mathGame = require("../games/Learning_Games/mathGame");
const spellingGame = require("../games/Learning_Games/spellingGame");
const guessAnimalGame = require("../games/Learning_Games/guessAnimalGame");
const { classifyGuessAnimalMessage, } = require("../games/Learning_Games/guessAnimalClassifier");
const logicPuzzleGame = require("../games/Learning_Games/logicPuzzleGame");
const countingGame = require("../games/base_Games/countingGame");
const colorsShapesGame = require("../games/base_Games/colorsShapesGame");
const alphabetGame = require("../games/base_Games/alphabetGame");
const { isVocabRequest } = require("../search/vocab");
const { phraseReply } = require("../services/aiService");
const { classifyIsAnswerAttempt } = require("../search/gameAnswerIntent");
const { answerOffTopicQuestion } = require("./generalHandler");


async function handleLearningGame(
  userQuestion,
  conversationTurns,
  gameState
) {

  if (gameState.mode === "word_chain") {

    const currentQ = `A word starting with the letter "${gameState.requiredLetter}"`;
    const isAnswer = await classifyIsAnswerAttempt({ userQuestion, currentQuestion: currentQ, conversationTurns });

    if (!isAnswer) {
      const answer = await answerOffTopicQuestion({ userQuestion, conversationTurns });
      return { answer, gameState: { mode: null } };
    }

    const { requiredLetter, usedWords } = gameState;
    const result = wordChainGame.checkWordChainMove(userQuestion, requiredLetter, usedWords);

    if (!result.valid) {
      const answer = await phraseReply(`
The child's word chain move was invalid (reason: ${result.reason}). They needed
a word starting with "${requiredLetter}". Their message: "${userQuestion}".
Encourage them warmly and remind them of the required letter. Use 1-2 emojis.
`);
      return { answer, gameState };
    }

    const newLetter = wordChainGame.lastLetter(result.word);
    const answer = await phraseReply(`
The child correctly said "${result.word}" in the word chain game, matching
their language/tone: "${userQuestion}". Celebrate briefly, then ask for a new
word starting with the letter "${newLetter.toUpperCase()}". Use 1-2 emojis.
`);
    return {
      answer,
      gameState: {
        mode: "word_chain",
        requiredLetter: newLetter,
        usedWords: [...usedWords, result.word],
      },
    };
  }
  // MATH GAME
  if (gameState.mode === "math_game") {


    const isAnswer = await classifyIsAnswerAttempt({
      userQuestion, currentQuestion: gameState.currentQuestion, conversationTurns,
    });

    if (!isAnswer) {
      const answer = await answerOffTopicQuestion({ userQuestion, conversationTurns });
      return { answer, gameState: { mode: null } };
    }

    const correct = mathGame.checkMathAnswer(userQuestion, gameState.currentAnswer);
    const next = mathGame.generateProblem();

    const answer = await phraseReply(`
The child answered a math problem: "${gameState.currentQuestion}". Their
answer: "${userQuestion}". ${correct ? "This was CORRECT." : `This was WRONG. Correct answer was ${gameState.currentAnswer}.`}
Give short feedback matching their tone, then present the next problem:
"${next.question}". Use 1-2 emojis.
`);
    return {
      answer,
      gameState: { mode: "math_game", currentQuestion: next.question, currentAnswer: next.answer },
    };
  }
  // SPELLING CHALLENGE
  if (gameState.mode === "spelling") {

    const currentQ = `Spell the word "${gameState.currentWord}"`;
    const isAnswer = await classifyIsAnswerAttempt({ userQuestion, currentQuestion: currentQ, conversationTurns });

    if (!isAnswer) {
      const answer = await answerOffTopicQuestion({ userQuestion, conversationTurns });
      return { answer, gameState: { mode: null } };
    }


    const correct = spellingGame.checkSpelling(userQuestion, gameState.currentWord);
    const nextWord = spellingGame.pickWord([...(gameState.usedWords || []), gameState.currentWord]);

    const answer = await phraseReply(`
The child tried to spell "${gameState.currentWord}". Their attempt: "${userQuestion}".
${correct ? "This was CORRECT." : `This was WRONG. Correct spelling: "${gameState.currentWord}".`}
Give short feedback matching their tone, then ask them to spell the next word: "${nextWord}".
Use 1-2 emojis.
`);
    return {
      answer,
      gameState: {
        mode: "spelling",
        currentWord: nextWord,
        usedWords: [...(gameState.usedWords || []), gameState.currentWord],
      },
    };
  }
  // GUESS THE ANIMAL
  if (gameState.mode === "guess_animal") {

    const currentQ = `Guess the Animal game. The child can ask a yes/no question or guess the secret animal. The secret animal is "${secretAnimal.name}". Do not reveal it.`;

    const isAnswer = await classifyIsAnswerAttempt({
      userQuestion,
      currentQuestion: currentQ,
      conversationTurns
    });

    if (!isAnswer) {
      const answer = await answerOffTopicQuestion({
        userQuestion,
        conversationTurns
      });
      return {
        answer,
        gameState: { mode: null }
      };
    }
    const { secretAnimal, triesLeft } = gameState;

    const classification = await classifyGuessAnimalMessage({ userQuestion, conversationTurns });

    if (classification.type === "give_up") {
      const answer = await phraseReply(`
The child gave up on Guess the Animal. Reveal the secret animal was "${secretAnimal.name}",
share this fun fact: "${secretAnimal.funFact}", and ask if they want to play again.
Match their tone. Use 1-2 emojis.
`);
      return { answer, gameState: { mode: null } };
    }

    if (classification.type === "guess") {
      const correct = guessAnimalGame.checkGuess(userQuestion, secretAnimal.name);
      if (correct) {
        const answer = await phraseReply(`
The child correctly guessed the animal is "${secretAnimal.name}"! Celebrate, share
this fun fact: "${secretAnimal.funFact}", and ask if they want to play again.
Match their tone. Use 1-2 emojis.
`);
        return { answer, gameState: { mode: null } };
      }
      const remaining = triesLeft - 1;
      if (remaining <= 0) {
        const answer = await phraseReply(`
The child ran out of tries. Reveal the animal was "${secretAnimal.name}" kindly,
share this fun fact: "${secretAnimal.funFact}". Match their tone. Use 1-2 emojis.
`);
        return { answer, gameState: { mode: null } };
      }
      const answer = await phraseReply(`
The child guessed "${userQuestion}" but the animal is NOT that. They have
${remaining} tries left. Encourage them to keep asking yes/no questions. Match their tone. Use 1-2 emojis.
`);
      return { answer, gameState: { ...gameState, triesLeft: remaining } };
    }

    if (classification.type === "unmappable_question") {
      const answer = await phraseReply(`
The child asked a question in Guess the Animal that doesn't map to a known
trait. Kindly say you're not sure about that one, and suggest they ask about
whether it flies, lives in water, has four legs, is a pet, or eats meat.
Match their tone. Use 1-2 emojis.
`);
      return { answer, gameState }; // no try used for an unanswerable question
    }

    // attribute_question
    const value = guessAnimalGame.getAttributeValue(secretAnimal, classification.attribute);
    const answer = await phraseReply(`
Answer the child's yes/no question about the secret animal truthfully.
Their question: "${userQuestion}". The correct answer is: ${value ? "YES" : "NO"}.
Keep it short and fun, match their tone. Use 1-2 emojis.
`);
    return { answer, gameState }; // no try used for a question, only for guesses
  }
  // COUNTING GAME
  if (gameState.mode === "counting_game") {

    const isAnswer = await classifyIsAnswerAttempt({
      userQuestion, currentQuestion: gameState.currentQuestion, conversationTurns,
    });

    console.log("isAnswer", isAnswer)

    if (!isAnswer) {
      const answer = await answerOffTopicQuestion({ userQuestion, conversationTurns });
      return { answer, gameState: { mode: null } };
    }

    const correct = countingGame.checkAnswer(userQuestion, gameState.currentAnswer);
    const next = countingGame.generateProblem();

    const answer = await phraseReply(`
The child answered a counting problem: "${gameState.currentQuestion}". Their
answer: "${userQuestion}". ${correct ? "This was CORRECT." : `This was WRONG. Correct answer was ${gameState.currentAnswer}.`}
Give short feedback matching their tone, then present the next problem:
"${next.question}". Use 1-2 emojis.
`);
    return {
      answer,
      gameState: { mode: "counting_game", currentQuestion: next.question, currentAnswer: next.answer },
    };
  }
  // COLORS & SHAPES
  if (gameState.mode === "colors_shapes") {

    const isAnswer = await classifyIsAnswerAttempt({
      userQuestion, currentQuestion: gameState.currentItem.question, conversationTurns,
    });

    if (!isAnswer) {
      const answer = await answerOffTopicQuestion({ userQuestion, conversationTurns });
      return { answer, gameState: { mode: null } };
    }
    const currentItem = gameState.currentItem;
    const correct = colorsShapesGame.checkAnswer(userQuestion, currentItem.answer);
    const { index, item: nextItem } = colorsShapesGame.pickQuestion([
      ...(gameState.askedIndexes || []),
      gameState.currentIndex,
    ]);

    const answer = await phraseReply(`
The child answered: "${currentItem.question}" with "${userQuestion}".
${correct ? "This was CORRECT." : `This was WRONG. Correct answer: "${currentItem.answer}".`}
Give short feedback matching their tone, then ask the next question:
"${nextItem.question}". Use 1-2 emojis.
`);
    return {
      answer,
      gameState: {
        mode: "colors_shapes",
        currentIndex: index,
        currentItem: nextItem,
        askedIndexes: [...(gameState.askedIndexes || []), gameState.currentIndex],
      },
    };
  }
  // ALPHABET GAME
  if (gameState.mode === "alphabet_game") {

    const currentQ = `A word starting with the letter "${gameState.currentLetter}"`;
    const isAnswer = await classifyIsAnswerAttempt({ userQuestion, currentQuestion: currentQ, conversationTurns });

    if (!isAnswer) {
      const answer = await answerOffTopicQuestion({ userQuestion, conversationTurns });
      return { answer, gameState: { mode: null } };
    }

    const valid = alphabetGame.startsWithLetter(userQuestion, gameState.currentLetter);
    const next = alphabetGame.nextLetter(gameState.currentLetter);

    const answer = await phraseReply(`
The child is playing the Alphabet game. Current letter was "${gameState.currentLetter}".
Their answer: "${userQuestion}". ${valid ? "Their word correctly starts with that letter — celebrate!" : "Their word does NOT start with that letter — gently correct them."}
Then say: "${next} is for..." and ask them to think of a word starting with "${next}".
Match their tone. Use 1-2 emojis.
`);
    return { answer, gameState: { mode: "alphabet_game", currentLetter: next } };
  }

// LOGIC PUZZLE

if (gameState.mode === "logic_puzzle") {

    const {
        currentPuzzleIndex
    } = gameState;

    const currentPuzzle =
        logicPuzzleGame.puzzles[currentPuzzleIndex];


    // ------------------------------------------
    // CHECK: ANSWER OR OFF-TOPIC?
    // ------------------------------------------

    const isAnswer = await classifyIsAnswerAttempt({
        userQuestion,

        currentQuestion: `
Logic Puzzle:
"${currentPuzzle.question}"

The child should try to solve this puzzle
and give an answer or guess.
`,

        conversationTurns
    });

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

    const correctAnswer =
        String(currentPuzzle.answer)
            .trim()
            .toLowerCase();

    const userAnswer =
        String(userQuestion)
            .trim()
            .toLowerCase();

    const isCorrect =
        userAnswer === correctAnswer;
    const answer = await phraseReply(`
The child is playing a Logic Puzzle.

Puzzle:
"${currentPuzzle.question}"

Correct answer:
"${currentPuzzle.answer}"

The child's answer:
"${userQuestion}"

The child was ${isCorrect ? "CORRECT" : "WRONG"}.

${isCorrect
    ? "Celebrate their correct answer."
    : "Gently tell them the correct answer and encourage them."
}

Keep it short, fun and child-friendly.
Use 1-2 emojis.

If the answer was wrong, explain the correct answer briefly.
`);


    return {
        answer,
        gameState: {
            mode: null
        }
    };
}

  // START games

  if (wordChainGame.isStartWordChainRequest(userQuestion)) {
    const startWord = "apple";
    const nextLetter = wordChainGame.lastLetter(startWord);
    const answer = await phraseReply(`
Start a word chain game. Say the word "APPLE" and ask the child to say a
word starting with "${nextLetter.toUpperCase()}". Match their tone. Use 1-2 emojis.
`);
    return { answer, gameState: { mode: "word_chain", requiredLetter: nextLetter, usedWords: ["apple"] } };
  }

  if (mathGame.isStartMathRequest(userQuestion)) {
    const problem = mathGame.generateProblem();
    const answer = await phraseReply(`
Start a "Beat the Robot" math game. Present this problem: "${problem.question}".
Match their tone. Use 1-2 emojis.
`);
    return { answer, gameState: { mode: "math_game", currentQuestion: problem.question, currentAnswer: problem.answer } };
  }

  if (spellingGame.isStartSpellingRequest(userQuestion)) {
    const word = spellingGame.pickWord([]);
    const answer = await phraseReply(`
Start a spelling challenge. Ask the child to spell: "${word}".
Match their tone. Use 1-2 emojis.
`);
    return { answer, gameState: { mode: "spelling", currentWord: word, usedWords: [] } };
  }

  if (guessAnimalGame.isStartGuessAnimalRequest(userQuestion)) {
    const animal = guessAnimalGame.pickSecretAnimal();
    const answer = await phraseReply(`
Start "Guess the Animal" (20 Questions). Tell the child you're thinking of an
animal and they can ask yes/no questions to guess it. Do NOT reveal the animal.
Match their tone. Use 1-2 emojis.
`);
    return { answer, gameState: { mode: "guess_animal", secretAnimal: animal, triesLeft: guessAnimalGame.MAX_TRIES } };
  }

  if (logicPuzzleGame.isStartLogicPuzzleRequest(userQuestion)) {
    const { index, puzzle } = logicPuzzleGame.pickPuzzle(gameState.askedIndexes || []);
    const answer = await phraseReply(`
The child asked for a logic puzzle, matching the language/tone of their message: "${userQuestion}".
Puzzle to present: "${puzzle.question}"
Do NOT reveal the answer. Invite them to guess. Keep it short, fun, and use 1-2 emojis.
`);
    return {
      answer,
      gameState: {
        mode: "logic_puzzle",
        currentPuzzleIndex: index,
        askedIndexes: gameState.askedIndexes || [],
      },
    };
  }

  if (countingGame.isStartCountingRequest(userQuestion)) {
    const problem = countingGame.generateProblem();
    const answer = await phraseReply(`
Start a counting game for young kids. Present this problem: "${problem.question}".
Match their tone. Use 1-2 emojis.
`);
    return { answer, gameState: { mode: "counting_game", currentQuestion: problem.question, currentAnswer: problem.answer } };
  }

  if (colorsShapesGame.isStartColorsShapesRequest(userQuestion)) {
    const { index, item } = colorsShapesGame.pickQuestion([]);
    const answer = await phraseReply(`
Start a colors and shapes game. Ask this question: "${item.question}".
Match their tone. Use 1-2 emojis.
`);
    return { answer, gameState: { mode: "colors_shapes", currentIndex: index, currentItem: item, askedIndexes: [] } };
  }

  if (alphabetGame.isStartAlphabetRequest(userQuestion)) {
    const answer = await phraseReply(`
Start the Alphabet game. Say "A is for Apple!" and ask the child to think of
another word starting with A. Match their tone. Use 1-2 emojis.
`);
    return { answer, gameState: { mode: "alphabet_game", currentLetter: "A" } };
  }

  // VOCABULARY

  if (isVocabRequest(userQuestion)) {

    const answer =
      await phraseReply(`
The child wants Vocabulary Builder.

Share ONE new word appropriate for kids.

Give:
1. Word
2. Simple meaning
3. Example sentence

Match their tone:
"${userQuestion}"

Use 1-2 emojis.
`);

    return {
      answer,
      gameState: {
        mode: null,
      },
    };
  }
  return null;

}

module.exports = {
  handleLearningGame,
};