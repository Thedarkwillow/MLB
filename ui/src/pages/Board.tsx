import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { BoardProp } from "../lib/types";
import Table from "../components/Table";
export default function BoardPage() {
  const [rows, setRows] = useState<BoardProp[]>([]);
  const [loading, setLoading] = useState(true);
  const [oddsFilter, setOddsFilter] = useState("all");
  const [statFilter, setStatFilter] = useState("");
  useEffect(() => { async function load() {
    setLoading(true);
    const snapshotRes = await supabase.from("board_snapshots").select("id").order("captured_at", { ascending: false }).limit(1).single();
    const snapshotId = snapshotRes.data?.id;
    if (!snapshotId) { setRows([]); setLoading(false); return; }
    const propsRes = await supabase.from("board_props").select("*").eq("snapshot_id", snapshotId).order("player_name", { ascending: true });
    setRows((propsRes.data as BoardProp[]) ?? []); setLoading(false);
  } load(); }, []);
  const filtered = useMemo(() => rows.filter(row => { if (oddsFilter !== "all" && (row.odds_type ?? "standard") !== oddsFilter) return false; if (statFilter && row.stat_type_norm !== statFilter) return false; return true; }), [rows, oddsFilter, statFilter]);
  const statOptions = useMemo(() => Array.from(new Set(rows.map(r => r.stat_type_norm))).sort(), [rows]);
  return <div style={{ display:"grid", gap:16 }}><h1 style={{ margin:0, fontSize:28 }}>Board</h1><div style={{ display:"flex", gap:12, flexWrap:"wrap" }}><select value={oddsFilter} onChange={(e)=>setOddsFilter(e.target.value)} style={selectStyle}><option value="all">All classes</option><option value="goblin">Goblin</option><option value="standard">Regular</option><option value="demon">Demon</option></select><select value={statFilter} onChange={(e)=>setStatFilter(e.target.value)} style={selectStyle}><option value="">All stats</option>{statOptions.map(stat => <option key={stat} value={stat}>{stat}</option>)}</select></div>{loading ? <div style={panelStyle}>Loading…</div> : <Table rows={filtered} emptyText="No board rows yet." columns={[{ key:"player", header:"Player", render:r=>r.player_name },{ key:"team", header:"Team", render:r=>r.player_team ?? "—" },{ key:"opp", header:"Opponent", render:r=>r.opponent_team ?? "—" },{ key:"stat", header:"Stat", render:r=>r.stat_type_norm },{ key:"line", header:"Line", render:r=>(r.line ?? "—") as any },{ key:"class", header:"Class", render:r=>r.odds_type ?? "standard" },{ key:"status", header:"Join", render:r=>r.join_status }]} />}</div>;
}
const selectStyle: React.CSSProperties = { background:"#111827", color:"#e5e7eb", border:"1px solid #374151", borderRadius:8, padding:"10px 12px" };
const panelStyle: React.CSSProperties = { padding:16, border:"1px solid #1f2937", borderRadius:12, background:"#111827" };
