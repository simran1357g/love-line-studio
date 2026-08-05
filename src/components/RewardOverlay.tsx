import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Sparkles, Heart, Zap } from "lucide-react";
import { levelTitle, type AwardResult } from "@/lib/progress";
import { sfx, haptic } from "@/lib/audio";

const RARITY: Record<string, string> = {
  common: "from-[oklch(0.95_0.03_20)] to-white",
  rare: "from-[oklch(0.9_0.08_320)] to-[oklch(0.97_0.03_20)]",
  legendary: "from-[oklch(0.9_0.12_85)] to-[oklch(0.95_0.06_20)]",
};

export function RewardOverlay({ result, onClose }: { result: AwardResult | null; onClose: () => void }) {
  useEffect(() => {
    if (!result) return;
    sfx(result.leveledUp ? "levelup" : "reward");
    haptic(result.leveledUp ? [20, 60, 20, 60, 40] : [15, 40, 15]);
    confetti({
      particleCount: result.leveledUp ? 160 : 90,
      spread: 80,
      origin: { y: 0.35 },
      colors: ["#f7a8b8", "#ffd9e1", "#e0567a", "#fff3f6", "#f6c177"],
    });
  }, [result]);

  return (
    <AnimatePresence>
      {result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[oklch(0.45_0.15_15)]/25 px-5 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 18, stiffness: 220 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[2rem] border border-white/60 bg-gradient-to-b from-white/95 to-[oklch(0.97_0.03_20)]/95 p-7 text-center shadow-2xl"
          >
            {result.leveledUp ? (
              <>
                <motion.div
                  animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="mx-auto text-5xl"
                >
                  👑
                </motion.div>
                <div className="mt-3 text-[10px] uppercase tracking-[0.35em] text-[oklch(0.55_0.18_15)]">Level up</div>
                <h2 className="mt-1 font-serif text-4xl">Level {result.level}</h2>
                <p className="font-serif text-lg italic text-muted-foreground">{levelTitle(result.level)}</p>
              </>
            ) : (
              <>
                <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.4, repeat: Infinity }}>
                  <Sparkles className="mx-auto h-9 w-9 text-[oklch(0.62_0.2_15)]" />
                </motion.div>
                <h2 className="mt-3 font-serif text-3xl">Rewards unlocked</h2>
              </>
            )}

            <div className="mt-5 flex justify-center gap-3">
              <Stat icon={<Zap className="h-3.5 w-3.5" />} label="XP" value={`+${result.xpGained}`} />
              <Stat icon={<Heart className="h-3.5 w-3.5" fill="currentColor" />} label="Love Points" value={`+${result.lpGained}`} />
            </div>

            {result.card && (
              <motion.div
                initial={{ rotateY: 180, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.7 }}
                className={`mt-6 rounded-3xl border border-[oklch(0.62_0.2_15)]/30 bg-gradient-to-br ${RARITY[result.card.rarity]} p-5 shadow-inner`}
              >
                <div className="text-[10px] uppercase tracking-[0.3em] text-[oklch(0.55_0.18_15)]">
                  {result.card.rarity} card
                </div>
                <div className="mt-2 text-4xl">{result.card.emoji}</div>
                <div className="mt-1 font-serif text-2xl">{result.card.title}</div>
                <p className="mt-1 font-serif text-sm italic text-muted-foreground">{result.card.text}</p>
              </motion.div>
            )}

            {result.newAchievements.length > 0 && (
              <div className="mt-5 space-y-2">
                {result.newAchievements.map((a, i) => (
                  <motion.div
                    key={a.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5 + i * 0.12 }}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-white/70 px-4 py-3 text-left"
                  >
                    <span className="text-2xl">{a.emoji}</span>
                    <span className="min-w-0">
                      <span className="block font-serif text-base leading-tight">{a.title}</span>
                      <span className="block text-[11px] text-muted-foreground">{a.desc}</span>
                    </span>
                  </motion.div>
                ))}
              </div>
            )}

            <button onClick={onClose} className="btn-romance hover:btn-romance-hover mt-7 w-full">
              Claim
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white/70 px-4 py-2">
      <div className="flex items-center justify-center gap-1 text-[oklch(0.55_0.18_15)]">{icon}<span className="font-medium">{value}</span></div>
      <div className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}