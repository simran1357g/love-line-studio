import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Flame, Zap, Heart, Trophy, X, Gift } from "lucide-react";
import {
  ACHIEVEMENTS, MYSTERY_CARDS, activeEvents, levelFromXp, levelTitle,
  loadProgress, xpForLevel, type Progress,
} from "@/lib/progress";
import { pop } from "@/lib/audio";

export function useProgress() {
  const [p, setP] = useState<Progress | null>(null);
  useEffect(() => {
    setP(loadProgress());
    const h = (e: Event) => setP((e as CustomEvent<Progress>).detail);
    window.addEventListener("loveline:progress", h);
    return () => window.removeEventListener("loveline:progress", h);
  }, []);
  return p;
}

export function ProgressHud({ compact }: { compact?: boolean }) {
  const p = useProgress();
  const [open, setOpen] = useState(false);
  if (!p) return null;

  const level = levelFromXp(p.xp);
  const cur = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const pct = Math.max(4, Math.round(((p.xp - cur) / (next - cur)) * 100));
  const events = activeEvents(p);

  return (
    <>
      <button
        onClick={() => { pop("tap"); setOpen(true); }}
        className="group flex items-center gap-3 rounded-full border border-[oklch(0.62_0.2_15)]/25 bg-white/70 px-3 py-1.5 shadow-sm backdrop-blur transition hover:shadow-[0_0_20px_-4px_oklch(0.62_0.2_15/0.5)] active:scale-95"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.82_0.12_25)] to-[oklch(0.62_0.2_15)] text-[11px] font-semibold text-white">
          {level}
        </span>
        {!compact && (
          <span className="w-20 overflow-hidden rounded-full bg-white/70">
            <motion.span
              className="block h-1.5 rounded-full bg-gradient-to-r from-[oklch(0.82_0.12_25)] to-[oklch(0.62_0.2_15)]"
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6 }}
            />
          </span>
        )}
        <span className="flex items-center gap-1 text-[11px] text-[oklch(0.45_0.15_15)]">
          <Flame className="h-3 w-3" /> {p.streak}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-[oklch(0.45_0.15_15)]">
          <Heart className="h-3 w-3" fill="currentColor" /> {p.lp}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-[oklch(0.45_0.15_15)]/25 p-3 backdrop-blur-sm sm:items-center"
          >
            <motion.div
              initial={{ y: 40, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 22, stiffness: 240 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[86vh] w-full max-w-md overflow-y-auto rounded-[2rem] border border-white/60 bg-white/90 p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.3em] text-[oklch(0.55_0.18_15)]">Level {level}</div>
                  <h2 className="font-serif text-3xl leading-tight">{levelTitle(level)}</h2>
                </div>
                <button onClick={() => setOpen(false)} className="rounded-full bg-white/80 p-1.5"><X className="h-4 w-4" /></button>
              </div>

              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[oklch(0.95_0.02_20)]">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-[oklch(0.82_0.12_25)] to-[oklch(0.62_0.2_15)]"
                  animate={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                <span>{p.xp} XP</span><span>{next} XP to level {level + 1}</span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <Tile icon={<Zap className="h-3.5 w-3.5" />} label="Games" value={p.games} />
                <Tile icon={<Flame className="h-3.5 w-3.5" />} label="Streak" value={`${p.streak}d`} />
                <Tile icon={<Heart className="h-3.5 w-3.5" fill="currentColor" />} label="Love Pts" value={p.lp} />
              </div>

              {events.length > 0 && (
                <div className="mt-5 space-y-2">
                  {events.map((e) => (
                    <div key={e.id} className="flex items-center gap-3 rounded-2xl border border-[oklch(0.62_0.2_15)]/25 bg-gradient-to-r from-[oklch(0.97_0.03_20)] to-white px-4 py-3 text-left">
                      <span className="text-2xl">{e.emoji}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-serif text-base leading-tight">{e.title}</span>
                        <span className="block text-[11px] text-muted-foreground">{e.desc}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-[oklch(0.62_0.2_15)] px-2 py-0.5 text-[10px] text-white">{e.bonus}</span>
                    </div>
                  ))}
                </div>
              )}

              <Section title="Relationship stats" />
              <div className="space-y-2">
                {(Object.keys(p.stats) as (keyof Progress["stats"])[]).map((k) => (
                  <div key={k}>
                    <div className="flex justify-between text-[11px] capitalize text-muted-foreground"><span>{k}</span><span>{p.stats[k]}%</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[oklch(0.95_0.02_20)]">
                      <motion.div className="h-full rounded-full bg-gradient-to-r from-[oklch(0.82_0.12_25)] to-[oklch(0.62_0.2_15)]"
                        initial={{ width: 0 }} animate={{ width: `${p.stats[k]}%` }} transition={{ duration: 0.8 }} />
                    </div>
                  </div>
                ))}
              </div>

              <Section title={`Achievements (${p.achievements.length}/${ACHIEVEMENTS.length})`} icon={<Trophy className="h-3.5 w-3.5" />} />
              <div className="grid grid-cols-2 gap-2">
                {ACHIEVEMENTS.map((a) => {
                  const got = p.achievements.includes(a.id);
                  return (
                    <div key={a.id} className={`rounded-2xl border px-3 py-2.5 text-left ${got ? "border-[oklch(0.62_0.2_15)]/35 bg-white" : "border-border bg-white/40 opacity-50"}`}>
                      <div className="text-lg leading-none">{got ? a.emoji : "🔒"}</div>
                      <div className="mt-1.5 font-serif text-sm leading-tight">{a.title}</div>
                      <div className="text-[10px] leading-snug text-muted-foreground">{a.desc}</div>
                    </div>
                  );
                })}
              </div>

              <Section title={`Mystery cards (${p.cards.length}/${MYSTERY_CARDS.length})`} icon={<Gift className="h-3.5 w-3.5" />} />
              <div className="flex flex-wrap gap-2 pb-2">
                {MYSTERY_CARDS.map((c) => {
                  const got = p.cards.includes(c.id);
                  return (
                    <div key={c.id} title={got ? c.text : "Locked"}
                      className={`rounded-2xl border px-3 py-2 text-center ${got ? "border-[oklch(0.62_0.2_15)]/35 bg-white" : "border-border bg-white/40 opacity-45"}`}>
                      <div className="text-xl">{got ? c.emoji : "❔"}</div>
                      <div className="mt-1 text-[10px] leading-tight">{got ? c.title : "Locked"}</div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Section({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <div className="mt-6 mb-3 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.28em] text-[oklch(0.55_0.18_15)]">
      {icon}{title}
    </div>
  );
}

function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-white/70 px-2 py-3">
      <div className="flex items-center justify-center gap-1 text-[oklch(0.55_0.18_15)]">{icon}<span className="font-medium">{value}</span></div>
      <div className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}