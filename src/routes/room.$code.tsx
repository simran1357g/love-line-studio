import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getClientId } from "@/lib/client-id";
import { getGame, GAME_LIST, type GameMode } from "@/lib/games";
import { FloatingPetals } from "@/components/FloatingPetals";
import { ChatPanel } from "@/components/compat/ChatPanel";
import { ProgressHud } from "@/components/ProgressHud";
import { RewardOverlay } from "@/components/RewardOverlay";
import { SuspenseReveal } from "@/components/SuspenseReveal";
import { award, touchStreak, xpMultiplier, type AwardResult } from "@/lib/progress";
import { pop } from "@/lib/audio";
import { Heart, Copy, Check, ChevronRight, Sparkles, MessageCircle, X } from "lucide-react";

export const Route = createFileRoute("/room/$code")({
  component: RoomPage,
  head: ({ params }) => ({
    meta: [
      { title: `Loveline Room ${params.code} — Your Virtual Date` },
      { name: "description", content: "Your private virtual date room. Answer romantic questions together." },
    ],
  }),
});

type Room = { id: string; code: string; current_index: number; status: string; mode: string };
type Player = { id: string; room_id: string; name: string; slot: number; client_id: string };
type Answer = { id: string; room_id: string; question_index: number; slot: number; answer: string };

function RoomPage() {
  const { code } = useParams({ from: "/room/$code" });
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [reward, setReward] = useState<AwardResult | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [rewardedGame, setRewardedGame] = useState(false);
  const clientId = typeof window !== "undefined" ? getClientId() : "";

  useEffect(() => { touchStreak(); }, []);

  // Initial load + polling fallback (in case realtime is blocked on mobile networks)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: r } = await supabase.from("rooms").select().eq("code", code).maybeSingle();
      if (cancelled) return;
      if (!r) { setNotFound(true); return; }
      setRoom((prev) => (prev && JSON.stringify(prev) === JSON.stringify(r) ? prev : (r as Room)));
      const [{ data: ps }, { data: as }] = await Promise.all([
        supabase.from("players").select().eq("room_id", r.id),
        supabase.from("answers").select().eq("room_id", r.id),
      ]);
      if (cancelled) return;
      setPlayers((prev) => {
        const next = (ps ?? []) as Player[];
        return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
      });
      setAnswers((prev) => {
        const next = (as ?? []) as Answer[];
        return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
      });
    }
    load();
    const timer = setInterval(load, 2500);
    return () => { cancelled = true; clearInterval(timer); };
  }, [code]);

  // Realtime
  useEffect(() => {
    if (!room) return;
    const channel = supabase.channel(`room:${room.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          setRoom(payload.new as Room);
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `room_id=eq.${room.id}` },
        (payload) => {
          setPlayers((prev) => {
            if (payload.eventType === "DELETE") return prev.filter(p => p.id !== (payload.old as Player).id);
            const n = payload.new as Player;
            const rest = prev.filter(p => p.id !== n.id);
            return [...rest, n];
          });
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "answers", filter: `room_id=eq.${room.id}` },
        (payload) => {
          setAnswers((prev) => {
            if (payload.eventType === "DELETE") return prev.filter(a => a.id !== (payload.old as Answer).id);
            const n = payload.new as Answer;
            const rest = prev.filter(a => a.id !== n.id);
            return [...rest, n];
          });
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [room?.id]);

  const me = useMemo(() => players.find(p => p.client_id === clientId), [players, clientId]);
  const partner = useMemo(() => players.find(p => p.client_id !== clientId), [players, clientId]);

  if (notFound) return <NotFoundScreen />;
  if (!room) return <LoadingScreen />;

  if (!me) {
    if (players.length >= 2) return <SpectatorFullScreen code={code} />;
    return (
      <JoinScreen
        code={code}
        hostName={players[0]?.name}
        joining={submitting}
        onJoin={async (name) => {
          setSubmitting(true);
          const slot = players.some((p) => p.slot === 1) ? 2 : 1;
          await supabase.from("players").insert({
            room_id: room!.id,
            name: (name.trim() || "Partner").slice(0, 30),
            slot,
            client_id: clientId,
          });
          const { data: ps } = await supabase.from("players").select().eq("room_id", room!.id);
          setPlayers((ps ?? []) as Player[]);
          setSubmitting(false);
        }}
      />
    );
  }

  // Waiting screen — only 1 player
  if (players.length < 2) {
    return <WaitingRoom code={code} me={me} copied={copied} onCopy={async () => {
      const url = `${window.location.origin}/room/${code}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }} />;
  }

  const game = getGame(room.mode);
  const prompts = game.prompts;
  const qIndex = room.current_index;
  const question = prompts[qIndex % prompts.length];
  const myAnswer = answers.find(a => a.question_index === qIndex && a.slot === me.slot);
  const partnerAnswer = partner ? answers.find(a => a.question_index === qIndex && a.slot === partner.slot) : undefined;
  const bothAnswered = !!myAnswer && !!partnerAnswer;
  const finished = qIndex >= prompts.length;

  async function submitValue(value: string) {
    if (!value.trim() || !me) return;
    pop("send", 14);
    setSubmitting(true);
    const { error } = await supabase.from("answers").upsert({
      room_id: room!.id,
      question_index: qIndex,
      slot: me.slot,
      answer: value.trim(),
    }, { onConflict: "room_id,question_index,slot" });
    setSubmitting(false);
    if (!error) {
      setDraft("");
      award({ xp: 6 * xpMultiplier(), lp: 3, answers: 1, stats: { communication: 1, romance: 1 } });
    }
  }

  async function switchGame(mode: GameMode) {
    await supabase.from("answers").delete().eq("room_id", room!.id);
    await supabase.from("rooms").update({ current_index: 0, mode }).eq("id", room!.id);
  }

  async function nextQuestion() {
    pop("tap");
    setRevealed(false);
    await supabase.from("rooms").update({ current_index: qIndex + 1 }).eq("id", room!.id);
  }

  if (finished) {
    if (!rewardedGame) {
      setRewardedGame(true);
      setReward(award({
        xp: 60 * xpMultiplier(), lp: 50, games: 1, card: true,
        stats: { trust: 3, communication: 3, romance: 4, humor: 3 },
      }));
    }
    return <>
      <RewardOverlay result={reward} onClose={() => setReward(null)} />
      <FinishedScreen me={me} partner={partner} answers={answers} onSwitch={switchGame} onRestart={async () => {
      await supabase.from("answers").delete().eq("room_id", room!.id);
      await supabase.from("rooms").update({ current_index: 0 }).eq("id", room!.id);
      setRewardedGame(false);
    }} onExit={() => navigate({ to: "/" })} />
    </>;
  }

  const chat = (
    <ChatPanel
      roomId={room.id}
      mySlot={me.slot}
      myName={me.name}
      partnerName={partner?.name ?? "Partner"}
      currentQuestion={question.q}
    />
  );

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <FloatingPetals />
      <RewardOverlay result={reward} onClose={() => setReward(null)} />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-serif text-2xl text-[oklch(0.45_0.15_15)]">
          <Heart className="h-5 w-5" fill="currentColor" />
          Loveline
        </div>
        <div className="flex items-center gap-3 text-sm">
          <ProgressHud compact />
          <span className="rounded-full border border-border bg-white/50 px-3 py-1 text-xs">{game.emoji} {game.title}</span>
          <span className="text-muted-foreground">You &amp; {partner?.name}</span>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid max-w-7xl gap-6 px-6 pb-28 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:pb-10">
        <section className="min-w-0">
        <div className="mb-8 flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
          <span>Question {qIndex + 1} of {prompts.length}</span>
          <span className="rounded-full border border-border bg-white/50 px-3 py-1 font-serif italic normal-case">{question.category}</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/40">
          <div className="h-full bg-gradient-to-r from-[oklch(0.82_0.12_25)] to-[oklch(0.62_0.2_15)] transition-all"
               style={{ width: `${((qIndex + 1) / prompts.length) * 100}%` }} />
        </div>

        <div key={qIndex} className="mt-10 rounded-3xl p-10 glass-card" style={{ animation: "fade-in 0.6s ease" }}>
          <h1 className="text-center text-3xl md:text-4xl font-serif leading-snug text-foreground">
            "{question.q}"
          </h1>
        </div>

        {!bothAnswered ? (
          <div className="mt-8 rounded-3xl p-8 glass-card">
            {!myAnswer ? (
              <>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">{game.inputLabel}, {me.name}</label>
                {question.options ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {question.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => submitValue(opt)}
                        disabled={submitting}
                        className="rounded-2xl border border-border bg-white/70 px-5 py-6 font-serif text-xl italic transition hover:border-[oklch(0.62_0.2_15)] hover:bg-white disabled:opacity-60"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                <>
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder={game.placeholder}
                  rows={4}
                  className="mt-3 w-full resize-none rounded-2xl border border-border bg-white/70 px-4 py-3 text-lg font-serif italic outline-none focus:border-[oklch(0.62_0.2_15)] focus:ring-2 focus:ring-[oklch(0.82_0.12_25)]/40"
                  maxLength={500}
                />
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{draft.length}/500</span>
                  <button
                    onClick={() => submitValue(draft)}
                    disabled={submitting || !draft.trim()}
                    className="btn-romance hover:btn-romance-hover disabled:opacity-50 flex items-center gap-2"
                  >
                    <Heart className="h-4 w-4" fill="currentColor" /> Send with love
                  </button>
                </div>
                </>
                )}
              </>
            ) : (
              <div className="text-center">
                <Sparkles className="mx-auto h-8 w-8 text-[oklch(0.62_0.2_15)]" style={{ animation: "pulse-heart 1.6s ease-in-out infinite" }} />
                <p className="mt-4 font-serif text-xl italic text-foreground">Your heart is set.</p>
                <p className="mt-2 text-sm text-muted-foreground">Waiting for {partner?.name} to answer…</p>
              </div>
            )}
          </div>
        ) : !revealed ? (
          <SuspenseReveal onDone={() => setRevealed(true)} />
        ) : (
          <div className="mt-8 space-y-4" style={{ animation: "fade-in 0.6s ease" }}>
            <AnswerCard name={me.name} answer={myAnswer!.answer} isMe />
            <AnswerCard name={partner!.name} answer={partnerAnswer!.answer} />
            <div className="pt-4 text-center">
              <button onClick={nextQuestion} className="btn-romance hover:btn-romance-hover inline-flex items-center gap-2">
                Next question <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        </section>

        <aside className="hidden min-h-0 lg:block lg:h-[calc(100vh-8rem)] lg:sticky lg:top-6">{chat}</aside>
      </main>

      {/* Mobile chat drawer */}
      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[oklch(0.62_0.2_15)] px-6 py-3 text-sm text-[oklch(0.99_0.01_20)] shadow-xl lg:hidden"
      >
        <MessageCircle className="h-4 w-4" /> Chat with {partner?.name}
      </button>
      <AnimatePresence>
        {chatOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setChatOpen(false)}
              className="fixed inset-0 z-40 bg-black/20 lg:hidden"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 240 }}
              className="fixed inset-x-0 bottom-0 z-50 h-[82vh] lg:hidden"
            >
              <div className="relative h-full px-2 pb-2">
                <button
                  onClick={() => setChatOpen(false)}
                  className="absolute right-5 top-4 z-10 rounded-full bg-white/80 p-1.5"
                  aria-label="Close chat"
                >
                  <X className="h-4 w-4" />
                </button>
                {chat}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function AnswerCard({ name, answer, isMe }: { name: string; answer: string; isMe?: boolean }) {
  return (
    <div className="rounded-3xl p-6 glass-card">
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <Heart className="h-3 w-3 text-[oklch(0.62_0.2_15)]" fill="currentColor" />
        {isMe ? "You" : name} said
      </div>
      <p className="font-serif text-xl italic leading-relaxed text-foreground">"{answer}"</p>
    </div>
  );
}

function WaitingRoom({ code, me, copied, onCopy }: { code: string; me: Player; copied: boolean; onCopy: () => void }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <FloatingPetals />
      <main className="relative z-10 mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
        <Heart className="h-10 w-10 text-[oklch(0.62_0.2_15)]" fill="currentColor" style={{ animation: "pulse-heart 1.8s ease-in-out infinite" }} />
        <h1 className="mt-6 font-serif text-5xl">Waiting for your love…</h1>
        <p className="mt-3 max-w-md text-muted-foreground font-serif italic">
          Send this link to your partner, {me.name}. The date begins the moment they arrive.
        </p>

        <div className="mt-10 w-full rounded-3xl p-8 glass-card">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Room code</div>
          <div className="mt-2 font-serif text-5xl tracking-[0.3em] text-[oklch(0.45_0.15_15)]">{code}</div>
          <button
            onClick={onCopy}
            className="btn-romance hover:btn-romance-hover mt-6 inline-flex items-center gap-2"
          >
            {copied ? <><Check className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy invite link</>}
          </button>
          <p className="mt-4 break-all text-xs text-muted-foreground">
            {typeof window !== "undefined" ? `${window.location.origin}/room/${code}` : ""}
          </p>
        </div>
      </main>
    </div>
  );
}

function FinishedScreen({ me, partner, answers, onRestart, onExit, onSwitch }:
  { me: Player; partner?: Player; answers: Answer[]; onRestart: () => void; onExit: () => void; onSwitch: (mode: GameMode) => void }) {
  const count = answers.filter(a => a.slot === me.slot).length;
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <FloatingPetals />
      <main className="relative z-10 mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
        <Sparkles className="h-10 w-10 text-[oklch(0.62_0.2_15)]" />
        <h1 className="mt-6 font-serif text-5xl">That was beautiful.</h1>
        <p className="mt-4 max-w-md text-muted-foreground font-serif italic">
          You and {partner?.name ?? "your love"} answered {count} questions together. Hold onto this feeling.
        </p>
        <div className="mt-10 flex gap-3">
          <button onClick={onRestart} className="btn-romance hover:btn-romance-hover">Play again</button>
          <button onClick={onExit} className="rounded-full border border-border bg-white/60 px-6 py-3 text-sm">Exit</button>
        </div>
        <div className="mt-12 w-full">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Try another game</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {GAME_LIST.map((g) => (
              <button key={g.id} onClick={() => onSwitch(g.id)}
                className="rounded-2xl border border-border bg-white/60 px-3 py-3 text-left transition hover:bg-white">
                <div className="text-lg leading-none">{g.emoji}</div>
                <div className="mt-2 font-serif text-base leading-tight">{g.title}</div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Heart className="h-8 w-8 text-[oklch(0.62_0.2_15)]" fill="currentColor" style={{ animation: "pulse-heart 1.4s ease-in-out infinite" }} />
    </div>
  );
}

function NotFoundScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center px-6">
      <h1 className="font-serif text-4xl">Room not found</h1>
      <p className="mt-2 text-muted-foreground">Double-check the code or start a new date.</p>
      <a href="/" className="btn-romance mt-6">Back to start</a>
    </div>
  );
}

function SpectatorFullScreen({ code }: { code: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center px-6">
      <h1 className="font-serif text-4xl">This room is full</h1>
      <p className="mt-2 text-muted-foreground">Room {code} already has two hearts inside.</p>
      <a href="/" className="btn-romance mt-6">Start your own date</a>
    </div>
  );
}

function JoinScreen({
  code,
  hostName,
  joining,
  onJoin,
}: {
  code: string;
  hostName?: string;
  joining: boolean;
  onJoin: (name: string) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <FloatingPetals />
      <div className="relative z-10 w-full max-w-md rounded-3xl p-8 glass-card">
        <Heart className="mx-auto h-8 w-8 text-[oklch(0.62_0.2_15)]" fill="currentColor" />
        <h1 className="mt-4 font-serif text-3xl">{hostName ? `${hostName} is waiting…` : "Join the date"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Room {code}</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional)"
          maxLength={30}
          className="mt-6 w-full rounded-full border border-border bg-white/70 px-5 py-3 text-center font-serif italic outline-none focus:border-[oklch(0.62_0.2_15)]"
        />
        <button
          onClick={() => onJoin(name)}
          disabled={joining}
          className="btn-romance hover:btn-romance-hover mt-4 w-full disabled:opacity-50"
        >
          {joining ? "Joining…" : "Join the date"}
        </button>
      </div>
    </div>
  );
}

function UnusedSpectator({ code }: { code: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center px-6">
      <h1 className="font-serif text-4xl">This room is full</h1>
      <p className="mt-2 text-muted-foreground">Room {code} already has two hearts inside.</p>
      <a href="/" className="btn-romance mt-6">Start your own date</a>
    </div>
  );
}