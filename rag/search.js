const { retrieve } = require("./retrieve");
const { chatModel } = require("./ai");
const riddleGame = require("../games/Riddles/riddleGame");
const quizGame = require("../games/Quiz_Zone/quizGame");
const { classifyAndReply } = require("../games/Riddles/classifyAndReply");
const { handleRiddleIntent } = require("../games/Riddles/riddleLogic");
const { classifyQuizCategory, classifyQuizMode, judgeOpenAnswer } = require("../games/Quiz_Zone/quizClassifier");
const { phraseQuizQuestion } = require("../games/Quiz_Zone/quizQuestion");
const { phraseQuizFeedback } = require("../games/Quiz_Zone/quizFeedback");

async function phraseReply(instruction) {
  const result = await chatModel.generateContent(instruction);
  return result.response.text().trim();
}


async function search(userQuestion, history = [], gameState = {}) {
  const conversationTurns = history.map((m) => ({
    role: m.sender === "user" ? "user" : "model",
    parts: [{ text: m.text }],
  }));

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


  // EVERYTHING ELSE — normal AI-powered answer (Kikoo facts, jokes, chit-chat)

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