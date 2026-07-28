import { deleteLine } from '../engine/lineManager';
import { grantReward } from '../engine/resourceEconomy';
import { WEEK_LENGTH, type GameState, type RewardOption } from '../state/gameState';
import { recordWeeksSurvived } from '../state/highScores';
import type { PointerHandler } from '../input/pointerHandler';
import { sound } from './sound';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const REWARD_LABELS: Record<RewardOption, { icon: string; name: string; desc: string }> = {
  line: { icon: '〰️', name: 'New Line', desc: 'A new line colour — includes a train to run it' },
  train: { icon: '🚈', name: 'Train', desc: 'Assign to a line to move more people' },
  carriage: { icon: '🚃', name: 'Carriage', desc: '+6 capacity on one train' },
  bridge: { icon: '🌉', name: 'Bridge', desc: 'Cross a river with a new segment' },
  express: { icon: '🚄', name: 'High-Speed Rail', desc: 'Much faster, double capacity' },
  big: { icon: '🚂', name: 'Big Train', desc: 'Triple capacity at regular speed' },
  major: { icon: '🏛️', name: 'Major Station', desc: 'One station holds twice the crowd' },
};

export class HUD {
  private root: HTMLElement;
  private top!: HTMLElement;
  private tray!: HTMLElement;
  private overlay: HTMLElement | null = null;
  private traySignature = '';
  private lastScore = 0;
  private recordedWeeks = 0;

  constructor(
    container: HTMLElement,
    private getState: () => GameState,
    private pointer: PointerHandler,
    /** endSession=false keeps the game alive (paused) behind the menu. */
    private onMenu: (endSession: boolean) => void,
  ) {
    this.root = document.createElement('div');
    container.appendChild(this.root);
    this.buildChrome();
    pointer.onAction = () => this.refreshTray();
    pointer.onInvalid = () => sound.invalid();
  }

  destroy(): void {
    this.root.remove();
  }

  private buildChrome(): void {
    this.root.innerHTML = `
      <style>
        .ct-top { position:absolute; top:0; left:0; right:0; display:flex; align-items:center;
          gap:16px; padding:10px 16px; background:rgba(255,255,255,0.88); backdrop-filter:blur(4px);
          font-size:15px; color:#33323d; border-bottom:1px solid rgba(0,0,0,0.08); }
        .ct-top .ct-score { font-weight:700; font-size:18px; }
        .ct-top button { border:1px solid #ccc; background:#fff; border-radius:8px; padding:4px 12px;
          font-size:14px; cursor:pointer; }
        .ct-top button:hover { background:#f0efe9; }
        .ct-tray { position:absolute; bottom:0; left:0; right:0; display:flex; align-items:center;
          gap:14px; padding:10px 16px; background:rgba(255,255,255,0.88); backdrop-filter:blur(4px);
          border-top:1px solid rgba(0,0,0,0.08); flex-wrap:wrap; }
        .ct-swatch { display:flex; align-items:center; gap:4px; }
        .ct-dot { width:22px; height:22px; border-radius:50%; display:inline-block; }
        .ct-dot.empty { border:2px dashed #aaa; background:transparent; }
        .ct-del { border:none; background:none; color:#888; cursor:pointer; font-size:13px; padding:0 2px; }
        .ct-del:hover { color:#d6363c; }
        .ct-token { border:1px solid #ccc; background:#fff; border-radius:10px; padding:6px 12px;
          font-size:14px; cursor:pointer; color:#33323d; }
        .ct-token.armed { outline:3px solid #2e6fb7; }
        .ct-token:disabled { opacity:0.45; cursor:default; }
        .ct-hint { font-size:13px; color:#777; margin-left:auto; }
        .ct-overlay { position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
          background:rgba(40,40,50,0.45); z-index:10; }
        .ct-card { background:#fff; border-radius:16px; padding:28px 32px; max-width:520px; width:90%;
          box-shadow:0 12px 40px rgba(0,0,0,0.25); color:#33323d; text-align:center; }
        .ct-card h2 { margin-bottom:6px; }
        .ct-card .ct-sub { color:#777; margin-bottom:18px; }
        .ct-choices { display:flex; gap:14px; justify-content:center; }
        .ct-choice { flex:1; border:2px solid #ddd; border-radius:12px; padding:16px 10px; background:#fff;
          cursor:pointer; font-size:15px; }
        .ct-choice:hover { border-color:#2e6fb7; background:#f4f8fd; }
        .ct-choice .ci { font-size:30px; display:block; margin-bottom:6px; }
        .ct-choice .cd { font-size:12px; color:#888; display:block; margin-top:4px; }
        .ct-stats { text-align:left; margin:14px auto 20px; display:inline-block; font-size:14px; line-height:1.8; }
        .ct-btnrow { display:flex; gap:12px; justify-content:center; }
        .ct-primary { background:#2e6fb7; color:#fff; border:none; border-radius:10px;
          padding:10px 22px; font-size:15px; cursor:pointer; }
        .ct-secondary { background:#fff; color:#33323d; border:1px solid #ccc; border-radius:10px;
          padding:10px 22px; font-size:15px; cursor:pointer; }
        .ct-record { color:#3ba55d; font-weight:700; }
      </style>
      <div class="ct-top"></div>
      <div class="ct-tray"></div>
    `;
    this.top = this.root.querySelector('.ct-top')!;
    this.tray = this.root.querySelector('.ct-tray')!;
  }

  /** Called every frame from the render loop. */
  update(): void {
    const s = this.getState();

    // Top bar
    const day = DAYS[Math.min(6, Math.floor(((WEEK_LENGTH - s.weekTimer) / WEEK_LENGTH) * 7))];
    const paused = s.isPaused ? ' · PAUSED' : '';
    const topText = `Week ${s.week} · ${day}${paused}`;
    const scoreText = `${s.score}`;
    if (this.top.dataset.sig !== topText + scoreText) {
      this.top.dataset.sig = topText + scoreText;
      this.top.innerHTML = `
        <span style="font-weight:800; letter-spacing:1px;">CROSSTOWN</span>
        <span>${topText}</span>
        <span class="ct-score">★ ${scoreText}</span>
        <span style="flex:1"></span>
        ${s.mode === 'normal' ? `<button data-act="pause">${s.isPaused ? 'Resume' : 'Pause'}</button>` : ''}
        <button data-act="mute">${sound.isMuted() ? '🔇' : '🔊'}</button>
        <button data-act="menu">Menu</button>
      `;
      this.top.querySelector('[data-act="pause"]')?.addEventListener('click', () => {
        s.isPaused = !s.isPaused;
        this.top.dataset.sig = '';
      });
      this.top.querySelector('[data-act="mute"]')?.addEventListener('click', () => {
        sound.toggleMute();
        this.top.dataset.sig = '';
      });
      this.top.querySelector('[data-act="menu"]')?.addEventListener('click', () => this.onMenu(false));
    }

    // Delivery ding
    if (s.score > this.lastScore) sound.deliver();
    this.lastScore = s.score;

    // City-unlock progression: reaching week N means N-1 full weeks survived.
    if (s.mode !== 'creative' && s.week - 1 > this.recordedWeeks) {
      this.recordedWeeks = s.week - 1;
      recordWeeksSurvived(s.city.id, this.recordedWeeks);
    }

    // Tray refresh when counts change
    const sig = [
      s.lines.map((l) => l.id).join(','),
      s.availableLines,
      s.availableTrains,
      s.availableCarriages,
      s.availableBridges,
      s.availableExpress,
      s.availableBig,
      s.availableMajors,
      this.pointer.assignMode ?? '',
    ].join('|');
    if (sig !== this.traySignature) {
      this.traySignature = sig;
      this.refreshTrayNow();
    }

    // Weekly reward overlay — keyed off the overlay itself so it can never
    // desync from pendingReward (which would soft-lock the sim).
    if (s.pendingReward && !this.overlay) {
      sound.week();
      this.showRewardChoice(s.pendingReward);
    }
  }

  refreshTray(): void {
    this.traySignature = '';
  }

  private refreshTrayNow(): void {
    const s = this.getState();
    const creative = s.mode === 'creative';
    const fmt = (n: number) => (creative ? '∞' : `${n}`);
    this.tray.innerHTML = '';

    for (const line of s.lines) {
      const el = document.createElement('span');
      el.className = 'ct-swatch';
      el.innerHTML = `<span class="ct-dot" style="background:${line.color}"></span>
        <button class="ct-del" title="Delete line">✕</button>`;
      el.querySelector('.ct-del')!.addEventListener('click', () => {
        deleteLine(s, line.id);
        this.refreshTray();
      });
      this.tray.appendChild(el);
    }
    for (let i = 0; i < Math.min(creative ? 1 : s.availableLines, 7); i++) {
      const el = document.createElement('span');
      el.className = 'ct-dot empty';
      el.title = 'Unused line — drag between stations to draw';
      this.tray.appendChild(el);
    }

    type Mode = 'train' | 'express' | 'big' | 'carriage' | 'major' | null;
    const mkToken = (label: string, count: number, mode: Mode, hint: string, alwaysShow = true) => {
      if (!alwaysShow && count <= 0 && !creative) return;
      const btn = document.createElement('button');
      btn.className = 'ct-token' + (mode && this.pointer.assignMode === mode ? ' armed' : '');
      btn.textContent = `${label} × ${fmt(count)}`;
      btn.title = hint;
      btn.disabled = !creative && count <= 0;
      if (mode) {
        btn.addEventListener('click', () => {
          this.pointer.assignMode = this.pointer.assignMode === mode ? null : mode;
          this.refreshTray();
        });
      }
      this.tray.appendChild(btn);
    };
    mkToken('🚈 Trains', s.availableTrains, 'train', 'Click, then click a line to add a train');
    mkToken('🚄 HSR', s.availableExpress, 'express', 'High-speed rail: faster, double capacity. Click, then click a line', false);
    mkToken('🚂 Big', s.availableBig, 'big', 'Big train: triple capacity, regular speed. Click, then click a line', false);
    mkToken('🚃 Carriages', s.availableCarriages, 'carriage', 'Click, then click a line to lengthen a train');
    mkToken('🏛️ Major', s.availableMajors, 'major', 'Click, then click a station to double its waiting capacity (permanent)', false);
    if (s.rivers.length > 0) {
      const el = document.createElement('span');
      el.className = 'ct-token';
      el.style.cursor = 'default';
      el.textContent = `🌉 Bridges × ${fmt(s.availableBridges)}`;
      el.title = 'Spent automatically when a segment crosses a river';
      this.tray.appendChild(el);
    }

    const hintText: Record<Exclude<Mode, null>, string> = {
      train: 'Click a line on the map to place the train',
      express: 'Click a line on the map to place the high-speed train',
      big: 'Click a line on the map to place the big train',
      carriage: 'Click a line on the map to add the carriage',
      major: 'Click a station on the map to upgrade it',
    };
    const hint = document.createElement('span');
    hint.className = 'ct-hint';
    hint.textContent = this.pointer.assignMode
      ? hintText[this.pointer.assignMode]
      : 'Drag between stations to build lines';
    this.tray.appendChild(hint);
  }

  private showRewardChoice(options: RewardOption[]): void {
    const s = this.getState();
    this.closeOverlay();
    const overlay = document.createElement('div');
    overlay.className = 'ct-overlay';
    overlay.innerHTML = `
      <div class="ct-card">
        <h2>Week ${s.week}</h2>
        <div class="ct-sub">A new train has arrived (+1 🚈). Choose a bonus:</div>
        <div class="ct-choices"></div>
      </div>`;
    const choices = overlay.querySelector('.ct-choices')!;
    for (const opt of options) {
      const info = REWARD_LABELS[opt];
      const btn = document.createElement('button');
      btn.className = 'ct-choice';
      btn.innerHTML = `<span class="ci">${info.icon}</span><b>${info.name}</b><span class="cd">${info.desc}</span>`;
      btn.addEventListener('click', () => {
        grantReward(s, opt);
        this.closeOverlay();
        this.refreshTray();
      });
      choices.appendChild(btn);
    }
    this.root.appendChild(overlay);
    this.overlay = overlay;
  }

  showGameOver(isRecord: boolean, best: number, onReplay: () => void): void {
    const s = this.getState();
    sound.gameOver();
    this.closeOverlay();
    const eff =
      s.stats.passengersSpawned > 0
        ? Math.round((s.stats.passengersDelivered / s.stats.passengersSpawned) * 100)
        : 0;
    const overlay = document.createElement('div');
    overlay.className = 'ct-overlay';
    overlay.innerHTML = `
      <div class="ct-card">
        <h2>Line Terminated</h2>
        <div class="ct-sub">A station stayed overcrowded too long.</div>
        <div style="font-size:42px; font-weight:800;">★ ${s.score}</div>
        ${isRecord ? '<div class="ct-record">New record!</div>' : `<div class="ct-sub">Best: ${best}</div>`}
        <div class="ct-stats">
          Weeks survived: <b>${s.week}</b><br/>
          Lines used: <b>${s.stats.linesUsed}</b> · Longest line: <b>${s.stats.longestLineStations || 0} stations</b><br/>
          Transfers made: <b>${s.stats.transfers}</b> · Delivery rate: <b>${eff}%</b>
        </div>
        <div class="ct-btnrow">
          <button class="ct-primary" data-act="replay">Play Again</button>
          <button class="ct-secondary" data-act="menu">Main Menu</button>
        </div>
      </div>`;
    overlay.querySelector('[data-act="replay"]')!.addEventListener('click', () => {
      this.closeOverlay();
      onReplay();
    });
    overlay.querySelector('[data-act="menu"]')!.addEventListener('click', () => {
      this.closeOverlay();
      this.onMenu(true);
    });
    this.root.appendChild(overlay);
    this.overlay = overlay;
  }

  private closeOverlay(): void {
    this.overlay?.remove();
    this.overlay = null;
  }
}
