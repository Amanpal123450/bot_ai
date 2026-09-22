async function handleRiddleIntent({
  intent,
  reply,
  userQuestion,
  gameState,
  riddleGame,
  phraseReply,
}) {
  switch (intent) {
    case "correct_answer":
    case "give_up": {
      return {
        answer: reply,
        gameState: {
          mode: null,
          currentRiddleIndex: undefined,
          askedIndexes: [
            ...(gameState.askedIndexes || []),
            gameState.currentRiddleIndex,
          ],
        },
      };
    }

    case "new_riddle_request": {
      const { index, riddle } = riddleGame.pickNewRiddle([
        ...(gameState.askedIndexes || []),
        gameState.currentRiddleIndex,
      ]);

      const answer = await phraseReply(`
Present this new riddle to the child, matching the language/tone of their message: "${userQuestion}".

New riddle: "${riddle.question}"

Do NOT reveal the answer.
Keep it short, fun, and use 1-2 emojis.
`);

      return {
        answer,
        gameState: {
          mode: "riddle",
          currentRiddleIndex: index,
          askedIndexes: [
            ...(gameState.askedIndexes || []),
            gameState.currentRiddleIndex,
          ],
        },
      };
    }

    default:
      return {
        answer: reply,
        gameState,
      };
  }
}

module.exports = {
  handleRiddleIntent,
};