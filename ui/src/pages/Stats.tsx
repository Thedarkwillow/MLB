import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
type StatRow = { stat_type_norm: string; result: string; };
export default function StatsPage() {
  const [rows, setRows] = useState<StatRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { async function load() { setLoading(true); const res = await supabase.from("settlements").select("stat_type_norm,result").neq("result", "PENDING"); setRows((res.data as StatRow[]) ?? []); setLoading(false); } load(); }, []);
  const grouped = rows.reduce<Record<string, { total:number; hit:number; miss:number; push:number }>>((acc,row)=>{ if(!acc[row.stat_type_norm]) acc[row.stat_type_norm]={total:0,hit:0,miss:0,push:0}; acc[row.stat_type_norm].total += 1; if(row.result==="HIT") acc[row.stat_type_norm].hit += 1; if(row.result==="MISS") acc[row.stat_type_norm].miss += 1; if(row.result==="PUSH") acc[row.stat_type_norm].push += 1; return acc; }, {});
  const entries = Object.entries(grouped).sort((a,b)=>b[1].total-a[1].total);
  return <div style={{ display:"grid", gap:16 }}><h1 style={{ margin:0, fontSize:28 }}>Stats</h1>{loading ? <div style={panelStyle}>Loading…</div> : !entries.length ? <div style={panelStyle}>No settled props yet.</div> : <div style={{ display:"grid", gap:12 }}>{entries.map(([stat, vals])=>{ const winRate = vals.total ? Math.round((vals.hit / vals.total) * 100) : 0; return <div key={stat} style={panelStyle}><div style={{ fontWeight:700, marginBottom:8 }}>{stat}</div><div style={{ color:"#9ca3af", fontSize:14 }}>Total: {vals.total} · Hit: {vals.hit} · Miss: {vals.miss} · Push: {vals.push} · Win rate: {winRate}%</div></div>; })}</div>}</div>;
}
const panelStyle: React.CSSProperties = { padding:16, border:"1px solid #1f2937", borderRadius:12, background:"#111827" };
