import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { RecommendationProp } from "../lib/types";
import Table from "../components/Table";
export default function RecommendationsPage() {
  const [rows, setRows] = useState<RecommendationProp[]>([]);
  const [loading, setLoading] = useState(true);
  const [bucket, setBucket] = useState("all");
  const [klass, setKlass] = useState("all");
  useEffect(() => { async function load() { setLoading(true); const res = await supabase.from("recommendation_props").select("*").order("created_at", { ascending: false }); setRows((res.data as RecommendationProp[]) ?? []); setLoading(false); } load(); }, []);
  const filtered = useMemo(() => rows.filter(row => { if (bucket !== "all" && row.play_bucket !== bucket) return false; if (klass !== "all" && (row.odds_type ?? "standard") !== klass) return false; return true; }), [rows, bucket, klass]);
  return <div style={{ display:"grid", gap:16 }}><h1 style={{ margin:0, fontSize:28 }}>Recommendations</h1><div style={{ display:"flex", gap:12, flexWrap:"wrap" }}><select value={bucket} onChange={(e)=>setBucket(e.target.value)} style={selectStyle}><option value="all">All buckets</option><option value="safest">Safest</option><option value="best_overall">Best overall</option><option value="upside">Upside</option></select><select value={klass} onChange={(e)=>setKlass(e.target.value)} style={selectStyle}><option value="all">All classes</option><option value="goblin">Goblin</option><option value="standard">Regular</option><option value="demon">Demon</option></select></div>{loading ? <div style={panelStyle}>Loading…</div> : <Table rows={filtered} emptyText="No recommendations yet." columns={[{ key:"player", header:"Player", render:r=>r.player_name },{ key:"team", header:"Team", render:r=>r.player_team ?? "—" },{ key:"stat", header:"Stat", render:r=>r.stat_type_norm },{ key:"side", header:"Side", render:r=>r.side },{ key:"line", header:"Line", render:r=>r.line },{ key:"class", header:"Class", render:r=>r.odds_type ?? "standard" },{ key:"bucket", header:"Bucket", render:r=>r.play_bucket ?? "—" },{ key:"confidence", header:"Confidence", render:r=>(r.confidence ?? "—") as any }]} />}</div>;
}
const selectStyle: React.CSSProperties = { background:"#111827", color:"#e5e7eb", border:"1px solid #374151", borderRadius:8, padding:"10px 12px" };
const panelStyle: React.CSSProperties = { padding:16, border:"1px solid #1f2937", borderRadius:12, background:"#111827" };
