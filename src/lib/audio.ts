import songAsset from "@/assets/until-i-found-you.mp3.asset.json";

type Sub = (playing: boolean) => void;

declare global {
  interface Window {
    __loveline_audio?: HTMLAudioElement;
    __loveline_ctx?: AudioContext;
  }
}

const subs = new Set<Sub>();

/** Single <audio> instance for the whole app — survives route changes & re-renders. */
export function getMusic(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!window.__loveline_audio) {
    const a = new Audio(songAsset.url);
    a.loop = true;
    a.volume = 0.32;
    a.preload = "auto";
    a.addEventListener("play", () => subs.forEach((s) => s(true)));
    a.addEventListener("pause", () => subs.forEach((s) => s(false)));
    window.__loveline_audio = a;
  }
  return window.__loveline_audio;
}

export function subscribeMusic(fn: Sub) {
  subs.add(fn);
  return () => subs.delete(fn);
}

export function isMusicPlaying() {
  const a = getMusic();
  return !!a && !a.paused;
}

/** Start playback only if it isn't already going (never restarts the track). */
export function ensureMusic() {
  const a = getMusic();
  if (!a || !a.paused) return;
  a.play().catch(() => {});
}

export function toggleMusic() {
  const a = getMusic();
  if (!a) return;
  if (a.paused) a.play().catch(() => {});
  else a.pause();
}

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!window.__loveline_ctx) window.__loveline_ctx = new AC();
  if (window.__loveline_ctx.state === "suspended") void window.__loveline_ctx.resume();
  return window.__loveline_ctx;
}

function tone(freq: number, start: number, dur: number, gain = 0.06, type: OscillatorType = "sine") {
  const c = ctx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + start);
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.05);
}

export type Sfx = "tap" | "send" | "reveal" | "levelup" | "reward" | "heartbeat" | "tick";

export function sfx(name: Sfx) {
  switch (name) {
    case "tap": tone(660, 0, 0.08, 0.04, "triangle"); break;
    case "send": tone(520, 0, 0.1, 0.05); tone(780, 0.07, 0.14, 0.045); break;
    case "reveal": [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.07, 0.25, 0.05)); break;
    case "levelup": [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.09, 0.35, 0.06, "triangle")); break;
    case "reward": [880, 1174, 1568].forEach((f, i) => tone(f, i * 0.06, 0.3, 0.05)); break;
    case "heartbeat": tone(90, 0, 0.12, 0.12); tone(80, 0.22, 0.16, 0.1); break;
    case "tick": tone(1200, 0, 0.04, 0.03, "square"); break;
  }
}

export function haptic(pattern: number | number[] = 12) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(pattern); } catch { /* ignore */ }
  }
}

export function pop(name: Sfx = "tap", vibe: number | number[] = 10) {
  sfx(name);
  haptic(vibe);
}