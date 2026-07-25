
CREATE TABLE public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  current_index int not null default 0,
  status text not null default 'waiting',
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO anon, authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rooms open" ON public.rooms FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null,
  slot int not null,
  client_id text not null,
  joined_at timestamptz not null default now(),
  unique (room_id, slot)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO anon, authenticated;
GRANT ALL ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "players open" ON public.players FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  question_index int not null,
  slot int not null,
  answer text not null,
  created_at timestamptz not null default now(),
  unique (room_id, question_index, slot)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.answers TO anon, authenticated;
GRANT ALL ON public.answers TO service_role;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "answers open" ON public.answers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.answers;

ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER TABLE public.players REPLICA IDENTITY FULL;
ALTER TABLE public.answers REPLICA IDENTITY FULL;
