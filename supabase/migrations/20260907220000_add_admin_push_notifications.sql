create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id bigint not null references public.businesses(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_push_subscriptions_business_active on public.push_subscriptions(business_id,is_active);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null check(char_length(title) between 1 and 120),
  message text not null check(char_length(message) between 1 and 1000),
  target_type text not null check(target_type in ('all','business')),
  target_business_id bigint references public.businesses(id) on delete set null,
  action_url text,
  created_at timestamptz not null default now(),
  created_by text
);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);
create index if not exists idx_notifications_target_business on public.notifications(target_business_id,created_at desc);
alter table public.push_subscriptions enable row level security;
alter table public.notifications enable row level security;
revoke all on public.push_subscriptions from anon,authenticated;
revoke all on public.notifications from anon,authenticated;
