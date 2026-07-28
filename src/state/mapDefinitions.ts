import type { CityDef } from './gameState';

// All cities are designed in a 1600x1000 world space; the renderer scales to fit.
//
// Later cities unlock by surviving full weeks (in any city, non-creative).
// Famous-city maps are hand-drawn, stylised geography: water bodies in the
// river layer, faint `decor` outlines (hills, parks, landmarks) and `labels`
// (districts, waterways) that read like a muted maps view.
//
// Each world city also has a gameplay differentiator via `resourceBonus`,
// `tuning` (spawn-rate multipliers, per-crossing bridge cost) and `growth`
// (weighted hubs that make the city expand in a signature pattern — twin
// cores, radial rings, a river corridor, etc). The description tells the
// player. The three starter maps are deliberately left uniform.

export const CITIES: CityDef[] = [
  {
    id: 'gridholm',
    name: 'Gridholm',
    description: 'Open plains, no water. A gentle place to learn the ropes.',
    size: { x: 1600, y: 1000 },
    rivers: [],
    seed: 1013,
    starterStations: [
      { position: { x: 560, y: 380 }, shape: 'circle' },
      { position: { x: 900, y: 300 }, shape: 'triangle' },
      { position: { x: 1080, y: 560 }, shape: 'circle' },
      { position: { x: 700, y: 640 }, shape: 'square' },
      { position: { x: 460, y: 560 }, shape: 'circle' },
    ],
  },
  {
    id: 'ferrydale',
    name: 'Ferrydale',
    description: 'A wide river splits the city. Bridges are precious.',
    size: { x: 1600, y: 1000 },
    seed: 2027,
    rivers: [
      {
        id: 'river-main',
        width: 46,
        path: [
          { x: -20, y: 620 },
          { x: 320, y: 560 },
          { x: 640, y: 590 },
          { x: 920, y: 480 },
          { x: 1240, y: 420 },
          { x: 1620, y: 460 },
        ],
      },
    ],
    starterStations: [
      { position: { x: 480, y: 380 }, shape: 'circle' },
      { position: { x: 860, y: 300 }, shape: 'triangle' },
      { position: { x: 1150, y: 250 }, shape: 'circle' },
      { position: { x: 620, y: 780 }, shape: 'square' },
      { position: { x: 1050, y: 700 }, shape: 'circle' },
    ],
  },
  {
    id: 'twinforks',
    name: 'Twin Forks',
    description: 'Two rivers carve the map into three banks. Plan crossings carefully.',
    size: { x: 1600, y: 1000 },
    seed: 3041,
    rivers: [
      {
        id: 'river-west',
        width: 40,
        path: [
          { x: 520, y: -20 },
          { x: 560, y: 260 },
          { x: 480, y: 540 },
          { x: 560, y: 820 },
          { x: 520, y: 1020 },
        ],
      },
      {
        id: 'river-east',
        width: 40,
        path: [
          { x: 1120, y: -20 },
          { x: 1060, y: 300 },
          { x: 1160, y: 600 },
          { x: 1080, y: 1020 },
        ],
      },
    ],
    starterStations: [
      { position: { x: 300, y: 420 }, shape: 'circle' },
      { position: { x: 800, y: 320 }, shape: 'triangle' },
      { position: { x: 820, y: 640 }, shape: 'circle' },
      { position: { x: 1350, y: 400 }, shape: 'square' },
      { position: { x: 1330, y: 680 }, shape: 'circle' },
    ],
  },
  {
    id: 'hongkong',
    name: 'Hong Kong',
    description: 'Kowloon and the Island grow first across the harbour; the eastern districts fill in later.',
    // Twin harbour cores from the start; an eastern district opens later.
    growth: {
      hubs: [
        { x: 780, y: 280, r: 190, weight: 4, label: 'Kowloon' },
        { x: 820, y: 730, r: 180, weight: 4, label: 'Central' },
        { x: 1250, y: 280, r: 170, weight: 3, opensWeek: 4, label: 'Kowloon East' },
      ],
    },
    size: { x: 1600, y: 1000 },
    seed: 4057,
    unlock: { weeks: 3 },
    rivers: [
      {
        id: 'victoria-harbour',
        width: 90,
        path: [
          { x: -20, y: 560 },
          { x: 300, y: 520 },
          { x: 700, y: 480 },
          { x: 1100, y: 470 },
          { x: 1620, y: 420 },
        ],
      },
    ],
    decor: [
      // Kowloon hills (Lion Rock ridge)
      [
        { x: 250, y: 160 },
        { x: 420, y: 90 },
        { x: 560, y: 150 },
        { x: 720, y: 70 },
        { x: 900, y: 140 },
        { x: 1080, y: 90 },
        { x: 1250, y: 150 },
      ],
      // Island mountain ridge (the Peak)
      [
        { x: 250, y: 800 },
        { x: 420, y: 710 },
        { x: 560, y: 770 },
        { x: 720, y: 690 },
        { x: 900, y: 760 },
        { x: 1100, y: 710 },
        { x: 1300, y: 780 },
      ],
      // Outlying island, south-west
      [
        { x: 120, y: 880 },
        { x: 200, y: 840 },
        { x: 280, y: 880 },
        { x: 230, y: 940 },
        { x: 140, y: 930 },
        { x: 120, y: 880 },
      ],
      // Kowloon peninsula tip outline
      [
        { x: 620, y: 420 },
        { x: 700, y: 380 },
        { x: 790, y: 420 },
      ],
    ],
    labels: [
      { text: 'Kowloon', x: 800, y: 220, size: 24 },
      { text: 'Hong Kong Island', x: 780, y: 850, size: 22 },
      { text: 'Victoria Harbour', x: 1260, y: 435, size: 15 },
      { text: 'The Peak', x: 420, y: 745, size: 13 },
    ],
    starterStations: [
      { position: { x: 550, y: 300 }, shape: 'circle' },
      { position: { x: 900, y: 250 }, shape: 'triangle' },
      { position: { x: 1200, y: 320 }, shape: 'circle' },
      { position: { x: 650, y: 680 }, shape: 'square' },
      { position: { x: 1000, y: 650 }, shape: 'circle' },
    ],
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    description: 'Polycentric — growth spreads across many distinct wards, with no single downtown.',
    size: { x: 1600, y: 1000 },
    seed: 5077,
    unlock: { weeks: 4 },
    // Several roughly-equal neighbourhood hubs, all active from the start:
    // the city grows in scattered clusters rather than one CBD.
    growth: {
      hubs: [
        { x: 450, y: 400, r: 150, weight: 3, label: 'Shinjuku' },
        { x: 560, y: 630, r: 140, weight: 2, label: 'Shibuya' },
        { x: 780, y: 400, r: 140, weight: 3, label: 'Marunouchi' },
        { x: 850, y: 210, r: 130, weight: 2, label: 'Ueno' },
        { x: 1230, y: 400, r: 110, weight: 2, label: 'Koto' },
      ],
    },
    rivers: [
      {
        id: 'tokyo-bay',
        width: 130,
        path: [
          { x: 950, y: 1030 },
          { x: 1120, y: 870 },
          { x: 1360, y: 800 },
          { x: 1630, y: 820 },
        ],
      },
      {
        id: 'sumida',
        width: 34,
        path: [
          { x: 1060, y: -20 },
          { x: 1020, y: 250 },
          { x: 1080, y: 520 },
          { x: 1130, y: 780 },
        ],
      },
      {
        id: 'arakawa',
        width: 40,
        path: [
          { x: 1360, y: -20 },
          { x: 1300, y: 240 },
          { x: 1380, y: 500 },
          { x: 1420, y: 740 },
        ],
      },
    ],
    decor: [
      // Yamanote-style loop hint, centre-west
      [
        { x: 560, y: 220 },
        { x: 680, y: 260 },
        { x: 740, y: 380 },
        { x: 720, y: 520 },
        { x: 620, y: 620 },
        { x: 480, y: 640 },
        { x: 370, y: 560 },
        { x: 330, y: 420 },
        { x: 380, y: 290 },
        { x: 470, y: 220 },
        { x: 560, y: 220 },
      ],
      // Imperial-palace green block inside the loop
      [
        { x: 500, y: 390 },
        { x: 570, y: 380 },
        { x: 590, y: 440 },
        { x: 520, y: 460 },
        { x: 500, y: 390 },
      ],
      // Mt. Fuji on the far western horizon
      [
        { x: 90, y: 840 },
        { x: 200, y: 680 },
        { x: 310, y: 840 },
      ],
      [
        { x: 165, y: 730 },
        { x: 235, y: 730 },
      ],
      // Coastal reclamation edges along the bay
      [
        { x: 900, y: 920 },
        { x: 1020, y: 800 },
        { x: 1180, y: 730 },
      ],
      [
        { x: 1250, y: 950 },
        { x: 1400, y: 900 },
        { x: 1550, y: 910 },
      ],
    ],
    labels: [
      { text: 'Tokyo Bay', x: 1330, y: 870, size: 20 },
      { text: 'Sumida', x: 960, y: 170, size: 13 },
      { text: 'Yamanote', x: 530, y: 430, size: 15 },
      { text: 'Mt Fuji', x: 200, y: 880, size: 13 },
    ],
    starterStations: [
      { position: { x: 420, y: 320 }, shape: 'circle' },
      { position: { x: 700, y: 250 }, shape: 'triangle' },
      { position: { x: 520, y: 550 }, shape: 'square' },
      { position: { x: 850, y: 500 }, shape: 'circle' },
      { position: { x: 1230, y: 300 }, shape: 'circle' },
    ],
  },
  {
    id: 'london',
    name: 'London',
    description: 'A dense central core, then Docklands east and the south bank fill in over time.',
    // Zone-1 core first, then outward: Docklands (wk4), south bank (wk6).
    growth: {
      hubs: [
        { x: 750, y: 340, r: 250, weight: 5, label: 'Central' },
        { x: 1200, y: 330, r: 180, weight: 3, opensWeek: 4, label: 'Docklands' },
        { x: 620, y: 800, r: 190, weight: 3, opensWeek: 6, label: 'South Bank' },
      ],
    },
    size: { x: 1600, y: 1000 },
    seed: 6113,
    unlock: { weeks: 5 },
    rivers: [
      {
        id: 'thames',
        width: 44,
        path: [
          { x: -20, y: 520 },
          { x: 250, y: 560 },
          { x: 450, y: 470 },
          { x: 650, y: 540 },
          { x: 850, y: 630 },
          { x: 1050, y: 560 },
          { x: 1250, y: 470 },
          { x: 1620, y: 520 },
        ],
      },
    ],
    decor: [
      // Hyde Park
      [
        { x: 290, y: 330 },
        { x: 440, y: 320 },
        { x: 455, y: 400 },
        { x: 305, y: 415 },
        { x: 290, y: 330 },
      ],
      // Regent's Park loop
      [
        { x: 540, y: 200 },
        { x: 620, y: 190 },
        { x: 660, y: 250 },
        { x: 610, y: 310 },
        { x: 530, y: 300 },
        { x: 505, y: 245 },
        { x: 540, y: 200 },
      ],
      // Greenwich park & hill, south-east
      [
        { x: 1150, y: 720 },
        { x: 1290, y: 700 },
        { x: 1320, y: 800 },
        { x: 1180, y: 820 },
        { x: 1150, y: 720 },
      ],
      // City boundary hint, north-east
      [
        { x: 850, y: 200 },
        { x: 1000, y: 170 },
        { x: 1150, y: 220 },
      ],
      // The Eye — a wheel on the south bank
      [
        { x: 700, y: 690 },
        { x: 722, y: 668 },
        { x: 744, y: 690 },
        { x: 722, y: 712 },
        { x: 700, y: 690 },
      ],
      // Tower Bridge ticks
      [
        { x: 892, y: 600 },
        { x: 892, y: 660 },
      ],
      [
        { x: 918, y: 598 },
        { x: 918, y: 658 },
      ],
    ],
    labels: [
      { text: 'The Thames', x: 330, y: 545, size: 15 },
      { text: 'Hyde Park', x: 372, y: 368, size: 12 },
      { text: 'The City', x: 1000, y: 240, size: 18 },
      { text: 'Greenwich', x: 1235, y: 762, size: 13 },
    ],
    starterStations: [
      { position: { x: 360, y: 250 }, shape: 'circle' },
      { position: { x: 750, y: 300 }, shape: 'triangle' },
      { position: { x: 1080, y: 280 }, shape: 'circle' },
      { position: { x: 520, y: 720 }, shape: 'square' },
      { position: { x: 950, y: 780 }, shape: 'circle' },
    ],
  },
  {
    id: 'newyork',
    name: 'New York',
    description: 'Manhattan booms first; the outer boroughs only start filling in later. Extra bridges.',
    size: { x: 1600, y: 1000 },
    seed: 7121,
    unlock: { weeks: 6 },
    resourceBonus: { bridges: 2 },
    tuning: { station: 0.85 },
    // Core/periphery: Manhattan grows hard from turn one; Brooklyn opens in
    // week 4 and New Jersey in week 6, so early crowds concentrate downtown.
    growth: {
      hubs: [
        { x: 690, y: 420, r: 250, weight: 6, label: 'Manhattan' },
        { x: 1180, y: 600, r: 240, weight: 4, opensWeek: 4, label: 'Brooklyn' },
        { x: 250, y: 430, r: 190, weight: 3, opensWeek: 6, label: 'New Jersey' },
      ],
    },
    rivers: [
      {
        id: 'hudson',
        width: 52,
        path: [
          { x: 500, y: -20 },
          { x: 520, y: 300 },
          { x: 500, y: 650 },
          { x: 520, y: 1020 },
        ],
      },
      {
        id: 'east-river',
        width: 40,
        path: [
          { x: 880, y: -20 },
          { x: 860, y: 300 },
          { x: 900, y: 620 },
          { x: 880, y: 1020 },
        ],
      },
    ],
    decor: [
      // Central Park
      [
        { x: 640, y: 180 },
        { x: 760, y: 180 },
        { x: 760, y: 330 },
        { x: 640, y: 330 },
        { x: 640, y: 180 },
      ],
      // Broadway slicing the grid diagonally
      [
        { x: 620, y: 120 },
        { x: 700, y: 420 },
        { x: 760, y: 760 },
      ],
      // Grid hints
      [
        { x: 600, y: 500 },
        { x: 820, y: 500 },
      ],
      [
        { x: 600, y: 640 },
        { x: 820, y: 640 },
      ],
      // Statue on her island, south-west
      [
        { x: 380, y: 860 },
        { x: 400, y: 820 },
        { x: 420, y: 860 },
        { x: 380, y: 860 },
      ],
    ],
    labels: [
      { text: 'Manhattan', x: 700, y: 80, size: 18 },
      { text: 'Brooklyn', x: 1180, y: 720, size: 22 },
      { text: 'New Jersey', x: 250, y: 300, size: 20 },
      { text: 'Hudson', x: 448, y: 800, size: 13 },
    ],
    starterStations: [
      { position: { x: 300, y: 400 }, shape: 'circle' },
      { position: { x: 700, y: 420 }, shape: 'triangle' },
      { position: { x: 660, y: 620 }, shape: 'circle' },
      { position: { x: 1150, y: 520 }, shape: 'square' },
      { position: { x: 1250, y: 720 }, shape: 'circle' },
    ],
  },
  {
    id: 'paris',
    name: 'Paris',
    description: 'Radial and dense — growth rings outward from the centre. One extra line to tame it.',
    // Concentric: a dense centre, then arrondissement rings open outward.
    growth: {
      hubs: [
        { x: 780, y: 470, r: 180, weight: 5, label: 'Centre' },
        { x: 780, y: 250, r: 130, weight: 2, opensWeek: 3, label: 'North' },
        { x: 1050, y: 480, r: 130, weight: 2, opensWeek: 3, label: 'East' },
        { x: 520, y: 470, r: 130, weight: 2, opensWeek: 4, label: 'West' },
        { x: 780, y: 720, r: 130, weight: 2, opensWeek: 4, label: 'South' },
      ],
    },
    size: { x: 1600, y: 1000 },
    seed: 8231,
    unlock: { weeks: 6 },
    resourceBonus: { lines: 1 },
    rivers: [
      {
        id: 'seine',
        width: 40,
        path: [
          { x: -20, y: 560 },
          { x: 300, y: 600 },
          { x: 600, y: 540 },
          { x: 900, y: 560 },
          { x: 1250, y: 480 },
          { x: 1620, y: 520 },
        ],
      },
    ],
    decor: [
      // Boulevard périphérique ring
      [
        { x: 780, y: 130 },
        { x: 1030, y: 200 },
        { x: 1140, y: 400 },
        { x: 1100, y: 640 },
        { x: 900, y: 800 },
        { x: 640, y: 810 },
        { x: 450, y: 680 },
        { x: 400, y: 450 },
        { x: 500, y: 240 },
        { x: 780, y: 130 },
      ],
      // Inner boulevards ring
      [
        { x: 780, y: 320 },
        { x: 920, y: 380 },
        { x: 950, y: 500 },
        { x: 850, y: 620 },
        { x: 700, y: 630 },
        { x: 610, y: 520 },
        { x: 640, y: 390 },
        { x: 780, y: 320 },
      ],
      // The Tower
      [
        { x: 545, y: 645 },
        { x: 570, y: 575 },
        { x: 595, y: 645 },
      ],
      [
        { x: 557, y: 615 },
        { x: 583, y: 615 },
      ],
    ],
    labels: [
      { text: 'Seine', x: 320, y: 640, size: 14 },
      { text: 'Montmartre', x: 820, y: 200, size: 13 },
      { text: 'Rive Gauche', x: 820, y: 730, size: 15 },
    ],
    starterStations: [
      { position: { x: 600, y: 350 }, shape: 'circle' },
      { position: { x: 950, y: 320 }, shape: 'triangle' },
      { position: { x: 1080, y: 620 }, shape: 'circle' },
      { position: { x: 540, y: 720 }, shape: 'square' },
      { position: { x: 780, y: 240 }, shape: 'circle' },
    ],
  },
  {
    id: 'shanghai',
    name: 'Shanghai',
    description: 'Puxi is built up from day one; then Pudong opens across the river and booms. Extra kit up front.',
    // Signature two-core arc: established Puxi, then Pudong opens late and grows hard.
    growth: {
      hubs: [
        { x: 520, y: 450, r: 230, weight: 5, label: 'Puxi' },
        { x: 1300, y: 500, r: 230, weight: 6, opensWeek: 5, label: 'Pudong' },
      ],
    },
    size: { x: 1600, y: 1000 },
    seed: 9341,
    unlock: { weeks: 7 },
    resourceBonus: { trains: 1, bridges: 1 },
    tuning: { station: 0.75, passenger: 0.9 },
    rivers: [
      {
        id: 'huangpu',
        width: 55,
        path: [
          { x: 1050, y: -20 },
          { x: 1150, y: 250 },
          { x: 1000, y: 500 },
          { x: 1100, y: 750 },
          { x: 1050, y: 1020 },
        ],
      },
    ],
    decor: [
      // The Bund curve, west bank
      [
        { x: 930, y: 400 },
        { x: 950, y: 480 },
        { x: 990, y: 550 },
      ],
      // Pearl Tower across the river
      [
        { x: 1170, y: 430 },
        { x: 1185, y: 395 },
        { x: 1200, y: 430 },
        { x: 1185, y: 465 },
        { x: 1170, y: 430 },
      ],
      [
        { x: 1185, y: 465 },
        { x: 1185, y: 510 },
      ],
      // Old town grid hints
      [
        { x: 500, y: 350 },
        { x: 800, y: 350 },
      ],
      [
        { x: 500, y: 550 },
        { x: 800, y: 550 },
      ],
    ],
    labels: [
      { text: 'Puxi', x: 550, y: 450, size: 22 },
      { text: 'Pudong', x: 1370, y: 380, size: 22 },
      { text: 'Huangpu', x: 1005, y: 900, size: 14 },
    ],
    starterStations: [
      { position: { x: 500, y: 300 }, shape: 'circle' },
      { position: { x: 800, y: 450 }, shape: 'triangle' },
      { position: { x: 600, y: 650 }, shape: 'square' },
      { position: { x: 1300, y: 450 }, shape: 'circle' },
      { position: { x: 1350, y: 700 }, shape: 'circle' },
    ],
  },
  {
    id: 'singapore',
    name: 'Singapore',
    description: 'A compact island of scattered districts: fewer new stations, but crowds build fast.',
    // Compact polycentric: districts across the island, Changi east opens late.
    growth: {
      hubs: [
        { x: 700, y: 420, r: 160, weight: 3, label: 'Orchard' },
        { x: 1000, y: 650, r: 150, weight: 3, label: 'Marina' },
        { x: 400, y: 480, r: 150, weight: 3, label: 'Jurong' },
        { x: 1250, y: 420, r: 140, weight: 2, opensWeek: 5, label: 'Changi' },
      ],
    },
    size: { x: 1600, y: 1000 },
    seed: 10453,
    unlock: { weeks: 7 },
    tuning: { station: 1.15, passenger: 0.85 },
    rivers: [
      {
        id: 'singapore-river',
        width: 45,
        path: [
          { x: 700, y: 620 },
          { x: 820, y: 540 },
          { x: 920, y: 580 },
          { x: 1000, y: 680 },
          { x: 1050, y: 1020 },
        ],
      },
    ],
    decor: [
      // Island coastline
      [
        { x: 180, y: 300 },
        { x: 400, y: 150 },
        { x: 800, y: 100 },
        { x: 1200, y: 160 },
        { x: 1450, y: 350 },
        { x: 1500, y: 600 },
        { x: 1300, y: 820 },
        { x: 900, y: 900 },
        { x: 500, y: 880 },
        { x: 250, y: 700 },
        { x: 180, y: 300 },
      ],
      // Sentosa, offshore
      [
        { x: 560, y: 940 },
        { x: 660, y: 925 },
        { x: 730, y: 950 },
      ],
      // Marina Bay towers: three ticks and a deck
      [
        { x: 1060, y: 750 },
        { x: 1060, y: 700 },
      ],
      [
        { x: 1080, y: 750 },
        { x: 1080, y: 700 },
      ],
      [
        { x: 1100, y: 750 },
        { x: 1100, y: 700 },
      ],
      [
        { x: 1050, y: 700 },
        { x: 1110, y: 700 },
      ],
    ],
    labels: [
      { text: 'Marina Bay', x: 1120, y: 790, size: 13 },
      { text: 'Orchard', x: 700, y: 350, size: 15 },
      { text: 'Sentosa', x: 640, y: 975, size: 12 },
    ],
    starterStations: [
      { position: { x: 600, y: 300 }, shape: 'circle' },
      { position: { x: 950, y: 300 }, shape: 'triangle' },
      { position: { x: 500, y: 550 }, shape: 'square' },
      { position: { x: 820, y: 700 }, shape: 'circle' },
      { position: { x: 1200, y: 450 }, shape: 'circle' },
    ],
  },
  {
    id: 'sydney',
    name: 'Sydney',
    description: 'City core first; the North Shore and eastern beaches develop later. Extra bridges included.',
    // Harbour crossing early, then the eastern suburbs open.
    growth: {
      hubs: [
        { x: 600, y: 600, r: 210, weight: 5, label: 'CBD' },
        { x: 700, y: 180, r: 170, weight: 3, opensWeek: 3, label: 'North Shore' },
        { x: 1300, y: 650, r: 190, weight: 3, opensWeek: 5, label: 'Eastern Suburbs' },
      ],
    },
    size: { x: 1600, y: 1000 },
    seed: 11563,
    unlock: { weeks: 8 },
    resourceBonus: { bridges: 2 },
    rivers: [
      {
        id: 'harbour',
        width: 60,
        path: [
          { x: 1620, y: 320 },
          { x: 1250, y: 380 },
          { x: 1000, y: 340 },
          { x: 800, y: 420 },
          { x: 500, y: 380 },
          { x: -20, y: 420 },
        ],
      },
      {
        id: 'cove-south',
        width: 32,
        path: [
          { x: 870, y: 400 },
          { x: 830, y: 560 },
        ],
      },
      {
        id: 'cove-east',
        width: 32,
        path: [
          { x: 1150, y: 380 },
          { x: 1190, y: 540 },
        ],
      },
    ],
    decor: [
      // Opera House sails
      [
        { x: 1020, y: 300 },
        { x: 1038, y: 272 },
        { x: 1056, y: 300 },
      ],
      [
        { x: 1044, y: 300 },
        { x: 1062, y: 268 },
        { x: 1080, y: 300 },
      ],
      // Harbour Bridge arch
      [
        { x: 930, y: 320 },
        { x: 965, y: 290 },
        { x: 1000, y: 320 },
      ],
      // Eastern beaches coastline
      [
        { x: 1520, y: 480 },
        { x: 1480, y: 640 },
        { x: 1530, y: 800 },
      ],
    ],
    labels: [
      { text: 'The Harbour', x: 550, y: 340, size: 15 },
      { text: 'North Shore', x: 700, y: 180, size: 18 },
      { text: 'Bondi', x: 1430, y: 700, size: 13 },
    ],
    starterStations: [
      { position: { x: 600, y: 250 }, shape: 'circle' },
      { position: { x: 1000, y: 200 }, shape: 'triangle' },
      { position: { x: 500, y: 600 }, shape: 'square' },
      { position: { x: 980, y: 620 }, shape: 'circle' },
      { position: { x: 1300, y: 700 }, shape: 'circle' },
    ],
  },
  {
    id: 'istanbul',
    name: 'Istanbul',
    description: 'The European side grows first; the Asian side opens late. Every crossing costs two tunnels.',
    // Europe established; Asia opens late — and reaching it costs double bridges.
    growth: {
      hubs: [
        { x: 520, y: 530, r: 240, weight: 5, label: 'Europe' },
        { x: 1250, y: 500, r: 220, weight: 4, opensWeek: 5, label: 'Asia' },
      ],
    },
    size: { x: 1600, y: 1000 },
    seed: 12671,
    unlock: { weeks: 8 },
    resourceBonus: { bridges: 3 },
    tuning: { bridgeCost: 2 },
    rivers: [
      {
        id: 'bosphorus',
        width: 65,
        path: [
          { x: 900, y: -20 },
          { x: 950, y: 250 },
          { x: 880, y: 500 },
          { x: 950, y: 750 },
          { x: 900, y: 1020 },
        ],
      },
      {
        id: 'golden-horn',
        width: 38,
        path: [
          { x: 880, y: 480 },
          { x: 650, y: 380 },
          { x: 450, y: 350 },
        ],
      },
    ],
    decor: [
      // Domes and minarets, old city
      [
        { x: 660, y: 580 },
        { x: 680, y: 555 },
        { x: 700, y: 580 },
      ],
      [
        { x: 715, y: 578 },
        { x: 733, y: 550 },
        { x: 751, y: 578 },
      ],
      [
        { x: 655, y: 578 },
        { x: 655, y: 535 },
      ],
      [
        { x: 758, y: 576 },
        { x: 758, y: 532 },
      ],
      // Theodosian walls, west
      [
        { x: 380, y: 500 },
        { x: 420, y: 620 },
        { x: 390, y: 760 },
      ],
    ],
    labels: [
      { text: 'Europe', x: 450, y: 700, size: 22 },
      { text: 'Asia', x: 1280, y: 450, size: 22 },
      { text: 'Bosphorus', x: 980, y: 140, size: 14 },
      { text: 'Golden Horn', x: 560, y: 300, size: 13 },
    ],
    starterStations: [
      { position: { x: 600, y: 240 }, shape: 'circle' },
      { position: { x: 520, y: 560 }, shape: 'circle' },
      { position: { x: 700, y: 720 }, shape: 'square' },
      { position: { x: 1200, y: 350 }, shape: 'triangle' },
      { position: { x: 1250, y: 650 }, shape: 'circle' },
    ],
  },
  {
    id: 'seoul',
    name: 'Seoul',
    description: 'Growth starts north of the river, then Gangnam booms to the south. Starts with a Big Train.',
    // Gangbuk (north) first; Gangnam ("south of the river") opens later.
    growth: {
      hubs: [
        { x: 700, y: 320, r: 230, weight: 5, label: 'Gangbuk' },
        { x: 1050, y: 820, r: 200, weight: 4, opensWeek: 4, label: 'Gangnam' },
      ],
    },
    size: { x: 1600, y: 1000 },
    seed: 13781,
    unlock: { weeks: 9 },
    resourceBonus: { big: 1 },
    rivers: [
      {
        id: 'han',
        width: 70,
        path: [
          { x: -20, y: 580 },
          { x: 400, y: 620 },
          { x: 800, y: 540 },
          { x: 1200, y: 600 },
          { x: 1620, y: 560 },
        ],
      },
    ],
    decor: [
      // Bukhansan ridges
      [
        { x: 300, y: 180 },
        { x: 420, y: 100 },
        { x: 540, y: 170 },
        { x: 660, y: 90 },
        { x: 780, y: 160 },
      ],
      [
        { x: 900, y: 150 },
        { x: 1020, y: 80 },
        { x: 1140, y: 150 },
      ],
      // N Seoul Tower on its hill
      [
        { x: 700, y: 340 },
        { x: 750, y: 300 },
        { x: 800, y: 340 },
      ],
      [
        { x: 750, y: 300 },
        { x: 750, y: 260 },
      ],
    ],
    labels: [
      { text: 'Han River', x: 800, y: 575, size: 15 },
      { text: 'Gangnam', x: 1100, y: 780, size: 18 },
      { text: 'Bukhansan', x: 520, y: 60, size: 13 },
    ],
    starterStations: [
      { position: { x: 500, y: 300 }, shape: 'circle' },
      { position: { x: 900, y: 280 }, shape: 'triangle' },
      { position: { x: 1250, y: 320 }, shape: 'circle' },
      { position: { x: 700, y: 780 }, shape: 'square' },
      { position: { x: 1150, y: 760 }, shape: 'circle' },
    ],
  },
  {
    id: 'berlin',
    name: 'Berlin',
    description: 'Mitte at the centre, then the west and east open together. The gentlest world city.',
    // Central Mitte; west and east wings open together in week 3.
    growth: {
      hubs: [
        { x: 800, y: 430, r: 220, weight: 5, label: 'Mitte' },
        { x: 430, y: 450, r: 160, weight: 3, opensWeek: 3, label: 'West' },
        { x: 1150, y: 480, r: 160, weight: 3, opensWeek: 3, label: 'East' },
      ],
    },
    size: { x: 1600, y: 1000 },
    seed: 14891,
    unlock: { weeks: 9 },
    tuning: { passenger: 1.1, station: 1.1 },
    rivers: [
      {
        id: 'spree',
        width: 28,
        path: [
          { x: -20, y: 480 },
          { x: 300, y: 520 },
          { x: 550, y: 460 },
          { x: 800, y: 520 },
          { x: 1050, y: 470 },
          { x: 1300, y: 540 },
          { x: 1620, y: 500 },
        ],
      },
      {
        id: 'wannsee',
        width: 70,
        path: [
          { x: 200, y: 780 },
          { x: 300, y: 830 },
          { x: 380, y: 900 },
        ],
      },
    ],
    decor: [
      // S-Bahn ring
      [
        { x: 800, y: 260 },
        { x: 1030, y: 320 },
        { x: 1140, y: 500 },
        { x: 1040, y: 690 },
        { x: 800, y: 750 },
        { x: 560, y: 690 },
        { x: 460, y: 500 },
        { x: 570, y: 320 },
        { x: 800, y: 260 },
      ],
      // Fernsehturm
      [
        { x: 860, y: 470 },
        { x: 860, y: 420 },
      ],
      [
        { x: 852, y: 428 },
        { x: 860, y: 412 },
        { x: 868, y: 428 },
        { x: 852, y: 428 },
      ],
      // Tiergarten
      [
        { x: 620, y: 420 },
        { x: 760, y: 415 },
        { x: 765, y: 480 },
        { x: 625, y: 485 },
        { x: 620, y: 420 },
      ],
    ],
    labels: [
      { text: 'Mitte', x: 920, y: 400, size: 18 },
      { text: 'Spree', x: 350, y: 550, size: 13 },
      { text: 'Wannsee', x: 250, y: 940, size: 13 },
    ],
    starterStations: [
      { position: { x: 550, y: 300 }, shape: 'circle' },
      { position: { x: 950, y: 300 }, shape: 'triangle' },
      { position: { x: 650, y: 650 }, shape: 'square' },
      { position: { x: 1100, y: 650 }, shape: 'circle' },
      { position: { x: 1350, y: 400 }, shape: 'circle' },
    ],
  },
  {
    id: 'moscow',
    name: 'Moscow',
    description: 'A city of rings — growth radiates outward from the Kremlin. Extra line; loops pay off.',
    // Concentric: dense centre, then rings open outward in waves.
    growth: {
      hubs: [
        { x: 800, y: 470, r: 200, weight: 5, label: 'Centre' },
        { x: 800, y: 220, r: 130, weight: 2, opensWeek: 3, label: 'North' },
        { x: 1150, y: 470, r: 130, weight: 2, opensWeek: 3, label: 'East' },
        { x: 450, y: 470, r: 130, weight: 2, opensWeek: 4, label: 'West' },
        { x: 800, y: 770, r: 130, weight: 2, opensWeek: 4, label: 'South' },
      ],
    },
    size: { x: 1600, y: 1000 },
    seed: 15901,
    unlock: { weeks: 10 },
    resourceBonus: { lines: 1 },
    rivers: [
      {
        id: 'moskva',
        width: 45,
        path: [
          { x: -20, y: 620 },
          { x: 350, y: 560 },
          { x: 600, y: 650 },
          { x: 900, y: 580 },
          { x: 1150, y: 650 },
          { x: 1620, y: 580 },
        ],
      },
    ],
    decor: [
      // Inner and outer ring roads
      [
        { x: 800, y: 300 },
        { x: 960, y: 350 },
        { x: 1020, y: 480 },
        { x: 950, y: 610 },
        { x: 800, y: 660 },
        { x: 650, y: 610 },
        { x: 580, y: 480 },
        { x: 645, y: 350 },
        { x: 800, y: 300 },
      ],
      [
        { x: 800, y: 160 },
        { x: 1080, y: 240 },
        { x: 1220, y: 480 },
        { x: 1100, y: 730 },
        { x: 800, y: 810 },
        { x: 500, y: 730 },
        { x: 380, y: 480 },
        { x: 520, y: 240 },
        { x: 800, y: 160 },
      ],
      // Kremlin walls
      [
        { x: 760, y: 500 },
        { x: 845, y: 500 },
        { x: 833, y: 552 },
        { x: 770, y: 552 },
        { x: 760, y: 500 },
      ],
    ],
    labels: [
      { text: 'Kremlin', x: 800, y: 585, size: 13 },
      { text: 'Moskva', x: 300, y: 610, size: 13 },
      { text: 'Ring Line', x: 1160, y: 260, size: 14 },
    ],
    starterStations: [
      { position: { x: 620, y: 300 }, shape: 'circle' },
      { position: { x: 1000, y: 300 }, shape: 'triangle' },
      { position: { x: 500, y: 800 }, shape: 'square' },
      { position: { x: 1000, y: 780 }, shape: 'circle' },
      { position: { x: 1320, y: 450 }, shape: 'circle' },
    ],
  },
  {
    id: 'cairo',
    name: 'Cairo',
    description: 'Life hugs the river — growth spreads along the Nile corridor. A high-speed train to run its length.',
    // Linear: downtown, then along the Nile axis, then west-bank Giza.
    growth: {
      hubs: [
        { x: 950, y: 500, r: 190, weight: 5, label: 'Downtown' },
        { x: 1150, y: 230, r: 150, weight: 3, opensWeek: 3, label: 'Heliopolis' },
        { x: 900, y: 830, r: 150, weight: 3, opensWeek: 4, label: 'Maadi' },
        { x: 400, y: 720, r: 150, weight: 2, opensWeek: 5, label: 'Giza' },
      ],
    },
    size: { x: 1600, y: 1000 },
    seed: 17011,
    unlock: { weeks: 10 },
    resourceBonus: { express: 1 },
    rivers: [
      {
        id: 'nile',
        width: 60,
        path: [
          { x: 750, y: 1020 },
          { x: 800, y: 700 },
          { x: 760, y: 400 },
          { x: 820, y: -20 },
        ],
      },
    ],
    decor: [
      // Giza pyramids, south-west
      [
        { x: 300, y: 800 },
        { x: 360, y: 720 },
        { x: 420, y: 800 },
        { x: 300, y: 800 },
      ],
      [
        { x: 430, y: 810 },
        { x: 470, y: 760 },
        { x: 510, y: 810 },
        { x: 430, y: 810 },
      ],
      // River island
      [
        { x: 762, y: 560 },
        { x: 782, y: 505 },
        { x: 795, y: 560 },
        { x: 780, y: 610 },
        { x: 762, y: 560 },
      ],
      // Desert dunes, far east
      [
        { x: 1250, y: 300 },
        { x: 1350, y: 260 },
        { x: 1450, y: 300 },
      ],
      [
        { x: 1300, y: 700 },
        { x: 1400, y: 660 },
        { x: 1500, y: 700 },
      ],
    ],
    labels: [
      { text: 'Nile', x: 700, y: 250, size: 15 },
      { text: 'Giza', x: 400, y: 860, size: 15 },
      { text: 'Downtown', x: 980, y: 550, size: 14 },
    ],
    starterStations: [
      { position: { x: 640, y: 300 }, shape: 'circle' },
      { position: { x: 950, y: 350 }, shape: 'triangle' },
      { position: { x: 630, y: 650 }, shape: 'square' },
      { position: { x: 950, y: 700 }, shape: 'circle' },
      { position: { x: 540, y: 500 }, shape: 'circle' },
    ],
  },
];
