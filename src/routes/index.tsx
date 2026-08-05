import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getClientId, generateRoomCode } from "@/lib/client-id";
import { FloatingPetals } from "@/components/FloatingPetals";
import heroImg from "@/assets/hero-romance.jpg";
import { Heart, Sparkles, ArrowRight } from "lucide-react";
import { GAME_LIST, type GameMode } from "@/lib/games";
import { ProgressHud } from "@/components/ProgressHud";
import { LuckySpin } from "@/components/LuckySpin";
import { RewardOverlay } from "@/components/RewardOverlay";
import { activeEvents, loadProgress, touchStreak, type AwardResult } from "@/lib/progress";
import { pop } from "@/lib/audio";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Loveline — A Virtual Date for Two" },
      { name: "description", content: "A dreamy virtual date game for couples. Start a room, share the link, and answer romantic questions together." },
    ],
  }),
});

function Landing() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [mode, setMode] = useState<GameMode>("questions");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reward, setReward] = useState<AwardResult | null>(null);
  const [events, setEvents] = useState<ReturnType<typeof activeEvents>>([]);

  useEffect(() => {
    touchStreak();
    setEvents(activeEvents(loadProgress()));
  }, []);

  async function createRoom() {
    setLoading(true); setError(null);
    try {
      const code = generateRoomCode();
      const { data: room, error: rErr } = await supabase
        .from("rooms")
        .insert({ code, status: "waiting", current_index: 0, mode })
        .select()
        .single();
      if (rErr || !room) throw rErr ?? new Error("Failed");
      const { error: pErr } = await supabase.from("players").insert({
        room_id: room.id,
        name: (name.trim() || "You").slice(0, 30),
        slot: 1,
        client_id: getClientId(),
      });
      if (pErr) throw pErr;
      navigate({ to: "/room/$code", params: { code } });
    } catch (e) {
      setError((e as Error).message ?? "Could not create room");
      setLoading(false);
    }
  }

  async function createCompatRoom() {
    setLoading(true); setError(null);
    try {
      const code = generateRoomCode();
      const { data: room, error: rErr } = await supabase
        .from("rooms")
        .insert({ code, status: "waiting", current_index: 0, mode: "compat" })
        .select()
        .single();
      if (rErr || !room) throw rErr ?? new Error("Failed");
      const { error: pErr } = await supabase.from("players").insert({
        room_id: room.id,
        name: (name.trim() || "You").slice(0, 30),
        slot: 1,
        client_id: getClientId(),
      });
      if (pErr) throw pErr;
      navigate({ to: "/compat/$code", params: { code } });
    } catch (e) {
      setError((e as Error).message ?? "Could not create room");
      setLoading(false);
    }
  }

  async function joinRoom() {
    const code = joinCode.trim().toUpperCase();
    if (!code) { setError("Enter a room code"); return; }
    setLoading(true); setError(null);
    try {
      const { data: room, error: rErr } = await supabase
        .from("rooms").select().eq("code", code).maybeSingle();
      if (rErr) throw rErr;
      if (!room) throw new Error("Room not found");
      const { data: existing } = await supabase
        .from("players").select().eq("room_id", room.id);
      const clientId = getClientId();
      const already = existing?.find(p => p.client_id === clientId);
      if (!already) {
        if ((existing?.length ?? 0) >= 2) throw new Error("Room is full");
        const nextSlot = existing?.find(p => p.slot === 1) ? 2 : 1;
        const { error: pErr } = await supabase.from("players").insert({
          room_id: room.id,
          name: (name.trim() || "Partner").slice(0, 30),
          slot: nextSlot,
          client_id: clientId,
        });
        if (pErr) throw pErr;
      }
      navigate({ to: room.mode === "compat" ? "/compat/$code" : "/room/$code", params: { code } });
    } catch (e) {
      setError((e as Error).message ?? "Could not join");
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <FloatingPetals />
      <div className="absolute inset-0 -z-10">
        <img src={heroImg} alt="" width={1536} height={1024}
          className="h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16">
        <RewardOverlay result={reward} onClose={() => setReward(null)} />
        <div className="mb-6"><ProgressHud /></div>
        <div className="mb-2 flex items-center gap-2 text-sm uppercase tracking-[0.3em] text-[oklch(0.55_0.18_15)]">
          <Sparkles className="h-4 w-4" />
          <span>A virtual date, for two</span>
          <Sparkles className="h-4 w-4" />
        </div>
        <h1 className="text-center text-6xl font-serif font-500 text-foreground md:text-7xl" style={{ animation: "fade-in 0.9s ease" }}>
          Loveline
        </h1>
        <p className="mt-4 max-w-lg text-center text-lg leading-relaxed text-muted-foreground font-serif italic">
          Four little games. One shared room. Discover each other, one heartbeat at a time.
        </p>

        <div className="mt-12 w-full max-w-md rounded-3xl p-8 glass-card" style={{ animation: "fade-in 1.1s ease" }}>
          <div className="mb-6 space-y-2">
            <LuckySpin onReward={setReward} />
            {events.map((ev) => (
              <div key={ev.id} className="flex items-center gap-3 rounded-2xl border border-[oklch(0.62_0.2_15)]/25 bg-white/60 px-4 py-3 text-left">
                <span className="text-xl">{ev.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-serif text-base leading-tight">{ev.title}</span>
                  <span className="block text-[11px] leading-snug text-muted-foreground">{ev.desc}</span>
                </span>
                <span className="shrink-0 rounded-full bg-[oklch(0.62_0.2_15)] px-2 py-0.5 text-[10px] text-white">{ev.bonus}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => { pop("tap"); createCompatRoom(); }}
            disabled={loading}
            className="group mb-6 w-full rounded-3xl border border-[oklch(0.62_0.2_15)]/35 bg-gradient-to-br from-white/85 to-[oklch(0.94_0.04_20)]/80 p-5 text-left shadow-sm transition hover:shadow-md disabled:opacity-60"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-[oklch(0.55_0.18_15)]">
                  <Sparkles className="h-3 w-3" /> New · Premium
                </div>
                <div className="mt-2 font-serif text-2xl leading-tight text-foreground">Compatibility Test 💞</div>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">
                  25 questions, live chat, lock your answers, and reveal your love score.
                </p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-[oklch(0.55_0.18_15)] transition group-hover:translate-x-1" />
            </div>
          </button>

          <div className="mb-6">
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Choose your game</label>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {GAME_LIST.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setMode(g.id)}
                  className={`rounded-2xl border px-3 py-3 text-left transition ${
                    mode === g.id
                      ? "border-[oklch(0.62_0.2_15)] bg-white/85 shadow-sm"
                      : "border-border bg-white/50 hover:bg-white/70"
                  }`}
                >
                  <div className="text-lg leading-none">{g.emoji}</div>
                  <div className="mt-2 font-serif text-base leading-tight text-foreground">{g.title}</div>
                  <div className="mt-1 text-[11px] leading-snug text-muted-foreground">{g.tagline}</div>
                </button>
              ))}
            </div>
          </div>

          <label className="text-xs uppercase tracking-widest text-muted-foreground">Your name (optional)</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Aria"
            className="mt-2 w-full rounded-xl border border-border bg-white/70 px-4 py-3 text-lg font-serif italic outline-none focus:border-[oklch(0.62_0.2_15)] focus:ring-2 focus:ring-[oklch(0.82_0.12_25)]/40"
            maxLength={30}
          />

          <button
            onClick={createRoom}
            disabled={loading}
            className="btn-romance mt-6 w-full text-base disabled:opacity-60 hover:btn-romance-hover flex items-center justify-center gap-2"
          >
            <Heart className="h-4 w-4" fill="currentColor" />
            Start a New Date
          </button>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>or join yours</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ROOM CODE"
              className="flex-1 rounded-xl border border-border bg-white/70 px-4 py-3 text-center text-lg tracking-[0.4em] font-medium outline-none focus:border-[oklch(0.62_0.2_15)]"
              maxLength={6}
            />
            <button
              onClick={joinRoom}
              disabled={loading}
              className="rounded-xl border border-[oklch(0.62_0.2_15)]/40 bg-white/50 px-5 font-medium text-[oklch(0.45_0.15_15)] transition hover:bg-white/80 disabled:opacity-60"
            >
              Join
            </button>
          </div>

          {error && (
            <p className="mt-4 text-center text-sm text-[oklch(0.5_0.2_20)]">{error}</p>
          )}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Made with <Heart className="inline h-3 w-3" fill="currentColor" /> for the ones in love
        </p>
      </main>
    </div>
  );
}