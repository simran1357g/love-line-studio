import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getClientId } from "@/lib/client-id";
import { COMPAT_QUESTIONS } from "@/lib/compatibility";
import { FloatingHearts } from "@/components/compat/FloatingHearts";
import { ChatPanel } from "@/components/compat/ChatPanel";
import { CompatResults } from "@/components/compat/CompatResults";
import { ProgressHud } from "@/components/ProgressHud";
import { RewardOverlay } from "@/components/RewardOverlay";
import { award, touchStreak, xpMultiplier, type AwardResult } from "@/lib/progress";
import { pop } from "@/lib/audio";
import { Check, ChevronLeft, ChevronRight, Copy, Heart, Lock, MessageCircle, X } from "lucide-react";

export const Route = createFileRoute("/compat/$code")({
  component: CompatPage,
  head: ({ params }) => ({
    meta: [
      { title: `Compatibility Test ${params.code} — Loveline` },
      {
        name: "description",
        content: "A premium real-time compatibility test for couples: 25 questions, live chat, and an AI love score.",
      },
      { property: "og:title", content: "Loveline Compatibility Test" },
      { property: "og:description", content: "Answer 25 questions together and reveal your compatibility score." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Room = { id: string; code: string; current_index: number; status: string; mode: string };
type Player = { id: string; room_id: string; name: string; slot: number; client_id: string };
type Answer = { id: string; room_id: string; question_index: number; slot: number; answer: string; locked: boolean };

function CompatPage() {
  const { code } = useParams({ from: "/compat/$code" });
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [joining, setJoining] = useState(false);
  const clientId = typeof window !== "undefined" ? getClientId() : "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const list: string[] = JSON.parse(localStorage.getItem("loveline_compat_codes") ?? "[]");
    if (!list.includes(code)) localStorage.setItem("loveline_compat_codes", JSON.stringify([...list, code].slice(-20)));
  }, [code]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: r } = await supabase.from("rooms").select().eq("code", code).maybeSingle();
      if (cancelled) return;
      if (!r) {
        setNotFound(true);
        return;
      }
      setRoom(r as Room);
      const [{ data: ps }, { data: as }] = await Promise.all([
        supabase.from("players").select().eq("room_id", r.id),
        supabase.from("answers").select().eq("room_id", r.id),
      ]);
      if (cancelled) return;
      setPlayers((ps ?? []) as Player[]);
      setAnswers((as ?? []) as Answer[]);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    if (!room) return;
    const channel = supabase
      .channel(`compat:${room.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `room_id=eq.${room.id}` }, (p) => {
        setPlayers((prev) => {
          if (p.eventType === "DELETE") return prev.filter((x) => x.id !== (p.old as Player).id);
          const n = p.new as Player;
          return [...prev.filter((x) => x.id !== n.id), n];
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "answers", filter: `room_id=eq.${room.id}` }, (p) => {
        setAnswers((prev) => {
          if (p.eventType === "DELETE") return prev.filter((x) => x.id !== (p.old as Answer).id);
          const n = p.new as Answer;
          return [...prev.filter((x) => x.id !== n.id), n];
        });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id]);

  const me = useMemo(() => players.find((p) => p.client_id === clientId), [players, clientId]);
  const partner = useMemo(() => players.find((p) => p.client_id !== clientId), [players, clientId]);

  async function join() {
    if (!room) return;
    setJoining(true);
    const slot = players.find((p) => p.slot === 1) ? 2 : 1;
    await supabase.from("players").insert({
      room_id: room.id,
      name: (joinName.trim() || "Partner").slice(0, 30),
      slot,
      client_id: clientId,
    });
    const { data: ps } = await supabase.from("players").select().eq("room_id", room.id);
    setPlayers((ps ?? []) as Player[]);
    setJoining(false);
  }

  if (notFound) return <Centered title="Room not found" line="Double-check the code or start a new test." />;
  if (!room) return <Centered title="Loading…" line="Setting the mood." />;

  if (!me) {
    if (players.length >= 2) return <Centered title="This room is full" line={`Room ${code} already has two hearts inside.`} />;
    return (
      <Shell>
        <div className="mx-auto w-full max-w-md rounded-3xl p-8 text-center glass-card">
          <Heart className="mx-auto h-8 w-8 text-[oklch(0.62_0.2_15)]" fill="currentColor" />
          <h1 className="mt-4 font-serif text-4xl">You've been invited</h1>
          <p className="mt-2 font-serif italic text-muted-foreground">
            {players[0]?.name ?? "Someone"} wants to test your compatibility.
          </p>
          <input
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            placeholder="Your name"
            maxLength={30}
            className="mt-6 w-full rounded-xl border border-border bg-white/70 px-4 py-3 text-center font-serif text-lg italic outline-none focus:border-[oklch(0.62_0.2_15)]"
          />
          <button onClick={join} disabled={joining} className="btn-romance hover:btn-romance-hover mt-4 w-full disabled:opacity-60">
            Join the test
          </button>
        </div>
      </Shell>
    );
  }

  const myAnswers = answers.filter((a) => a.slot === me.slot);
  const partnerAnswers = partner ? answers.filter((a) => a.slot === partner.slot) : [];
  const iLocked = myAnswers.length === COMPAT_QUESTIONS.length && myAnswers.every((a) => a.locked);
  const partnerLocked = partnerAnswers.length === COMPAT_QUESTIONS.length && partnerAnswers.every((a) => a.locked);

  if (players.length < 2) {
    return (
      <Shell>
        <div className="mx-auto w-full max-w-md rounded-3xl p-8 text-center glass-card">
          <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.8, repeat: Infinity }}>
            <Heart className="mx-auto h-10 w-10 text-[oklch(0.62_0.2_15)]" fill="currentColor" />
          </motion.div>
          <h1 className="mt-5 font-serif text-4xl">Waiting for your person…</h1>
          <p className="mt-2 font-serif italic text-muted-foreground">Send them this code, {me.name}.</p>
          <div className="mt-6 font-serif text-5xl tracking-[0.3em] text-[oklch(0.45_0.15_15)]">{code}</div>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(`${window.location.origin}/compat/${code}`);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="btn-romance hover:btn-romance-hover mt-6 inline-flex items-center gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" /> Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copy invite link
              </>
            )}
          </button>
        </div>
      </Shell>
    );
  }

  if (iLocked && partnerLocked) {
    const bySlot: Record<number, string[]> = { 1: [], 2: [] };
    answers.forEach((a) => {
      if (!bySlot[a.slot]) bySlot[a.slot] = [];
      bySlot[a.slot][a.question_index] = a.answer;
    });
    return (
      <Shell wide>
        <CompatResults
          roomId={room.id}
          code={code}
          mySlot={me.slot}
          myName={me.name}
          partnerName={partner?.name ?? "Partner"}
          answersBySlot={bySlot}
          onPlayAgain={async () => {
            await supabase.from("answers").delete().eq("room_id", room.id);
            setAnswers([]);
            setIndex(0);
          }}
          onExit={() => navigate({ to: "/" })}
        />
      </Shell>
    );
  }

  const question = COMPAT_QUESTIONS[index];
  const myPick = myAnswers.find((a) => a.question_index === index)?.answer;
  const answeredCount = myAnswers.length;
  const allAnswered = answeredCount === COMPAT_QUESTIONS.length;

  async function pick(option: string) {
    if (!me || iLocked) return;
    setAnswers((prev) => [
      ...prev.filter((a) => !(a.slot === me.slot && a.question_index === index)),
      { id: `local-${index}`, room_id: room!.id, question_index: index, slot: me.slot, answer: option, locked: false },
    ]);
    await supabase
      .from("answers")
      .upsert(
        { room_id: room!.id, question_index: index, slot: me.slot, answer: option, locked: false },
        { onConflict: "room_id,question_index,slot" },
      );
    setTimeout(() => setIndex((i) => Math.min(COMPAT_QUESTIONS.length - 1, i + 1)), 350);
  }

  async function lockAnswers() {
    if (!me) return;
    await supabase.from("answers").update({ locked: true }).eq("room_id", room!.id).eq("slot", me.slot);
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
      <FloatingHearts />

      <header className="relative z-10 mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-5 sm:flex sm:justify-between">
        <div className="flex min-w-0 items-center gap-2 font-serif text-2xl text-[oklch(0.45_0.15_15)]">
          <Heart className="h-5 w-5 shrink-0" fill="currentColor" />
          <span className="truncate">Compatibility Test</span>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs">
          <ProgressHud compact />
          <span className="rounded-full border border-border bg-white/60 px-3 py-1">
            {me.name} &amp; {partner?.name}
          </span>
          <span className="rounded-full border border-border bg-white/60 px-3 py-1 tracking-widest">{code}</span>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid max-w-7xl gap-6 px-5 pb-28 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:pb-10">
        <section className="min-w-0">
          <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
            <span>
              Question {index + 1} of {COMPAT_QUESTIONS.length}
            </span>
            <span className="rounded-full border border-border bg-white/60 px-3 py-1 font-serif italic normal-case">
              {question.category}
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/50">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[oklch(0.82_0.12_25)] to-[oklch(0.62_0.2_15)]"
              animate={{ width: `${(answeredCount / COMPAT_QUESTIONS.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            You: {answeredCount}/25 · {partner?.name}: {partnerAnswers.length}/25
            {partnerLocked && " · locked in 🔒"}
          </p>

          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18, scale: 0.98 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
              className="mt-6 rounded-[2rem] p-7 glass-card sm:p-10"
            >
              <div className="text-4xl">{question.emoji}</div>
              <h1 className="mt-4 font-serif text-3xl leading-snug sm:text-4xl">{question.q}</h1>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {question.options.map((opt) => {
                  const active = myPick === opt;
                  return (
                    <motion.button
                      key={opt}
                      whileTap={{ scale: 0.97 }}
                      whileHover={{ y: -2 }}
                      onClick={() => pick(opt)}
                      disabled={iLocked}
                      className={`rounded-2xl border px-5 py-5 text-left font-serif text-lg transition disabled:opacity-60 ${
                        active
                          ? "border-[oklch(0.62_0.2_15)] bg-[oklch(0.62_0.2_15)] text-[oklch(0.99_0.01_20)] shadow-lg"
                          : "border-border bg-white/70 hover:bg-white"
                      }`}
                    >
                      {opt}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-white/60 px-4 py-2.5 text-sm disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            {allAnswered && !iLocked ? (
              <motion.button
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={lockAnswers}
                className="btn-romance hover:btn-romance-hover inline-flex items-center gap-2"
              >
                <Lock className="h-4 w-4" /> Lock Answers
              </motion.button>
            ) : iLocked ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-[oklch(0.62_0.2_15)]/40 bg-white/70 px-4 py-2.5 text-sm text-[oklch(0.45_0.15_15)]">
                <Lock className="h-4 w-4" /> Locked · waiting for {partner?.name}
              </span>
            ) : (
              <button
                onClick={() => setIndex((i) => Math.min(COMPAT_QUESTIONS.length - 1, i + 1))}
                disabled={index === COMPAT_QUESTIONS.length - 1}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-white/60 px-4 py-2.5 text-sm disabled:opacity-40"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
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

function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <FloatingHearts />
      <div className={`relative z-10 mx-auto flex min-h-screen ${wide ? "" : "items-center justify-center"} px-5 py-10`}>
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}

function Centered({ title, line }: { title: string; line: string }) {
  return (
    <Shell>
      <div className="text-center">
        <h1 className="font-serif text-4xl">{title}</h1>
        <p className="mt-2 text-muted-foreground">{line}</p>
        <a href="/" className="btn-romance mt-6 inline-block">
          Back to start
        </a>
      </div>
    </Shell>
  );
}