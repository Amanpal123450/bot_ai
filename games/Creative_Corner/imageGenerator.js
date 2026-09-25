async function generateImage(prompt) {
  const encodedPrompt = encodeURIComponent(prompt);

  const url =
    `https://gen.pollinations.ai/image/${encodedPrompt}?model=flux`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.POLLINATIONS_API_KEY}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Pollinations error ${response.status}: ${errorText}`
    );
  }

  const imageBuffer = await response.arrayBuffer();

  return Buffer.from(imageBuffer);
}

module.exports = {
  generateImage,
};