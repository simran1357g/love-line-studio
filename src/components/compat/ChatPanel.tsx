import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { loveBotStarter } from "@/lib/lovebot.functions";
import { Send, Smile, Sparkles, Check, CheckCheck } from "lucide-react";

export type ChatMessage = {
  id: string;
  room_id: string;
  slot: number;
  name: string;
  kind: string;
  content: string;
  reactions: Record<string, number[]>;
  read_by: number[];
  created_at: string;
};

const EMOJIS = ["❤️", "😍", "😂", "🥺", "🔥", "😘", "✨", "🙈", "💍", "🌹"];
const REACTIONS = ["❤️", "😂", "😮", "🥺", "🔥"];

export function ChatPanel({
  roomId,
  mySlot,
  myName,
  partnerName,
  currentQuestion,
}: {
  roomId: string;
  mySlot: number;
  myName: string;
  partnerName: string;
  currentQuestion: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [botLoading, setBotLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const typingChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const instanceId = useRef(Math.random().toString(36).slice(2, 9));

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      supabase
        .from("chat_messages")
        .select()
        .eq("room_id", roomId)
        .order("created_at")
        .then(({ data }) => {
          if (cancelled) return;
          const next = (data ?? []) as unknown as ChatMessage[];
          setMessages((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
        });
    load();
    const timer = setInterval(load, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [roomId]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat:${roomId}:${instanceId.current}`, { config: { broadcast: { self: false } } })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => {
            if (payload.eventType === "DELETE") return prev.filter((m) => m.id !== (payload.old as ChatMessage).id);
            const n = payload.new as unknown as ChatMessage;
            const rest = prev.filter((m) => m.id !== n.id);
            return [...rest, n].sort((a, b) => a.created_at.localeCompare(b.created_at));
          });
        },
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if ((payload as { slot: number }).slot === mySlot) return;
        setPartnerTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setPartnerTyping(false), 2500);
      })
      .subscribe();
    typingChannel.current = channel;
    return () => {
      supabase.removeChannel(channel);
      typingChannel.current = null;
    };
  }, [roomId, mySlot]);

  // Auto scroll
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, partnerTyping]);

  // Read receipts
  useEffect(() => {
    const unread = messages.filter((m) => m.slot !== mySlot && !(m.read_by ?? []).includes(mySlot));
    if (!unread.length) return;
    unread.forEach((m) => {
      supabase
        .from("chat_messages")
        .update({ read_by: [...(m.read_by ?? []), mySlot] })
        .eq("id", m.id)
        .then(() => undefined);
    });
  }, [messages, mySlot]);

  const notifyTyping = useCallback(() => {
    typingChannel.current?.send({ type: "broadcast", event: "typing", payload: { slot: mySlot } });
  }, [mySlot]);

  async function send(content: string, kind = "text", name = myName, slot = mySlot) {
    const body = content.trim();
    if (!body) return;
    setText("");
    setShowEmoji(false);
    await supabase.from("chat_messages").insert({ room_id: roomId, slot, name, kind, content: body });
  }

  async function react(m: ChatMessage, emoji: string) {
    const current = { ...(m.reactions ?? {}) } as Record<string, number[]>;
    const slots = current[emoji] ?? [];
    current[emoji] = slots.includes(mySlot) ? slots.filter((s) => s !== mySlot) : [...slots, mySlot];
    if (!current[emoji].length) delete current[emoji];
    await supabase.from("chat_messages").update({ reactions: current }).eq("id", m.id);
  }

  async function callLoveBot() {
    setBotLoading(true);
    try {
      const res = await loveBotStarter({ data: { question: currentQuestion, names: `${myName} and ${partnerName}` } });
      if (res.message) await send(res.message, "bot", "LoveBot", 0);
    } catch (e) {
      await send((e as Error).message || "LoveBot is resting.", "bot", "LoveBot", 0);
    } finally {
      setBotLoading(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-3xl glass-card">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div className="min-w-0">
          <p className="truncate font-serif text-lg leading-tight">Chat with {partnerName}</p>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {partnerTyping ? "typing…" : "live"}
          </p>
        </div>
        <button
          onClick={callLoveBot}
          disabled={botLoading}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-[oklch(0.62_0.2_15)]/30 bg-white/70 px-3 py-1.5 text-xs font-medium text-[oklch(0.45_0.15_15)] transition hover:bg-white disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {botLoading ? "Thinking…" : "LoveBot"}
        </button>
      </div>

      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="px-2 pt-6 text-center font-serif italic text-muted-foreground">
            Say something sweet while you answer…
          </p>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m) => {
            const mine = m.slot === mySlot;
            const bot = m.kind === "bot";
            const seen = mine && (m.read_by ?? []).some((s) => s !== mySlot);
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`group flex flex-col ${mine ? "items-end" : "items-start"}`}
              >
                {bot ? (
                  <div className="w-full rounded-2xl border border-[oklch(0.62_0.2_15)]/25 bg-white/60 px-4 py-3">
                    <p className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-widest text-[oklch(0.55_0.18_15)]">
                      <Sparkles className="h-3 w-3" /> LoveBot
                    </p>
                    <p className="font-serif italic leading-relaxed text-foreground">{m.content}</p>
                  </div>
                ) : (
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                      mine
                        ? "bg-[oklch(0.62_0.2_15)] text-[oklch(0.99_0.01_20)]"
                        : "border border-border bg-white/80 text-foreground"
                    }`}
                  >
                    {!mine && <span className="mb-0.5 block text-[10px] uppercase tracking-widest opacity-60">{m.name}</span>}
                    {m.content}
                  </div>
                )}

                <div className={`mt-1 flex items-center gap-1 ${mine ? "flex-row-reverse" : ""}`}>
                  {Object.entries(m.reactions ?? {}).map(([emoji, slots]) => (
                    <button
                      key={emoji}
                      onClick={() => react(m, emoji)}
                      className="rounded-full border border-border bg-white/80 px-2 py-0.5 text-xs"
                    >
                      {emoji} {slots.length}
                    </button>
                  ))}
                  <div className="hidden gap-0.5 group-hover:flex">
                    {REACTIONS.map((r) => (
                      <button
                        key={r}
                        onClick={() => react(m, r)}
                        className="rounded-full px-1 text-xs opacity-60 transition hover:opacity-100"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  {mine &&
                    (seen ? (
                      <CheckCheck className="h-3.5 w-3.5 text-[oklch(0.62_0.2_15)]" />
                    ) : (
                      <Check className="h-3.5 w-3.5 text-muted-foreground" />
                    ))}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {partnerTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 px-2">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                className="h-2 w-2 rounded-full bg-[oklch(0.62_0.2_15)]/50"
              />
            ))}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showEmoji && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="shrink-0 overflow-hidden border-t border-border/60 px-4"
          >
            <div className="flex flex-wrap gap-1 py-3">
              {EMOJIS.map((e) => (
                <button key={e} onClick={() => setText((t) => t + e)} className="rounded-xl px-2 py-1 text-xl hover:bg-white/70">
                  {e}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
        className="flex shrink-0 items-center gap-2 border-t border-border/60 px-3 py-3"
      >
        <button
          type="button"
          onClick={() => setShowEmoji((s) => !s)}
          className="shrink-0 rounded-full p-2 text-muted-foreground transition hover:bg-white/70"
          aria-label="Emojis"
        >
          <Smile className="h-5 w-5" />
        </button>
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            notifyTyping();
          }}
          placeholder="Type something lovely…"
          maxLength={400}
          className="min-w-0 flex-1 rounded-full border border-border bg-white/70 px-4 py-2.5 outline-none focus:border-[oklch(0.62_0.2_15)]"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="shrink-0 rounded-full bg-[oklch(0.62_0.2_15)] p-2.5 text-[oklch(0.99_0.01_20)] transition disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}