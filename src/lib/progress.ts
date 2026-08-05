/** Local, device-side progression: XP, Love Points, levels, streaks, achievements, loot. */

export type Progress = {
  xp: number;
  lp: number; // Love Points (spendable-ish currency)
  streak: number;
  lastPlayed: string | null; // YYYY-MM-DD
  games: number;
  answers: number;
  achievements: string[];
  cards: string[]; // collected mystery reward cards
  chapters: number; // story mode chapters unlocked
  stats: { trust: number; communication: number; romance: number; humor: number };
};

const KEY = "loveline_progress_v1";

const EMPTY: Progress = {
  xp: 0, lp: 0, streak: 0, lastPlayed: null, games: 0, answers: 0,
  achievements: [], cards: [], chapters: 1,
  stats: { trust: 10, communication: 10, romance: 10, humor: 10 },
};

export const LEVEL_TITLES = [
  "New Sparks", "Crushing", "Butterflies", "Smitten", "Sweethearts",
  "Inseparable", "Soulmates", "Legendary Love", "Eternal Flame",
];

export function levelFromXp(xp: number) {
  return Math.floor(Math.sqrt(xp / 60)) + 1;
}
export function xpForLevel(level: number) {
  return Math.pow(level - 1, 2) * 60;
}
export function levelTitle(level: number) {
  return LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)] ?? "Eternal Flame";
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function loadProgress(): Progress {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<Progress>) };
  } catch {
    return { ...EMPTY };
  }
}

export function saveProgress(p: Progress) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
    window.dispatchEvent(new CustomEvent("loveline:progress", { detail: p }));
  } catch { /* ignore */ }
}

/** Call once per day of play — keeps the daily streak alive. */
export function touchStreak(): { progress: Progress; streakUp: boolean } {
  const p = loadProgress();
  const t = today();
  if (p.lastPlayed === t) return { progress: p, streakUp: false };
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  p.streak = p.lastPlayed === yesterday ? p.streak + 1 : 1;
  p.lastPlayed = t;
  p.lp += 20 + p.streak * 5;
  saveProgress(p);
  return { progress: p, streakUp: true };
}

export type AchievementDef = { id: string; title: string; desc: string; emoji: string; test: (p: Progress) => boolean };

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_answer", title: "First Heartbeat", desc: "Answer your very first question", emoji: "💗", test: p => p.answers >= 1 },
  { id: "ten_answers", title: "Deep Talker", desc: "Answer 10 questions", emoji: "🗝️", test: p => p.answers >= 10 },
  { id: "fifty_answers", title: "Open Book", desc: "Answer 50 questions", emoji: "📖", test: p => p.answers >= 50 },
  { id: "first_game", title: "Date Night", desc: "Finish your first game", emoji: "🌙", test: p => p.games >= 1 },
  { id: "five_games", title: "Regulars", desc: "Finish 5 games together", emoji: "🍷", test: p => p.games >= 5 },
  { id: "streak_3", title: "Three Day Spark", desc: "Play 3 days in a row", emoji: "🔥", test: p => p.streak >= 3 },
  { id: "streak_7", title: "Unbreakable Week", desc: "Play 7 days in a row", emoji: "⚡", test: p => p.streak >= 7 },
  { id: "level_5", title: "Sweethearts", desc: "Reach level 5", emoji: "👑", test: p => levelFromXp(p.xp) >= 5 },
  { id: "collector", title: "Card Collector", desc: "Collect 5 mystery cards", emoji: "🃏", test: p => p.cards.length >= 5 },
  { id: "midnight", title: "Midnight Lovers", desc: "Play after midnight", emoji: "🌌", test: () => new Date().getHours() < 5 },
];

export type MysteryCard = { id: string; title: string; text: string; emoji: string; rarity: "common" | "rare" | "legendary" };

export const MYSTERY_CARDS: MysteryCard[] = [
  { id: "kiss", title: "Kiss Coupon", text: "Redeemable for one long, unhurried kiss.", emoji: "💋", rarity: "common" },
  { id: "date", title: "Free Date Pass", text: "Your partner plans the whole evening. No questions.", emoji: "🎟️", rarity: "rare" },
  { id: "truth", title: "One Free Truth", text: "Ask anything. They must answer honestly.", emoji: "🔮", rarity: "rare" },
  { id: "hug", title: "20 Second Hug", text: "Science says it releases oxytocin. Claim it now.", emoji: "🫂", rarity: "common" },
  { id: "song", title: "Dedicated Song", text: "They must send you a song that reminds them of you.", emoji: "🎶", rarity: "common" },
  { id: "confession", title: "Secret Confession", text: "A sealed envelope: confess something you've never said.", emoji: "✉️", rarity: "legendary" },
  { id: "breakfast", title: "Breakfast in Bed", text: "Tomorrow morning. Non-negotiable.", emoji: "🥐", rarity: "rare" },
  { id: "starlight", title: "Starlight Promise", text: "One night, no phones. Just the two of you.", emoji: "✨", rarity: "legendary" },
  { id: "roast", title: "Roast Immunity", text: "One free pass from any teasing for 24 hours.", emoji: "🛡️", rarity: "common" },
  { id: "dance", title: "Kitchen Slow Dance", text: "One song. Bare feet. Right now.", emoji: "💃", rarity: "rare" },
];

export function drawCard(): MysteryCard {
  const roll = Math.random();
  const pool = MYSTERY_CARDS.filter(c =>
    roll < 0.08 ? c.rarity === "legendary" : roll < 0.4 ? c.rarity === "rare" : c.rarity === "common");
  const list = pool.length ? pool : MYSTERY_CARDS;
  return list[Math.floor(Math.random() * list.length)]!;
}

export type AwardResult = {
  progress: Progress;
  xpGained: number;
  lpGained: number;
  leveledUp: boolean;
  level: number;
  newAchievements: AchievementDef[];
  card?: MysteryCard;
};

export function award(opts: {
  xp?: number; lp?: number; answers?: number; games?: number; card?: boolean;
  stats?: Partial<Progress["stats"]>;
}): AwardResult {
  const p = loadProgress();
  const before = levelFromXp(p.xp);
  p.xp += opts.xp ?? 0;
  p.lp += opts.lp ?? 0;
  p.answers += opts.answers ?? 0;
  p.games += opts.games ?? 0;
  if (opts.stats) {
    for (const k of Object.keys(opts.stats) as (keyof Progress["stats"])[]) {
      p.stats[k] = Math.min(100, p.stats[k] + (opts.stats[k] ?? 0));
    }
  }
  let card: MysteryCard | undefined;
  if (opts.card) {
    card = drawCard();
    if (!p.cards.includes(card.id)) p.cards.push(card.id);
  }
  const after = levelFromXp(p.xp);
  if (after > before) p.chapters = Math.max(p.chapters, after);
  const newAchievements = ACHIEVEMENTS.filter(a => !p.achievements.includes(a.id) && a.test(p));
  p.achievements.push(...newAchievements.map(a => a.id));
  saveProgress(p);
  return {
    progress: p,
    xpGained: opts.xp ?? 0,
    lpGained: opts.lp ?? 0,
    leveledUp: after > before,
    level: after,
    newAchievements,
    ...(card ? { card } : {}),
  };
}

/* ---- Live events: Midnight Challenge, Weekend Quest, Boss Battle ---- */
export type LiveEvent = { id: string; title: string; desc: string; emoji: string; bonus: string };

export function activeEvents(p: Progress): LiveEvent[] {
  const out: LiveEvent[] = [];
  const h = new Date().getHours();
  const d = new Date().getDay();
  if (h >= 23 || h < 5) out.push({ id: "midnight", title: "Midnight Challenge", desc: "Play now for double XP — the honest hours.", emoji: "🌌", bonus: "2× XP" });
  if (d === 0 || d === 6) out.push({ id: "weekend", title: "Weekend Exclusive Quest", desc: "Finish any game this weekend for a guaranteed mystery card.", emoji: "🎁", bonus: "+1 Card" });
  if (p.games > 0 && p.games % 5 === 4) out.push({ id: "boss", title: "Boss Battle Incoming", desc: "One more game unlocks the Boss Round — hardest questions, biggest rewards.", emoji: "🐉", bonus: "3× LP" });
  return out;
}

export function xpMultiplier() {
  const h = new Date().getHours();
  return h >= 23 || h < 5 ? 2 : 1;
}