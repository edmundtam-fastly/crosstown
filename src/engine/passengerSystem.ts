import { passengerInterval, shapeWeight } from './difficultyCurve';
import type { Rng } from './rng';
import { nextId, OVERCROWD_GRACE, type GameState, type ShapeType } from '../state/gameState';

export function updatePassengers(state: GameState, rng: Rng): void {
  const shapesOnMap = [...new Set(state.stations.map((s) => s.shape))];

  for (const station of state.stations) {
    // Spawn
    if (state.gameTime >= station.nextPassengerAt) {
      station.nextPassengerAt =
        state.gameTime +
        passengerInterval(state.gameTime, state.mode) *
          (state.city.tuning?.passenger ?? 1) *
          rng.range(0.7, 1.3);
      const candidates = shapesOnMap.filter((s) => s !== station.shape);
      if (candidates.length > 0) {
        const dest: ShapeType = candidates[rng.weighted(candidates.map(shapeWeight))];
        station.waitingPassengers.push({
          id: nextId('p'),
          destinationShape: dest,
          spawnedAt: state.gameTime,
          boardedLineId: null,
        });
        state.stats.passengersSpawned += 1;
      }
    }

    // Overcrowding bookkeeping
    if (station.waitingPassengers.length > station.capacity) {
      if (station.overcrowdedSince === null) station.overcrowdedSince = state.gameTime;
    } else {
      station.overcrowdedSince = null;
    }
  }

  // Game over check
  if (state.mode !== 'creative' && !state.isGameOver) {
    const grace = OVERCROWD_GRACE[state.mode];
    for (const station of state.stations) {
      if (station.overcrowdedSince !== null && state.gameTime - station.overcrowdedSince >= grace) {
        state.isGameOver = true;
        break;
      }
    }
  }
}
