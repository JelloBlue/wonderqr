drop policy if exists "public usage events insert" on public.usage_events;
revoke all on table public.usage_events from anon, authenticated;
revoke all on sequence public.usage_events_id_seq from anon, authenticated;
