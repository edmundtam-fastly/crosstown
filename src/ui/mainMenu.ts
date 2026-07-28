import { CITIES } from '../state/mapDefinitions';
import { getBestWeeks, getBestWeeksOverall, getHighScore } from '../state/highScores';
import type { CityDef, GameMode } from '../state/gameState';

function unlockProgress(city: CityDef): number {
  if (!city.unlock) return Infinity;
  return city.unlock.cityId ? getBestWeeks(city.unlock.cityId) : getBestWeeksOverall();
}

function isUnlocked(city: CityDef): boolean {
  return !city.unlock || unlockProgress(city) >= city.unlock.weeks;
}

const MODES: { id: GameMode; name: string; desc: string }[] = [
  { id: 'normal', name: 'Normal', desc: 'Pause to plan. Weekly reward choice.' },
  { id: 'extreme', name: 'Extreme', desc: 'No pausing. Faster ramp. Random rewards.' },
  { id: 'creative', name: 'Creative', desc: 'Unlimited resources. No game over.' },
];

const CONTROLS: [string, string][] = [
  ['Draw a line', 'Drag from a station through the stations you want to connect'],
  ['Extend a line', 'Drag outward from a line’s end — grab the knobbed stub (they fan out when several lines end at one station) to pick a specific line'],
  ['Undo while dragging', 'Drag back onto the previous station to remove the last segment'],
  ['Reroute a line', 'Grab a middle segment and drag it onto a station to insert that stop'],
  ['Close a loop', 'Drag a line’s end onto its other end (3+ stations)'],
  ['Delete a line', 'Click the ✕ next to its color swatch in the bottom tray'],
  ['Place trains & carriages', 'New lines get a train automatically (if any are spare); to place more, click the token in the tray, then click a line on the map'],
  ['Special trains', 'High-Speed Rail (🚄) is much faster with double capacity; Big Trains (🚂) carry triple at regular speed — place them like normal trains'],
  ['Major stations', 'Click the 🏛️ token, then a station: it permanently holds twice the crowd before overcrowding'],
  ['Bridges', 'Spent automatically when a new segment crosses a river'],
];

export function showMainMenu(
  container: HTMLElement,
  onPlay: (city: CityDef, mode: GameMode) => void,
  onResume?: () => void,
): () => void {
  let mode: GameMode = 'normal';
  let cityId = CITIES[0].id;

  const el = document.createElement('div');
  el.innerHTML = `
    <style>
      .ct-menu { position:absolute; inset:0; display:flex; align-items:flex-start; justify-content:center;
        background:linear-gradient(160deg,#f4f1ea 0%, #e8e2d4 100%); z-index:20; overflow:auto; }
      .ct-menu-card { text-align:center; padding:30px 20px 50px; max-width:720px; width:94%; color:#33323d; }
      .ct-title { font-size:52px; font-weight:800; letter-spacing:6px; margin-bottom:2px; }
      .ct-tag { color:#888; margin-bottom:26px; }
      .ct-row { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin-bottom:22px; }
      .ct-citygrid { display:grid; grid-template-columns:repeat(auto-fill, minmax(215px, 1fr)); gap:10px;
        max-height:252px; overflow-y:auto; margin-bottom:22px; padding:4px 8px 4px 4px;
        border:1px solid #ddd6c6; border-radius:12px; background:rgba(255,255,255,0.45);
        scrollbar-width:thin; text-align:left; }
      .ct-citygrid .ct-opt { min-width:0; padding:10px 12px; }
      .ct-opt { border:2px solid #d8d2c4; border-radius:12px; padding:12px 16px; background:#fff;
        cursor:pointer; min-width:170px; text-align:left; font-size:14px; }
      .ct-opt.sel { border-color:#2e6fb7; box-shadow:0 0 0 3px rgba(46,111,183,0.15); }
      .ct-opt b { display:block; font-size:16px; margin-bottom:3px; }
      .ct-opt .d { color:#888; font-size:12px; }
      .ct-opt .hs { color:#3ba55d; font-size:12px; font-weight:600; margin-top:5px; display:block; }
      .ct-opt.locked { opacity:0.55; cursor:default; background:#f2efe7; }
      .ct-opt .lk { color:#b06a2c; font-size:12px; font-weight:600; margin-top:5px; display:block; }
      .ct-play { background:#d6363c; color:#fff; border:none; border-radius:12px; padding:14px 46px;
        font-size:19px; font-weight:700; cursor:pointer; letter-spacing:1px; }
      .ct-play:hover { background:#b92c31; }
      .ct-resume { background:#3ba55d; color:#fff; border:none; border-radius:12px; padding:14px 46px;
        font-size:19px; font-weight:700; cursor:pointer; letter-spacing:1px; margin-right:12px; }
      .ct-resume:hover { background:#2f8a4c; }
      .ct-sect { font-size:13px; text-transform:uppercase; letter-spacing:2px; color:#999; margin-bottom:10px; }
      .ct-help-toggle { background:none; border:none; color:#2e6fb7; cursor:pointer; font-size:14px;
        margin-top:26px; text-decoration:underline; }
      .ct-help { display:none; text-align:left; background:#fff; border:2px solid #d8d2c4; border-radius:12px;
        padding:16px 20px; margin-top:12px; font-size:14px; }
      .ct-help.open { display:block; }
      .ct-help dt { font-weight:700; margin-top:10px; }
      .ct-help dt:first-child { margin-top:0; }
      .ct-help dd { color:#777; margin-left:0; font-size:13px; }
    </style>
    <div class="ct-menu">
      <div class="ct-menu-card">
        <div class="ct-title">CROSSTOWN</div>
        <div class="ct-tag">Draw the lines. Move the city.</div>
        <div class="ct-sect">City</div>
        <div class="ct-citygrid" data-group="city"></div>
        <div class="ct-sect">Mode</div>
        <div class="ct-row" data-group="mode"></div>
        <div>
          ${onResume ? '<button class="ct-resume">RESUME</button>' : ''}
          <button class="ct-play">${onResume ? 'NEW GAME' : 'PLAY'}</button>
        </div>
        <button class="ct-help-toggle">How to play</button>
        <dl class="ct-help"></dl>
      </div>
    </div>`;

  const cityRow = el.querySelector('[data-group="city"]')!;
  const modeRow = el.querySelector('[data-group="mode"]')!;

  const renderOptions = () => {
    cityRow.innerHTML = '';
    for (const city of CITIES) {
      const unlocked = isUnlocked(city);
      const best = getHighScore(city.id, mode);
      const weeks = getBestWeeks(city.id);
      const btn = document.createElement('button');
      btn.className = 'ct-opt' + (city.id === cityId ? ' sel' : '') + (unlocked ? '' : ' locked');
      if (unlocked) {
        btn.innerHTML = `<b>${city.name}</b><span class="d">${city.description}</span>
          ${best > 0 || weeks > 0 ? `<span class="hs">Best (${mode}): ★ ${best} · ${weeks} wk${weeks === 1 ? '' : 's'} survived</span>` : ''}`;
        btn.addEventListener('click', () => {
          cityId = city.id;
          renderOptions();
        });
      } else {
        const req = city.unlock!;
        const where = req.cityId
          ? `in ${CITIES.find((c) => c.id === req.cityId)?.name ?? req.cityId}`
          : 'in any city';
        btn.innerHTML = `<b>🔒 ${city.name}</b><span class="d">${city.description}</span>
          <span class="lk">Survive ${req.weeks} weeks ${where} (best so far: ${unlockProgress(city)})</span>`;
      }
      cityRow.appendChild(btn);
    }
    modeRow.innerHTML = '';
    for (const m of MODES) {
      const btn = document.createElement('button');
      btn.className = 'ct-opt' + (m.id === mode ? ' sel' : '');
      btn.innerHTML = `<b>${m.name}</b><span class="d">${m.desc}</span>`;
      btn.addEventListener('click', () => {
        mode = m.id;
        renderOptions();
      });
      modeRow.appendChild(btn);
    }
  };
  renderOptions();

  const help = el.querySelector('.ct-help') as HTMLElement;
  help.innerHTML = CONTROLS.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  el.querySelector('.ct-help-toggle')!.addEventListener('click', () => help.classList.toggle('open'));

  el.querySelector('.ct-play')!.addEventListener('click', () => {
    const city = CITIES.find((c) => c.id === cityId)!;
    onPlay(city, mode);
  });
  el.querySelector('.ct-resume')?.addEventListener('click', () => onResume?.());

  container.appendChild(el);
  return () => el.remove();
}
