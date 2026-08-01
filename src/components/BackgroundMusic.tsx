import { useEffect, useRef, useState } from "react";
import { Music, VolumeX } from "lucide-react";
import songAsset from "@/assets/until-i-found-you.mp3.asset.json";

export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = new Audio(songAsset.url);
    audio.loop = true;
    audio.volume = 0.35;
    audioRef.current = audio;

    audio.play().then(() => setPlaying(true)).catch(() => {
      // Browser blocked autoplay — start on first interaction
      const kick = () => {
        audio.play().then(() => setPlaying(true)).catch(() => {});
        window.removeEventListener("pointerdown", kick);
        window.removeEventListener("keydown", kick);
      };
      window.addEventListener("pointerdown", kick);
      window.addEventListener("keydown", kick);
    });

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={playing ? "Pause music" : "Play music"}
      className="fixed bottom-5 right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white/70 text-[oklch(0.45_0.15_15)] shadow-sm backdrop-blur transition hover:bg-white"
    >
      {playing ? <Music className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </button>
  );
}
