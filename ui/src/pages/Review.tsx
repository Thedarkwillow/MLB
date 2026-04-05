import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { ReviewQueueItem } from "../lib/types";
import Table from "../components/Table";
export default function ReviewPage() {
  const [rows, setRows] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { async function load() { setLoading(true); const res = await supabase.from("review_queue").select("*").order("created_at", { ascending: false }); setRows((res.data as ReviewQueueItem[]) ?? []); setLoading(false); } load(); }, []);
  return <div style={{ display:"grid", gap:16 }}><h1 style={{ margin:0, fontSize:28 }}>Review Queue</h1>{loading ? <div style={panelStyle}>Loading…</div> : <Table rows={rows} emptyText="No review items." columns={[{ key:"type", header:"Type", render:r=>r.queue_type },{ key:"reason", header:"Reason", render:r=>r.reason },{ key:"status", header:"Status", render:r=>r.status },{ key:"created", header:"Created", render:r=>new Date(r.created_at).toLocaleString() },{ key:"resolution", header:"Resolution", render:r=>r.resolution ?? "—" }]} />}</div>;
}
const panelStyle: React.CSSProperties = { padding:16, border:"1px solid #1f2937", borderRadius:12, background:"#111827" };
