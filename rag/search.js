const { retrieve } = require("./retrieve");
const { chatModel } = require("./ai");
const riddleGame = require("../games/Riddles/riddleGame");
const quizGame = require("../games/Quiz_Zone/quizGame");
const { classifyAndReply } = require("../games/Riddles/classifyAndReply");
const { handleRiddleIntent } = require("../games/Riddles/riddleLogic");
const { classifyQuizCategory, classifyQuizMode, judgeOpenAnswer } = require("../games/Quiz_Zone/quizClassifier");
const { phraseQuizQuestion } = require("../games/Quiz_Zone/quizQuestion");
const { phraseQuizFeedback } = require("../games/Quiz_Zone/quizFeedback");
const wordChainGame = require("../games/Learning_Games/wordChainGame");
const mathGame = require("../games/Learning_Games/mathGame");
const spellingGame = require("../games/Learning_Games/spellingGame");
const guessAnimalGame = require("../games/Learning_Games/guessAnimalGame");
const { classifyGuessAnimalMessage } = require("../games/Learning_Games/guessAnimalClassifier");
const logicPuzzleGame = require("../games/Learning_Games/logicPuzzleGame");
const creativeCorner = require("../games/Creative_Corner/creativeCornerGame");
const countingGame = require("../games/base_Games/countingGame");
const colorsShapesGame = require("../games/base_Games/colorsShapesGame");
const alphabetGame = require("../games/base_Games/alphabetGame");
const { generateImage } = require("../games/Creative_Corner/imageGenerator");
const { classifyDrawingRequest } = require("../games/Creative_Corner/drawingClassifier");

async function phraseReply(instruction) {
  const result = await chatModel.generateContent(instruction);
  return result.response.text().trim();
}

// AI decides if the child wants the bot's PREVIOUS message repeated/translated,
// or if this is a genuinely new question — no hardcoded keyword list needed.
async function classifyGeneralIntent({ userQuestion, lastBotMessage, conversationTurns }) {
  if (!lastBotMessage) {
    return { type: "new_topic" };
  }

  const instructionText = `
You are Kikoo's kids assistant. Your previous message to the child was:
"${lastBotMessage}"

The child just replied: "${userQuestion}"

Decide what the child wants:
- "repeat_or_translate": they want your PREVIOUS message said again, repeated,
  or translated/rephrased into a different language or style (e.g. they didn't
  understand it, or they're asking for it in Hindi/Hinglish/English/etc.)
- "new_topic": this is a new question, request, or topic — unrelated to simply
  repeating your last message.

Respond ONLY with JSON: {"type": "repeat_or_translate" | "new_topic"}
`;

  const result = await chatModel.generateContent({
    contents: [...conversationTurns, { role: "user", parts: [{ text: instructionText }] }],
    generationConfig: { responseMimeType: "application/json" },
  });

  try {
    return JSON.parse(result.response.text());
  } catch {
    return { type: "new_topic" }; // fail safe — don't block a real new question
  }
}

const VOCAB_TRIGGERS = ["vocabulary builder", "word of the day"];
function isVocabRequest(text) {
  return VOCAB_TRIGGERS.some((k) => text.toLowerCase().includes(k));
}


async function search(userQuestion, history = [], gameState = {}) {
  const conversationTurns = history.map((m) => ({
    role: m.sender === "user" ? "user" : "model",
    parts: [{ text: m.text }],
  }));


  const isAnyGameActive = !!gameState.mode;

  if (isAnyGameActive) {
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
    isVocabRequest(userQuestion);  

    if (wantsToSwitch) {
      gameState = {}; 
    }
  }

  // step 1: choosing category 

  if (gameState.mode === "quiz_setup_category") {
    const { category, reply } = await classifyQuizCategory({ userQuestion, conversationTurns });

    if (category === "unclear") {
      return { answer: reply, gameState }; // stay on this step, ask again
    }

    return {
      answer: reply,
      gameState: {
        mode: "quiz_setup_mode",
        pendingCategory: category === "mixed" ? null : category,
      },
    };
  }

 
  //step 2: choosing MCQ vs open answer then start round

  if (gameState.mode === "quiz_setup_mode") {
    const { mode, reply } = await classifyQuizMode({ userQuestion, conversationTurns });

    if (mode === "unclear") {
      return { answer: reply, gameState }; // stay on this step, ask again
    }

    const questions = quizGame.buildRound(gameState.pendingCategory);
    console.log("questions:", questions);
    const prepared = questions.map((q) => ({
      ...q,
      options: mode === "mcq" ? quizGame.buildOptions(q.answer, q.category) : null,
    }));

    const firstQuestionText = await phraseQuizQuestion({
      userQuestion,
      item: prepared[0],
      answerMode: mode,
      questionNumber: 1,
      conversationTurns,
      introText: reply, // include the AI's confirmation before the question
    });

    return {
      answer: firstQuestionText,
      gameState: {
        mode: "quiz",
        answerMode: mode,
        questions: prepared,
        currentIndex: 0,
        correctCount: 0,
      },
    };
  }

 
  //  answering questions 1 to 5

  if (gameState.mode === "quiz") {
    const { questions, currentIndex, answerMode, correctCount } = gameState;
    const current = questions[currentIndex];

    let isCorrect;
    if (answerMode === "mcq") {
      isCorrect = quizGame.checkMCQAnswer(userQuestion, current.options, current.answer);
    } else {
      isCorrect = await judgeOpenAnswer({
        question: current.question,
        correctAnswer: current.answer,
        userAnswer: userQuestion,
      });
    }

    const newCorrectCount = correctCount + (isCorrect ? 1 : 0);
    const nextIndex = currentIndex + 1;
    const isLastQuestion = nextIndex >= questions.length;

    const answer = await phraseQuizFeedback({
      userQuestion,
      isCorrect,
      correctAnswer: current.answer,
      nextItem: isLastQuestion ? null : questions[nextIndex],
      answerMode,
      questionNumber: currentIndex,
      isLastQuestion,
      correctCount: newCorrectCount,
      conversationTurns,
    });

    if (isLastQuestion) {
      return { answer, gameState: { mode: null } };
    }

    return {
      answer,
      gameState: {
        mode: "quiz",
        answerMode,
        questions,
        currentIndex: nextIndex,
        correctCount: newCorrectCount,
      },
    };
  }

// Learning_Games

  if (gameState.mode === "word_chain") {
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

if (gameState.mode === "creative_corner") {
  const { subtype, prompt } = gameState;

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

// COUNTING GAME
if (gameState.mode === "counting_game") {
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

 
  //logicPuzzleGame


 // RIDDLE LOGIC 

  const riddleActive =
    gameState.mode === "riddle" && gameState.currentRiddleIndex !== undefined;

  if (riddleActive) {
    const current = riddleGame.riddles[gameState.currentRiddleIndex];
    const hintFact = riddleGame.generateHint(current.answer);

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

  
  // Check if they're starting quiz or riddle
  
  if (quizGame.isStartQuizRequest(userQuestion)) {
    const answer = await phraseReply(`
The child wants to play the quiz, matching the language/tone of their message: "${userQuestion}".
Ask which category they'd like: Animals 🐘, Space 🚀, Dinosaurs 🦖, or General Knowledge 🌍 —
or "surprise me" for a mix. Keep it short and fun, use 1-2 emojis.
`);
    return { answer, gameState: { mode: "quiz_setup_category" } };
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

if (creativeCorner.isCreativeMenuRequest(userQuestion)) {
  const answer = await phraseReply(`
The child wants to see Creative Corner activities, matching their language/tone: "${userQuestion}".
List these options with emojis: Drawing prompts 🎨, Story starters 📖, Make up a song 🎵,
Invent a superhero 🦸, Design a monster 👹, Paper craft ideas ✂️.
Ask which one they'd like to try. Keep it short and fun.
`);
  return { answer, gameState: { mode: null } };
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

if (isVocabRequest(userQuestion)) {
  const answer = await phraseReply(`
The child wants Vocabulary Builder — share ONE new word appropriate for kids,
its simple meaning, and an example sentence using it. Match their tone: "${userQuestion}".
Use 1-2 emojis.
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

  // EVERYTHING ELSE — normal AI-powered answer (Kikoo facts, jokes, chit-chat)

   const lastBotMessage = [...history].reverse().find((m) => m.sender !== "user")?.text;

  const generalIntent = await classifyGeneralIntent({
    userQuestion,
    lastBotMessage,
    conversationTurns,
  });

  if (generalIntent.type === "repeat_or_translate" && lastBotMessage) {
    const answer = await phraseReply(`
The child wants your PREVIOUS message repeated or said in a different
language/style, based on their request: "${userQuestion}".

Your previous message was: "${lastBotMessage}"

Repeat or rephrase THAT SAME message in the language/style they asked for.
Do NOT introduce a new topic, joke, or activity — only restate what you
already said. Keep it short and use 1-2 emojis.
`);
    return { answer, gameState };
  }

  const matches = await retrieve(userQuestion);
  const context = matches.map((m) => `From ${m.source}:\n${m.text}`).join("\n\n---\n\n");

  const prompt = `
Use the Context to answer the User.

Rules:
- For Kikoo facts, use only the Context.
- For jokes, poems, stories and creative requests, use relevant Context content.
- Give one short item at a time.
- Keep the response short, friendly and child-safe.
- Reply in the same language/style the user is using.
- If a Kikoo fact is missing from Context, say:
"Sorry, I don't have this information. Please contact Kikoo support at info@kikoo.in."

Context:
${context}

User:
${userQuestion}

Answer:
`;

  const result = await chatModel.generateContent({
    contents: [...conversationTurns, { role: "user", parts: [{ text: prompt }] }],
  });

  return { answer: result.response.text(), gameState: { mode: null } };
}

module.exports = { search };