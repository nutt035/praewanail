create extension if not exists pgcrypto;

create table if not exists public.chat_users (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('line', 'facebook')),
  platform_user_id text not null unique,
  display_name text,
  picture_url text,
  last_active timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  chat_user_id uuid not null unique references public.chat_users(id) on delete cascade,
  status text not null default 'bot' check (status in ('bot', 'human')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_user_id uuid not null references public.chat_users(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  message_type text not null default 'text',
  content text,
  image_url text,
  delivery_status text not null default 'success',
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists chat_users_platform_last_active_idx
  on public.chat_users(platform, last_active desc);
create index if not exists chat_messages_user_created_idx
  on public.chat_messages(chat_user_id, created_at);

alter table public.chat_users enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "Owner can read chat users" on public.chat_users;
create policy "Owner can read chat users" on public.chat_users
  for select to authenticated using (true);
drop policy if exists "Owner can read chat sessions" on public.chat_sessions;
create policy "Owner can read chat sessions" on public.chat_sessions
  for select to authenticated using (true);
drop policy if exists "Owner can read chat messages" on public.chat_messages;
create policy "Owner can read chat messages" on public.chat_messages
  for select to authenticated using (true);

do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null;
end $$;
