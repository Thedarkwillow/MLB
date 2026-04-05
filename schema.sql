-- Enable useful extension
create extension if not exists pgcrypto;

create table if not exists board_snapshots (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'apify',
  actor_id text,
  actor_run_id text,
  dataset_id text,
  sport text not null default 'MLB',
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (actor_run_id)
);

create table if not exists board_props (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references board_snapshots(id) on delete cascade,
  projection_id text not null,
  market_id text,
  event_id text,
  player_name text not null,
  player_team text,
  opponent_team text,
  stat_type_raw text not null,
  line numeric,
  direction text,
  odds_type text,
  start_time timestamptz,
  board_time timestamptz,
  updated_at timestamptz,
  player_name_norm text not null,
  player_team_norm text,
  opponent_team_norm text,
  stat_type_norm text not null,
  join_status text not null default 'unresolved',
  review_reason text,
  raw jsonb not null,
  created_at timestamptz not null default now(),
  unique (snapshot_id, projection_id)
);

create index if not exists idx_board_props_snapshot_id on board_props(snapshot_id);
create index if not exists idx_board_props_projection_id on board_props(projection_id);
create index if not exists idx_board_props_player_norm on board_props(player_name_norm);
create index if not exists idx_board_props_stat_norm on board_props(stat_type_norm);
create index if not exists idx_board_props_odds_type on board_props(odds_type);

create table if not exists recommendation_runs (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid references board_snapshots(id) on delete set null,
  run_label text,
  created_at timestamptz not null default now()
);

create table if not exists recommendation_props (
  id uuid primary key default gen_random_uuid(),
  recommendation_run_id uuid not null references recommendation_runs(id) on delete cascade,
  board_prop_id uuid references board_props(id) on delete set null,
  projection_id text not null,
  player_name text not null,
  player_team text,
  opponent_team text,
  stat_type_norm text not null,
  line numeric not null,
  side text not null check (side in ('MORE', 'LESS')),
  odds_type text,
  confidence numeric,
  edge numeric,
  trust_score numeric,
  play_bucket text,
  created_at timestamptz not null default now()
);

create index if not exists idx_recommendation_props_projection_id on recommendation_props(projection_id);
create index if not exists idx_recommendation_props_run_id on recommendation_props(recommendation_run_id);

create table if not exists settlements (
  id uuid primary key default gen_random_uuid(),
  board_prop_id uuid references board_props(id) on delete set null,
  recommendation_prop_id uuid references recommendation_props(id) on delete set null,
  projection_id text not null,
  game_date date,
  player_name text not null,
  player_team text,
  stat_type_norm text not null,
  line numeric not null,
  side text not null check (side in ('MORE', 'LESS')),
  actual_value numeric,
  result text not null default 'PENDING' check (result in ('PENDING', 'HIT', 'MISS', 'PUSH', 'REVIEW')),
  closing_line numeric,
  settled_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_settlements_projection_id on settlements(projection_id);
create index if not exists idx_settlements_result on settlements(result);
create index if not exists idx_settlements_stat_type_norm on settlements(stat_type_norm);

create table if not exists review_queue (
  id uuid primary key default gen_random_uuid(),
  board_prop_id uuid references board_props(id) on delete cascade,
  settlement_id uuid references settlements(id) on delete cascade,
  queue_type text not null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'ignored')),
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_review_queue_status on review_queue(status);
create index if not exists idx_review_queue_type on review_queue(queue_type);

create table if not exists player_aliases (
  id uuid primary key default gen_random_uuid(),
  alias text not null unique,
  normalized_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists team_aliases (
  id uuid primary key default gen_random_uuid(),
  alias text not null unique,
  normalized_team text not null,
  created_at timestamptz not null default now()
);

create or replace view latest_board_snapshot as
select * from board_snapshots order by captured_at desc limit 1;
