import type { GameMode, ShapeType } from '../state/gameState';

// All ramps are functions of gameTime (seconds) so a fixed timestep keeps
// difficulty identical across devices.

const RAMP: Record<GameMode, number> = { normal: 1, extreme: 1.5, creative: 0.9 };

/** Seconds between passenger spawns at a single station. */
export function passengerInterval(gameTime: number, mode: GameMode): number {
  const t = gameTime * RAMP[mode];
  // 9s at t=0 easing toward 3s by ~25 minutes.
  return 3 + 6 / (1 + t / 500);
}

/** Seconds between new stations appearing. */
export function stationInterval(gameTime: number, mode: GameMode): number {
  const t = gameTime * RAMP[mode];
  return 16 + 24 / (1 + t / 420); // 40s early, ~16s late
}

/** Which shapes may exist at a given time (rarer shapes unlock later). */
export function unlockedShapes(gameTime: number, mode: GameMode): ShapeType[] {
  const t = gameTime * RAMP[mode];
  const shapes: ShapeType[] = ['circle', 'triangle', 'square'];
  if (t > 240) shapes.push('cross');
  if (t > 480) shapes.push('star');
  if (t > 720) shapes.push('diamond');
  if (t > 960) shapes.push('pentagon');
  return shapes;
}

/** Spawn weight per shape — commons stay common, rares stay rare. */
export function shapeWeight(shape: ShapeType): number {
  switch (shape) {
    case 'circle':
      return 5;
    case 'triangle':
      return 4;
    case 'square':
      return 3;
    default:
      return 1;
  }
}
