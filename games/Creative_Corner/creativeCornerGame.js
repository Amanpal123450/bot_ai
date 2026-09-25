const data = require("./creativeCornerData");

// Each subtype has its own start trigger — checked in this priority order
// (most specific first) so e.g. "story" doesn't accidentally swallow "song".
const SUBTYPE_TRIGGERS = [
  { subtype: "drawing", keywords: ["draw", "drawing" ,"drow" ,"image","images", "draw the image"] },
  { subtype: "story", keywords: ["story starter", "complete the story", "finish this story"] },
  { subtype: "song", keywords: ["make a song", "make up a song", "write a song"] },
  { subtype: "superhero", keywords: ["invent a superhero", "create a superhero", "design a superhero"] },
  { subtype: "monster", keywords: ["design a monster", "create a monster", "invent a monster"] },
  { subtype: "papercraft", keywords: ["paper craft", "papercraft", "origami"] },
];



const MENU_TRIGGERS = ["creative corner", "creative activity", "creative activities", "let's create"];

function isCreativeMenuRequest(text) {
  const lower = text.toLowerCase();
  return MENU_TRIGGERS.some((k) => lower.includes(k));
}

function detectSubtype(text) {
  const lower = text.toLowerCase();
  for (const { subtype, keywords } of SUBTYPE_TRIGGERS) {
    if (keywords.some((k) => lower.includes(k))) return subtype;
  }
  return null;
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Returns { subtype, prompt } — prompt is what the bot says to kick off the activity.
function startActivity(subtype) {
  switch (subtype) {
    case "drawing":
      return { subtype, prompt: pickRandom(data.drawingPrompts) };
    case "story":
      return { subtype, prompt: pickRandom(data.storyStarters) };
    case "song":
      return { subtype, prompt: `Let's make a song about ${pickRandom(data.songTopics)}!` };
    case "superhero":
      return { subtype, prompt: "Let's invent a superhero! What's their name?" };
    case "monster":
      return { subtype, prompt: "Let's design a monster! How many eyes does it have?" };
    case "papercraft":
      return { subtype, prompt: `Let's make ${pickRandom(data.papercraftIdeas)}! (Ask a grown-up to help with folding.)` };
    default:
      return { subtype: "drawing", prompt: pickRandom(data.drawingPrompts) };
  }
}

module.exports = { isCreativeMenuRequest, detectSubtype, startActivity };