import { GameLoop } from './engine/gameLoop';
import { CanvasRenderer } from './render/canvasRenderer';
import { PointerHandler } from './input/pointerHandler';
import { createGameState, type CityDef, type GameMode, type GameState } from './state/gameState';
import { getHighScore, submitScore } from './state/highScores';
import { HUD } from './ui/hud';
import { showMainMenu } from './ui/mainMenu';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui-root') as HTMLElement;

let current: { loop: GameLoop; hud: HUD } | null = null;
let removeMenu: (() => void) | null = null;

function seedFromUrl(): number {
  const s = new URLSearchParams(location.search).get('seed');
  return s ? Number(s) >>> 0 : (Date.now() % 0xffffffff) >>> 0;
}

function startGame(city: CityDef, mode: GameMode): void {
  stopGame();
  removeMenu?.();
  removeMenu = null;

  const state: GameState = createGameState(city, mode, seedFromUrl() ^ city.seed);
  (window as unknown as { __ct?: GameState }).__ct = state; // dev/debug handle
  const renderer = new CanvasRenderer(canvas, () => state);
  const pointer = new PointerHandler(canvas, () => state, renderer);
  const hud = new HUD(uiRoot, () => state, pointer, (endSession) => {
    if (endSession) stopGame();
    openMenu();
  });

  const loop = new GameLoop(
    state,
    () => {
      renderer.render();
      hud.update();
    },
    () => {
      const isRecord = submitScore(city.id, mode, state.score);
      hud.showGameOver(isRecord, getHighScore(city.id, mode), () => startGame(city, mode));
    },
  );
  renderer.resize();
  loop.start();
  (window as unknown as { __ctStep?: (s: number) => void }).__ctStep = (s) => loop.stepSeconds(s);
  current = { loop, hud };
}

function stopGame(): void {
  if (!current) return;
  current.loop.stop();
  current.hud.destroy();
  current = null;
}

function openMenu(): void {
  removeMenu?.();
  // A finished session can't be resumed — discard it.
  if (current?.loop.state.isGameOver) stopGame();

  if (current) {
    // Keep the session alive, paused, behind the menu.
    const state = current.loop.state;
    const wasPaused = state.isPaused;
    state.isPaused = true;
    removeMenu = showMainMenu(uiRoot, startGame, () => {
      removeMenu?.();
      removeMenu = null;
      state.isPaused = wasPaused;
    });
  } else {
    removeMenu = showMainMenu(uiRoot, startGame);
  }
}

openMenu();
