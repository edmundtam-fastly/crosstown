// Core data model for Crosstown. Pure data — no rendering or DOM here so the
// simulation can run headless (e.g. in unit tests).

export type ShapeType =
  | 'circle'
  | 'triangle'
  | 'square'
  | 'cross'
  | 'star'
  | 'diamond'
  | 'pentagon';

export const ALL_SHAPES: ShapeType[] = [
  'circle',
  'triangle',
  'square',
  'cross',
  'star',
  'diamond',
  'pentagon',
];

export interface Vec2 {
  x: number;
  y: number;
}

export interface Passenger {
  id: string;
  destinationShape: ShapeType;
  spawnedAt: number;
  boardedLineId: string | null;
}

export interface Station {
  id: string;
  position: Vec2;
  shape: ShapeType;
  isInterchange: boolean;
  /** Upgraded major station: double waiting capacity. Permanent once applied. */
  isMajor: boolean;
  waitingPassengers: Passenger[];
  overcrowdedSince: number | null; // gameTime seconds, null if not overcrowded
  capacity: number;
  nextPassengerAt: number; // gameTime at which this station spawns its next passenger
}

export type TrainKind = 'normal' | 'express' | 'big';

export const TRAIN_SPECS: Record<TrainKind, { speed: number; capacity: number; name: string }> = {
  normal: { speed: 90, capacity: 6, name: 'Train' },
  express: { speed: 150, capacity: 12, name: 'High-Speed Rail' },
  big: { speed: 90, capacity: 18, name: 'Big Train' },
};

export interface Train {
  id: string;
  lineId: string;
  kind: TrainKind;
  /** Distance in world units along the line's polyline path. */
  distance: number;
  direction: 1 | -1;
  carriages: number; // 0 extra carriages = base train
  passengers: Passenger[];
  capacity: number;
  /** Seconds of dwell remaining at a station stop (0 = moving). */
  dwell: number;
  /** Index into the line's stationIds of the last station serviced. */
  lastStopIndex: number;
}

export interface Line {
  id: string;
  colorIndex: number;
  color: string;
  stationIds: string[];
  isLoop: boolean;
  trains: Train[];
  /** Bridge tokens consumed by this line's water crossings (refunded on delete). */
  bridgesUsed: number;
}

export interface RiverSegment {
  id: string;
  path: Vec2[];
  width: number;
}

export type GameMode = 'normal' | 'extreme' | 'creative';

export interface CityDef {
  id: string;
  name: string;
  description: string;
  /** World-space size the map is designed in. */
  size: Vec2;
  rivers: RiverSegment[];
  starterStations: { position: Vec2; shape: ShapeType }[];
  seed: number;
  /** Decorative geography outlines (coastlines, hills, parks) drawn faintly behind the map. */
  decor?: Vec2[][];
  /** Faint place-name labels (landmarks, districts, water bodies). */
  labels?: { text: string; x: number; y: number; size?: number }[];
  /** Locked until this many full weeks have been survived (in `cityId`, or in any city if omitted). */
  unlock?: { weeks: number; cityId?: string };
  /** Extra starting resources on top of the standard kit. */
  resourceBonus?: Partial<
    Record<'lines' | 'trains' | 'carriages' | 'bridges' | 'express' | 'big' | 'majors', number>
  >;
  /** Per-city gameplay multipliers (1 = default). bridgeCost is per water crossing. */
  tuning?: { passenger?: number; station?: number; bridgeCost?: number };
  /** New stations only spawn inside this circle (linear/compact cities). */
  spawnArea?: { x: number; y: number; r: number };
  /**
   * Polycentric / core-periphery growth. New stations cluster around weighted
   * hubs instead of spreading uniformly. A hub can be time-gated with
   * `opensWeek` to model a periphery (outer boroughs, suburbs) that only
   * starts developing later in the game. When present this drives placement
   * (overriding uniform/spawnArea). Faint zone discs are drawn per hub.
   */
  growth?: {
    hubs: {
      x: number;
      y: number;
      r: number; // cluster radius (world units)
      weight: number; // relative spawn share once open
      opensWeek?: number; // hub dormant until this week (default 1)
      label?: string; // optional district name (drawn faintly at the hub)
    }[];
  };
}

export interface Stats {
  passengersDelivered: number;
  passengersSpawned: number;
  longestLineStations: number;
  linesUsed: number;
  transfers: number;
}

export interface GameState {
  city: CityDef;
  mode: GameMode;
  seed: number;
  stations: Station[];
  lines: Line[];
  rivers: RiverSegment[];
  availableLines: number;
  availableTrains: number;
  availableCarriages: number;
  availableBridges: number;
  availableExpress: number;
  availableBig: number;
  availableMajors: number;
  score: number;
  stats: Stats;
  gameTime: number; // seconds of simulated time
  weekTimer: number; // seconds until next weekly grant
  week: number;
  nextStationAt: number; // gameTime at which the next station spawns
  isGameOver: boolean;
  isPaused: boolean;
  /** Set when a weekly reward choice is pending; sim halts until resolved. */
  pendingReward: RewardOption[] | null;
  usedShapes: ShapeType[]; // shapes currently present on the map
  /** Bumped on every line-topology change; invalidates the routing table. */
  topologyVersion: number;
}

export type RewardOption = 'line' | 'train' | 'carriage' | 'bridge' | 'express' | 'big' | 'major';

export const WEEK_LENGTH = 90; // seconds per in-game week
export const STATION_CAPACITY = 6;
export const INTERCHANGE_CAPACITY = 10;
export const OVERCROWD_GRACE: Record<GameMode, number> = {
  normal: 45,
  extreme: 22,
  creative: Infinity,
};
export const CARRIAGE_CAPACITY = 6;
export const TRAIN_DWELL = 0.8; // seconds stopped at each station

let idCounter = 0;
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function trainCapacity(kind: TrainKind, carriages: number): number {
  return TRAIN_SPECS[kind].capacity + carriages * CARRIAGE_CAPACITY;
}

/** Waiting capacity before the overcrowd countdown starts. */
export function stationCapacity(st: Pick<Station, 'isInterchange' | 'isMajor'>): number {
  return (st.isInterchange ? INTERCHANGE_CAPACITY : STATION_CAPACITY) * (st.isMajor ? 2 : 1);
}

export function createGameState(city: CityDef, mode: GameMode, seed: number): GameState {
  const creative = mode === 'creative';
  const stations: Station[] = city.starterStations.map((s) => ({
    id: nextId('st'),
    position: { ...s.position },
    shape: s.shape,
    isInterchange: false,
    isMajor: false,
    waitingPassengers: [],
    overcrowdedSince: null,
    capacity: STATION_CAPACITY,
    nextPassengerAt: 2 + Math.random() * 4, // staggered first spawns; cosmetic only
  }));
  const bonus = city.resourceBonus ?? {};
  return {
    city,
    mode,
    seed,
    stations,
    lines: [],
    rivers: city.rivers.map((r) => ({ ...r, path: r.path.map((p) => ({ ...p })) })),
    availableLines: creative ? 99 : 3 + (bonus.lines ?? 0),
    availableTrains: creative ? 99 : 3 + (bonus.trains ?? 0),
    availableCarriages: creative ? 99 : 0 + (bonus.carriages ?? 0),
    availableBridges: creative ? 99 : (city.rivers.length > 0 ? 3 : 0) + (bonus.bridges ?? 0),
    availableExpress: creative ? 99 : 0 + (bonus.express ?? 0),
    availableBig: creative ? 99 : 0 + (bonus.big ?? 0),
    availableMajors: creative ? 99 : 0 + (bonus.majors ?? 0),
    score: 0,
    stats: {
      passengersDelivered: 0,
      passengersSpawned: 0,
      longestLineStations: 0,
      linesUsed: 0,
      transfers: 0,
    },
    gameTime: 0,
    weekTimer: WEEK_LENGTH,
    week: 1,
    nextStationAt: 20,
    isGameOver: false,
    isPaused: false,
    pendingReward: null,
    usedShapes: [...new Set(stations.map((s) => s.shape))],
    topologyVersion: 0,
  };
}

export function stationById(state: GameState, id: string): Station | undefined {
  return state.stations.find((s) => s.id === id);
}

/** Recompute which stations are interchanges (touched by 2+ lines). Called on
 *  every line-topology mutation, so it also versions the routing table. */
export function refreshInterchanges(state: GameState): void {
  state.topologyVersion += 1;
  const counts = new Map<string, number>();
  for (const line of state.lines) {
    for (const sid of new Set(line.stationIds)) {
      counts.set(sid, (counts.get(sid) ?? 0) + 1);
    }
  }
  for (const st of state.stations) {
    st.isInterchange = (counts.get(st.id) ?? 0) >= 2;
    st.capacity = stationCapacity(st);
  }
}
