import { distToSegment } from '../engine/collision';
import {
  bridgesNeeded,
  buildLinePath,
  canStartNewLine,
  commitLine,
  edgeOffset,
  endTails,
  extendLine,
  insertStationIntoLine,
  segmentPoints,
} from '../engine/lineManager';
import { addCarriageToLine, assignTrainToLine } from '../engine/trainSystem';
import { refreshInterchanges, stationById, type GameState, type Line, type Station, type Vec2 } from '../state/gameState';
import { LINE_COLORS } from '../render/theme';
import type { CanvasRenderer } from '../render/canvasRenderer';

type DragMode =
  | { kind: 'none' }
  | {
      kind: 'draft'; // drawing a brand-new line
      stationIds: string[];
      segmentCosts: number[]; // bridges reserved per added segment
      reserved: number;
      isLoop: boolean;
      color: string;
    }
  | {
      kind: 'extend'; // extending an existing line from one end
      line: Line;
      atStart: boolean;
      addedCosts: number[]; // bridge cost of each station added this drag
      addedCount: number;
    }
  | {
      kind: 'reroute'; // dragging a middle segment to insert a station
      line: Line;
      segIndex: number;
    };

export type AssignMode = 'train' | 'express' | 'big' | 'carriage' | 'major' | null;

export class PointerHandler {
  private drag: DragMode = { kind: 'none' };
  assignMode: AssignMode = null;
  onAction: (() => void) | null = null; // HUD refresh hook
  onInvalid: (() => void) | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private getState: () => GameState,
    private renderer: CanvasRenderer,
  ) {
    canvas.addEventListener('pointerdown', (e) => this.down(e));
    canvas.addEventListener('pointermove', (e) => this.move(e));
    canvas.addEventListener('pointerup', (e) => this.up(e));
    canvas.addEventListener('pointercancel', () => this.cancel());
  }

  private invalid(): void {
    this.renderer.flashInvalid();
    this.onInvalid?.();
  }

  /**
   * Nearest line to a world point, with the station-edge index under the
   * pointer. Hit-tests against the *drawn* ribbon geometry — i.e. each edge is
   * shifted by its parallel-corridor offset — so grabbing a specific coloured
   * ribbon selects that line even when several share a corridor.
   */
  private nearestLine(world: Vec2): { line: Line; segIndex: number } | null {
    const state = this.getState();
    let best: { line: Line; segIndex: number } | null = null;
    let bestD = 22;
    for (const line of state.lines) {
      const ids = line.stationIds;
      const edgeCount = line.isLoop ? ids.length : ids.length - 1;
      for (let i = 0; i < edgeCount; i++) {
        const a = stationById(state, ids[i]);
        const b = stationById(state, ids[(i + 1) % ids.length]);
        if (!a || !b) continue;
        const off = edgeOffset(state, line, ids[i], ids[(i + 1) % ids.length]);
        const seg = segmentPoints(a.position, b.position);
        let d = Infinity;
        for (let j = 0; j < seg.length - 1; j++) {
          const p1 = { x: seg[j].x + off.x, y: seg[j].y + off.y };
          const p2 = { x: seg[j + 1].x + off.x, y: seg[j + 1].y + off.y };
          d = Math.min(d, distToSegment(world, p1, p2));
        }
        if (d < bestD) {
          bestD = d;
          best = { line, segIndex: i };
        }
      }
    }
    return best;
  }

  /** Line-end tail under the pointer, if any — nearest wins when tails fan out. */
  private hitTail(world: Vec2): { line: Line; atStart: boolean } | null {
    const state = this.getState();
    let best: { line: Line; atStart: boolean } | null = null;
    let bestD = 16;
    for (const tail of endTails(state)) {
      // Bias toward the tip so neighbouring fanned tails don't fight over
      // the shared base point; the knob at the tip is the primary handle.
      const dTip = Math.hypot(tail.tip.x - world.x, tail.tip.y - world.y);
      const dStub = distToSegment(world, tail.base, tail.tip) + 6;
      const d = Math.min(dTip, dStub);
      if (d < bestD) {
        bestD = d;
        best = { line: tail.line, atStart: tail.atStart };
      }
    }
    return best;
  }

  private down(e: PointerEvent): void {
    const state = this.getState();
    if (state.isGameOver || state.pendingReward) return;
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic events have no active pointer */
    }
    const world = this.renderer.toWorld(e.clientX, e.clientY);

    // Token assignment mode: click a line (trains/carriages) or a station
    // (major upgrade) to place the pending token.
    if (this.assignMode) {
      const mode = this.assignMode;
      let ok = false;
      if (mode === 'major') {
        const station = this.renderer.hitStation(state, world);
        if (station && !station.isMajor && (state.availableMajors > 0 || state.mode === 'creative')) {
          if (state.mode !== 'creative') state.availableMajors -= 1;
          station.isMajor = true;
          refreshInterchanges(state); // recompute capacity
          ok = true;
        }
      } else {
        const hit = this.nearestLine(world);
        if (hit) {
          ok =
            mode === 'carriage'
              ? addCarriageToLine(state, hit.line)
              : assignTrainToLine(state, hit.line, mode === 'train' ? 'normal' : mode) !== null;
        }
      }
      if (!ok) this.invalid();
      this.assignMode = null;
      this.onAction?.();
      return;
    }

    // Grabbing a line's end tail extends that specific line — the unambiguous
    // way to pick one when several lines terminate at the same station.
    const tail = this.hitTail(world);
    if (tail) {
      this.drag = { kind: 'extend', line: tail.line, atStart: tail.atStart, addedCosts: [], addedCount: 0 };
      this.updatePreview(world);
      return;
    }

    const station = this.renderer.hitStation(state, world);
    if (!station) {
      // Not on a station: grabbing a line segment starts a reroute drag.
      const hit = this.nearestLine(world);
      if (hit) {
        this.drag = { kind: 'reroute', line: hit.line, segIndex: hit.segIndex };
        this.updatePreview(world);
      }
      return;
    }

    // Lines whose end is this station are candidates for extension.
    const candidates: { line: Line; atStart: boolean }[] = [];
    for (const line of state.lines) {
      if (line.isLoop) continue;
      if (line.stationIds[0] === station.id) candidates.push({ line, atStart: true });
      if (line.stationIds[line.stationIds.length - 1] === station.id) candidates.push({ line, atStart: false });
    }
    if (candidates.length > 0) {
      // Several ends here: pick the line whose tail stub is closest to the
      // click (clicking toward a line's tail chooses it; grab the tail itself
      // for full precision).
      let pick = candidates[0];
      if (candidates.length > 1) {
        // Use the fanned tail tips so the choice matches what's on screen.
        let bestD = Infinity;
        const tails = endTails(state).filter((t) => t.stationId === station.id);
        for (const t of tails) {
          const d = Math.hypot(t.tip.x - world.x, t.tip.y - world.y);
          if (d < bestD) {
            bestD = d;
            pick = { line: t.line, atStart: t.atStart };
          }
        }
      }
      this.drag = { kind: 'extend', line: pick.line, atStart: pick.atStart, addedCosts: [], addedCount: 0 };
      this.updatePreview(world);
      return;
    }

    if (!canStartNewLine(state)) {
      this.invalid();
      return;
    }
    const used = new Set(state.lines.map((l) => l.colorIndex));
    const colorIndex = LINE_COLORS.findIndex((_, i) => !used.has(i));
    this.drag = {
      kind: 'draft',
      stationIds: [station.id],
      segmentCosts: [],
      reserved: 0,
      isLoop: false,
      color: LINE_COLORS[colorIndex === -1 ? 0 : colorIndex],
    };
    this.updatePreview(world);
  }

  private move(e: PointerEvent): void {
    const state = this.getState();
    const world = this.renderer.toWorld(e.clientX, e.clientY);
    if (this.drag.kind === 'none') {
      // Idle: preview what a grab would do. Tail (extend) takes priority; then,
      // when not over a station, the line/segment a reroute would grab — shown
      // as a halo + knob so the correct ribbon is unambiguous in a shared corridor.
      const tail = this.hitTail(world);
      this.renderer.hoverTail = tail ? { lineId: tail.line.id, atStart: tail.atStart } : null;
      let onLine = false;
      if (!tail && !this.renderer.hitStation(state, world)) {
        const hit = this.nearestLine(world);
        this.renderer.hoverLine = hit ? { lineId: hit.line.id, segIndex: hit.segIndex } : null;
        onLine = !!hit;
      } else {
        this.renderer.hoverLine = null;
      }
      this.canvas.style.cursor = tail || onLine ? 'grab' : '';
      return;
    }
    this.renderer.hoverTail = null;
    this.renderer.hoverLine = null;
    const hover = this.renderer.hitStation(state, world);

    if (this.drag.kind === 'draft') this.moveDraft(state, hover);
    else if (this.drag.kind === 'extend') this.moveExtend(state, hover);
    else this.moveReroute(state, hover);
    this.updatePreview(world);
  }

  private moveDraft(state: GameState, hover: Station | null): void {
    const d = this.drag as Extract<DragMode, { kind: 'draft' }>;
    if (!hover || d.isLoop) return;
    const last = d.stationIds[d.stationIds.length - 1];
    if (hover.id === last) return;

    // Dragging back onto the previous station removes the last segment.
    if (d.stationIds.length >= 2 && hover.id === d.stationIds[d.stationIds.length - 2]) {
      d.stationIds.pop();
      const cost = d.segmentCosts.pop() ?? 0;
      d.reserved -= cost;
      state.availableBridges += cost;
      return;
    }

    const lastStation = stationById(state, last)!;
    // Closing the loop back to the first station.
    if (hover.id === d.stationIds[0] && d.stationIds.length >= 3) {
      const cost = bridgesNeeded(state, lastStation, hover);
      if (cost > state.availableBridges) {
        this.invalid();
        return;
      }
      state.availableBridges -= cost;
      d.segmentCosts.push(cost);
      d.reserved += cost;
      d.isLoop = true;
      return;
    }
    if (d.stationIds.includes(hover.id)) return;

    const cost = bridgesNeeded(state, lastStation, hover);
    if (cost > state.availableBridges) {
      this.invalid();
      return;
    }
    state.availableBridges -= cost;
    d.segmentCosts.push(cost);
    d.reserved += cost;
    d.stationIds.push(hover.id);
  }

  private moveExtend(state: GameState, hover: Station | null): void {
    const d = this.drag as Extract<DragMode, { kind: 'extend' }>;
    if (!hover || d.line.isLoop) return;
    const ids = d.line.stationIds;
    const endId = d.atStart ? ids[0] : ids[ids.length - 1];
    if (hover.id === endId) return;

    // Dragging back onto the neighbour undoes segments added during this drag.
    const neighbour = d.atStart ? ids[1] : ids[ids.length - 2];
    if (d.addedCount > 0 && hover.id === neighbour) {
      const cost = d.addedCosts.pop() ?? 0;
      state.availableBridges += cost;
      d.line.bridgesUsed -= cost;
      if (d.atStart) {
        const before = buildLinePath(d.line, state).totalLength;
        ids.shift();
        const delta = buildLinePath(d.line, state).totalLength - before;
        for (const t of d.line.trains) {
          t.lastStopIndex = Math.max(0, t.lastStopIndex - 1);
          t.distance = Math.max(0, t.distance + delta);
        }
      } else {
        ids.pop();
      }
      d.addedCount -= 1;
      refreshInterchanges(state);
      return;
    }

    const bridgesBefore = state.availableBridges;
    if (extendLine(state, d.line, hover.id, d.atStart)) {
      d.addedCosts.push(bridgesBefore - state.availableBridges);
      d.addedCount += 1;
      this.onAction?.();
    } else if (!d.line.stationIds.includes(hover.id)) {
      this.invalid(); // rejected for lack of bridges
    }
  }

  private moveReroute(state: GameState, hover: Station | null): void {
    const d = this.drag as Extract<DragMode, { kind: 'reroute' }>;
    if (!hover) return;
    if (d.line.stationIds.includes(hover.id)) return; // nothing to do
    if (insertStationIntoLine(state, d.line, d.segIndex, hover.id)) {
      this.drag = { kind: 'none' }; // one insertion per grab
      this.onAction?.();
    } else {
      this.invalid(); // rejected for lack of bridges
    }
  }

  private updatePreview(world: Vec2): void {
    if (this.drag.kind === 'draft') {
      const d = this.drag;
      this.renderer.preview = {
        stationIds: d.isLoop ? [...d.stationIds, d.stationIds[0]] : d.stationIds,
        color: d.color,
        cursor: d.isLoop ? null : world,
        valid: true,
      };
    } else if (this.drag.kind === 'extend') {
      const d = this.drag;
      const endId = d.atStart ? d.line.stationIds[0] : d.line.stationIds[d.line.stationIds.length - 1];
      this.renderer.preview = {
        stationIds: d.line.isLoop ? [] : [endId],
        color: d.line.color,
        cursor: d.line.isLoop ? null : world,
        valid: true,
      };
    } else if (this.drag.kind === 'reroute') {
      const d = this.drag;
      const ids = d.line.stationIds;
      const isWrap = d.segIndex >= ids.length - 1;
      this.renderer.preview = {
        stationIds: [],
        color: d.line.color,
        cursor: world,
        valid: true,
        reroute: {
          aId: ids[Math.min(d.segIndex, ids.length - 1)],
          bId: isWrap ? ids[0] : ids[d.segIndex + 1],
        },
      };
    } else {
      this.renderer.preview = null;
    }
  }

  private up(_e: PointerEvent): void {
    const state = this.getState();
    if (this.drag.kind === 'draft') {
      const d = this.drag;
      if (d.stationIds.length >= 2) {
        const line = commitLine(state, d.stationIds, d.isLoop, d.reserved);
        // A line without a train is dead weight — put one on it right away
        // if the tray has any (assignTrainToLine no-ops when it doesn't).
        if (line) assignTrainToLine(state, line);
      } else {
        state.availableBridges += d.reserved; // nothing drawn — refund
      }
    }
    this.drag = { kind: 'none' };
    this.renderer.preview = null;
    this.onAction?.();
  }

  private cancel(): void {
    const state = this.getState();
    if (this.drag.kind === 'draft') {
      state.availableBridges += this.drag.reserved;
    }
    this.drag = { kind: 'none' };
    this.renderer.preview = null;
  }
}
