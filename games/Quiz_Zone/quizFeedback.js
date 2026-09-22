const { chatModel } = require("../../rag/ai");
const { buildQuestionFacts } = require("./quizQuestion");

async function phraseQuizFeedback({ userQuestion, isCorrect, correctAnswer, nextItem, answerMode, questionNumber, isLastQuestion, correctCount, conversationTurns }) {
  let instruction = `
The child answered a quiz question. Their message: "${userQuestion}".
${isCorrect ? "Their answer was CORRECT." : `Their answer was WRONG. The correct answer was: "${correctAnswer}".`}
Give short feedback matching their language/tone:
- If correct: something like "Woohoo! You got it! +1 star!" (celebrate).
- If wrong: something like "Nice try! The answer is ${correctAnswer}. You'll get the next one!" (encourage, reveal the answer).
Use 1-2 emojis.
`;

  if (isLastQuestion) {
    instruction += `
This was the LAST question (5 of 5). The child's final score is ${correctCount} out of 5.
After the feedback above, add the final result:
${correctCount === 5
        ? `Announce excitedly: "5 out of 5! You earned the Super Brain badge!" 🧠🏆`
        : `Announce their score out of 5 warmly and encourage them to play again.`}
`;
  } else {
    const facts = buildQuestionFacts(nextItem, answerMode, questionNumber + 1);
    instruction += `
After the feedback above, present the NEXT question (do not reveal its answer):
${facts}
`;
  }

  const result = await chatModel.generateContent({
    contents: [...conversationTurns, { role: "user", parts: [{ text: instruction }] }],
  });
  return result.response.text().trim();
}

module.exports = {
  phraseQuizFeedback,
};