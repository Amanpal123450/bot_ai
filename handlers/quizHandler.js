const quizGame = require("../games/Quiz_Zone/quizGame");
const {
    classifyQuizCategory,
    classifyQuizMode,
    judgeOpenAnswer,
} = require("../games/Quiz_Zone/quizClassifier");

const { phraseQuizQuestion } = require("../games/Quiz_Zone/quizQuestion");
const { phraseQuizFeedback } = require("../games/Quiz_Zone/quizFeedback");
const { phraseReply } = require("../services/aiService");
const { answerOffTopicQuestion } = require("./generalHandler");
const { classifyIsAnswerAttempt } = require("../search/gameAnswerIntent");

async function handleQuiz(userQuestion, conversationTurns, gameState) {

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

        const currentQuestion = `Quiz question:"${current.question}" Answer mode: ${answerMode} 
        ${answerMode === "mcq" ? `Options: ${JSON.stringify(current.options)}` : ""}
        The child should answer this quiz question.
`;

    const isAnswer = await classifyIsAnswerAttempt({
        userQuestion,
        currentQuestion,
        conversationTurns
    });

    if (!isAnswer) {
        const answer = await answerOffTopicQuestion({
            userQuestion,
            conversationTurns
        });

        return {
            answer,
            gameState: {
                mode: null
            }
        };
    }


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

    // Start quiz
    if (quizGame.isStartQuizRequest(userQuestion)) {
        const answer = await phraseReply(`
The child wants to play the quiz, matching the language/tone of their message: "${userQuestion}".
Ask which category they'd like: Animals 🐘, Space 🚀, Dinosaurs 🦖, or General Knowledge 🌍 —
or "surprise me" for a mix. Keep it short and fun, use 1-2 emojis.
`);
        return { answer, gameState: { mode: "quiz_setup_category" } };
    }

    return null;
}

module.exports = { handleQuiz };