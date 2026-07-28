import type { Rng } from './rng';
import { WEEK_LENGTH, type GameState, type RewardOption } from '../state/gameState';
import { LINE_COLORS } from '../render/theme';

/** Advance the weekly clock; sets `pendingReward` when a grant is due. */
export function updateEconomy(state: GameState, dt: number, rng: Rng): void {
  if (state.mode === 'creative') {
    // Sandbox: keep the calendar ticking, but resources are effectively infinite.
    state.weekTimer -= dt;
    if (state.weekTimer <= 0) {
      state.weekTimer += WEEK_LENGTH;
      state.week += 1;
    }
    return;
  }

  state.weekTimer -= dt;
  if (state.weekTimer > 0) return;
  state.weekTimer += WEEK_LENGTH;
  state.week += 1;

  // Every week ships a free train; the reward choice is a bonus on top.
  state.availableTrains += 1;

  const options = rollRewardOptions(state, rng);
  if (state.mode === 'extreme') {
    // No pause to plan: auto-grant one at random.
    grantReward(state, rng.pick(options));
  } else {
    state.pendingReward = options; // HUD shows a choice; sim pauses meanwhile
  }
}

function rollRewardOptions(state: GameState, rng: Rng): RewardOption[] {
  const pool: { opt: RewardOption; w: number }[] = [
    { opt: 'train', w: 3 },
    { opt: 'carriage', w: 3 },
  ];
  if (state.lines.length < LINE_COLORS.length) pool.push({ opt: 'line', w: 2 });
  if (state.rivers.length > 0) {
    // Watery cities (2+ bodies) see bridges more often.
    pool.push({ opt: 'bridge', w: state.rivers.length >= 2 ? 4 : 2 });
  }
  if (state.week >= 3) {
    // Premium upgrades enter the pool once the network has taken shape.
    pool.push({ opt: 'express', w: 1.5 }, { opt: 'big', w: 1.5 }, { opt: 'major', w: 1.5 });
  }
  // Two distinct weighted picks.
  const picks: RewardOption[] = [];
  for (let k = 0; k < 2 && pool.length > 0; k++) {
    const idx = rng.weighted(pool.map((p) => p.w));
    picks.push(pool[idx].opt);
    pool.splice(idx, 1);
  }
  return picks;
}

export function grantReward(state: GameState, option: RewardOption): void {
  switch (option) {
    case 'line':
      // A line alone is unusable — it ships with a train to run on it.
      state.availableLines += 1;
      state.availableTrains += 1;
      break;
    case 'train':
      state.availableTrains += 1;
      break;
    case 'carriage':
      state.availableCarriages += 1;
      break;
    case 'bridge':
      state.availableBridges += 1;
      break;
    case 'express':
      state.availableExpress += 1;
      break;
    case 'big':
      state.availableBig += 1;
      break;
    case 'major':
      state.availableMajors += 1;
      break;
  }
  state.pendingReward = null;
}
