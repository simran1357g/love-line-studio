import { useEffect, useState } from "react";
import { Music, VolumeX } from "lucide-react";
import { ensureMusic, isMusicMuted, isMusicPlaying, subscribeMusic, toggleMusic, haptic } from "@/lib/audio";

/**
 * Global music control. The <audio> element lives in a module singleton, so the
 * song keeps playing across routes, re-renders and answer submissions —
 * it never restarts. Music starts unmuted by default; the user can mute it
 * anytime with this button.
 */
export function BackgroundMusic() {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setPlaying(isMusicPlaying());
    const unsub = subscribeMusic(setPlaying);

    // Try to start on first user interaction — browsers block autoplay otherwise.
    const kick = () => ensureMusic();
    window.addEventListener("pointerdown", kick);
    window.addEventListener("keydown", kick);

    // Also try immediately (works if the browser already allowed autoplay).
    ensureMusic();

    return () => {
      unsub();
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
    };
  }, []);

  function toggle() {
    haptic(12);
    toggleMusic();
  }

  const muted = !playing;

  return (
    <button
      onClick={toggle}
      aria-label={muted ? "Play music" : "Pause music"}
      className="fixed bottom-5 right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white/70 text-[oklch(0.45_0.15_15)] shadow-sm backdrop-blur transition hover:scale-110 hover:bg-white active:scale-95"
    >
      {muted ? <VolumeX className="h-4 w-4" /> : <Music className="h-4 w-4 animate-pulse" />}
    </button>
  );
}
