// cine/governor.js — THE SWEET SPOT, AS ARITHMETIC AND HYSTERESIS.
//
// The operator's conundrum: push a machine or a phone as far as it goes and
// not one step further, because a cinematic that stutters is a worse
// cinematic than a softer one. A fixed tier table cannot find that point —
// an M4 and a mid-range phone are ten times apart, and a phone moves again
// after two minutes of heat. So the point is MEASURED, twice:
//
//   1. calibrate: one march with a readback stall, timed, gives the device's
//      sine-folds per second. fitSize() turns that and a frame budget into
//      the largest wormhole target that fits. Arithmetic, no feel.
//   2. govern: while the scene plays, a smoothed frame time steps the size
//      down when frames run over budget for a while, and up when there is
//      headroom for longer — one step at a time, never two within a gap,
//      never up while the caller says the expensive beat is on.
//
// The LOOK is never touched: steps and octaves are the operator's; only the
// target's pixels (which soften) and its update rate change.
//
// Pure module: numbers in, numbers out. Tested in Node.

export const SIZES = [256, 384, 512, 768, 1024, 1536, 2048];

// Folds per second from one timed render of a square target.
export function rateFromSample(size, steps, octaves, ms) {
  if (!(ms > 0)) return 0;
  return (size * size * steps * octaves) / (ms / 1000);
}

// The largest size whose march fits the budget at this rate. Never below
// the smallest size: below that the effect is not the effect.
export function fitSize({ rate, budgetMs, steps, octaves, sizes = SIZES }) {
  if (!(rate > 0) || !(budgetMs > 0)) return sizes[0];
  const px = Math.sqrt((budgetMs / 1000) * rate / (steps * octaves));
  let best = sizes[0];
  for (const s of sizes) if (s <= px) best = s;
  return best;
}

// The march's share of a frame at a target fps: a cinematic spends the rest
// on the scene and the post chain.
export function marchBudgetMs(fps, share = 0.4) {
  return (1000 / fps) * share;
}

export function createGovernor({
  budgetMs,                 // the whole frame's budget (1000 / target fps)
  sizes = SIZES,
  initial = 512,
  downOver = 0.25,          // frames this far over budget...
  downHoldMs = 1000,        // ...for this long step DOWN
  upHeadroom = 0.40,        // frames this far under budget...
  upHoldMs = 5000,          // ...for this long step UP
  gapMs = 3000,             // never two steps inside this
  ema = 0.1,                // smoothing of the frame time
} = {}) {
  let idx = Math.max(0, sizes.indexOf(initial));
  if (idx < 0) idx = 0;
  let smooth = budgetMs;
  let overSince = -1, underSince = -1, lastStep = -Infinity;
  const g = {
    get size() { return sizes[idx]; },
    get frameMs() { return smooth; },
    steps: [],
    // frameMs: this frame's time; now: a clock in ms; lockUp: the caller is
    // on a beat that must not get more expensive mid-way
    tick(frameMs, now, { lockUp = false } = {}) {
      smooth += (frameMs - smooth) * ema;
      const over = smooth > budgetMs * (1 + downOver);
      const under = smooth < budgetMs * (1 - upHeadroom);
      overSince = over ? (overSince < 0 ? now : overSince) : -1;
      underSince = under ? (underSince < 0 ? now : underSince) : -1;
      if (now - lastStep < gapMs) return { changed: false, size: sizes[idx] };
      if (over && now - overSince >= downHoldMs && idx > 0) {
        idx--; lastStep = now; overSince = -1; underSince = -1;
        g.steps.push({ at: now, to: sizes[idx], why: 'over' });
        return { changed: true, size: sizes[idx], why: 'over' };
      }
      if (!lockUp && under && now - underSince >= upHoldMs && idx < sizes.length - 1) {
        idx++; lastStep = now; overSince = -1; underSince = -1;
        g.steps.push({ at: now, to: sizes[idx], why: 'headroom' });
        return { changed: true, size: sizes[idx], why: 'headroom' };
      }
      return { changed: false, size: sizes[idx] };
    },
    set(size) { const i = sizes.indexOf(size); if (i >= 0) idx = i; },
  };
  return g;
}
