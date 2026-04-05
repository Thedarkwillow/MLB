import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type BoardPropRow = {
  id: string;
  projection_id: string;
  player_name: string;
  player_team: string | null;
  stat_type_norm: string;
  line: number | null;
  direction: string | null;
  start_time: string | null;
};

type MlbScheduleGame = {
  gamePk: number;
  gameDate: string;
  teams: {
    away: { team: { name: string } };
    home: { team: { name: string } };
  };
  status: { detailedState: string };
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  Deno.env.get("SUPABASE_SERVICE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[’']/g, "")
    .replace(/\./g, "")
    .replace(/[^a-z0-9+ ]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizePlayerName(value: string | null | undefined): string {
  return normalizeText(value)
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTeam(value: string | null | undefined): string {
  const v = normalizeText(value);
  if (!v) return "";

  const aliases: Record<string, string> = {
    ari: "arizona diamondbacks",
    atl: "atlanta braves",
    bal: "baltimore orioles",
    bos: "boston red sox",
    chc: "chicago cubs",
    cws: "chicago white sox",
    chw: "chicago white sox",
    cin: "cincinnati reds",
    cle: "cleveland guardians",
    col: "colorado rockies",
    det: "detroit tigers",
    hou: "houston astros",
    kc: "kansas city royals",
    kcr: "kansas city royals",
    laa: "los angeles angels",
    lad: "los angeles dodgers",
    mia: "miami marlins",
    mil: "milwaukee brewers",
    min: "minnesota twins",
    nym: "new york mets",
    nyy: "new york yankees",
    oak: "oakland athletics",
    ath: "oakland athletics",
    phi: "philadelphia phillies",
    pit: "pittsburgh pirates",
    sd: "san diego padres",
    sdp: "san diego padres",
    sf: "san francisco giants",
    sfg: "san francisco giants",
    sea: "seattle mariners",
    stl: "st louis cardinals",
    tb: "tampa bay rays",
    tbr: "tampa bay rays",
    tex: "texas rangers",
    tor: "toronto blue jays",
    wsh: "washington nationals",
    was: "washington nationals",
  };

  return aliases[v] ?? v;
}

function teamMatches(a: string | null | undefined, b: string | null | undefined): boolean {
  return normalizeTeam(a) === normalizeTeam(b);
}

function toGameDateFromStart(startTime: string | null | undefined): string {
  if (!startTime) {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  }
  return new Date(startTime).toISOString().slice(0, 10);
}

async function fetchSchedule(date: string): Promise<MlbScheduleGame[]> {
  const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`schedule fetch failed: ${res.status}`);
  const json = await res.json();
  const games: MlbScheduleGame[] = [];
  for (const d of json.dates ?? []) {
    for (const g of d.games ?? []) {
      games.push(g);
    }
  }
  return games;
}

async function fetchBoxscore(gamePk: number): Promise<any> {
  const url = `https://statsapi.mlb.com/api/v1/game/${gamePk}/boxscore`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`boxscore fetch failed: ${res.status}`);
  return await res.json();
}

function findPlayerInBoxscore(box: any, playerName: string, playerTeam: string | null) {
  const targetName = normalizePlayerName(playerName);

  const homePlayers = Object.values(box?.teams?.home?.players ?? {}) as any[];
  const awayPlayers = Object.values(box?.teams?.away?.players ?? {}) as any[];

  const all = [...homePlayers, ...awayPlayers];

  let candidates = all.filter((p) => normalizePlayerName(p?.person?.fullName) === targetName);

  if (playerTeam) {
    const homeTeam = box?.teams?.home?.team?.name ?? "";
    const awayTeam = box?.teams?.away?.team?.name ?? "";
    if (teamMatches(playerTeam, homeTeam)) {
      candidates = homePlayers.filter((p) => normalizePlayerName(p?.person?.fullName) === targetName);
    } else if (teamMatches(playerTeam, awayTeam)) {
      candidates = awayPlayers.filter((p) => normalizePlayerName(p?.person?.fullName) === targetName);
    }
  }

  return candidates[0] ?? null;
}

function extractActual(statType: string, player: any): number | null {
  const b = player?.stats?.batting ?? {};
  const p = player?.stats?.pitching ?? {};

  switch (statType) {
    case "hits":
      return typeof b.hits === "number" ? b.hits : null;
    case "runs":
      return typeof b.runs === "number" ? b.runs : null;
    case "rbis":
      return typeof b.rbi === "number" ? b.rbi : null;
    case "home_runs":
      return typeof b.homeRuns === "number" ? b.homeRuns : null;
    case "stolen_bases":
      return typeof b.stolenBases === "number" ? b.stolenBases : null;
    case "total_bases": {
      const singles =
        typeof b.hits === "number" &&
        typeof b.doubles === "number" &&
        typeof b.triples === "number" &&
        typeof b.homeRuns === "number"
          ? b.hits - b.doubles - b.triples - b.homeRuns
          : null;
      if (singles === null) return null;
      return singles + (b.doubles ?? 0) * 2 + (b.triples ?? 0) * 3 + (b.homeRuns ?? 0) * 4;
    }
    case "pitcher_strikeouts":
      return typeof p.strikeOuts === "number" ? p.strikeOuts : null;
    default:
      return null;
  }
}

function mapDirectionToSide(direction: string | null | undefined): "MORE" | "LESS" {
  const d = normalizeText(direction);
  if (d === "under" || d === "less") return "LESS";
  return "MORE";
}

function grade(side: "MORE" | "LESS", line: number, actual: number): "HIT" | "MISS" | "PUSH" {
  if (side === "MORE") {
    if (actual > line) return "HIT";
    if (actual < line) return "MISS";
    return "PUSH";
  }
  if (actual < line) return "HIT";
  if (actual > line) return "MISS";
  return "PUSH";
}

async function settleOneProp(prop: BoardPropRow) {
  const gameDate = toGameDateFromStart(prop.start_time);

  const supported = new Set([
    "hits",
    "runs",
    "rbis",
    "home_runs",
    "stolen_bases",
    "total_bases",
    "pitcher_strikeouts",
  ]);

  if (!supported.has(prop.stat_type_norm) || prop.line === null) {
    await supabase.from("review_queue").insert({
      board_prop_id: prop.id,
      queue_type: "settlement",
      reason: `Unsupported settlement stat type: ${prop.stat_type_norm}`,
      status: "open",
    });

    await supabase.from("settlements").upsert(
      {
        board_prop_id: prop.id,
        projection_id: prop.projection_id,
        game_date: gameDate,
        player_name: prop.player_name,
        player_team: prop.player_team,
        stat_type_norm: prop.stat_type_norm,
        line: prop.line ?? 0,
        side: mapDirectionToSide(prop.direction),
        result: "REVIEW",
        notes: "Unsupported stat type for automatic settlement",
      },
      { onConflict: "board_prop_id" }
    );
    return;
  }

  const schedule = await fetchSchedule(gameDate);
  const matchingGames = schedule.filter((g) => {
    return (
      teamMatches(prop.player_team, g.teams.home.team.name) ||
      teamMatches(prop.player_team, g.teams.away.team.name)
    );
  });

  for (const game of matchingGames) {
    const state = normalizeText(game.status?.detailedState);
    const finished =
      state.includes("final") ||
      state.includes("completed") ||
      state.includes("game over");

    if (!finished) continue;

    const box = await fetchBoxscore(game.gamePk);
    const player = findPlayerInBoxscore(box, prop.player_name, prop.player_team);
    if (!player) continue;

    const actual = extractActual(prop.stat_type_norm, player);
    if (actual === null) continue;

    const side = mapDirectionToSide(prop.direction);
    const result = grade(side, prop.line!, actual);

    await supabase.from("settlements").upsert(
      {
        board_prop_id: prop.id,
        projection_id: prop.projection_id,
        game_date: gameDate,
        player_name: prop.player_name,
        player_team: prop.player_team,
        stat_type_norm: prop.stat_type_norm,
        line: prop.line,
        side,
        actual_value: actual,
        result,
        settled_at: new Date().toISOString(),
      },
      { onConflict: "board_prop_id" }
    );

    return;
  }

  await supabase.from("review_queue").insert({
    board_prop_id: prop.id,
    queue_type: "settlement",
    reason: "Could not match completed MLB game/player/stat for settlement",
    status: "open",
  });

  await supabase.from("settlements").upsert(
    {
      board_prop_id: prop.id,
      projection_id: prop.projection_id,
      game_date: gameDate,
      player_name: prop.player_name,
      player_team: prop.player_team,
      stat_type_norm: prop.stat_type_norm,
      line: prop.line ?? 0,
      side: mapDirectionToSide(prop.direction),
      result: "REVIEW",
      notes: "Could not match completed game/player/stat",
    },
    { onConflict: "board_prop_id" }
  );
}

serve(async () => {
  try {
    const { data: unsettled, error } = await supabase
      .from("board_props")
      .select("id,projection_id,player_name,player_team,stat_type_norm,line,direction,start_time")
      .not("line", "is", null)
      .order("start_time", { ascending: true })
      .limit(200);

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    let processed = 0;

    for (const prop of (unsettled ?? []) as BoardPropRow[]) {
      const { data: existing } = await supabase
        .from("settlements")
        .select("id,result")
        .eq("board_prop_id", prop.id)
        .maybeSingle();

      if (existing && existing.result !== "PENDING") continue;

      await settleOneProp(prop);
      processed += 1;
    }

    return new Response(JSON.stringify({ ok: true, processed }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});
