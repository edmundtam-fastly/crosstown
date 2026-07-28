const KEY = 'crosstown.highscores.v1';

type Scores = Record<string, number>;

function load(): Scores {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Scores;
  } catch {
    return {};
  }
}

export function getHighScore(cityId: string, mode: string): number {
  return load()[`${cityId}:${mode}`] ?? 0;
}

// --- City-unlock progression: best full weeks survived per city ---

const PROGRESS_KEY = 'crosstown.progress.v1';

function loadProgress(): Scores {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}') as Scores;
  } catch {
    return {};
  }
}

/** Best number of full weeks survived in a city (any non-creative mode). */
export function getBestWeeks(cityId: string): number {
  return loadProgress()[cityId] ?? 0;
}

/** Best weeks survived across all cities. */
export function getBestWeeksOverall(): number {
  return Math.max(0, ...Object.values(loadProgress()));
}

export function recordWeeksSurvived(cityId: string, weeks: number): void {
  const progress = loadProgress();
  if (weeks > (progress[cityId] ?? 0)) {
    progress[cityId] = weeks;
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      /* storage unavailable — ignore */
    }
  }
}

/** Returns true if this is a new record. */
export function submitScore(cityId: string, mode: string, score: number): boolean {
  const scores = load();
  const key = `${cityId}:${mode}`;
  if (score > (scores[key] ?? 0)) {
    scores[key] = score;
    try {
      localStorage.setItem(KEY, JSON.stringify(scores));
    } catch {
      /* storage unavailable — ignore */
    }
    return true;
  }
  return false;
}
