import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { loveInsight } from "@/lib/lovebot.functions";
import { COMPAT_QUESTIONS, achievements, computeScore, scoreLabel } from "@/lib/compatibility";
import { Download, Heart, RotateCcw, Sparkles, Trophy } from "lucide-react";

type Props = {
  roomId: string;
  code: string;
  mySlot: number;
  myName: string;
  partnerName: string;
  answersBySlot: Record<number, string[]>;
  onPlayAgain: () => void;
  onExit: () => void;
};

export function CompatResults({
  roomId,
  code,
  mySlot,
  myName,
  partnerName,
  answersBySlot,
  onPlayAgain,
  onExit,
}: Props) {
  const mine = answersBySlot[mySlot] ?? [];
  const theirs = answersBySlot[mySlot === 1 ? 2 : 1] ?? [];
  const score = useMemo(() => computeScore(mine, theirs), [mine, theirs]);
  const label = scoreLabel(score.total);
  const [shown, setShown] = useState(0);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ code: string; score: number; player_a: string; player_b: string; created_at: string }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animated score count-up + confetti
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1800);
      setShown(Math.round(score.total * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
      else
        confetti({
          particleCount: 160,
          spread: 90,
          origin: { y: 0.35 },
          colors: ["#ffd7e0", "#ff8fab", "#e5476b", "#fff5f7"],
        });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score.total]);

  // Load or generate the AI insight (slot 1 generates, both read via realtime)
  useEffect(() => {
    let cancelled = false;
    async function run() {
      const { data } = await supabase.from("results").select().eq("room_id", roomId).maybeSingle();
      if (cancelled) return;
      if (data?.insight) {
        setInsight(data.insight);
        return;
      }
      if (mySlot !== 1) return;
      try {
        const res = await loveInsight({
          data: {
            nameA: myName,
            nameB: partnerName,
            score: score.total,
            categories: score.categories.map((c) => ({ name: c.name, score: c.score })),
            highlights: COMPAT_QUESTIONS.map((q, i) => ({ q: q.q, a: mine[i] ?? "—", b: theirs[i] ?? "—" })),
          },
        });
        if (cancelled) return;
        setInsight(res.insight);
        await supabase.from("results").insert({
          room_id: roomId,
          code,
          score: score.total,
          player_a: myName,
          player_b: partnerName,
          categories: JSON.parse(JSON.stringify(score.categories)),
          insight: res.insight,
        });
      } catch (e) {
        if (!cancelled) setInsightError((e as Error).message);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    const channel = supabase
      .channel(`results:${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "results", filter: `room_id=eq.${roomId}` }, (p) => {
        const row = p.new as { insight?: string };
        if (row.insight) setInsight(row.insight);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Previous matches from this device
  useEffect(() => {
    const codes: string[] = JSON.parse(localStorage.getItem("loveline_compat_codes") ?? "[]");
    const past = codes.filter((c) => c !== code).slice(-6);
    if (!past.length) return;
    supabase
      .from("results")
      .select("code, score, player_a, player_b, created_at")
      .in("code", past)
      .order("created_at", { ascending: false })
      .then(({ data }) => setHistory((data ?? []) as typeof history));
  }, [code]);

  function downloadCard() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = 1080;
    const H = 1920;
    canvas.width = W;
    canvas.height = H;
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#fff6f8");
    g.addColorStop(0.5, "#ffe3ea");
    g.addColorStop(1, "#ffd0dd");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.fillStyle = "#b03a56";
    ctx.font = "600 46px Georgia, serif";
    ctx.fillText("LOVELINE COMPATIBILITY", W / 2, 220);

    ctx.fillStyle = "#5b1f2f";
    ctx.font = "italic 64px Georgia, serif";
    ctx.fillText(`${myName} + ${partnerName}`, W / 2, 340);

    ctx.fillStyle = "#e5476b";
    ctx.font = "700 320px Georgia, serif";
    ctx.fillText(`${score.total}%`, W / 2, 760);

    ctx.fillStyle = "#5b1f2f";
    ctx.font = "600 76px Georgia, serif";
    ctx.fillText(label.title, W / 2, 880);
    ctx.font = "italic 40px Georgia, serif";
    ctx.fillText(label.line, W / 2, 950);

    let y = 1120;
    score.categories.forEach((c) => {
      ctx.textAlign = "left";
      ctx.fillStyle = "#5b1f2f";
      ctx.font = "500 40px Georgia, serif";
      ctx.fillText(c.name, 140, y);
      ctx.textAlign = "right";
      ctx.fillText(`${c.score}%`, W - 140, y);
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillRect(140, y + 20, W - 280, 18);
      ctx.fillStyle = "#e5476b";
      ctx.fillRect(140, y + 20, ((W - 280) * c.score) / 100, 18);
      y += 130;
    });

    ctx.textAlign = "center";
    ctx.fillStyle = "#b03a56";
    ctx.font = "italic 38px Georgia, serif";
    ctx.fillText(`${score.matched} of 25 answers matched`, W / 2, 1810);

    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `loveline-${myName}-${partnerName}.png`;
    a.click();
  }

  const badges = achievements(score);

  return (
    <div className="relative z-10 mx-auto max-w-3xl px-5 pb-24 pt-10">
      <canvas ref={canvasRef} className="hidden" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[2rem] p-8 text-center glass-card sm:p-12">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Your compatibility</p>
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 12 }}
          className="mt-4 bg-gradient-to-br from-[oklch(0.72_0.18_20)] to-[oklch(0.55_0.22_12)] bg-clip-text font-serif text-[5.5rem] leading-none text-transparent sm:text-[8rem]"
        >
          {shown}%
        </motion.div>
        <h1 className="mt-2 font-serif text-4xl">{label.title}</h1>
        <p className="mt-2 font-serif italic text-muted-foreground">{label.line}</p>
        <p className="mt-4 text-sm text-muted-foreground">
          {myName} &amp; {partnerName} · {score.matched}/25 answers matched
        </p>
      </motion.div>

      <section className="mt-8 rounded-3xl p-7 glass-card">
        <h2 className="font-serif text-2xl">Category breakdown</h2>
        <div className="mt-5 space-y-4">
          {score.categories.map((c, i) => (
            <div key={c.name}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{c.name}</span>
                <span className="text-muted-foreground">{c.score}%</span>
              </div>
              <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-white/60">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${c.score}%` }}
                  transition={{ delay: 0.3 + i * 0.12, duration: 0.9, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-[oklch(0.82_0.12_25)] to-[oklch(0.62_0.2_15)]"
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-5 font-serif italic text-muted-foreground">
          Strongest together in <span className="text-[oklch(0.5_0.18_15)]">{score.best}</span>, most to explore in{" "}
          <span className="text-[oklch(0.5_0.18_15)]">{score.worst}</span>.
        </p>
      </section>

      <section className="mt-8 rounded-3xl p-7 glass-card">
        <h2 className="flex items-center gap-2 font-serif text-2xl">
          <Sparkles className="h-5 w-5 text-[oklch(0.62_0.2_15)]" /> LoveBot's read on you
        </h2>
        {insight ? (
          <div className="mt-4 space-y-3">
            {insight.split("\n").filter(Boolean).map((p, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                className="font-serif text-lg leading-relaxed text-foreground"
              >
                {p}
              </motion.p>
            ))}
          </div>
        ) : insightError ? (
          <p className="mt-4 text-sm text-[oklch(0.5_0.2_20)]">{insightError}</p>
        ) : (
          <p className="mt-4 font-serif italic text-muted-foreground">Writing something just for you two…</p>
        )}
      </section>

      <section className="mt-8 rounded-3xl p-7 glass-card">
        <h2 className="flex items-center gap-2 font-serif text-2xl">
          <Trophy className="h-5 w-5 text-[oklch(0.62_0.2_15)]" /> Achievements
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {badges.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-white/60 px-4 py-3"
            >
              <span className="text-2xl">{b.emoji}</span>
              <div className="min-w-0">
                <p className="truncate font-serif text-lg leading-tight">{b.title}</p>
                <p className="text-xs text-muted-foreground">{b.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-3xl p-7 glass-card">
        <h2 className="font-serif text-2xl">Answer by answer</h2>
        <div className="mt-4 space-y-3">
          {COMPAT_QUESTIONS.map((q, i) => {
            const same = mine[i] && mine[i] === theirs[i];
            return (
              <motion.div
                key={q.q}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.35 }}
                className={`rounded-2xl border px-4 py-3 ${
                  same ? "border-[oklch(0.62_0.2_15)]/40 bg-white/75" : "border-border bg-white/45"
                }`}
              >
                <p className="text-sm font-medium text-foreground">
                  {q.emoji} {q.q} {same && <span className="ml-1 text-[oklch(0.55_0.2_15)]">match</span>}
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl bg-white/70 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{myName}</p>
                    <p className="font-serif italic">{mine[i] ?? "—"}</p>
                  </div>
                  <div className="rounded-xl bg-white/70 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{partnerName}</p>
                    <p className="font-serif italic">{theirs[i] ?? "—"}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {history.length > 0 && (
        <section className="mt-8 rounded-3xl p-7 glass-card">
          <h2 className="font-serif text-2xl">Previous matches</h2>
          <div className="mt-4 space-y-2">
            {history.map((h) => (
              <div key={h.code + h.created_at} className="flex items-center justify-between rounded-xl bg-white/60 px-4 py-2.5 text-sm">
                <span className="truncate font-serif italic">
                  {h.player_a} &amp; {h.player_b}
                </span>
                <span className="ml-3 shrink-0 font-medium text-[oklch(0.5_0.18_15)]">{h.score}%</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <button onClick={downloadCard} className="btn-romance hover:btn-romance-hover inline-flex items-center gap-2">
          <Download className="h-4 w-4" /> Download story card
        </button>
        <button
          onClick={onPlayAgain}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-white/60 px-6 py-3 text-sm transition hover:bg-white"
        >
          <RotateCcw className="h-4 w-4" /> Play again
        </button>
        <button
          onClick={onExit}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-white/60 px-6 py-3 text-sm transition hover:bg-white"
        >
          <Heart className="h-4 w-4" /> Home
        </button>
      </div>
    </div>
  );
}