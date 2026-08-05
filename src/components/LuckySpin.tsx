import { useState } from "react";
import { motion } from "framer-motion";
import { Gift } from "lucide-react";
import { award, loadProgress, saveProgress, type AwardResult } from "@/lib/progress";
import { pop, sfx } from "@/lib/audio";

const SPIN_KEY = "loveline_spin_day";

export function LuckySpin({ onReward }: { onReward: (r: AwardResult) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [used, setUsed] = useState(() =>
    typeof window !== "undefined" && window.localStorage.getItem(SPIN_KEY) === today);
  const [spinning, setSpinning] = useState(false);

  function spin() {
    if (used || spinning) return;
    pop("tap", 15);
    setSpinning(true);
    const ticker = setInterval(() => sfx("tick"), 110);
    setTimeout(() => {
      clearInterval(ticker);
      window.localStorage.setItem(SPIN_KEY, today);
      const p = loadProgress();
      saveProgress(p);
      const r = award({ xp: 30 + Math.floor(Math.random() * 70), lp: 25 + Math.floor(Math.random() * 75), card: Math.random() < 0.7 });
      setSpinning(false);
      setUsed(true);
      onReward(r);
    }, 1900);
  }

  return (
    <button
      onClick={spin}
      disabled={used}
      className="group relative w-full overflow-hidden rounded-3xl border border-[oklch(0.62_0.2_15)]/30 bg-gradient-to-br from-[oklch(0.97_0.04_20)] to-white p-4 text-left transition hover:shadow-[0_0_30px_-8px_oklch(0.62_0.2_15/0.55)] disabled:opacity-55"
    >
      <div className="flex items-center gap-3">
        <motion.div
          animate={spinning ? { rotate: 1440, scale: [1, 1.25, 1] } : { rotate: 0 }}
          transition={spinning ? { duration: 1.9, ease: "easeOut" } : {}}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.82_0.12_25)] to-[oklch(0.62_0.2_15)] text-white"
        >
          <Gift className="h-5 w-5" />
        </motion.div>
        <div className="min-w-0">
          <div className="font-serif text-xl leading-tight">
            {used ? "Come back tomorrow" : spinning ? "Spinning…" : "Daily Lucky Spin"}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {used ? "Today's loot box is claimed 💝" : "Free XP, Love Points & a mystery card"}
          </div>
        </div>
      </div>
    </button>
  );
}