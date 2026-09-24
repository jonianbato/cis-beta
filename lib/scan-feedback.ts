/**
 * The beep a handheld scanner makes, so the operator knows a read happened
 * without looking at the screen.
 *
 * Synthesised with Web Audio rather than shipped as a sound file: two short
 * tones need no asset, no network and no decoding delay before the first beep.
 */

type Tone = { freq: number; start: number; duration: number };

/** One bright blip for an accepted code, two low ones for a rejected code. */
const TONES: Record<"ok" | "error", Tone[]> = {
  ok: [{ freq: 1800, start: 0, duration: 0.12 }],
  error: [
    { freq: 330, start: 0, duration: 0.14 },
    { freq: 330, start: 0.2, duration: 0.14 },
  ],
};

/** Android buzzes along with the beep; iOS ignores vibrate() entirely. */
const VIBRATION: Record<"ok" | "error", number[]> = {
  ok: [60],
  error: [80, 60, 80],
};

const VOLUME = 0.25;

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!context) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  return context;
}

/**
 * Browsers keep audio suspended until the page has had a user gesture, and a
 * camera read is not one. Call this from a tap — the one that opens the
 * scanner — so the first detected code can already beep.
 */
export function unlockScanSound(): void {
  const ctx = audioContext();
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

export function playScanFeedback(kind: "ok" | "error"): void {
  try {
    navigator.vibrate?.(VIBRATION[kind]);
  } catch {
    // Some browsers throw when vibration is blocked by policy.
  }

  const ctx = audioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();

  const now = ctx.currentTime;
  for (const tone of TONES[kind]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = tone.freq;

    // A few milliseconds of attack and release keep the edges from clicking.
    const start = now + tone.start;
    const end = start + tone.duration;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(VOLUME, start + 0.005);
    gain.gain.setValueAtTime(VOLUME, end - 0.01);
    gain.gain.linearRampToValueAtTime(0, end);

    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(end);
  }
}
