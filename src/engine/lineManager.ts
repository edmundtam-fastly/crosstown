import { countRiverCrossings, dist } from './collision';
import {
  nextId,
  refreshInterchanges,
  stationById,
  type GameState,
  type Line,
  type Station,
  type Vec2,
} from '../state/gameState';
import { LINE_COLORS } from '../render/theme';

/**
 * Octilinear elbow between two stations: run diagonally at 45° from `a`, then
 * axis-aligned into `b` (classic transit-map styling). Returns [a, elbow, b]
 * or [a, b] when already aligned.
 */
export function segmentPoints(a: Vec2, b: Vec2): Vec2[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  if (adx < 1 || ady < 1 || Math.abs(adx - ady) < 1) return [a, b];
  const d = Math.min(adx, ady);
  const elbow = { x: a.x + Math.sign(dx) * d, y: a.y + Math.sign(dy) * d };
  // Elbow on the diagonal-first side; put the diagonal at the start.
  return [a, elbow, b];
}

export interface LinePath {
  points: Vec2[];
  /** Cumulative distance at each point. */
  cumDist: number[];
  /** Distance along the path of each station in line.stationIds order. */
  stationDist: number[];
  totalLength: number;
}

export function buildLinePath(line: Line, state: GameState): LinePath {
  const stations = line.stationIds
    .map((id) => stationById(state, id))
    .filter((s): s is Station => !!s);
  const points: Vec2[] = [];
  const stationDist: number[] = [];
  const cumDist: number[] = [0];
  let total = 0;

  const push = (p: Vec2) => {
    if (points.length > 0) {
      total += dist(points[points.length - 1], p);
      cumDist.push(total);
    }
    points.push(p);
  };

  for (let i = 0; i < stations.length; i++) {
    if (i === 0) {
      push(stations[i].position);
      stationDist.push(0);
      continue;
    }
    const seg = segmentPoints(stations[i - 1].position, stations[i].position);
    for (let j = 1; j < seg.length; j++) push(seg[j]);
    stationDist.push(total);
  }
  if (line.isLoop && stations.length > 1) {
    const seg = segmentPoints(stations[stations.length - 1].position, stations[0].position);
    for (let j = 1; j < seg.length; j++) push(seg[j]);
  }
  return { points, cumDist, stationDist, totalLength: total === 0 ? 1 : total };
}

/** Closest point on a line's rendered path to an arbitrary world point. */
export function closestPointOnPath(p: Vec2, path: LinePath): { dist: number; pathDistance: number } {
  let bestDist = Infinity;
  let bestPathDistance = 0;
  for (let i = 0; i < path.points.length - 1; i++) {
    const a = path.points[i];
    const b = path.points[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const d = dist(p, { x: a.x + t * dx, y: a.y + t * dy });
    if (d < bestDist) {
      bestDist = d;
      bestPathDistance = path.cumDist[i] + t * Math.sqrt(lenSq);
    }
  }
  return { dist: bestDist, pathDistance: bestPathDistance };
}

export function pointAtDistance(path: LinePath, d: number): { pos: Vec2; angle: number } {
  const pts = path.points;
  if (pts.length < 2) return { pos: pts[0] ?? { x: 0, y: 0 }, angle: 0 };
  const clamped = Math.max(0, Math.min(path.cumDist[path.cumDist.length - 1], d));
  let i = 0;
  while (i < path.cumDist.length - 2 && path.cumDist[i + 1] < clamped) i++;
  const a = pts[i];
  const b = pts[i + 1];
  const segLen = path.cumDist[i + 1] - path.cumDist[i] || 1;
  const t = (clamped - path.cumDist[i]) / segLen;
  return {
    pos: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
    angle: Math.atan2(b.y - a.y, b.x - a.x),
  };
}

function nextFreeColorIndex(state: GameState): number {
  const used = new Set(state.lines.map((l) => l.colorIndex));
  for (let i = 0; i < LINE_COLORS.length; i++) {
    if (!used.has(i)) return i;
  }
  return state.lines.length % LINE_COLORS.length;
}

/** Bridges needed to connect stations a→b (0 if no water crossed). Some
 *  cities charge more per crossing (e.g. Istanbul's strait). */
export function bridgesNeeded(state: GameState, a: Station, b: Station): number {
  const cost = state.city.tuning?.bridgeCost ?? 1;
  return countRiverCrossings(a.position, b.position, state.rivers) * cost;
}

export function canStartNewLine(state: GameState): boolean {
  return state.availableLines > 0 && state.lines.length < LINE_COLORS.length;
}

/** Commit a drawn line. Assumes bridge tokens were already reserved during the drag. */
export function commitLine(state: GameState, stationIds: string[], isLoop: boolean, bridgesUsed: number): Line | null {
  if (stationIds.length < 2) return null;
  const colorIndex = nextFreeColorIndex(state);
  const line: Line = {
    id: nextId('line'),
    colorIndex,
    color: LINE_COLORS[colorIndex],
    stationIds: [...stationIds],
    isLoop,
    trains: [],
    bridgesUsed,
  };
  state.lines.push(line);
  state.availableLines -= 1;
  state.stats.linesUsed = Math.max(state.stats.linesUsed, state.lines.length);
  state.stats.longestLineStations = Math.max(state.stats.longestLineStations, line.stationIds.length);
  refreshInterchanges(state);
  return line;
}

/** Delete a line, refunding its token, bridges, and returning its trains to the tray. */
export function deleteLine(state: GameState, lineId: string): void {
  const line = state.lines.find((l) => l.id === lineId);
  if (!line) return;
  // Passengers on its trains go back to waiting at the nearest station on the line.
  for (const train of line.trains) {
    const path = buildLinePath(line, state);
    let bestIdx = 0;
    for (let i = 1; i < path.stationDist.length; i++) {
      if (Math.abs(path.stationDist[i] - train.distance) < Math.abs(path.stationDist[bestIdx] - train.distance)) {
        bestIdx = i;
      }
    }
    const st = stationById(state, line.stationIds[bestIdx]);
    if (st) {
      for (const p of train.passengers) {
        p.boardedLineId = null;
        st.waitingPassengers.push(p);
      }
    }
    if (train.kind === 'express') state.availableExpress += 1;
    else if (train.kind === 'big') state.availableBig += 1;
    else state.availableTrains += 1;
    state.availableCarriages += train.carriages;
  }
  state.lines = state.lines.filter((l) => l.id !== lineId);
  state.availableLines += 1;
  state.availableBridges += line.bridgesUsed;
  refreshInterchanges(state);
}

/** Extend an existing line at one end. Returns false if invalid. */
export function extendLine(state: GameState, line: Line, stationId: string, atStart: boolean): boolean {
  if (line.isLoop) return false;
  if (line.stationIds.includes(stationId)) {
    // Closing the loop: connecting an end back to the other end.
    const other = atStart ? line.stationIds[line.stationIds.length - 1] : line.stationIds[0];
    if (stationId === other && line.stationIds.length >= 3) {
      const endId = atStart ? line.stationIds[0] : line.stationIds[line.stationIds.length - 1];
      const a = stationById(state, endId)!;
      const b = stationById(state, stationId)!;
      const need = bridgesNeeded(state, a, b);
      if (need > state.availableBridges) return false;
      state.availableBridges -= need;
      line.bridgesUsed += need;
      line.isLoop = true;
      return true;
    }
    return false;
  }
  const endId = atStart ? line.stationIds[0] : line.stationIds[line.stationIds.length - 1];
  const a = stationById(state, endId);
  const b = stationById(state, stationId);
  if (!a || !b) return false;
  const need = bridgesNeeded(state, a, b);
  if (need > state.availableBridges) return false;
  state.availableBridges -= need;
  line.bridgesUsed += need;
  if (atStart) {
    const before = buildLinePath(line, state).totalLength;
    line.stationIds.unshift(stationId);
    const delta = buildLinePath(line, state).totalLength - before;
    // Station indices and path distances shifted; keep trains where they were.
    for (const t of line.trains) {
      t.lastStopIndex += 1;
      t.distance += delta;
    }
  } else {
    line.stationIds.push(stationId);
  }
  state.stats.longestLineStations = Math.max(state.stats.longestLineStations, line.stationIds.length);
  refreshInterchanges(state);
  return true;
}

export const TAIL_LENGTH = 30;

/** Lateral spacing between parallel lines sharing a corridor (world units). */
export const PARALLEL_SPACING = 11;

function lineHasEdge(line: Line, aId: string, bId: string): boolean {
  const ids = line.stationIds;
  const last = line.isLoop ? ids.length : ids.length - 1;
  for (let i = 0; i < last; i++) {
    const j = (i + 1) % ids.length;
    if ((ids[i] === aId && ids[j] === bId) || (ids[i] === bId && ids[j] === aId)) return true;
  }
  return false;
}

/**
 * Render-only lateral offset for `line` on the station edge aId–bId, so lines
 * sharing a corridor sit side by side instead of overlapping. Slots are
 * ordered by colorIndex and centred; the normal is taken on a canonical
 * orientation of the edge so every line agrees which side is which.
 */
export function edgeOffset(state: GameState, line: Line, aId: string, bId: string): Vec2 {
  const sharing = state.lines.filter((l) => lineHasEdge(l, aId, bId));
  if (sharing.length < 2) return { x: 0, y: 0 };
  sharing.sort((x, y) => x.colorIndex - y.colorIndex);
  const idx = sharing.findIndex((l) => l.id === line.id);
  if (idx === -1) return { x: 0, y: 0 };
  const centered = idx - (sharing.length - 1) / 2;
  const [c1, c2] = aId < bId ? [aId, bId] : [bId, aId];
  const a = stationById(state, c1);
  const b = stationById(state, c2);
  if (!a || !b) return { x: 0, y: 0 };
  const dx = b.position.x - a.position.x;
  const dy = b.position.y - a.position.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    x: (-dy / len) * PARALLEL_SPACING * centered,
    y: (dx / len) * PARALLEL_SPACING * centered,
  };
}

export interface EndTail {
  line: Line;
  atStart: boolean;
  /** Id of the terminal station this tail belongs to. */
  stationId: string;
  /** Tip of the stub protruding past the terminal station. */
  tip: Vec2;
  /** Terminal station position. */
  base: Vec2;
}

/**
 * Short stubs protruding past each end of a non-loop line, in the direction of
 * its final segment. They make line ends visible and grabbable — the way to
 * pick a specific line when several terminate at the same station.
 */
export function lineEndTails(line: Line, state: GameState): EndTail[] {
  if (line.isLoop) return [];
  const path = buildLinePath(line, state);
  const pts = path.points;
  if (pts.length < 2) return [];
  const tails: EndTail[] = [];
  const mk = (base: Vec2, prev: Vec2, atStart: boolean, stationId: string) => {
    const len = dist(base, prev) || 1;
    const dir = { x: (base.x - prev.x) / len, y: (base.y - prev.y) / len };
    tails.push({
      line,
      atStart,
      stationId,
      base,
      tip: { x: base.x + dir.x * TAIL_LENGTH, y: base.y + dir.y * TAIL_LENGTH },
    });
  };
  mk(pts[0], pts[1], true, line.stationIds[0]);
  mk(pts[pts.length - 1], pts[pts.length - 2], false, line.stationIds[line.stationIds.length - 1]);
  return tails;
}

/**
 * All end tails on the map, fanned apart wherever several lines terminate at
 * the same station so each stub stays individually visible and grabbable.
 */
export function endTails(state: GameState): EndTail[] {
  const all = state.lines.flatMap((l) => lineEndTails(l, state));
  const groups = new Map<string, EndTail[]>();
  for (const t of all) {
    const g = groups.get(t.stationId);
    if (g) g.push(t);
    else groups.set(t.stationId, [t]);
  }
  const MIN_SEP = 0.55; // ~32° between neighbouring tails
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const entries = group
      .map((t) => ({ t, a: Math.atan2(t.tip.y - t.base.y, t.tip.x - t.base.x) }))
      .sort((x, y) => x.a - y.a);
    const meanBefore = entries.reduce((s, e) => s + e.a, 0) / entries.length;
    for (let i = 1; i < entries.length; i++) {
      if (entries[i].a - entries[i - 1].a < MIN_SEP) entries[i].a = entries[i - 1].a + MIN_SEP;
    }
    const meanAfter = entries.reduce((s, e) => s + e.a, 0) / entries.length;
    const shift = meanBefore - meanAfter;
    const len = TAIL_LENGTH + 8; // a touch longer when sharing a station
    for (const e of entries) {
      const a = e.a + shift;
      e.t.tip = { x: e.t.base.x + Math.cos(a) * len, y: e.t.base.y + Math.sin(a) * len };
    }
  }
  return all;
}

/**
 * Insert a station into the middle of a line, replacing segment
 * segIndex -> segIndex+1 (or the loop's wrap segment when segIndex is the last
 * index). Returns false if invalid (already on line, or not enough bridges).
 */
export function insertStationIntoLine(
  state: GameState,
  line: Line,
  segIndex: number,
  stationId: string,
): boolean {
  const ids = line.stationIds;
  if (ids.includes(stationId)) return false;
  const isWrap = segIndex >= ids.length - 1;
  if (isWrap && !line.isLoop) return false;
  const aId = ids[Math.min(segIndex, ids.length - 1)];
  const bId = isWrap ? ids[0] : ids[segIndex + 1];
  const a = stationById(state, aId);
  const b = stationById(state, bId);
  const c = stationById(state, stationId);
  if (!a || !b || !c) return false;

  const delta = bridgesNeeded(state, a, c) + bridgesNeeded(state, c, b) - bridgesNeeded(state, a, b);
  if (delta > state.availableBridges) return false;
  state.availableBridges -= delta;
  line.bridgesUsed += delta;

  const pathBefore = buildLinePath(line, state);
  const segEnd = isWrap ? pathBefore.totalLength : pathBefore.stationDist[segIndex + 1];
  if (isWrap) ids.push(stationId);
  else ids.splice(segIndex + 1, 0, stationId);
  const lenDelta = buildLinePath(line, state).totalLength - pathBefore.totalLength;

  // Keep trains beyond the modified segment where they were.
  for (const t of line.trains) {
    if (t.distance >= segEnd) t.distance += lenDelta;
    if (!isWrap && t.lastStopIndex > segIndex) t.lastStopIndex += 1;
  }

  state.stats.longestLineStations = Math.max(state.stats.longestLineStations, ids.length);
  refreshInterchanges(state);
  return true;
}

/** Whether a line serves any station of the given shape. */
export function lineServesShape(state: GameState, line: Line, shape: string): boolean {
  return line.stationIds.some((id) => stationById(state, id)?.shape === shape);
}

