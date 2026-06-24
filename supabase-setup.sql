-- Run this in your Supabase SQL Editor (Database > SQL Editor > New Query)

-- Journal entries (text + AI guidance saved together)
create table journal_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  entry_text text not null,
  guidance jsonb
);

-- Habit log (one row per habit per day per user)
create table habit_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  habit_id text not null,
  date date not null,
  unique(user_id, habit_id, date)
);

-- Tasks
create table tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  text text not null,
  done boolean default false,
  created_at timestamptz default now()
);

-- Bible reading progress
create table bible_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  chapter_key text not null,
  unique(user_id, chapter_key)
);

-- Schedule events
create table events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  time text,
  date date not null,
  created_at timestamptz default now()
);

-- Enable Row Level Security (users only see their own data)
alter table journal_entries enable row level security;
alter table habit_log enable row level security;
alter table tasks enable row level security;
alter table bible_progress enable row level security;
alter table events enable row level security;

-- RLS policies
create policy "own data" on journal_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own data" on habit_log for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own data" on tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own data" on bible_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own data" on events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
