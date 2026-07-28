import { buildLinePath, type LinePath } from './lineManager';
import { bestDistAtStation, hopDistance } from './routing';
import {
  nextId,
  stationById,
  trainCapacity,
  TRAIN_DWELL,
  TRAIN_SPECS,
  type GameState,
  type Line,
  type Station,
  type Train,
  type TrainKind,
} from '../state/gameState';

function trainPool(state: GameState, kind: TrainKind): number {
  return kind === 'normal'
    ? state.availableTrains
    : kind === 'express'
      ? state.availableExpress
      : state.availableBig;
}

function consumeTrain(state: GameState, kind: TrainKind, delta: number): void {
  if (kind === 'normal') state.availableTrains += delta;
  else if (kind === 'express') state.availableExpress += delta;
  else state.availableBig += delta;
}

export function assignTrainToLine(state: GameState, line: Line, kind: TrainKind = 'normal'): Train | null {
  if (trainPool(state, kind) <= 0) return null;
  consumeTrain(state, kind, -1);
  const train: Train = {
    id: nextId('tr'),
    lineId: line.id,
    kind,
    distance: 0,
    direction: 1,
    carriages: 0,
    passengers: [],
    capacity: trainCapacity(kind, 0),
    dwell: TRAIN_DWELL,
    lastStopIndex: 0,
  };
  line.trains.push(train);
  return train;
}

export function addCarriageToLine(state: GameState, line: Line): boolean {
  if (state.availableCarriages <= 0 || line.trains.length === 0) return false;
  // Attach to the train with the fewest carriages.
  const train = [...line.trains].sort((a, b) => a.carriages - b.carriages)[0];
  state.availableCarriages -= 1;
  train.carriages += 1;
  train.capacity = trainCapacity(train.kind, train.carriages);
  return true;
}

function serviceStation(state: GameState, line: Line, train: Train, station: Station): void {
  // 1) Unload: deliveries, then transfers. A passenger alights when a line
  // stopping here is strictly closer (in line-graph hops) to their shape than
  // the line they're on — or when their line has no route at all, so they
  // wait visibly instead of joyriding.
  const keep: typeof train.passengers = [];
  const alighted = new Set<string>();
  for (const p of train.passengers) {
    if (p.destinationShape === station.shape) {
      state.score += 1;
      state.stats.passengersDelivered += 1;
      continue;
    }
    const cur = hopDistance(state, line, p.destinationShape);
    const best = bestDistAtStation(state, station.id, p.destinationShape);
    if (best < cur || cur === Infinity) {
      p.boardedLineId = null;
      station.waitingPassengers.push(p);
      alighted.add(p.id);
      if (best < cur) state.stats.transfers += 1;
      continue;
    }
    keep.push(p);
  }
  train.passengers = keep;

  // 2) Load FIFO. A passenger boards only a line on a best route to their
  // shape from this station (never the train they just stepped off).
  const stillWaiting: typeof station.waitingPassengers = [];
  for (const p of station.waitingPassengers) {
    const room = train.passengers.length < train.capacity;
    const cur = hopDistance(state, line, p.destinationShape);
    const best = bestDistAtStation(state, station.id, p.destinationShape);
    const useful = Number.isFinite(cur) && cur <= best;
    if (room && useful && !alighted.has(p.id)) {
      p.boardedLineId = line.id;
      train.passengers.push(p);
    } else {
      stillWaiting.push(p);
    }
  }
  station.waitingPassengers = stillWaiting;
}

function updateTrain(state: GameState, line: Line, path: LinePath, train: Train, dt: number): void {
  const n = line.stationIds.length;
  if (n < 2) return;

  if (train.dwell > 0) {
    train.dwell -= dt;
    if (train.dwell > 0) return;
  }

  if (line.isLoop) train.direction = 1; // loop trains run one way

  // Keep index valid if the line changed shape since last frame.
  train.lastStopIndex = Math.max(0, Math.min(n - 1, train.lastStopIndex));

  // Work out the next stop.
  let next = train.lastStopIndex + train.direction;
  if (line.isLoop) {
    next = (next + n) % n;
  } else if (next < 0 || next >= n) {
    train.direction = (train.direction * -1) as 1 | -1;
    next = train.lastStopIndex + train.direction;
    if (next < 0 || next >= n) return; // degenerate single-station line
  }

  // Target distance along the path (loop wrap runs through the closing segment).
  const wrapping = line.isLoop && next === 0 && train.direction === 1;
  const target = wrapping ? path.totalLength : path.stationDist[next];

  train.distance = Math.max(0, Math.min(path.totalLength, train.distance));
  const step = TRAIN_SPECS[train.kind].speed * dt;
  const delta = target - train.distance;
  if (Math.abs(delta) <= step) {
    train.distance = wrapping ? 0 : target;
    train.lastStopIndex = next;
    train.dwell = TRAIN_DWELL;
    const station = stationById(state, line.stationIds[next]);
    if (station) serviceStation(state, line, train, station);
  } else {
    train.distance += Math.sign(delta) * step;
  }
}

export function updateTrains(state: GameState, dt: number): void {
  for (const line of state.lines) {
    if (line.trains.length === 0) continue;
    const path = buildLinePath(line, state);
    for (const train of line.trains) {
      updateTrain(state, line, path, train, dt);
    }
  }
}
