import type { ApifyPrizePicksRow } from "./types";

const TEAM_ALIAS_MAP: Record<string, string> = {
  ari: "arizona diamondbacks", arizona: "arizona diamondbacks", "arizona diamondbacks": "arizona diamondbacks",
  atl: "atlanta braves", atlanta: "atlanta braves", "atlanta braves": "atlanta braves",
  bal: "baltimore orioles", baltimore: "baltimore orioles", "baltimore orioles": "baltimore orioles",
  bos: "boston red sox", boston: "boston red sox", "boston red sox": "boston red sox",
  chc: "chicago cubs", "chicago cubs": "chicago cubs",
  cws: "chicago white sox", chw: "chicago white sox", "chicago white sox": "chicago white sox",
  cin: "cincinnati reds", cincinnati: "cincinnati reds", "cincinnati reds": "cincinnati reds",
  cle: "cleveland guardians", cleveland: "cleveland guardians", "cleveland guardians": "cleveland guardians",
  col: "colorado rockies", colorado: "colorado rockies", "colorado rockies": "colorado rockies",
  det: "detroit tigers", detroit: "detroit tigers", "detroit tigers": "detroit tigers",
  hou: "houston astros", houston: "houston astros", "houston astros": "houston astros",
  kc: "kansas city royals", kcr: "kansas city royals", "kansas city": "kansas city royals", "kansas city royals": "kansas city royals",
  laa: "los angeles angels", angels: "los angeles angels", "los angeles angels": "los angeles angels",
  lad: "los angeles dodgers", dodgers: "los angeles dodgers", "los angeles dodgers": "los angeles dodgers",
  mia: "miami marlins", miami: "miami marlins", "miami marlins": "miami marlins",
  mil: "milwaukee brewers", milwaukee: "milwaukee brewers", "milwaukee brewers": "milwaukee brewers",
  min: "minnesota twins", minnesota: "minnesota twins", "minnesota twins": "minnesota twins",
  nym: "new york mets", mets: "new york mets", "new york mets": "new york mets",
  nyy: "new york yankees", yankees: "new york yankees", "new york yankees": "new york yankees",
  oak: "oakland athletics", ath: "oakland athletics", athletics: "oakland athletics", "oakland athletics": "oakland athletics",
  phi: "philadelphia phillies", philadelphia: "philadelphia phillies", "philadelphia phillies": "philadelphia phillies",
  pit: "pittsburgh pirates", pittsburgh: "pittsburgh pirates", "pittsburgh pirates": "pittsburgh pirates",
  sd: "san diego padres", sdp: "san diego padres", "san diego padres": "san diego padres",
  sf: "san francisco giants", sfg: "san francisco giants", "san francisco giants": "san francisco giants",
  sea: "seattle mariners", seattle: "seattle mariners", "seattle mariners": "seattle mariners",
  stl: "st. louis cardinals", cardinals: "st. louis cardinals", "st louis cardinals": "st. louis cardinals", "st. louis cardinals": "st. louis cardinals",
  tb: "tampa bay rays", tbr: "tampa bay rays", "tampa bay rays": "tampa bay rays",
  tex: "texas rangers", texas: "texas rangers", "texas rangers": "texas rangers",
  tor: "toronto blue jays", toronto: "toronto blue jays", "toronto blue jays": "toronto blue jays",
  wsh: "washington nationals", was: "washington nationals", washington: "washington nationals", "washington nationals": "washington nationals"
};

const STAT_ALIAS_MAP: Record<string, string> = {
  "pitcher strikeouts": "pitcher_strikeouts", strikeouts: "pitcher_strikeouts", ks: "pitcher_strikeouts",
  "pitching outs": "pitching_outs", outs: "pitching_outs", hits: "hits", runs: "runs",
  rbis: "rbis", rbi: "rbis", "home runs": "home_runs", homers: "home_runs", hr: "home_runs",
  "stolen bases": "stolen_bases", sb: "stolen_bases", singles: "singles", doubles: "doubles",
  triples: "triples", walks: "walks", "total bases": "total_bases", tb: "total_bases",
  "hits+runs+rbis": "hrr", "hits + runs + rbis": "hrr", "hits+runs+rbi": "hrr", "hits + runs + rbi": "hrr", hrr: "hrr",
  "hitter strikeouts": "hitter_strikeouts", "hitter fantasy score": "hitter_fantasy_score",
  "pitcher fantasy score": "pitcher_fantasy_score", "hits allowed": "hits_allowed",
  "earned runs allowed": "earned_runs_allowed", "walks allowed": "walks_allowed",
  "1st inning runs allowed": "first_inning_runs_allowed", "pitcher strikeouts (combo)": "pitcher_strikeouts_combo"
};

export function normalizeText(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().trim().replace(/[’']/g, "").replace(/\./g, "").replace(/[^a-z0-9+ ]+/g, " ").replace(/\s+/g, " ");
}
export function normalizePlayerName(value: string | null | undefined): string {
  return normalizeText(value).replace(/\b(jr|sr|ii|iii|iv)\b/g, "").replace(/\s+/g, " ").trim();
}
export function normalizeTeam(value: string | null | undefined): string | null {
  const norm = normalizeText(value); if (!norm) return null; return TEAM_ALIAS_MAP[norm] ?? norm;
}
export function normalizeStatType(value: string | null | undefined): string {
  const norm = normalizeText(value); return STAT_ALIAS_MAP[norm] ?? norm.replace(/\s+/g, "_");
}
export function normalizeOddsType(value: string | null | undefined): string | null {
  const norm = normalizeText(value); if (!norm) return null; if (norm.includes("goblin")) return "goblin"; if (norm.includes("demon")) return "demon"; if (norm.includes("standard")) return "standard"; return norm;
}
export function coerceNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null; const n = Number(value); return Number.isFinite(n) ? n : null;
}
export function toIsoStringOrNull(value: unknown): string | null {
  if (!value || typeof value !== "string") return null; const d = new Date(value); return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
export function pickFirstString(...values: unknown[]): string | null {
  for (const value of values) { if (typeof value === "string" && value.trim()) return value.trim(); } return null;
}
export function normalizeApifyRow(row: ApifyPrizePicksRow) {
  const playerName = pickFirstString(row.player_name, row.name, row.player) ?? "unknown player";
  const playerTeam = pickFirstString(row.player_team, row.team) ?? null;
  const opponentTeam = pickFirstString(row.opponent_team, row.opponent) ?? null;
  const statTypeRaw = pickFirstString(row.stat_type, row.stat) ?? "unknown_stat";
  const oddsType = normalizeOddsType(pickFirstString(row.odds_type, row.goblin_demon));
  return {
    projection_id: String(row.projection_id ?? ""),
    market_id: row.market_id != null ? String(row.market_id) : null,
    event_id: row.event_id != null ? String(row.event_id) : null,
    player_name: playerName,
    player_team: playerTeam,
    opponent_team: opponentTeam,
    stat_type_raw: statTypeRaw,
    line: coerceNumber(row.line),
    direction: typeof row.direction === "string" ? row.direction : null,
    odds_type: oddsType,
    start_time: toIsoStringOrNull(pickFirstString(row.start_time, row.game_start)),
    board_time: toIsoStringOrNull(row.board_time),
    updated_at: toIsoStringOrNull(row.updated_at),
    player_name_norm: normalizePlayerName(playerName),
    player_team_norm: normalizeTeam(playerTeam),
    opponent_team_norm: normalizeTeam(opponentTeam),
    stat_type_norm: normalizeStatType(statTypeRaw),
    raw: row,
  };
}
