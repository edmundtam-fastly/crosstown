import type { RiverSegment, Station, Vec2 } from '../state/gameState';

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function orient(a: Vec2, b: Vec2, c: Vec2): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

export function segmentsIntersect(p1: Vec2, p2: Vec2, q1: Vec2, q2: Vec2): boolean {
  const d1 = orient(q1, q2, p1);
  const d2 = orient(q1, q2, p2);
  const d3 = orient(p1, p2, q1);
  const d4 = orient(p1, p2, q2);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Number of distinct rivers the segment a→b crosses (1 bridge per river crossed). */
export function countRiverCrossings(a: Vec2, b: Vec2, rivers: RiverSegment[]): number {
  let crossings = 0;
  for (const river of rivers) {
    for (let i = 0; i < river.path.length - 1; i++) {
      if (segmentsIntersect(a, b, river.path[i], river.path[i + 1])) {
        crossings += 1;
        break; // one bridge covers this river for this segment
      }
    }
  }
  return crossings;
}

export function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return dist(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function distToPolyline(p: Vec2, path: Vec2[]): number {
  let best = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    best = Math.min(best, distToSegment(p, path[i], path[i + 1]));
  }
  return best;
}

/** Valid placement: inside margins, clear of other stations and river water. */
export function isValidStationPosition(
  pos: Vec2,
  stations: Station[],
  rivers: RiverSegment[],
  mapSize: Vec2,
  margin = 60,
  minStationDist = 85,
): boolean {
  if (pos.x < margin || pos.y < margin || pos.x > mapSize.x - margin || pos.y > mapSize.y - margin) {
    return false;
  }
  for (const st of stations) {
    if (dist(pos, st.position) < minStationDist) return false;
  }
  for (const river of rivers) {
    if (distToPolyline(pos, river.path) < river.width / 2 + 30) return false;
  }
  return true;
}
