import { NavLink, Route, Routes } from "react-router-dom";
import BoardPage from "./pages/Board";
import StatsPage from "./pages/Stats";
import ReviewPage from "./pages/Review";
import RecommendationsPage from "./pages/Recommendations";
function Shell({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight:"100vh", background:"#0b1020", color:"#e5e7eb" }}><header style={{ borderBottom:"1px solid #1f2937", padding:"16px 20px", position:"sticky", top:0, background:"#0b1020", zIndex:10 }}><div style={{ maxWidth:1200, margin:"0 auto", display:"flex", gap:20, alignItems:"center", justifyContent:"space-between" }}><div style={{ fontWeight:700 }}>MLB Props Tracker</div><nav style={{ display:"flex", gap:14, fontSize:14 }}><NavItem to="/">Board</NavItem><NavItem to="/recommendations">Recommendations</NavItem><NavItem to="/review">Review</NavItem><NavItem to="/stats">Stats</NavItem></nav></div></header><main style={{ maxWidth:1200, margin:"0 auto", padding:20 }}>{children}</main></div>;
}
function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return <NavLink to={to} style={({isActive})=>({ padding:"8px 10px", borderRadius:8, background:isActive?"#1f2937":"transparent", color:isActive?"#fff":"#9ca3af" })}>{children}</NavLink>;
}
export default function App() {
  return <Shell><Routes><Route path="/" element={<BoardPage />} /><Route path="/recommendations" element={<RecommendationsPage />} /><Route path="/review" element={<ReviewPage />} /><Route path="/stats" element={<StatsPage />} /></Routes></Shell>;
}
