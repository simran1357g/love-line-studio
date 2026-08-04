ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false;

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  slot integer NOT NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'text',
  content text NOT NULL,
  reactions jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_by integer[] NOT NULL DEFAULT '{}'::integer[],
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO anon, authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_messages open" ON public.chat_messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  code text NOT NULL,
  score integer NOT NULL,
  player_a text NOT NULL,
  player_b text NOT NULL,
  categories jsonb NOT NULL DEFAULT '{}'::jsonb,
  insight text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.results TO anon, authenticated;
GRANT ALL ON public.results TO service_role;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "results open" ON public.results FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_chat_messages_room ON public.chat_messages(room_id, created_at);
CREATE INDEX idx_results_code ON public.results(code);

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.results;