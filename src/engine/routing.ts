// Hop-distance routing over the line graph.
//
// Lines are nodes; two lines are adjacent when they share a station.
// hopDistance(line, shape) = 0 if the line serves a station of that shape,
// else 1 + min over adjacent lines (multi-source BFS per shape).
//
// Passengers stay "dumb" (no per-passenger pathfinding): boarding and
// transfer decisions read this tiny per-(line, shape) table, which is cached
// and rebuilt only when the network topology changes.

import { lineServesShape } from './lineManager';
import type { GameState, Line, ShapeType } from '../state/gameState';

interface Table {
  version: number;
  dist: Map<string, Map<ShapeType, number>>;
}

const cache = new WeakMap<GameState, Table>();

function build(state: GameState): Table {
  const dist = new Map<string, Map<ShapeType, number>>(
    state.lines.map((l) => [l.id, new Map<ShapeType, number>()]),
  );

  // Adjacency: lines sharing at least one station.
  const neighbors = new Map<string, string[]>();
  for (const a of state.lines) {
    const ids = new Set(a.stationIds);
    neighbors.set(
      a.id,
      state.lines
        .filter((b) => b.id !== a.id && b.stationIds.some((sid) => ids.has(sid)))
        .map((b) => b.id),
    );
  }

  const shapes = [...new Set(state.stations.map((s) => s.shape))];
  for (const shape of shapes) {
    let frontier: Line[] = state.lines.filter((l) => lineServesShape(state, l, shape));
    for (const l of frontier) dist.get(l.id)!.set(shape, 0);
    let d = 0;
    while (frontier.length > 0) {
      d += 1;
      const next: Line[] = [];
      for (const l of frontier) {
        for (const nId of neighbors.get(l.id) ?? []) {
          const m = dist.get(nId)!;
          if (!m.has(shape)) {
            m.set(shape, d);
            next.push(state.lines.find((x) => x.id === nId)!);
          }
        }
      }
      frontier = next;
    }
  }
  return { version: state.topologyVersion, dist };
}

function table(state: GameState): Table {
  let t = cache.get(state);
  if (!t || t.version !== state.topologyVersion) {
    t = build(state);
    cache.set(state, t);
  }
  return t;
}

/** Line-graph hops from `line` to any station of `shape`; Infinity if unreachable. */
export function hopDistance(state: GameState, line: Line, shape: ShapeType): number {
  return table(state).dist.get(line.id)?.get(shape) ?? Infinity;
}

/** Minimal hop distance to `shape` among all lines stopping at the station. */
export function bestDistAtStation(state: GameState, stationId: string, shape: ShapeType): number {
  let best = Infinity;
  for (const line of state.lines) {
    if (!line.stationIds.includes(stationId)) continue;
    best = Math.min(best, hopDistance(state, line, shape));
  }
  return best;
}
