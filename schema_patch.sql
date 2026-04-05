alter table review_queue
  alter column board_prop_id drop not null;

alter table review_queue
  alter column settlement_id drop not null;

alter table review_queue
  add column if not exists snapshot_id uuid references board_snapshots(id) on delete cascade;

create index if not exists idx_review_queue_snapshot_id on review_queue(snapshot_id);
