import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { sfx, haptic } from "@/lib/audio";

const LINES = [
  "Reading both hearts…",
  "Running emotional resonance scan…",
  "Comparing word warmth…",
  "Measuring butterflies per minute…",
  "Almost there…",
];

/** Dramatic fake-AI analysis beat before answers are revealed. */
export function SuspenseReveal({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    sfx("heartbeat");
    haptic([15, 90, 15]);
    const t = setInterval(() => {
      setStep((s) => {
        if (s >= LINES.length - 1) {
          clearInterval(t);
          setTimeout(() => { sfx("reveal"); onDone(); }, 550);
          return s;
        }
        sfx("tick");
        return s + 1;
      });
    }, 620);
    return () => clearInterval(t);
  }, [onDone]);

  return (
    <div className="mt-8 rounded-3xl p-10 text-center glass-card">
      <motion.div animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 0.9, repeat: Infinity }}>
        <Sparkles className="mx-auto h-9 w-9 text-[oklch(0.62_0.2_15)]" />
      </motion.div>
      <motion.p key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="mt-5 font-serif text-xl italic text-foreground">
        {LINES[step]}
      </motion.p>
      <div className="mx-auto mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-white/60">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-[oklch(0.82_0.12_25)] to-[oklch(0.62_0.2_15)]"
          animate={{ width: `${((step + 1) / LINES.length) * 100}%` }} transition={{ duration: 0.5 }} />
      </div>
    </div>
  );
}