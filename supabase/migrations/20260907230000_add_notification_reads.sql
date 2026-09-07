create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  business_id bigint not null references public.businesses(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, business_id)
);
create index if not exists idx_notification_reads_business on public.notification_reads(business_id, read_at desc);
alter table public.notification_reads enable row level security;
revoke all on public.notification_reads from anon, authenticated;
