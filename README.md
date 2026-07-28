# Crosstown

A minimalist transit-line strategy game (inspired by Mini Metro's mechanics, with original branding and art). Draw lines between stations, run trains, and keep the growing city moving — if any station stays overcrowded too long, the network fails.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

Append `?seed=12345` to the URL for a reproducible run (station spawns, shapes, and passenger destinations are seeded).

## How to play

- **Draw lines** — drag from one station through others. Drag back onto the previous station to undo a segment. Drag from a line's end station to extend it; drag an end back onto the other end (3+ stations) to close a loop.
- **Pick a specific line** — every line end has a short colored stub ("tail") with a knob at its tip. When several lines end at the same station, the tails fan out so each stays separately visible; hover highlights the one you'd grab. Grab a tail (or click toward it) to extend that specific line.
- **Reroute a line** — grab a middle segment and drag it onto a station to insert that stop into the line (bridge costs are recalculated, including refunds).
- **Delete a line** — click the ✕ next to its colour swatch in the bottom tray (refunds the line token and any bridges).
- **Trains & carriages** — a newly drawn line automatically gets a train from the tray if one is spare; place additional ones by clicking the token in the tray, then clicking a line on the map.
- **Bridges** — spent automatically when a new segment crosses a river; segments are rejected (red flash) when you're out.
- **Weekly rewards** — every 90 s you receive a free train, plus a choice of one bonus grant (Normal) or a random one (Extreme). A new-line grant includes a train, so the line is immediately usable.
- **Interchanges** — stations served by 2+ lines get a ring; passengers hop off there to switch lines toward their destination shape.
- **Game over** — a station whose queue exceeds capacity shows a red countdown arc; if it isn't serviced before the arc completes, the run ends. Score = passengers delivered. High scores persist per city + mode in localStorage.

### Modes
- **Normal** — pause allowed, weekly reward choice, 45 s overcrowd grace.
- **Extreme** — no pausing, ~1.5× difficulty ramp, random rewards, 22 s grace.
- **Creative** — unlimited resources, no game over.

### Upgrades

Beyond lines, trains, carriages, and bridges, three premium upgrades enter the weekly reward pool from week 3:

- **High-Speed Rail (🚄)** — much faster (150 vs 90 units/s) with double capacity (12). Place like a normal train.
- **Big Train (🚂)** — triple capacity (18) at regular speed.
- **Major Station (🏛️)** — click the token, then a station: it permanently holds twice the crowd before the overcrowd countdown starts (12, or 20 as an interchange). Cannot be moved.

### Cities
The first three are always available; world cities unlock by surviving full weeks (in any city, any non-creative mode). Progress is tracked live and persists in localStorage. Each world city has a differentiator (resources, growth pattern, or geography rules).

**Growth patterns.** Beyond geography, each world city defines a `growth` model (`state/mapDefinitions.ts`): new stations cluster around weighted hubs instead of spreading uniformly, and a hub can be time-gated with `opensWeek` so a periphery only starts developing later. This gives each city a signature expansion shape — polycentric wards (Tokyo), a booming core with outer boroughs that open later (New York), staged twin-cores across water (Shanghai's Puxi→Pudong, Istanbul's Europe→Asia, Seoul's Gangbuk→Gangnam), radial rings (Paris, Moscow), and a river corridor (Cairo). A dormant zone renders as a faint ghost disc that brightens in place the week it opens; the three starter maps are left uniform. See "Rendering notes" for the visual treatment.

- **Gridholm** — no water, gentle intro.
- **Ferrydale** — one wide river; river maps start with 3 bridge tokens.
- **Twin Forks** — two rivers, three banks.
- **Hong Kong** 🔒 3 wks — Victoria Harbour splits Kowloon from the Island.
- **Tokyo** 🔒 4 wks — two rivers feed the great bay; Mt Fuji on the horizon.
- **London** 🔒 5 wks — the Thames S-curve, royal parks, the Eye.
- **New York** 🔒 6 wks — Hudson + East River around Manhattan's grid. *+2 bridges, but stations spawn 15% faster.*
- **Paris** 🔒 6 wks — radial rings around the Seine. *Growth confined inside the périphérique; +1 starting line.*
- **Shanghai** 🔒 7 wks — the Huangpu splits Puxi from Pudong. *Fastest growth in the game; +1 train and +1 bridge up front.*
- **Singapore** 🔒 7 wks — an island city-state. *Compact spawn area, fewer new stations, faster passengers.*
- **Sydney** 🔒 8 wks — harbour fingers and coves everywhere. *+2 bridges, and bridges appear more often in rewards.*
- **Istanbul** 🔒 8 wks — the Bosphorus divides two continents. *Every water crossing costs 2 tunnels; starts with 6.*
- **Seoul** 🔒 9 wks — the wide Han below Bukhansan's ridges. *Starts with a Big Train.*
- **Berlin** 🔒 9 wks — the Spree, the S-Bahn ring, Wannsee. *Gentlest ramp of the world cities (10% slower).*
- **Moscow** 🔒 10 wks — concentric rings around the Kremlin. *+1 starting line; loops shine here.*
- **Cairo** 🔒 10 wks — the Nile through the desert. *Growth hugs the river corridor; starts with High-Speed Rail.*

City maps are stylised, hand-drawn geography — simplified water bodies plus faint `decor` outlines and place-name `labels` rendered like a muted maps view — not real map data.

## Architecture

```
src/
  engine/      # pure simulation — no canvas/DOM (unit-testable headless)
    gameLoop.ts        # rAF driver with fixed 60 Hz timestep
    rng.ts             # seeded mulberry32 RNG
    stationSpawner.ts  # timed spawns, shape unlocks, valid placement
    passengerSystem.ts # spawn timers, destinations, overcrowd/game-over
    trainSystem.ts     # movement, dwell, board/alight/transfer rules
    lineManager.ts     # line topology, octilinear paths, bridge accounting
    resourceEconomy.ts # weekly grants
    difficultyCurve.ts # all time-based ramps in one place
    collision.ts       # segment intersection, river crossings, placement
  render/
    canvasRenderer.ts  # draws rivers, lines, trains, stations, previews
    theme.ts           # palette + sizing constants
  state/
    gameState.ts       # data model + state constructor
    mapDefinitions.ts  # city layouts (stations, rivers, seeds)
    highScores.ts      # localStorage persistence
  input/
    pointerHandler.ts  # unified mouse/touch drag logic (Pointer Events)
  ui/
    hud.ts             # top bar, resource tray, reward + game-over overlays
    mainMenu.ts        # city/mode select with high scores
    sound.ts           # tiny WebAudio synth (no assets)
  main.ts              # wiring
```

Design notes:
- **Simulation and rendering are fully separated**; the renderer reads state, never mutates it.
- **Fixed-timestep update** (60 Hz with an accumulator) keeps difficulty identical across refresh rates.
- **Passenger routing uses hop distances over the line graph** (`engine/routing.ts`): lines are nodes, adjacent when they share a station; `hopDistance(line, shape)` is 0 when the line serves that shape, else 1 + the minimum over adjacent lines (multi-source BFS per shape, cached, rebuilt only on topology changes). A passenger boards only a line on a best route from their station, transfers where a strictly closer line stops, and is dropped at the next stop if their line loses all routes (e.g. after a deletion). There is still no per-passenger pathfinding — passengers stay "dumb"; the table is per line-and-shape.

The main menu has a "How to play" panel with the same controls, and opening the menu mid-game pauses the session — Resume picks it back up; New Game discards it.

## Known limitations (v1)

- Rerouting inserts stops; removing a single middle stop still means undoing from an end or deleting the line.

## Rendering notes

- Lines sharing a station-to-station corridor are drawn side by side: each edge gets a lateral slot (ordered by line colour, centred, `PARALLEL_SPACING` apart), and trains ride their own ribbon. The offset is render-only for movement/dwell — the simulation always uses the logical path.
- **Picking a line to reroute** hit-tests against the *drawn* ribbon (each edge shifted by its corridor offset), so grabbing a specific coloured ribbon selects that line even where several run together. Hovering a line previews the grab: the line lifts with a soft casing + thicker stroke and a "grab here" knob appears at the segment midpoint (cursor → grab). Tails still take priority for line-extension.
