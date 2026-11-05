const wordChainGame = require("../games/Learning_Games/wordChainGame");
const mathGame = require("../games/Learning_Games/mathGame");
const spellingGame = require("../games/Learning_Games/spellingGame");
const guessAnimalGame = require("../games/Learning_Games/guessAnimalGame");
const { classifyGuessAnimalMessage, } = require("../games/Learning_Games/guessAnimalClassifier");
const logicPuzzleGame = require("../games/Learning_Games/logicPuzzleGame");
const countingGame = require("../games/base_Games/countingGame");
const colorsShapesGame = require("../games/base_Games/colorsShapesGame");
const alphabetGame = require("../games/base_Games/alphabetGame");
const geographyGame = require("../games/Learning_Games/geographyGame");
const animalSoundsGame = require("../games/Learning_Games/animalSoundsGame");
const { isVocabRequest } = require("../search/vocab");
const { phraseReply } = require("../services/aiService");
const { classifyIsAnswerAttempt } = require("../search/gameAnswerIntent");
const { answerOffTopicQuestion } = require("./generalHandler");
const { buildOptions, selectedOption, wordOptions } = require("../games/Learning_Games/multipleChoice");

const COLOR_SHAPE_CHOICES = ["yellow", "blue", "green", "triangle", "square", "circle", "red"];
const ANIMAL_CHOICES = ["elephant", "giraffe", "butterfly", "penguin", "dinosaur", "octopus", "lion", "tiger"];
const spellingOptions = (word) => buildOptions(word, [
  `${word}${word.slice(-1)}`,
  word.length > 2 ? `${word.slice(0, -1)}${word.slice(-1)}e` : `${word}e`,
  word.split("").reverse().join(""),
]);
const questionOptions = (question) => buildOptions(question.answer, question.choices);


async function handleLearningGame(
  userQuestion,
  conversationTurns,
  gameState
) {

  if (gameState.mode === "word_chain") {

    const currentQ = `A word starting with the letter "${gameState.requiredLetter}"`;
    const selected = selectedOption(userQuestion, gameState.options);
    const isAnswer = selected || await classifyIsAnswerAttempt({ userQuestion, currentQuestion: currentQ, conversationTurns });

    if (!isAnswer) {
      const answer = await answerOffTopicQuestion({ userQuestion, conversationTurns });
      return { answer, gameState: { mode: null } };
    }

    const { requiredLetter, usedWords } = gameState;
    const result = wordChainGame.checkWordChainMove(selected?.text || userQuestion, requiredLetter, usedWords);

    if (!result.valid) {
      const answer = await phraseReply(`
The child's word chain move was invalid (reason: ${result.reason}). They needed
a word starting with "${requiredLetter}". Their message: "${userQuestion}".
Encourage them warmly and remind them of the required letter. Use 1-2 emojis.
`);
      return { answer, gameState };
    }

    const newLetter = wordChainGame.lastLetter(result.word);
    const options = wordOptions(newLetter, [...usedWords, result.word]);
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
        options,
      },
      options,
    };
  }
  // MATH GAME
  if (gameState.mode === "math_game") {


    const selected = selectedOption(userQuestion, gameState.options);
    const isAnswer = selected || await classifyIsAnswerAttempt({
      userQuestion, currentQuestion: gameState.currentQuestion, conversationTurns,
    });

    if (!isAnswer) {
      const answer = await answerOffTopicQuestion({ userQuestion, conversationTurns });
      return { answer, gameState: { mode: null } };
    }

    const correct = mathGame.checkMathAnswer(selected?.text || userQuestion, gameState.currentAnswer);
    const next = mathGame.generateProblem();
    const options = buildOptions(next.answer, [next.answer + 1, next.answer - 1, next.answer + 2]);

    const answer = await phraseReply(`
The child answered a math problem: "${gameState.currentQuestion}". Their
answer: "${userQuestion}". ${correct ? "This was CORRECT." : `This was WRONG. Correct answer was ${gameState.currentAnswer}.`}
Give short feedback matching their tone, then present the next problem:
"${next.question}". Use 1-2 emojis.
`);
    return {
      answer,
      gameState: { mode: "math_game", currentQuestion: next.question, currentAnswer: next.answer, options },
      options,
    };
  }
  // SPELLING CHALLENGE
  if (gameState.mode === "spelling") {

    const currentQ = `Spell the word "${gameState.currentWord}"`;
    const selected = selectedOption(userQuestion, gameState.options);
    const isAnswer = selected || await classifyIsAnswerAttempt({ userQuestion, currentQuestion: currentQ, conversationTurns });

    if (!isAnswer) {
      const answer = await answerOffTopicQuestion({ userQuestion, conversationTurns });
      return { answer, gameState: { mode: null } };
    }


    const correct = spellingGame.checkSpelling(selected?.text || userQuestion, gameState.currentWord);
    const nextWord = spellingGame.pickWord([...(gameState.usedWords || []), gameState.currentWord]);
    const options = spellingOptions(nextWord);

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
        options,
      },
      options,
    };
  }
  // GUESS THE ANIMAL
  if (gameState.mode === "guess_animal") {

    // The button version is a simple four-animal guess. It deliberately skips
    // free-form yes/no questions so a child never has to open the keyboard.
    const selected = selectedOption(userQuestion, gameState.options);
    if (selected) {
      const { secretAnimal } = gameState;
      const correct = guessAnimalGame.checkGuess(selected.text, secretAnimal.name);
      const nextAnimal = guessAnimalGame.pickSecretAnimal();
      const options = buildOptions(nextAnimal.name, ANIMAL_CHOICES);
      const answer = await phraseReply(correct
        ? `The child correctly guessed the animal is "${secretAnimal.name}"! Celebrate, share this fun fact: "${secretAnimal.funFact}", then say you are thinking of another animal and ask them to choose again. Use 1-2 emojis.`
        : `The child guessed "${selected.text}", but the secret animal was "${secretAnimal.name}". Be kind, share this fun fact: "${secretAnimal.funFact}", then say you are thinking of another animal and ask them to choose again. Use 1-2 emojis.`);
      return {
        answer,
        gameState: { mode: "guess_animal", secretAnimal: nextAnimal, triesLeft: guessAnimalGame.MAX_TRIES, options },
        options,
      };
    }

    const { secretAnimal, triesLeft } = gameState;
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

    const selected = selectedOption(userQuestion, gameState.options);
    const isAnswer = selected || await classifyIsAnswerAttempt({
      userQuestion, currentQuestion: gameState.currentQuestion, conversationTurns,
    });

    console.log("isAnswer", isAnswer)

    if (!isAnswer) {
      const answer = await answerOffTopicQuestion({ userQuestion, conversationTurns });
      return { answer, gameState: { mode: null } };
    }

    const correct = countingGame.checkAnswer(selected?.text || userQuestion, gameState.currentAnswer);
    const next = countingGame.generateProblem();
    const options = buildOptions(next.answer, [next.answer + 1, next.answer - 1, next.answer + 2]);

    const answer = await phraseReply(`
The child answered a counting problem: "${gameState.currentQuestion}". Their
answer: "${userQuestion}". ${correct ? "This was CORRECT." : `This was WRONG. Correct answer was ${gameState.currentAnswer}.`}
Give short feedback matching their tone, then present the next problem:
"${next.question}". Use 1-2 emojis.
`);
    return {
      answer,
      gameState: { mode: "counting_game", currentQuestion: next.question, currentAnswer: next.answer, options },
      options,
    };
  }
  // COLORS & SHAPES
  if (gameState.mode === "colors_shapes") {

    const selected = selectedOption(userQuestion, gameState.options);
    const isAnswer = selected || await classifyIsAnswerAttempt({
      userQuestion, currentQuestion: gameState.currentItem.question, conversationTurns,
    });

    if (!isAnswer) {
      const answer = await answerOffTopicQuestion({ userQuestion, conversationTurns });
      return { answer, gameState: { mode: null } };
    }
    const currentItem = gameState.currentItem;
    const correct = colorsShapesGame.checkAnswer(selected?.text || userQuestion, currentItem.answer);
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
    const options = buildOptions(nextItem.answer, COLOR_SHAPE_CHOICES);
    return {
      answer,
      gameState: {
        mode: "colors_shapes",
        currentIndex: index,
        currentItem: nextItem,
        askedIndexes: [...(gameState.askedIndexes || []), gameState.currentIndex],
        options,
      },
      options,
    };
  }
  // ALPHABET GAME
  if (gameState.mode === "alphabet_game") {

    const currentQ = `A word starting with the letter "${gameState.currentLetter}"`;
    const selected = selectedOption(userQuestion, gameState.options);
    const isAnswer = selected || await classifyIsAnswerAttempt({ userQuestion, currentQuestion: currentQ, conversationTurns });

    if (!isAnswer) {
      const answer = await answerOffTopicQuestion({ userQuestion, conversationTurns });
      return { answer, gameState: { mode: null } };
    }

    const valid = alphabetGame.startsWithLetter(selected?.text || userQuestion, gameState.currentLetter);
    const next = alphabetGame.nextLetter(gameState.currentLetter);
    const options = wordOptions(next);

    const answer = await phraseReply(`
The child is playing the Alphabet game. Current letter was "${gameState.currentLetter}".
Their answer: "${userQuestion}". ${valid ? "Their word correctly starts with that letter — celebrate!" : "Their word does NOT start with that letter — gently correct them."}
Then say: "${next} is for..." and ask them to think of a word starting with "${next}".
Match their tone. Use 1-2 emojis.
`);
    return { answer, gameState: { mode: "alphabet_game", currentLetter: next, options }, options };
  }

  // GEOGRAPHY CHALLENGE
  if (gameState.mode === "geography_game") {
    const current = gameState.currentQuestion;
    const selected = selectedOption(userQuestion, gameState.options);
    if (!selected) {
      const answer = await answerOffTopicQuestion({ userQuestion, conversationTurns });
      return { answer, gameState };
    }
    const correct = selected.text.toLowerCase() === current.answer.toLowerCase();
    const { index, question: next } = geographyGame.pickQuestion([
      ...(gameState.askedIndexes || []), gameState.currentIndex,
    ]);
    const options = questionOptions(next);
    const answer = await phraseReply(`
The child chose "${selected.text}" for this geography question: "${current.question}".
They were ${correct ? "CORRECT" : `WRONG; the correct answer was ${current.answer}`}. Give brief, warm feedback.
Then ask this next geography question: "${next.question}".
Do not read or list answer choices; the child will see them after you finish speaking. Use 1-2 emojis.
`);
    return { answer, gameState: { mode: "geography_game", currentIndex: index, currentQuestion: next, askedIndexes: [...(gameState.askedIndexes || []), gameState.currentIndex], options }, options };
  }

  // ANIMAL SOUNDS
  if (gameState.mode === "animal_sounds") {
    const current = gameState.currentQuestion;
    const selected = selectedOption(userQuestion, gameState.options);
    if (!selected) {
      const answer = await answerOffTopicQuestion({ userQuestion, conversationTurns });
      return { answer, gameState };
    }
    const correct = selected.text.toLowerCase() === current.answer.toLowerCase();
    const { index, question: next } = animalSoundsGame.pickQuestion([
      ...(gameState.askedIndexes || []), gameState.currentIndex,
    ]);
    const options = questionOptions(next);
    const answer = await phraseReply(`
The child chose "${selected.text}" for this animal-sound question: "${current.question}".
They were ${correct ? "CORRECT" : `WRONG; the correct answer was ${current.answer}`}. Give brief, warm feedback.
Then ask this next animal-sound question: "${next.question}".
Do not read or list answer choices; the child will see them after you finish speaking. Use 1-2 emojis.
`);
    return { answer, gameState: { mode: "animal_sounds", currentIndex: index, currentQuestion: next, askedIndexes: [...(gameState.askedIndexes || []), gameState.currentIndex], options }, options };
  }

// LOGIC PUZZLE

if (gameState.mode === "logic_puzzle") {

    const {
        currentPuzzleIndex
    } = gameState;

    const currentPuzzle =
        logicPuzzleGame.puzzles[currentPuzzleIndex];


    const selected = selectedOption(userQuestion, gameState.options);
    const isAnswer = selected || await classifyIsAnswerAttempt({
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
        String(selected?.text || userQuestion)
            .trim()
            .toLowerCase();

    const isCorrect =
        userAnswer === correctAnswer;
    const { index, puzzle: nextPuzzle } = logicPuzzleGame.pickPuzzle([
      ...(gameState.askedIndexes || []),
      currentPuzzleIndex,
    ]);
    const options = buildOptions(nextPuzzle.answer, logicPuzzleGame.puzzles.map((puzzle) => puzzle.answer));
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
Then immediately ask this next puzzle: "${nextPuzzle.question}".
Do not say "Next puzzle" in English when the reply language is not English.
`);

    return {
        answer,
        gameState: {
            mode: "logic_puzzle",
            currentPuzzleIndex: index,
            askedIndexes: [...(gameState.askedIndexes || []), currentPuzzleIndex],
            options,
        },
        options,
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
    const options = wordOptions(nextLetter, ["apple"]);
    return { answer, gameState: { mode: "word_chain", requiredLetter: nextLetter, usedWords: ["apple"], options }, options };
  }

  if (mathGame.isStartMathRequest(userQuestion)) {
    const problem = mathGame.generateProblem();
    const options = buildOptions(problem.answer, [problem.answer + 1, problem.answer - 1, problem.answer + 2]);
    const answer = await phraseReply(`
Start a "Beat the Robot" math game. Present this problem: "${problem.question}".
Match their tone. Use 1-2 emojis.
`);
    return { answer, gameState: { mode: "math_game", currentQuestion: problem.question, currentAnswer: problem.answer, options }, options };
  }

  if (spellingGame.isStartSpellingRequest(userQuestion)) {
    const word = spellingGame.pickWord([]);
    const options = spellingOptions(word);
    const answer = await phraseReply(`
Start a spelling challenge. Ask the child to spell: "${word}".
Match their tone. Use 1-2 emojis.
`);
    return { answer, gameState: { mode: "spelling", currentWord: word, usedWords: [], options }, options };
  }

  if (guessAnimalGame.isStartGuessAnimalRequest(userQuestion)) {
    const animal = guessAnimalGame.pickSecretAnimal();
    const options = buildOptions(animal.name, ANIMAL_CHOICES);
    const answer = await phraseReply(`
Start "Guess the Animal". Tell the child you're thinking of an animal and ask
them to choose their guess. Do NOT reveal the animal.
Match their tone. Use 1-2 emojis.
`);
    return { answer, gameState: { mode: "guess_animal", secretAnimal: animal, triesLeft: guessAnimalGame.MAX_TRIES, options }, options };
  }

  if (logicPuzzleGame.isStartLogicPuzzleRequest(userQuestion)) {
    const { index, puzzle } = logicPuzzleGame.pickPuzzle(gameState.askedIndexes || []);
    const options = buildOptions(puzzle.answer, logicPuzzleGame.puzzles.map((item) => item.answer));
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
        options,
      },
      options,
    };
  }

  if (countingGame.isStartCountingRequest(userQuestion)) {
    const problem = countingGame.generateProblem();
    const options = buildOptions(problem.answer, [problem.answer + 1, problem.answer - 1, problem.answer + 2]);
    const answer = await phraseReply(`
Start a counting game for young kids. Present this problem: "${problem.question}".
Match their tone. Use 1-2 emojis.
`);
    return { answer, gameState: { mode: "counting_game", currentQuestion: problem.question, currentAnswer: problem.answer, options }, options };
  }

  if (colorsShapesGame.isStartColorsShapesRequest(userQuestion)) {
    const { index, item } = colorsShapesGame.pickQuestion([]);
    const options = buildOptions(item.answer, COLOR_SHAPE_CHOICES);
    const answer = await phraseReply(`
Start a colors and shapes game. Ask this question: "${item.question}".
Match their tone. Use 1-2 emojis.
`);
    return { answer, gameState: { mode: "colors_shapes", currentIndex: index, currentItem: item, askedIndexes: [], options }, options };
  }

  if (alphabetGame.isStartAlphabetRequest(userQuestion)) {
    const options = wordOptions("A");
    const answer = await phraseReply(`
Start the Alphabet game. Say "A is for Apple!" and ask the child to think of
another word starting with A. Match their tone. Use 1-2 emojis.
`);
    return { answer, gameState: { mode: "alphabet_game", currentLetter: "A", options }, options };
  }

  if (geographyGame.isStartGeographyRequest(userQuestion)) {
    const { index, question } = geographyGame.pickQuestion([]);
    const options = questionOptions(question);
    const answer = await phraseReply(`
Start a Geography Challenge. Ask this question: "${question.question}".
Do not read or list answer choices; the child will see them after you finish speaking.
Keep it short, fun, and use 1-2 emojis.
`);
    return { answer, gameState: { mode: "geography_game", currentIndex: index, currentQuestion: question, askedIndexes: [], options }, options };
  }

  if (animalSoundsGame.isStartAnimalSoundsRequest(userQuestion)) {
    const { index, question } = animalSoundsGame.pickQuestion([]);
    const options = questionOptions(question);
    const answer = await phraseReply(`
Start an Animal Sounds game. Ask this question: "${question.question}".
Do not read or list answer choices; the child will see them after you finish speaking.
Keep it short, fun, and use 1-2 emojis.
`);
    return { answer, gameState: { mode: "animal_sounds", currentIndex: index, currentQuestion: question, askedIndexes: [], options }, options };
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
