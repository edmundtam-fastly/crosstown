import { isValidStationPosition } from './collision';
import { shapeWeight, stationInterval, unlockedShapes } from './difficultyCurve';
import type { Rng } from './rng';
import { nextId, STATION_CAPACITY, type GameState, type Vec2 } from '../state/gameState';

/** Sample a position for the next station given the city's growth model. */
function sampleSpawnPos(state: GameState, rng: Rng): Vec2 {
  const disc = (cx: number, cy: number, radius: number): Vec2 => {
    const t = rng.next() * Math.PI * 2;
    const r = Math.sqrt(rng.next()) * radius;
    return { x: cx + Math.cos(t) * r, y: cy + Math.sin(t) * r };
  };

  // Polycentric / core-periphery: pick a currently-open hub, weighted.
  const growth = state.city.growth;
  if (growth) {
    const open = growth.hubs.filter((h) => state.week >= (h.opensWeek ?? 1));
    const pool = open.length > 0 ? open : [growth.hubs[0]];
    const hub = pool[rng.weighted(pool.map((h) => h.weight))];
    return disc(hub.x, hub.y, hub.r);
  }

  const area = state.city.spawnArea;
  if (area) return disc(area.x, area.y, area.r); // compact/island cities
  return { x: rng.range(0, state.city.size.x), y: rng.range(0, state.city.size.y) };
}

export function updateStationSpawner(state: GameState, rng: Rng): void {
  if (state.gameTime < state.nextStationAt) return;
  state.nextStationAt =
    state.gameTime + stationInterval(state.gameTime, state.mode) * (state.city.tuning?.station ?? 1);

  // Find a valid spot; give up quietly this tick if the map is too crowded.
  for (let attempt = 0; attempt < 40; attempt++) {
    const pos = sampleSpawnPos(state, rng);
    if (!isValidStationPosition(pos, state.stations, state.rivers, state.city.size)) continue;

    const shapes = unlockedShapes(state.gameTime, state.mode);
    const shape = shapes[rng.weighted(shapes.map(shapeWeight))];
    state.stations.push({
      id: nextId('st'),
      position: pos,
      shape,
      isInterchange: false,
      isMajor: false,
      waitingPassengers: [],
      overcrowdedSince: null,
      capacity: STATION_CAPACITY,
      nextPassengerAt: state.gameTime + rng.range(3, 8),
    });
    if (!state.usedShapes.includes(shape)) state.usedShapes.push(shape);
    return;
  }
}
