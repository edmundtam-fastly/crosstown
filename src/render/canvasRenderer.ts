import {
  buildLinePath,
  edgeOffset,
  endTails,
  pointAtDistance,
  segmentPoints,
  type LinePath,
} from '../engine/lineManager';
import {
  OVERCROWD_GRACE,
  stationById,
  WEEK_LENGTH,
  type GameState,
  type Line,
  type ShapeType,
  type Station,
  type Vec2,
} from '../state/gameState';
import { COLORS, SIZES } from './theme';

/** Point at half the arc-length of a polyline (used to place a grab knob). */
function polylineMidpoint(pts: Vec2[]): Vec2 {
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) total += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
  let half = total / 2;
  for (let i = 0; i < pts.length - 1; i++) {
    const segLen = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    if (half <= segLen) {
      const t = segLen === 0 ? 0 : half / segLen;
      return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * t, y: pts[i].y + (pts[i + 1].y - pts[i].y) * t };
    }
    half -= segLen;
  }
  return pts[pts.length - 1];
}

/** Live drag state supplied by the pointer handler, drawn as a preview. */
export interface DragPreview {
  stationIds: string[];
  color: string;
  cursor: Vec2 | null; // world coords
  valid: boolean;
  /** When rerouting a middle segment: the two stations being reconnected through the cursor. */
  reroute?: { aId: string; bId: string };
}

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private scale = 1;
  private offset: Vec2 = { x: 0, y: 0 };
  preview: DragPreview | null = null;
  /** Tail currently under the pointer (highlighted as grabbable). */
  hoverTail: { lineId: string; atStart: boolean } | null = null;
  /** Line/edge under the pointer that a grab would reroute (highlighted). */
  hoverLine: { lineId: string; segIndex: number } | null = null;
  /** Timestamp (perf ms) of the last invalid-action flash. */
  flashUntil = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private getState: () => GameState,
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /** Current world→screen layout from live window dims (0x0-safe fallback). */
  private layout(): { scale: number; ox: number; oy: number; w: number; h: number } {
    const w = window.innerWidth || 1280;
    const h = window.innerHeight || 800;
    const size = this.getState().city.size;
    const scale = Math.min(w / size.x, (h - 40) / size.y);
    return { scale, ox: (w - size.x * scale) / 2, oy: (h - size.y * scale) / 2, w, h };
  }

  resize(): void {
    const { scale, ox, oy, w, h } = this.layout();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.scale = scale;
    this.offset = { x: ox, y: oy };
  }

  /** Always computed from live dims so input mapping can never go stale. */
  toWorld(clientX: number, clientY: number): Vec2 {
    const { scale, ox, oy } = this.layout();
    return {
      x: (clientX - ox) / scale,
      y: (clientY - oy) / scale,
    };
  }

  flashInvalid(): void {
    this.flashUntil = performance.now() + 350;
  }

  render(): void {
    // Re-sync the canvas buffer if the window changed since the last resize
    // event (covers tabs that were hidden or 0x0 when the game started).
    const dpr = window.devicePixelRatio || 1;
    if (this.canvas.width !== this.layout().w * dpr) this.resize();
    const state = this.getState();
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    if (performance.now() < this.flashUntil) {
      ctx.fillStyle = 'rgba(214,54,60,0.08)';
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    }
    ctx.translate(this.offset.x, this.offset.y);
    ctx.scale(this.scale, this.scale);

    this.drawGrowthZones(state);
    this.drawDecor(state);
    this.drawRivers(state);
    this.drawLabels(state);
    this.drawLines(state);
    this.drawPreview(state);
    this.drawTrains(state);
    this.drawStations(state);

    ctx.restore();
  }

  /**
   * Growth zones: soft discs where new stations cluster. Every hub is always
   * drawn as part of the city; a not-yet-open periphery sits as a faint ghost
   * and simply brightens in place (over a few seconds) the week it opens. No
   * text — the city's own place-name labels name these areas.
   */
  private drawGrowthZones(state: GameState): void {
    const growth = state.city.growth;
    if (!growth) return;
    const ctx = this.ctx;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const FADE = 4; // seconds to brighten once a zone opens
    for (const hub of growth.hubs) {
      const opensWeek = hub.opensWeek ?? 1;
      // openness 0 = dormant ghost, 1 = fully active; brief fade the week it opens.
      let t: number;
      if (state.week > opensWeek) t = 1;
      else if (state.week < opensWeek) t = 0;
      else t = Math.max(0, Math.min(1, (WEEK_LENGTH - state.weekTimer) / FADE));

      ctx.beginPath();
      ctx.arc(hub.x, hub.y, hub.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(120,140,120,${lerp(0.015, 0.07, t).toFixed(3)})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(120,140,120,${lerp(0.07, 0.18, t).toFixed(3)})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.stroke();
    }
  }

  /** Faint geographic outlines (hills, parks, coastlines) behind everything. */
  private drawDecor(state: GameState): void {
    const decor = state.city.decor;
    if (!decor) return;
    const ctx = this.ctx;
    ctx.strokeStyle = COLORS.decor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const path of decor) {
      ctx.beginPath();
      path.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    }
  }

  /** Faint place-name labels — the "maps view" layer that anchors a city. */
  private drawLabels(state: GameState): void {
    const labels = state.city.labels;
    if (!labels) return;
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const l of labels) {
      const size = l.size ?? 18;
      ctx.font = `600 ${size}px "Avenir Next", "Segoe UI", system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(140,132,112,0.55)';
      // letter-spacing via manual tracking
      const text = l.text.toUpperCase().split('').join('  ');
      ctx.fillText(text, l.x, l.y);
    }
  }

  private drawRivers(state: GameState): void {
    const ctx = this.ctx;
    for (const river of state.rivers) {
      for (const [w, color] of [
        [river.width + 8, COLORS.waterEdge],
        [river.width, COLORS.water],
      ] as [number, string][]) {
        ctx.strokeStyle = color;
        ctx.lineWidth = w;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        river.path.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();
      }
    }
  }

  private strokePath(points: Vec2[], color: string, width: number, dashed = false): void {
    const ctx = this.ctx;
    if (points.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash(dashed ? [14, 10] : []);
    ctx.beginPath();
    points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /** Offset ribbon polyline for one station edge (matches nearestLine's geometry). */
  private edgeRibbon(state: GameState, line: Line, i: number): Vec2[] {
    const ids = line.stationIds;
    const a = stationById(state, ids[i]);
    const b = stationById(state, ids[(i + 1) % ids.length]);
    if (!a || !b) return [];
    const off = edgeOffset(state, line, ids[i], ids[(i + 1) % ids.length]);
    return segmentPoints(a.position, b.position).map((p) => ({ x: p.x + off.x, y: p.y + off.y }));
  }

  private drawLine(state: GameState, line: Line, highlightSeg: number | null): void {
    const ctx = this.ctx;
    const ids = line.stationIds;
    const edgeCount = line.isLoop ? ids.length : ids.length - 1;
    const hl = highlightSeg !== null;
    for (let i = 0; i < edgeCount; i++) {
      const pts = this.edgeRibbon(state, line, i);
      if (pts.length < 2) continue;
      if (hl) this.strokePath(pts, 'rgba(51,50,61,0.22)', SIZES.lineWidth + 9); // soft dark casing
      this.strokePath(pts, line.color, SIZES.lineWidth + (hl ? 4 : 0));
      if (highlightSeg === i) {
        // "grab here" knob at the segment midpoint
        const mid = polylineMidpoint(pts);
        ctx.beginPath();
        ctx.arc(mid.x, mid.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = line.color;
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }
    }
  }

  private drawLines(state: GameState): void {
    // Each station-to-station edge is laterally offset where lines share a
    // corridor, so parallels sit side by side. The hovered line is redrawn
    // last (on top) with a halo + segment knob so it's clear what a grab hits.
    for (const line of state.lines) this.drawLine(state, line, null);
    const hl = this.hoverLine;
    if (hl) {
      const line = state.lines.find((l) => l.id === hl.lineId);
      if (line) this.drawLine(state, line, hl.segIndex);
    }
    // End tails: short stubs with a knob past each terminus, fanned apart
    // when several lines end at one station. Grab one to extend that line.
    const ctx = this.ctx;
    for (const tail of endTails(state)) {
      const hovered =
        this.hoverTail &&
        this.hoverTail.lineId === tail.line.id &&
        this.hoverTail.atStart === tail.atStart;
      this.strokePath([tail.base, tail.tip], tail.line.color, SIZES.lineWidth * (hovered ? 0.8 : 0.55));
      ctx.beginPath();
      ctx.arc(tail.tip.x, tail.tip.y, hovered ? 8 : 5.5, 0, Math.PI * 2);
      ctx.fillStyle = tail.line.color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }
  }

  private drawPreview(state: GameState): void {
    const pv = this.preview;
    if (!pv) return;
    if (pv.reroute && pv.cursor) {
      const a = stationById(state, pv.reroute.aId);
      const b = stationById(state, pv.reroute.bId);
      if (a && b) {
        this.strokePath(segmentPoints(a.position, pv.cursor), pv.color, SIZES.lineWidth * 0.75, true);
        this.strokePath(segmentPoints(pv.cursor, b.position), pv.color, SIZES.lineWidth * 0.75, true);
      }
      return;
    }
    if (pv.stationIds.length === 0) return;
    const pts: Vec2[] = [];
    for (let i = 0; i < pv.stationIds.length; i++) {
      const st = stationById(state, pv.stationIds[i]);
      if (!st) continue;
      if (pts.length === 0) {
        pts.push(st.position);
      } else {
        const seg = segmentPoints(pts[pts.length - 1], st.position);
        for (let j = 1; j < seg.length; j++) pts.push(seg[j]);
      }
    }
    this.strokePath(pts, pv.color, SIZES.lineWidth);
    if (pv.cursor && pts.length > 0) {
      const seg = segmentPoints(pts[pts.length - 1], pv.cursor);
      this.strokePath(seg, pv.valid ? pv.color : COLORS.invalid, SIZES.lineWidth * 0.75, true);
    }
  }

  /** Lateral ribbon offset for whichever station edge lies at path distance d. */
  private edgeOffsetAtDistance(state: GameState, line: Line, path: LinePath, d: number): Vec2 {
    const ids = line.stationIds;
    const n = ids.length;
    if (n < 2) return { x: 0, y: 0 };
    let i = 0;
    while (i < path.stationDist.length - 1 && path.stationDist[i + 1] < d) i++;
    if (line.isLoop && d >= path.stationDist[path.stationDist.length - 1]) {
      return edgeOffset(state, line, ids[n - 1], ids[0]); // wrap segment
    }
    if (i >= n - 1) i = n - 2; // dwelling at the final station: use last edge
    return edgeOffset(state, line, ids[i], ids[i + 1]);
  }

  private drawTrains(state: GameState): void {
    const ctx = this.ctx;
    for (const line of state.lines) {
      if (line.trains.length === 0) continue;
      const path = buildLinePath(line, state);
      for (const train of line.trains) {
        // Unit silhouettes per kind: express = long & sleek with a white
        // stripe; big = long & wide; carriages use the base profile.
        const lead =
          train.kind === 'express'
            ? { L: SIZES.trainLength * 1.25, W: SIZES.trainWidth * 0.8, cap: 12 }
            : train.kind === 'big'
              ? { L: SIZES.trainLength * 1.3, W: SIZES.trainWidth * 1.3, cap: 18 }
              : { L: SIZES.trainLength, W: SIZES.trainWidth, cap: 6 };
        const units = train.carriages + 1;
        let pipStart = 0;
        for (let c = 0; c < units; c++) {
          const isLead = c === 0;
          const L = isLead ? lead.L : SIZES.trainLength;
          const W = isLead ? lead.W : SIZES.trainWidth;
          const unitCap = isLead ? lead.cap : 6;
          // Trailing carriages hang behind the (possibly longer) lead unit.
          const back =
            c === 0
              ? 0
              : lead.L / 2 + 2 + SIZES.trainLength / 2 + (c - 1) * (SIZES.trainLength + 4);
          const d = train.distance - train.direction * back;
          const { pos, angle } = pointAtDistance(path, d);
          const off = this.edgeOffsetAtDistance(state, line, path, d);
          ctx.save();
          ctx.translate(pos.x + off.x, pos.y + off.y);
          ctx.rotate(angle);
          ctx.fillStyle = line.color;
          ctx.beginPath();
          ctx.roundRect(-L / 2, -W / 2, L, W, train.kind === 'express' && isLead ? W / 2 : 4);
          ctx.fill();
          if (train.kind === 'express' && isLead) {
            ctx.strokeStyle = 'rgba(255,255,255,0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-L / 2 + 5, 0);
            ctx.lineTo(L / 2 - 5, 0);
            ctx.stroke();
          }
          // Passenger pips: a grid sized to the unit's capacity.
          const cols = unitCap <= 6 ? 3 : 6;
          const rows = Math.ceil(unitCap / cols);
          const pax = train.passengers.slice(pipStart, pipStart + unitCap);
          pipStart += unitCap;
          pax.forEach((p, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const px = -L / 2 + 7 + col * ((L - 14) / Math.max(1, cols - 1));
            const py = rows === 1 ? 0 : -W / 2 + 4 + row * ((W - 8) / (rows - 1));
            this.drawShape(p.destinationShape, px, py, 2.6, 'rgba(255,255,255,0.95)', null);
          });
          ctx.restore();
        }
      }
    }
  }

  private drawStations(state: GameState): void {
    const ctx = this.ctx;
    const grace = OVERCROWD_GRACE[state.mode];
    for (const st of state.stations) {
      const { x, y } = st.position;
      const r = SIZES.stationRadius * (st.isInterchange ? 1.25 : 1) * (st.isMajor ? 1.3 : 1);

      // Major stations sit on a soft gold plaza disc.
      if (st.isMajor) {
        ctx.fillStyle = 'rgba(216,186,110,0.35)';
        ctx.beginPath();
        ctx.arc(x, y, r + 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(178,144,60,0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Overcrowding: pulsing red halo + countdown arc.
      if (st.overcrowdedSince !== null) {
        const elapsed = state.gameTime - st.overcrowdedSince;
        const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 120);
        ctx.fillStyle = `rgba(214,54,60,${0.15 + 0.15 * pulse})`;
        ctx.beginPath();
        ctx.arc(x, y, r + 18, 0, Math.PI * 2);
        ctx.fill();
        if (Number.isFinite(grace)) {
          ctx.strokeStyle = COLORS.overcrowd;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(x, y, r + 12, -Math.PI / 2, -Math.PI / 2 + (elapsed / grace) * Math.PI * 2);
          ctx.stroke();
        }
      }

      if (st.isInterchange) {
        ctx.strokeStyle = COLORS.stationStroke;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, r + SIZES.interchangeRing, 0, Math.PI * 2);
        ctx.stroke();
      }

      this.drawShape(st.shape, x, y, r, COLORS.station, COLORS.stationStroke);

      // Waiting passengers, wrapped in rows beside the station.
      const s = SIZES.passengerSize;
      st.waitingPassengers.forEach((p, i) => {
        const col = i % 6;
        const row = Math.floor(i / 6);
        const px = x + r + 12 + col * (s + 5);
        const py = y - r + row * (s + 5);
        const over = i >= st.capacity;
        this.drawShape(p.destinationShape, px, py, s / 2 + 1, over ? COLORS.overcrowd : COLORS.passenger, null);
      });
    }
  }

  drawShape(shape: ShapeType, x: number, y: number, r: number, fill: string | null, stroke: string | null): void {
    const ctx = this.ctx;
    ctx.beginPath();
    switch (shape) {
      case 'circle':
        ctx.arc(x, y, r, 0, Math.PI * 2);
        break;
      case 'triangle':
        this.polygon(x, y + r * 0.1, r * 1.15, 3, -Math.PI / 2);
        break;
      case 'square': {
        const s = r * 0.88;
        ctx.rect(x - s, y - s, s * 2, s * 2);
        break;
      }
      case 'diamond':
        this.polygon(x, y, r * 1.1, 4, -Math.PI / 2);
        break;
      case 'pentagon':
        this.polygon(x, y, r * 1.05, 5, -Math.PI / 2);
        break;
      case 'star': {
        const spikes = 5;
        for (let i = 0; i < spikes * 2; i++) {
          const rad = i % 2 === 0 ? r * 1.15 : r * 0.5;
          const a = -Math.PI / 2 + (i * Math.PI) / spikes;
          const px = x + Math.cos(a) * rad;
          const py = y + Math.sin(a) * rad;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        break;
      }
      case 'cross': {
        const a = r * 0.4;
        const b = r * 1.05;
        ctx.moveTo(x - a, y - b);
        ctx.lineTo(x + a, y - b);
        ctx.lineTo(x + a, y - a);
        ctx.lineTo(x + b, y - a);
        ctx.lineTo(x + b, y + a);
        ctx.lineTo(x + a, y + a);
        ctx.lineTo(x + a, y + b);
        ctx.lineTo(x - a, y + b);
        ctx.lineTo(x - a, y + a);
        ctx.lineTo(x - b, y + a);
        ctx.lineTo(x - b, y - a);
        ctx.lineTo(x - a, y - a);
        ctx.closePath();
        break;
      }
    }
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = SIZES.stationStroke;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  }

  private polygon(x: number, y: number, r: number, sides: number, startAngle: number): void {
    const ctx = this.ctx;
    for (let i = 0; i < sides; i++) {
      const a = startAngle + (i * 2 * Math.PI) / sides;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  /** Nearest station within snap radius of a world point, or null. */
  hitStation(state: GameState, world: Vec2): Station | null {
    let best: Station | null = null;
    let bestD = SIZES.snapRadius / Math.min(1, this.scale) + 8;
    for (const st of state.stations) {
      const d = Math.hypot(st.position.x - world.x, st.position.y - world.y);
      if (d < bestD) {
        bestD = d;
        best = st;
      }
    }
    return best;
  }
}
