export type CompatQuestion = {
  q: string;
  category: CompatCategory;
  emoji: string;
  options: string[];
};

export type CompatCategory =
  | "Love Language"
  | "Lifestyle"
  | "Future"
  | "Intimacy"
  | "Playfulness";

export const COMPAT_CATEGORIES: CompatCategory[] = [
  "Love Language",
  "Lifestyle",
  "Future",
  "Intimacy",
  "Playfulness",
];

export const COMPAT_QUESTIONS: CompatQuestion[] = [
  { q: "How do you most love to be loved?", category: "Love Language", emoji: "💌", options: ["Words of affirmation", "Quality time", "Physical touch", "Little gifts"] },
  { q: "After a hard day, what do you need first?", category: "Love Language", emoji: "🫂", options: ["A long hug", "Someone to listen", "Silence together", "To be distracted"] },
  { q: "The sweetest text to receive is…", category: "Love Language", emoji: "📱", options: ["\"Thinking of you\"", "\"I'm proud of you\"", "\"Come here\"", "A random meme"] },
  { q: "How do you say sorry best?", category: "Love Language", emoji: "🌹", options: ["Straight words", "A thoughtful gesture", "A long hug", "Making them laugh"] },
  { q: "Love feels most real to you when…", category: "Love Language", emoji: "✨", options: ["We talk for hours", "We do nothing together", "We touch a lot", "We surprise each other"] },

  { q: "Perfect Sunday together?", category: "Lifestyle", emoji: "☀️", options: ["Slow morning in bed", "Brunch and a walk", "Road trip", "Separate hobbies, same room"] },
  { q: "Your ideal home vibe is…", category: "Lifestyle", emoji: "🏡", options: ["Cozy and warm", "Minimal and clean", "Colourful chaos", "Plants everywhere"] },
  { q: "Night owl or morning person?", category: "Lifestyle", emoji: "🌙", options: ["Night owl", "Morning person", "Depends on the day", "Chronically both"] },
  { q: "How social do you want life to be?", category: "Lifestyle", emoji: "🥂", options: ["Just us two", "Small circle", "Always people over", "Depends on mood"] },
  { q: "Money in a relationship should be…", category: "Lifestyle", emoji: "💸", options: ["Fully shared", "Mostly separate", "Split fairly", "Whoever has it, spends it"] },

  { q: "Where do you see us in five years?", category: "Future", emoji: "🔮", options: ["Same city, settled", "Travelling the world", "Building something together", "Wherever, as long as together"] },
  { q: "Dream wedding energy?", category: "Future", emoji: "💍", options: ["Big and loud", "Tiny and private", "Destination escape", "Courthouse then dinner"] },
  { q: "Kids someday?", category: "Future", emoji: "🍼", options: ["Yes, definitely", "Maybe one day", "No, just us", "Pets count"] },
  { q: "Ideal place to grow old in?", category: "Future", emoji: "🌊", options: ["By the sea", "In the mountains", "Big city forever", "Quiet countryside"] },
  { q: "What matters most long-term?", category: "Future", emoji: "🕊️", options: ["Emotional safety", "Adventure together", "Growth and ambition", "Peace and routine"] },

  { q: "How much closeness feels right?", category: "Intimacy", emoji: "🔥", options: ["Always touching", "Close but with space", "Deep talks over touch", "Quality over quantity"] },
  { q: "When upset, you…", category: "Intimacy", emoji: "🌧️", options: ["Talk it out now", "Need time alone first", "Write it down", "Go quiet and wait"] },
  { q: "Jealousy in your world is…", category: "Intimacy", emoji: "😳", options: ["A little is cute", "A red flag", "Totally normal", "Never felt it"] },
  { q: "Your idea of true trust is…", category: "Intimacy", emoji: "🔐", options: ["Total honesty", "Privacy respected", "No secrets, ever", "Actions over words"] },
  { q: "Best way to reconnect after a fight?", category: "Intimacy", emoji: "💞", options: ["Long conversation", "Physical closeness", "Do something fun", "Give it a night"] },

  { q: "Pick our signature date night", category: "Playfulness", emoji: "🎬", options: ["Movie and takeout", "Dancing till late", "Cooking together", "Midnight drive"] },
  { q: "Your flirting style is…", category: "Playfulness", emoji: "😉", options: ["Cheesy lines", "Teasing", "Soft and shy", "Bold and direct"] },
  { q: "Vacation mode?", category: "Playfulness", emoji: "✈️", options: ["Beach and nothing", "Packed itinerary", "Mountains and hikes", "New city, no plan"] },
  { q: "Who's more dramatic?", category: "Playfulness", emoji: "🎭", options: ["Me, obviously", "You, obviously", "Equally chaotic", "Neither of us"] },
  { q: "Our love story is a…", category: "Playfulness", emoji: "📖", options: ["Rom-com", "Slow-burn drama", "Adventure movie", "Cozy indie film"] },
];

export type CompatScore = {
  total: number;
  matched: number;
  categories: { name: CompatCategory; score: number; matched: number; total: number }[];
  best: CompatCategory;
  worst: CompatCategory;
};

export function computeScore(a: string[], b: string[]): CompatScore {
  const perCat = new Map<CompatCategory, { matched: number; total: number }>();
  let matched = 0;
  COMPAT_QUESTIONS.forEach((question, i) => {
    const hit = a[i] && b[i] && a[i] === b[i];
    if (hit) matched++;
    const cur = perCat.get(question.category) ?? { matched: 0, total: 0 };
    cur.total++;
    if (hit) cur.matched++;
    perCat.set(question.category, cur);
  });
  const categories = COMPAT_CATEGORIES.map((name) => {
    const c = perCat.get(name) ?? { matched: 0, total: 1 };
    return { name, matched: c.matched, total: c.total, score: Math.round((c.matched / c.total) * 100) };
  });
  const sorted = [...categories].sort((x, y) => y.score - x.score);
  // Gentle curve: pure agreement is rare, differences are still chemistry.
  const raw = matched / COMPAT_QUESTIONS.length;
  const total = Math.round(Math.min(99, 42 + raw * 57));
  return {
    total,
    matched,
    categories,
    best: sorted[0].name,
    worst: sorted[sorted.length - 1].name,
  };
}

export function scoreLabel(score: number): { title: string; line: string } {
  if (score >= 90) return { title: "Soulmates", line: "Two hearts running on the same frequency." };
  if (score >= 78) return { title: "Deeply In Sync", line: "You just get each other, and it shows." };
  if (score >= 65) return { title: "Beautifully Matched", line: "Strong core, sweet little differences." };
  if (score >= 52) return { title: "Opposites Attract", line: "Your differences are the spark." };
  return { title: "Curious Chemistry", line: "So much left to discover about each other." };
}

export function achievements(score: CompatScore): { emoji: string; title: string; desc: string }[] {
  const out: { emoji: string; title: string; desc: string }[] = [];
  out.push({ emoji: "🏁", title: "Test Complete", desc: "You both finished all 25 questions." });
  if (score.matched >= 5) out.push({ emoji: "🎯", title: "Mind Readers", desc: `Matched on ${score.matched} answers.` });
  if (score.total >= 78) out.push({ emoji: "💞", title: "In Sync", desc: "Scored above 78% compatibility." });
  const perfect = score.categories.find((c) => c.score === 100);
  if (perfect) out.push({ emoji: "🌟", title: `${perfect.name} Master`, desc: "A perfect category match." });
  if (score.categories.some((c) => c.score === 0)) out.push({ emoji: "🧲", title: "Total Opposites", desc: "One category with zero matches — spicy." });
  return out;
}