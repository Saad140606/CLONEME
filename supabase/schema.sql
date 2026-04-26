-- Users are handled by Supabase Auth automatically.

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  mode text default 'upload',
  status text default 'pending',
  photo_url text,
  video_url text,
  result_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table jobs enable row level security;

drop policy if exists "Users see own jobs" on jobs;
create policy "Users see own jobs" on jobs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
