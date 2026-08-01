import { DATE_QUESTIONS } from "./questions";

export type Prompt = { q: string; category: string; options?: [string, string] };

export type GameMode = "questions" | "thisorthat" | "truthdare" | "guessme";

export const THIS_OR_THAT: Prompt[] = [
  { q: "Cozy night in or dancing till 2am?", category: "This or That", options: ["Cozy night in", "Dancing till 2am"] },
  { q: "Beach sunset or mountain sunrise?", category: "This or That", options: ["Beach sunset", "Mountain sunrise"] },
  { q: "Handwritten letters or long voice notes?", category: "This or That", options: ["Handwritten letters", "Long voice notes"] },
  { q: "Forehead kisses or tight hugs?", category: "This or That", options: ["Forehead kisses", "Tight hugs"] },
  { q: "Slow morning together or midnight drive?", category: "This or That", options: ["Slow morning", "Midnight drive"] },
  { q: "Cooking together or ordering in?", category: "This or That", options: ["Cooking together", "Ordering in"] },
  { q: "Surprise gifts or planned trips?", category: "This or That", options: ["Surprise gifts", "Planned trips"] },
  { q: "Rain and chai or snow and coffee?", category: "This or That", options: ["Rain and chai", "Snow and coffee"] },
  { q: "Movie marathon or stargazing?", category: "This or That", options: ["Movie marathon", "Stargazing"] },
  { q: "Being called 'baby' or 'jaan'?", category: "This or That", options: ["Baby", "Jaan"] },
  { q: "Holding hands in public or secret glances?", category: "This or That", options: ["Holding hands", "Secret glances"] },
  { q: "Love songs or love letters?", category: "This or That", options: ["Love songs", "Love letters"] },
  { q: "City lights or countryside quiet?", category: "This or That", options: ["City lights", "Countryside quiet"] },
  { q: "Little daily texts or one long call?", category: "This or That", options: ["Daily texts", "One long call"] },
  { q: "Dress up dinner or pyjama picnic?", category: "This or That", options: ["Dress up dinner", "Pyjama picnic"] },
  { q: "First kiss again or first 'I love you' again?", category: "This or That", options: ["First kiss", "First I love you"] },
  { q: "Adventure honeymoon or luxury honeymoon?", category: "This or That", options: ["Adventure", "Luxury"] },
  { q: "Big loud wedding or tiny private one?", category: "This or That", options: ["Big and loud", "Tiny and private"] },
  { q: "Morning cuddles or goodnight cuddles?", category: "This or That", options: ["Morning", "Goodnight"] },
  { q: "Talking all night or silence together?", category: "This or That", options: ["Talking all night", "Comfortable silence"] },
];

export const TRUTH_OR_DARE: Prompt[] = [
  { q: "Truth: When did you first realise you were falling for me?", category: "Truth" },
  { q: "Dare: Send me the most flattering compliment you can think of, right now.", category: "Dare" },
  { q: "Truth: What's a text about me you typed but never sent?", category: "Truth" },
  { q: "Dare: Describe me using only three emojis and explain why.", category: "Dare" },
  { q: "Truth: What's the most jealous you've ever felt about me?", category: "Truth" },
  { q: "Dare: Write me a two-line poem in the next 60 seconds.", category: "Dare" },
  { q: "Truth: What's something you want from me but never asked for?", category: "Truth" },
  { q: "Dare: Confess one silly thing you do when you miss me.", category: "Dare" },
  { q: "Truth: What's your favourite photo of us and why?", category: "Truth" },
  { q: "Dare: Say the cheesiest pickup line you know, to me.", category: "Dare" },
  { q: "Truth: What's one fear you have about us?", category: "Truth" },
  { q: "Dare: Plan our next date in exactly one sentence.", category: "Dare" },
  { q: "Truth: What's the first thing you'd do if I showed up at your door tonight?", category: "Truth" },
  { q: "Dare: Name three things you'd steal from my wardrobe.", category: "Dare" },
  { q: "Truth: When was the last time I made your heart race?", category: "Truth" },
  { q: "Dare: Give our love story a movie title.", category: "Dare" },
  { q: "Truth: What's a secret nickname you have for me in your head?", category: "Truth" },
  { q: "Dare: Describe our perfect anniversary in 10 words or less.", category: "Dare" },
  { q: "Truth: What do you love most about the way I look at you?", category: "Truth" },
  { q: "Dare: Promise me one thing right here, in writing.", category: "Dare" },
];

export const GUESS_ME: Prompt[] = [
  { q: "Guess my comfort food when I'm sad.", category: "Guess Me" },
  { q: "Guess the song I'd sing to you at karaoke.", category: "Guess Me" },
  { q: "Guess what I think about right before falling asleep.", category: "Guess Me" },
  { q: "Guess my dream city to live in with you.", category: "Guess Me" },
  { q: "Guess my biggest pet peeve.", category: "Guess Me" },
  { q: "Guess which of your habits I love the most.", category: "Guess Me" },
  { q: "Guess what I'd order for you at a cafe.", category: "Guess Me" },
  { q: "Guess my favourite outfit of yours.", category: "Guess Me" },
  { q: "Guess what makes me feel most loved.", category: "Guess Me" },
  { q: "Guess my ideal Sunday plan.", category: "Guess Me" },
  { q: "Guess the memory of us I think about most.", category: "Guess Me" },
  { q: "Guess what I was thinking the first time we met.", category: "Guess Me" },
  { q: "Guess my go-to gift if money didn't matter.", category: "Guess Me" },
  { q: "Guess what scares me a little about love.", category: "Guess Me" },
  { q: "Guess the pet name I secretly like most.", category: "Guess Me" },
  { q: "Guess my favourite thing about your voice.", category: "Guess Me" },
  { q: "Guess where I'd take you on a surprise trip.", category: "Guess Me" },
  { q: "Guess how I'd describe you to my best friend.", category: "Guess Me" },
  { q: "Guess what always cheers me up instantly.", category: "Guess Me" },
  { q: "Guess the one word I'd tattoo about us.", category: "Guess Me" },
];

export const GAMES: Record<GameMode, {
  id: GameMode;
  title: string;
  tagline: string;
  emoji: string;
  prompts: Prompt[];
  inputLabel: string;
  placeholder: string;
}> = {
  questions: {
    id: "questions",
    title: "Romantic Questions",
    tagline: "Deep, dreamy questions to fall a little more in love.",
    emoji: "💌",
    prompts: DATE_QUESTIONS,
    inputLabel: "Your answer",
    placeholder: "Take your time. Say it honestly…",
  },
  thisorthat: {
    id: "thisorthat",
    title: "This or That",
    tagline: "Quick choices that reveal your hearts.",
    emoji: "⚖️",
    prompts: THIS_OR_THAT,
    inputLabel: "Your pick",
    placeholder: "Pick one…",
  },
  truthdare: {
    id: "truthdare",
    title: "Truth or Dare",
    tagline: "Sweet confessions and playful dares.",
    emoji: "🔥",
    prompts: TRUTH_OR_DARE,
    inputLabel: "Your confession",
    placeholder: "No holding back…",
  },
  guessme: {
    id: "guessme",
    title: "Guess My Answer",
    tagline: "How well do you really know each other?",
    emoji: "🎯",
    prompts: GUESS_ME,
    inputLabel: "Your guess",
    placeholder: "Guess what they'd say…",
  },
};

export const GAME_LIST = [GAMES.questions, GAMES.thisorthat, GAMES.truthdare, GAMES.guessme];

export function getGame(mode?: string | null) {
  return GAMES[(mode as GameMode) ?? "questions"] ?? GAMES.questions;
}
