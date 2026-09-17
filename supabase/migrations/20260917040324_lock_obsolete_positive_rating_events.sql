drop policy if exists "Public can record positive ratings" on public.rating_events;
revoke all on table public.rating_events from anon, authenticated;
