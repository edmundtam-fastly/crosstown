import { updateEconomy } from './resourceEconomy';
import { updatePassengers } from './passengerSystem';
import { updateStationSpawner } from './stationSpawner';
import { updateTrains } from './trainSystem';
import { Rng } from './rng';
import type { GameState } from '../state/gameState';

const FIXED_DT = 1 / 60;
const MAX_FRAME = 0.25; // clamp long frames (tab switch) to avoid spiral of death

export class GameLoop {
  readonly rng: Rng;
  private accumulator = 0;
  private lastTime: number | null = null;
  private rafId = 0;
  private running = false;

  constructor(
    public state: GameState,
    private render: () => void,
    private onGameOver: () => void,
  ) {
    this.rng = new Rng(state.seed);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = null;
    const frame = (now: number) => {
      if (!this.running) return;
      if (this.lastTime !== null) {
        this.accumulator += Math.min(MAX_FRAME, (now - this.lastTime) / 1000);
        while (this.accumulator >= FIXED_DT) {
          this.step(FIXED_DT);
          this.accumulator -= FIXED_DT;
        }
      }
      this.lastTime = now;
      this.render();
      this.rafId = requestAnimationFrame(frame);
    };
    this.rafId = requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  /** Advance the simulation synchronously (dev/testing aid; rAF-independent). */
  stepSeconds(seconds: number): void {
    const frames = Math.round(seconds / FIXED_DT);
    for (let i = 0; i < frames; i++) this.step(FIXED_DT);
    this.render();
  }

  private step(dt: number): void {
    const s = this.state;
    if (s.isGameOver || s.isPaused || s.pendingReward) return;

    s.gameTime += dt;
    updateStationSpawner(s, this.rng);
    updatePassengers(s, this.rng);
    updateTrains(s, dt);
    updateEconomy(s, dt, this.rng);

    if (s.isGameOver) this.onGameOver();
  }
}
