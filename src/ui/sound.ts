// Tiny WebAudio synth — no assets needed.

let ctx: AudioContext | null = null;
let muted = false;

function audio(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function blip(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.08): void {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  osc.connect(g).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration);
}

export const sound = {
  toggleMute(): boolean {
    muted = !muted;
    return muted;
  },
  isMuted: () => muted,
  deliver: () => blip(880, 0.09),
  week: () => {
    blip(523, 0.15);
    setTimeout(() => blip(784, 0.2), 120);
  },
  invalid: () => blip(140, 0.18, 'square', 0.05),
  gameOver: () => {
    blip(330, 0.4, 'triangle');
    setTimeout(() => blip(220, 0.6, 'triangle'), 250);
  },
};
