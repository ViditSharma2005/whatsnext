-- Run once in the Supabase SQL editor. Service-role access is server-side only.
create extension if not exists pgcrypto;
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  text text not null unique check (char_length(text) between 10 and 200),
  upvotes integer not null default 0 check (upvotes >= 0),
  downvotes integer not null default 0 check (downvotes >= 0),
  created_at timestamptz not null default now()
);
create table if not exists public.quote_votes (
  quote_id uuid not null references public.quotes(id) on delete cascade,
  voter_hash text not null,
  vote smallint not null check (vote in (-1,1)),
  updated_at timestamptz not null default now(),
  primary key (quote_id,voter_hash)
);
create table if not exists public.vote_attempts (voter_hash text primary key, window_start timestamptz not null default now(), attempts integer not null default 1);
create table if not exists public.contest_snapshots (id text primary key, payload jsonb not null);
create index if not exists quotes_created_at_idx on public.quotes (created_at desc);
alter table public.quotes enable row level security;
alter table public.quote_votes enable row level security;
alter table public.vote_attempts enable row level security;
alter table public.contest_snapshots enable row level security;
-- No anon or authenticated policies: all accesses go through the server with service role.
revoke all on public.quotes, public.quote_votes, public.vote_attempts, public.contest_snapshots from anon, authenticated;
grant all on public.quotes, public.quote_votes, public.vote_attempts, public.contest_snapshots to service_role;
create or replace function public.cast_quote_vote(p_quote_id uuid, p_voter_hash text, p_vote integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare prior integer := 0; current_up integer; current_down integer; n integer;
begin
  if p_vote not in (-1,0,1) or length(p_voter_hash) <> 64 then raise exception 'Invalid vote'; end if;
  -- Serializes a voter's requests across server instances.
  perform pg_advisory_xact_lock(hashtext(p_voter_hash));
  insert into vote_attempts(voter_hash,window_start,attempts) values(p_voter_hash,now(),1)
    on conflict(voter_hash) do update set
      attempts = case when vote_attempts.window_start < now() - interval '1 minute' then 1 else vote_attempts.attempts+1 end,
      window_start = case when vote_attempts.window_start < now() - interval '1 minute' then now() else vote_attempts.window_start end
    returning attempts into n;
  if n > 30 then raise exception 'Rate limited'; end if;
  perform 1 from quotes where id=p_quote_id for update;
  if not found then raise exception 'Quote not found'; end if;
  select vote into prior from quote_votes where quote_id=p_quote_id and voter_hash=p_voter_hash;
  prior := coalesce(prior,0);
  if p_vote = 0 then delete from quote_votes where quote_id=p_quote_id and voter_hash=p_voter_hash;
  else insert into quote_votes(quote_id,voter_hash,vote) values(p_quote_id,p_voter_hash,p_vote)
    on conflict(quote_id,voter_hash) do update set vote=excluded.vote, updated_at=now(); end if;
  update quotes set upvotes=upvotes-(case when prior=1 then 1 else 0 end)+(case when p_vote=1 then 1 else 0 end),
    downvotes=downvotes-(case when prior=-1 then 1 else 0 end)+(case when p_vote=-1 then 1 else 0 end)
    where id=p_quote_id returning upvotes,downvotes into current_up,current_down;
  return jsonb_build_object('upvotes',current_up,'downvotes',current_down,'vote',p_vote);
end; $$;
revoke all on function public.cast_quote_vote(uuid,text,integer) from public, anon, authenticated;
grant execute on function public.cast_quote_vote(uuid,text,integer) to service_role;
-- Add starter quotes so voting works immediately after setup.
insert into public.quotes(text) values
 ('Your excuses have a better streak than your submissions. Change that.'),
 ('The contest starts soon. Your comfort zone can wait.'),
 ('That problem isn’t going to solve itself. Neither is your rating.'),
 ('Less scrolling. More solving. The leaderboard isn’t going to climb itself.')
on conflict(text) do nothing;
