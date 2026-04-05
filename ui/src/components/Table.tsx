import type { ReactNode } from "react";
type Column<T> = { key: string; header: string; render: (row: T) => ReactNode; };
export default function Table<T>({ rows, columns, emptyText = "No rows found." }: { rows: T[]; columns: Column<T>[]; emptyText?: string; }) {
  if (!rows.length) return <div style={{ padding:16, border:"1px solid #1f2937", borderRadius:12, background:"#111827", color:"#9ca3af" }}>{emptyText}</div>;
  return <div style={{ overflowX:"auto", border:"1px solid #1f2937", borderRadius:12, background:"#111827" }}><table style={{ width:"100%", borderCollapse:"collapse", minWidth:800 }}><thead><tr style={{ background:"#0f172a" }}>{columns.map(col => <th key={col.key} style={{ textAlign:"left", fontSize:12, letterSpacing:0.4, color:"#93c5fd", padding:"12px 14px", borderBottom:"1px solid #1f2937", whiteSpace:"nowrap" }}>{col.header}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{columns.map(col=><td key={col.key} style={{ padding:"12px 14px", borderBottom:"1px solid #1f2937", verticalAlign:"top", fontSize:14, color:"#e5e7eb" }}>{col.render(row)}</td>)}</tr>)}</tbody></table></div>;
}
