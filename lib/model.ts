// Snapshot-driven launch radar: benchmark tokenless protocol TVL against observed token-cap/TVL
// ratios in the same sealed universe, then adjust by recent traction and operating history.

export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

export interface ModelConstants {
  benchmark_multiple: number;
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  peer_count: number;
}

export const MODEL_VERSION = 'cohort-radar-2';
export const EARLY_ROWS = 180;
export const LIVE_ROWS = 36;
const DAY_MS = 86_400_000;
const VERSIONED = /\s(V\d+(?:\.\d+)?|v\d+(?:\.\d+)?|\d+\.\d+)$/;

export interface FarmStep { text: string; cost: string; time: string }

export interface BoardRow {
  rank: number;
  tier: 'WATCHLIST' | 'EARLY';
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'records no token' | 'token trades';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    benchmark_multiple: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    age_days: number | null;
    peer_count: number;
  };
  farm_steps: string[];
}

export interface RadarRow {
  rank: number;
  tier: 'WATCHLIST' | 'EARLY';
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'records no token';
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  farm_steps: string[];
}

export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
  symbol: string | null;
}

export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  peer_sample_size: number;
  watchlist_slugs: string[];
  rows: RadarRow[];
  live: LiveRow[];
}

export class SnapshotError extends Error {}

function median(numbers: number[]): number {
  if (!numbers.length) return 0.2;
  const sorted = numbers.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

export function benchmarkFor(snapshot: Snapshot): { multiple: number; peers: number } {
  const ratios = snapshot.protocols
    .filter((p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0)
    .map((p) => p.mcap_usd! / p.tvl_usd)
    .filter(Number.isFinite);
  // The median makes one extreme token's market cap unable to dominate the estimate.
  const sample = ratios.filter((r) => r >= 0.005 && r <= 8);
  return { multiple: Math.max(0.03, Math.min(1.5, median(sample))), peers: sample.length };
}

export function modelFor(snapshot: Snapshot): ModelConstants {
  const benchmark = benchmarkFor(snapshot);
  return {
    benchmark_multiple: Math.round(benchmark.multiple * 10000) / 10000,
    growth_weight: 0.35, growth_floor: -50, growth_cap: 80,
    maturity_floor: 0.62, maturity_range: 0.38, maturity_days: 1095,
    unknown_age_days: 365, peer_count: benchmark.peers,
  };
}

export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (!listedAt) return null;
  const a = Date.parse(asOf + 'T00:00:00Z');
  const b = Date.parse(listedAt + 'T00:00:00Z');
  return Number.isFinite(a) && Number.isFinite(b) ? Math.max(0, Math.floor((a - b) / DAY_MS)) : null;
}

function score(p: SnapshotProtocol, snapshot: Snapshot, model: ModelConstants) {
  const age = ageDays(snapshot.as_of, p.listed_at);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, p.change_7d ?? 0));
  const growthMult = 1 + growthPct / 100 * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult = model.maturity_floor +
    Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days * model.maturity_range;
  const implied = Math.max(1, Math.round(p.tvl_usd * model.benchmark_multiple * growthMult * maturityMult));
  return { age, growthPct, growthMult, maturityMult, implied };
}

function isTokenless(p: SnapshotProtocol): boolean {
  return p.gecko_id === null && p.symbol === null && p.mcap_usd === null;
}

function rankable(p: SnapshotProtocol): boolean {
  return isTokenless(p) && p.category !== 'CEX' && !VERSIONED.test(p.name);
}

function chainOf(p: SnapshotProtocol): string { return p.chains[0] ?? 'its primary chain'; }

function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 2_000_000_000) return 200;
  if (p.tvl_usd >= 500_000_000) return 120;
  if (p.tvl_usd >= 100_000_000) return 75;
  return 35;
}

function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 120) return 60;
  if (age < 365) return 45;
  return 30;
}

function actionFor(p: SnapshotProtocol, capital: number): string {
  const category = (p.category ?? '').toLowerCase();
  const name = p.name;
  const chain = chainOf(p);
  if (category.includes('lend') || category.includes('cdp') || category.includes('collateral')) {
    return 'Supply $' + capital + ' of stablecoin collateral to ' + name + ' on ' + chain + '; use the smallest supported market.';
  }
  if (category.includes('dex') || category.includes('yield') || category.includes('farm')) {
    return 'Add $' + capital + ' of liquidity to ' + name + "'s deepest supported pool on " + chain + ', then keep the LP position.';
  }
  if (category.includes('bridge') || category.includes('chain')) {
    return 'Bridge $' + capital + ' of a supported asset through ' + name + ' to ' + chain + ', then make one native app transaction.';
  }
  if (category.includes('staking') || category.includes('restak')) {
    return "Stake $" + capital + " worth of the chain's native asset with " + name + ' on ' + chain + ' and retain the receipt.';
  }
  if (category.includes('derivative') || category.includes('perpetual') || category.includes('basis')) {
    return 'Post $' + capital + ' of collateral at ' + name + ' on ' + chain + ' and make a small, hedged position.';
  }
  if (category.includes('curator') || category.includes('allocator') || category.includes('vault')) {
    return 'Deposit $' + capital + ' into a diversified ' + name + ' vault on ' + chain + '; check asset and exit terms first.';
  }
  if (category.includes('stable') || category.includes('rwa')) {
    return "Mint or acquire $" + capital + " of " + name + "'s supported asset on " + chain + ' and hold it in the protocol.';
  }
  if (category.includes('insurance')) {
    return 'Buy the smallest available cover position at ' + name + ' on ' + chain + ' after checking exclusions and expiry.';
  }
  return 'Deposit $' + capital + ' of the lowest-risk supported asset into ' + name + ' on ' + chain + ' and retain the position.';
}

function stepText(text: string, cost: string, time: string): string {
  const sentence = text + ' Cost: ' + cost + '. Time: ' + time + '.';
  return sentence.length <= 600 ? sentence : sentence.slice(0, 596) + '...';
}

export function farmSteps(p: SnapshotProtocol, age: number | null): string[] {
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  return [
    stepText('Start with a separate wallet; verify the official app URL from the project primary channels before connecting.', 'no capital; under $3 of network gas', '5 minutes'),
    stepText(actionFor(p, capital), '$' + capital + ' deployed; budget up to $5 for setup gas', '15–25 minutes'),
    stepText('Return weekly to make one genuine use of ' + p.name + ': repeat a deposit, swap, vote, claim, or other product-native action.', 'about $2–5 gas each week, chain dependent', '10 minutes weekly'),
    stepText('Keep the position active for ' + hold + ' days, checking that the app still shows the expected balance and withdrawal route.', '$' + capital + ' remains exposed to protocol and asset risk', hold + ' days'),
    stepText('Before adding funds, inspect the protocol documentation for points, eligibility and excluded activity; never assume an airdrop.', 'no fee to read; avoid speculative extra deposits', '10 minutes once'),
    stepText('Record dates, wallet, transaction links and fees; exit through the app after the hold only when liquidity and settlement terms are clear.', 'gas to exit, usually budget $3–8', '5 minutes to log; 10 minutes to exit'),
  ];
}

function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank, tier: row.tier, slug: row.slug, name: row.name, category: row.category, chains: row.chains,
    tvl_usd: row.tvl_usd, change_7d: row.change_7d, mcap_usd: row.mcap_usd,
    gecko_id: row.gecko_id, symbol: row.symbol, token_status: 'records no token',
    listed_at: row.listed_at, age_days: row.age_days, implied_value_usd: row.implied_value_usd,
    growth_multiplier: row.model.growth_multiplier, maturity_multiplier: row.model.maturity_multiplier,
    farm_steps: row.farm_steps,
  };
}

export function buildRadar(snapshot: Snapshot, model = modelFor(snapshot)): { board: BoardRow[]; radar: RadarData } {
  const bySlug = new Map(snapshot.protocols.map((p) => [p.slug, p]));
  const chosen = new Map<string, SnapshotProtocol>();
  for (const slug of snapshot.watchlist) {
    const p = bySlug.get(slug);
    if (p) chosen.set(slug, p);
  }
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && rankable(p) && p.tvl_usd < snapshot.floor_usd)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .slice(0, EARLY_ROWS);
  for (const p of early) chosen.set(p.slug, p);
  const scored = [...chosen.values()].map((p) => ({ p, ...score(p, snapshot, model) }));
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  const board = scored.map((s, i): BoardRow => ({
    rank: i + 1, tier: snapshot.watchlist.includes(s.p.slug) ? 'WATCHLIST' : 'EARLY',
    slug: s.p.slug, name: s.p.name, category: s.p.category, chains: s.p.chains,
    tvl_usd: s.p.tvl_usd, change_7d: s.p.change_7d, mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at, gecko_id: s.p.gecko_id, symbol: s.p.symbol,
    token_status: 'records no token', age_days: s.age, implied_value_usd: s.implied,
    model: {
      benchmark_multiple: model.benchmark_multiple, growth_pct: s.growthPct,
      growth_multiplier: Math.round(s.growthMult * 10000) / 10000,
      maturity_multiplier: Math.round(s.maturityMult * 10000) / 10000,
      age_days: s.age, peer_count: model.peer_count,
    },
    farm_steps: farmSteps(s.p, s.age),
  }));
  const live = snapshot.protocols.filter((p) => !isTokenless(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p): LiveRow => ({
      slug: p.slug, name: p.name, category: p.category, chains: p.chains,
      tvl_usd: p.tvl_usd, mcap_usd: p.mcap_usd, change_7d: p.change_7d, symbol: p.symbol,
    }));
  const radar: RadarData = {
    as_of: snapshot.as_of, source: snapshot.source, floor_usd: snapshot.floor_usd,
    model, model_version: MODEL_VERSION, watchlist_size: snapshot.watchlist.length,
    board_size: board.length, early_size: early.length, live_size: live.length,
    peer_sample_size: model.peer_count, rows: board.map(radarRow), live,
    watchlist_slugs: snapshot.watchlist,
  };
  return { board, radar };
}

export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new SnapshotError('snapshot.json is not JSON'); }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new SnapshotError('snapshot.json must be an object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || typeof o.source !== 'string' || typeof o.floor_usd !== 'number' ||
      !Array.isArray(o.protocols) || !Array.isArray(o.watchlist)) throw new SnapshotError('snapshot.json is missing required fields');
  const protocols = o.protocols.map((item, i) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new SnapshotError('protocol ' + i + ' is not an object');
    const p = item as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number') {
      throw new SnapshotError('protocol ' + i + ' lacks slug, name or TVL');
    }
    return {
      slug: p.slug, name: p.name, category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((x): x is string => typeof x === 'string') : [],
      tvl_usd: p.tvl_usd, change_7d: typeof p.change_7d === 'number' ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of, source: o.source, floor_usd: o.floor_usd, protocols,
    watchlist: o.watchlist.filter((x): x is string => typeof x === 'string'),
  };
}

export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((slug) => !slugs.has(slug));
  if (missing.length) return 'missing watchlist protocols: ' + missing.slice(0, 5).join(', ');
  if (board.length < 100 || board.length > 4000) return 'board has ' + board.length + ' rows';
  if (new Set(board.map((r) => r.slug)).size !== board.length) return 'board repeats a slug';
  for (let i = 0; i < board.length; i++) {
    const row = board[i]!;
    if (row.rank !== i + 1) return 'rank ' + (i + 1) + ' is ' + row.rank;
    if (i && row.implied_value_usd > board[i - 1]!.implied_value_usd) return 'implied value rises at ' + row.slug;
    if (row.farm_steps.length < 3 || row.farm_steps.length > 12) return row.slug + ' has an invalid farm-step count';
    if (row.farm_steps.some((step) => step.trim().length < 20 || step.trim().length > 600)) return row.slug + ' has an invalid farm step';
    if (!Number.isSafeInteger(row.implied_value_usd) || row.implied_value_usd < 1 || row.implied_value_usd > 100_000_000_000_000) return row.slug + ' has an invalid implied value';
  }
  if (board.length > 1 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) return 'all rows have the same implied value';
  return null;
}

export function dataScript(radar: RadarData): string {
  return 'window.RADAR=' + JSON.stringify(radar) + ';\n';
}
