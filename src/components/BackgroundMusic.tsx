import { useEffect, useState } from "react";
import { Music, VolumeX } from "lucide-react";
import { ensureMusic, isMusicPlaying, subscribeMusic, toggleMusic, haptic } from "@/lib/audio";

/**
 * Global music control. The <audio> element lives in a module singleton, so the
 * song keeps playing across routes, re-renders and answer submissions —
 * it never restarts.
 */
export function BackgroundMusic() {
  const [playing, setPlaying] = useState(false);
  const [manuallyPaused, setManuallyPaused] = useState(false);

  useEffect(() => {
    setPlaying(isMusicPlaying());
    const unsub = subscribeMusic(setPlaying);
    ensureMusic();
    const kick = () => { if (!manuallyPaused) ensureMusic(); };
    window.addEventListener("pointerdown", kick);
    window.addEventListener("keydown", kick);
    return () => {
      unsub();
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
    };
  }, [manuallyPaused]);

  function toggle() {
    haptic(12);
    setManuallyPaused(isMusicPlaying());
    toggleMusic();
  }

  return (
    <button
      onClick={toggle}
      aria-label={playing ? "Pause music" : "Play music"}
      className="fixed bottom-5 right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white/70 text-[oklch(0.45_0.15_15)] shadow-sm backdrop-blur transition hover:scale-110 hover:bg-white active:scale-95"
    >
      {playing ? <Music className="h-4 w-4 animate-pulse" /> : <VolumeX className="h-4 w-4" />}
    </button>
  );
}
