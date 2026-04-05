import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { normalizeApifyRow } from "../shared/normalize";
import type { ApifyPrizePicksRow } from "../shared/types";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const APIFY_TOKEN = process.env.APIFY_TOKEN!;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !APIFY_TOKEN || !WEBHOOK_SECRET) {
  throw new Error("Missing required env vars for webhook");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

type ApifyWebhookPayload = {
  eventType?: string;
  resource?: { id?: string; actId?: string; defaultDatasetId?: string; };
};

async function fetchApifyDatasetItems(datasetId: string) {
  const url = `https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&token=${encodeURIComponent(APIFY_TOKEN)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch Apify dataset items: ${res.status} ${res.statusText}`);
  return (await res.json()) as ApifyPrizePicksRow[];
}

function getSecretFromRequest(req: VercelRequest): string | null {
  const q = req.query.secret;
  if (typeof q === "string") return q;
  if (Array.isArray(q) && q[0]) return q[0];
  return null;
}

function needsIngestReview(row: { projection_id: string; player_name_norm: string; stat_type_norm: string; line: number | null; }) {
  return !row.projection_id || !row.player_name_norm || !row.stat_type_norm || row.line === null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const secret = getSecretFromRequest(req);
  if (!secret || secret !== WEBHOOK_SECRET) return res.status(401).json({ error: "Unauthorized" });

  try {
    const body = (req.body ?? {}) as ApifyWebhookPayload;
    const actorRunId = body.resource?.id ?? null;
    const actorId = body.resource?.actId ?? null;
    const datasetId = body.resource?.defaultDatasetId ?? null;
    if (!datasetId) return res.status(400).json({ error: "Missing defaultDatasetId in webhook payload" });

    const items = await fetchApifyDatasetItems(datasetId);

    const { data: snapshot, error: snapshotError } = await supabase
      .from("board_snapshots")
      .upsert({ source: "apify", actor_id: actorId, actor_run_id: actorRunId, dataset_id: datasetId, sport: "MLB", captured_at: new Date().toISOString() }, { onConflict: "actor_run_id" })
      .select("id")
      .single();

    if (snapshotError || !snapshot) throw new Error(`Failed to create snapshot: ${snapshotError?.message ?? "unknown error"}`);

    const normalizedRows = items.map((row) => normalizeApifyRow(row)).filter((row) => row.projection_id);
    if (!normalizedRows.length) return res.status(200).json({ ok: true, snapshot_id: snapshot.id, inserted: 0, skipped: items.length });

    const boardPropRows = normalizedRows.map((row) => ({
      snapshot_id: snapshot.id,
      projection_id: row.projection_id,
      market_id: row.market_id,
      event_id: row.event_id,
      player_name: row.player_name,
      player_team: row.player_team,
      opponent_team: row.opponent_team,
      stat_type_raw: row.stat_type_raw,
      line: row.line,
      direction: row.direction,
      odds_type: row.odds_type,
      start_time: row.start_time,
      board_time: row.board_time,
      updated_at: row.updated_at,
      player_name_norm: row.player_name_norm,
      player_team_norm: row.player_team_norm,
      opponent_team_norm: row.opponent_team_norm,
      stat_type_norm: row.stat_type_norm,
      join_status: needsIngestReview(row) ? "review" : "unresolved",
      review_reason: needsIngestReview(row) ? "Missing required normalized ingest fields" : null,
      raw: row.raw,
    }));

    const { data: insertedProps, error: insertError } = await supabase
      .from("board_props")
      .upsert(boardPropRows, { onConflict: "snapshot_id,projection_id" })
      .select("id,snapshot_id,projection_id,review_reason,join_status");

    if (insertError) throw new Error(`Failed to insert board props: ${insertError.message}`);

    const reviewRows = (insertedProps ?? [])
      .filter((row) => row.join_status === "review")
      .map((row) => ({ board_prop_id: row.id, snapshot_id: row.snapshot_id, queue_type: "ingest", reason: row.review_reason ?? "Missing required normalized ingest fields", status: "open" }));

    if (reviewRows.length) await supabase.from("review_queue").insert(reviewRows);

    return res.status(200).json({ ok: true, snapshot_id: snapshot.id, inserted: insertedProps?.length ?? 0, reviews_created: reviewRows.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown webhook error";
    return res.status(500).json({ error: message });
  }
}
