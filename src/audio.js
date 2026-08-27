// audio.js — the Web Audio half: context, buffers, gain graph. Every
// decision about WHETHER a sound may play lives in audiomix.js; this
// file only carries them out. No three.js, no game knowledge, so any
// tab can adopt it.
//
// Signal graph:
//   BufferSource -> voiceGain -> busGain[bus] -> masterGain -> destination
//
// Two rules this file exists to keep:
//
// 1. THE CONTEXT IS BORN ON A USER GESTURE, never at init. Browsers
//    reject a context created before one, and a suspended context
//    swallows everything silently -- which looks exactly like a bug in
//    the game rather than a policy.
//
// 2. AUDIO NEVER THROWS INTO THE RENDER LOOP. Every entry point is
//    total. A failed fetch or decode logs once and that key becomes a
//    permanent no-op for the session; the game keeps running silent.

import { makeMixState, distanceGain, admit, addVoice, dropVoice } from './audiomix.js?v=d7f7f97b';
import { SOUNDS, BUSES, DEFAULT_LEVELS, GLOBAL_VOICE_CAP, DISTANCE_K } from './audiomanifest.js?v=d7f7f97b';
import { mulberry32 } from './rng.js?v=d7f7f97b';

const STORE_KEY = 'ssg.audio.levels';
const STEAL_FADE = 0.03; // s — a hard cut mid-waveform is an audible click

// bust.sh's fingerprint-urls.py rewrites HTML attributes and CSS url()
// only -- it does NOT touch JS string literals. Reading the <meta name="cb">
// token it already maintains gets audio URLs cache-busted for free, with
// no new bust patterns and no change to check-tokens.sh.
function bustToken() {
  const m = document.querySelector('meta[name="cb"]');
  const v = m && m.content ? m.content.trim() : '';
  return v ? `?v=${encodeURIComponent(v)}` : '';
}

export function makeAudio(opts = {}) {
  const base = opts.base ?? '';
  let ctx = null;
  let master = null;
  const busGain = Object.create(null);
  const buffers = Object.create(null); // key -> AudioBuffer | 'failed'
  const state = makeMixState();
  let nextId = 1;
  const live = new Map(); // id -> { src, gain }
  let jitter = mulberry32(opts.seed ?? 1);
  let armed = false;
  let loadStarted = false;
  let loggedFail = false;

  const levels = { ...DEFAULT_LEVELS };
  let muted = false;
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (saved && typeof saved === 'object') {
      for (const k of Object.keys(levels)) {
        if (typeof saved[k] === 'number') levels[k] = Math.min(1, Math.max(0, saved[k]));
      }
      muted = !!saved.muted;
    }
  } catch { /* private mode, corrupt value — defaults are fine */ }

  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ ...levels, muted })); } catch { /* ignore */ }
  }

  function now() { return ctx ? ctx.currentTime : 0; }

  function ensureCtx() {
    if (ctx) return ctx;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : levels.master;
      master.connect(ctx.destination);
      for (const b of BUSES) {
        const g = ctx.createGain();
        g.gain.value = levels[b] ?? 1;
        g.connect(master);
        busGain[b] = g;
      }
    } catch {
      ctx = null;
    }
    return ctx;
  }

  // idempotent: the listeners remove themselves after the first gesture
  function arm() {
    if (armed) return;
    armed = true;
    const go = () => {
      ensureCtx();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
      load();
      for (const ev of ['pointerdown', 'keydown', 'touchstart']) {
        window.removeEventListener(ev, go);
      }
    };
    for (const ev of ['pointerdown', 'keydown', 'touchstart']) {
      window.addEventListener(ev, go, { passive: true });
    }
  }

  async function decodeOne(key) {
    const spec = SOUNDS[key];
    try {
      const res = await fetch(`${base}${spec.file}${bustToken()}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const bytes = await res.arrayBuffer();
      buffers[key] = await ctx.decodeAudioData(bytes);
    } catch (err) {
      buffers[key] = 'failed';
      if (!loggedFail) {
        loggedFail = true;
        console.warn(`[audio] ${key} failed to load; that sound is off for this session`, err);
      }
    }
  }

  function load() {
    if (loadStarted || !ensureCtx()) return Promise.resolve();
    loadStarted = true;
    return Promise.all(Object.keys(SOUNDS).map(decodeOne));
  }

  function stopVoice(id, fade = STEAL_FADE) {
    const v = live.get(id);
    if (!v) return;
    live.delete(id);
    dropVoice(state, id);
    const t = now();
    try {
      v.gain.gain.cancelScheduledValues(t);
      v.gain.gain.setValueAtTime(v.gain.gain.value, t);
      v.gain.gain.linearRampToValueAtTime(0, t + fade);
      v.src.stop(t + fade + 0.01);
    } catch { /* already stopped */ }
  }

  function start(key, o, looping) {
    const spec = SOUNDS[key];
    if (!spec || !ctx) return null;
    const buf = buffers[key];
    if (!buf || buf === 'failed') return null;

    const t = now();
    const cfg = { maxVoices: spec.maxVoices, minInterval: spec.minInterval };
    const verdict = admit(state, key, t, cfg, GLOBAL_VOICE_CAP);
    if (!verdict.ok) return null;
    if (verdict.steal !== null) stopVoice(verdict.steal);

    const jitterAmt = spec.rateJitter ? (jitter() * 2 - 1) * spec.rateJitter : 0;
    const rate = Math.max(0.05, (o.rate ?? 1) * (1 + jitterAmt));
    const g = spec.gain * (o.gain ?? 1) * distanceGain(o.dist ?? 0, DISTANCE_K);

    let src, gain;
    try {
      src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = looping;
      src.playbackRate.value = rate;
      gain = ctx.createGain();
      gain.gain.value = g;
      src.connect(gain);
      gain.connect(busGain[spec.bus] ?? master);
      src.start();
    } catch {
      return null;
    }

    const id = nextId++;
    addVoice(state, key, t, id);
    live.set(id, { src, gain });
    if (!looping) {
      src.onended = () => { live.delete(id); dropVoice(state, id); };
    }
    return { id, src, gain };
  }

  return {
    arm,
    load,
    get ready() { return !!ctx; },
    levels,
    get muted() { return muted; },

    reseed(seed) { jitter = mulberry32(seed >>> 0 || 1); },

    play(key, o = {}) { start(key, o, false); },

    // a handle rather than a key, because the bed is continuous: the
    // caller nudges gain and rate every frame from the tank's speed
    loop(key, o = {}) {
      const v = start(key, o, true);
      if (!v) return { set() {}, stop() {} };
      return {
        set(gain, rate) {
          try {
            const t = now();
            // short ramps, not steps: a per-frame jump in gain zippers
            v.gain.gain.setTargetAtTime(Math.max(0, gain) * SOUNDS[key].gain, t, 0.05);
            v.src.playbackRate.setTargetAtTime(Math.max(0.05, rate), t, 0.08);
          } catch { /* context died */ }
        },
        stop(fade = 0.25) { stopVoice(v.id, fade); },
      };
    },

    setMaster(v) {
      levels.master = Math.min(1, Math.max(0, v));
      if (master) master.gain.setTargetAtTime(muted ? 0 : levels.master, now(), 0.02);
      persist();
    },

    setBus(name, v) {
      if (!BUSES.includes(name)) return;
      levels[name] = Math.min(1, Math.max(0, v));
      if (busGain[name]) busGain[name].gain.setTargetAtTime(levels[name], now(), 0.02);
      persist();
    },

    setMute(on) {
      muted = !!on;
      if (master) master.gain.setTargetAtTime(muted ? 0 : levels.master, now(), 0.02);
      persist();
    },
  };
}
