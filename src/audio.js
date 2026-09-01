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

import { makeMixState, distanceGain, admit, addVoice, dropVoice } from './audiomix.js?v=bd425e5e';
import { SOUNDS, BUSES, DEFAULT_LEVELS, GLOBAL_VOICE_CAP, DISTANCE_K } from './audiomanifest.js?v=bd425e5e';
import { mulberry32 } from './rng.js?v=bd425e5e';
import { gateStep } from './audiogate.js?v=bd425e5e';

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
      // An output-device change — plugging in headphones, or starting an
      // AirPlay cast mid-session — can leave the context suspended or
      // interrupted, and nothing here was listening. Cheap insurance, and
      // it is the one AirPlay-specific thing this file can actually do:
      // the ~2s buffer a TV adds is the receiver's, not ours.
      // A context can lapse long after it started — tab hidden, headphones
      // unplugged, an OS interruption. Re-arm rather than assume the unlock
      // was a one-time event.
      ctx.onstatechange = () => {
        const st = ctx ? ctx.state : 'none';
        console.log(`AUDIO state -> ${st}`);
        if (st === 'running') {
          stopListening();
          if (!summaryArmed) {
            summaryArmed = true;
            // eight seconds of real play is enough to have asked for
            // something; one line, once, and then it is quiet
            setTimeout(() => {
              console.log(`AUDIO summary requested=${nRequested}`
                + ` refused-by-mix=${nRefused} started=${nStarted}`
                + ` audible=${nAudible} live=${live.size}`
                + ` ctx=${ctx ? ctx.state : 'none'} muted=${muted}`
                + ` master=${levels.master}`);
            }, 8000);
          }
        }
        else if (armed) { startListening(); if (ctx) ctx.resume().catch(() => {}); }
      };
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

  // --- THE GATE ----------------------------------------------------------
  // Getting a context RUNNING is a state to maintain, not an event that
  // happens once. The policy lives in audiogate.js (pure, Node-tested); this
  // half only performs it.
  //
  // What went wrong before, in order, because each is a trap worth naming:
  //   - listeners in the BUBBLE phase sat behind every handler that calls
  //     stopImmediatePropagation, and a cinematic's skip handler ate the
  //     first keypress. Hence capture + passive, first in line, never
  //     interfering.
  //   - the listeners were removed SYNCHRONOUSLY, before resume() settled,
  //     so a single rejected attempt killed audio for the session. Now they
  //     stay until the context is genuinely running.
  //   - creating the context eagerly, outside a gesture, produced the state
  //     browsers are least willing to start. Eager creation is still right
  //     for DECODING, but if resuming keeps failing the context is rebuilt
  //     inside a gesture, which is the historically reliable path.
  const ARM_EVENTS = ['pointerdown', 'pointerup', 'touchstart', 'touchend',
    'keydown', 'keyup', 'click'];
  const ARM_OPTS = { passive: true, capture: true };
  let failedResumes = 0;
  let rebuilds = 0;
  let listening = false;

  function stateNow() { return ctx ? ctx.state : null; }

  function stopListening() {
    if (!listening) return;
    listening = false;
    for (const ev of ARM_EVENTS) window.removeEventListener(ev, onGesture, true);
  }
  function startListening() {
    if (listening) return;
    listening = true;
    for (const ev of ARM_EVENTS) window.addEventListener(ev, onGesture, ARM_OPTS);
  }

  function rebuildCtx() {
    rebuilds++;
    failedResumes = 0;
    const old = ctx;
    ctx = null; master = null;
    if (old) { try { old.close(); } catch { /* already gone */ } }
    ensureCtx();          // built inside the gesture this time
    // buffers are kept: an AudioBuffer is data, not a child of the context
    // that decoded it, so a rebuild costs nothing to re-fetch
  }

  function reportReady() {
    loadSettled = true;
    const total = Object.keys(SOUNDS).length;
    let ok = 0, failed = 0;
    for (const k of Object.keys(SOUNDS)) {
      if (buffers[k] === 'failed') failed++;
      else if (buffers[k]) ok++;
    }
    console.log(`AUDIO ready ctx=${stateNow()} decoded=${ok}/${total}`
      + `${failed ? ` failed=${failed}` : ''}`);
  }

  // Runs on EVERY gesture until the context is running. Cheap when it is.
  let attempts = 0;
  function onGesture() {
    const step = gateStep(stateNow(), failedResumes, rebuilds);
    // A blocked context's resume() promise often never SETTLES at all — it
    // neither resolves nor rejects until activation arrives — so outcome
    // logging alone can look identical to "the listener never fired". Log the
    // attempt too, capped so a stubborn session cannot flood the console.
    if (++attempts <= 3) {
      console.log(`AUDIO gesture ${attempts}: ctx=${stateNow()} -> ${step.action}`);
    }
    if (step.action === 'done' || step.action === 'give-up') { stopListening(); return; }
    if (step.action === 'rebuild') { rebuildCtx(); }
    if (!ctx) return;
    ctx.resume().then(
      () => {
        if (stateNow() === 'running') {
          console.log(`AUDIO running (after ${failedResumes} failed,`
            + ` ${rebuilds} rebuild${rebuilds === 1 ? '' : 's'})`);
          stopListening();
        } else {
          // resolved but NOT running — the case the old one-shot code read as
          // success and then stopped listening on
          failedResumes++;
        }
      },
      (e) => {
        failedResumes++;
        console.log(`AUDIO resume rejected (${failedResumes}) ${(e && e.name) || e}`);
      },
    );
  }

  function arm() {
    if (armed) return;
    armed = true;
    // Decode now, on an OFFLINE context. Do NOT create the playback context
    // here: Safari will happily report a context created outside a gesture as
    // `running` and then produce no output at all — measured, with 30 audible
    // voices at gain 0.55 and silence (operator, 2026-09-01). The playback
    // context is born in the gesture handler, which is the one place every
    // browser agrees on.
    load().then(reportReady);
    console.log(`AUDIO armed (decoding; playback context waits for a gesture)`
      + ` muted=${muted} master=${levels.master}`);
    startListening();
  }

  // DECODING DOES NOT NEED THE SPEAKERS. An OfflineAudioContext can be
  // created without user activation and decodes exactly the same bytes, and
  // an AudioBuffer is plain data — not bound to the context that produced
  // it. So the samples download and decode during page load while the real
  // playback context waits for a gesture, which is where Safari insists it
  // be BORN, not merely resumed.
  let decodeCtx = null;
  function decodeContext() {
    if (ctx) return ctx;               // once it exists, use the real one
    if (decodeCtx) return decodeCtx;
    const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OC) return null;
    try { decodeCtx = new OC(1, 1, 44100); } catch { decodeCtx = null; }
    return decodeCtx;
  }

  async function decodeOne(key) {
    const spec = SOUNDS[key];
    try {
      const res = await fetch(`${base}${spec.file}${bustToken()}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const bytes = await res.arrayBuffer();
      const dc = decodeContext();
      if (!dc) throw new Error('no context to decode with');
      buffers[key] = await dc.decodeAudioData(bytes);
    } catch (err) {
      buffers[key] = 'failed';
      if (!loggedFail) {
        loggedFail = true;
        console.warn(`[audio] ${key} failed to load; that sound is off for this session`, err);
      }
    }
  }

  // Idempotent AND awaitable. It used to return a bare Promise.resolve() on
  // any call after the first, so a second caller was told "done" while the
  // decodes were still in flight — which is exactly how the ready report
  // came back decoded=0/26 on a session that went on to decode all 26.
  // Cache the promise so every caller awaits the same real work.
  let loadPromise = null;
  function load() {
    if (loadPromise) return loadPromise;
    if (!decodeContext()) return Promise.resolve();
    loadStarted = true;
    loadPromise = Promise.all(Object.keys(SOUNDS).map(decodeOne));
    return loadPromise;
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
      // a stolen or stopped voice unwires itself too — onended does not
      // fire for a LOOP, so this is the only place a bed ever gets cleaned
      v.src.onended = () => {
        try { v.src.disconnect(); v.gain.disconnect(); } catch { /* already gone */ }
      };
    } catch { /* already stopped */ }
  }

  // WHY A SOUND DID NOT SOUND — once per session, not per call. A silent
  // game has several causes that look identical from outside: no context, a
  // parked context, samples that never decoded, or a muted mix. start()
  // returns null for all of them, silently and correctly. This says which.
  let mutedReport = false;
  let loadSettled = false;
  let summaryArmed = false;
  let firstVoiceLogged = false;
  let firstAudibleLogged = false;
  // counters, so a summary can separate "nothing is asking for sound"
  // from "everything is asking and being refused" from "everything
  // plays at zero gain" — three causes, one identical symptom
  let nRequested = 0, nRefused = 0, nStarted = 0, nAudible = 0;
  function reportSilence(why, key) {
    if (mutedReport) return;
    // "not decoded yet" before the load settles is a TRANSIENT — the engine
    // asks to spool at t=0, every session, on a perfectly healthy page. The
    // reporter fires once, so letting a transient claim it would mask the
    // real cause for the rest of the session.
    if (!loadSettled && why.startsWith('sample not decoded')) return;
    mutedReport = true;
    console.log(`AUDIO silent: ${why} (first blocked sound: ${key})`
      + ` ctx=${ctx ? ctx.state : 'none'} muted=${muted} master=${levels.master}`
      + ` loadStarted=${loadStarted}`);
  }

  function start(key, o, looping) {
    const spec = SOUNDS[key];
    if (!spec) return null;
    nRequested++;
    if (!ctx) { reportSilence('no AudioContext — the gesture never armed it', key); return null; }
    // REFUSE UNTIL THE CONTEXT RUNS. This used to be implicit: there was no
    // context at all before the first gesture, so start() returned null and
    // no voice was ever built. Creating the context eagerly removed that
    // guard by accident — sounds then got wired against a SUSPENDED context
    // whose currentTime does not advance, so they occupied the voice budget,
    // polluted the mix's timing state with a stalled clock, and never
    // sounded. The engine bed was the worst of it: loop() handed back a
    // handle to a voice that could never play, the caller cached it, and it
    // never asked again.
    //
    // Returning null is the documented contract here — see loop() below: it
    // makes the caller retry next frame, which costs nothing.
    if (ctx.state !== 'running') {
      reportSilence(`context is ${ctx.state}, not running`, key);
      return null;
    }
    const buf = buffers[key];
    if (!buf || buf === 'failed') {
      reportSilence(buf === 'failed' ? 'sample failed to decode' : 'sample not decoded yet', key);
      return null;
    }

    const t = now();
    const cfg = { maxVoices: spec.maxVoices, minInterval: spec.minInterval };
    const verdict = admit(state, key, t, cfg, GLOBAL_VOICE_CAP);
    if (!verdict.ok) { nRefused++; return null; }
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

    // Two different questions. The first voice proves sounds are being
    // wired at all; the first AUDIBLE one proves the gain chain survives to
    // something you could hear. A bed at rest legitimately has gain 0 — the
    // thruster rises with speed — so the first line alone says nothing about
    // audibility, which is exactly the trap the earlier diagnostics fell in.
    const line = (what) => `AUDIO ${what} '${key}' gain=${g.toFixed(3)}`
      + ` bus=${spec.bus}(${(levels[spec.bus] ?? 1).toFixed(2)})`
      + ` master=${levels.master} muted=${muted} rate=${rate.toFixed(2)}`
      + ` live=${live.size} ctx=${ctx.state}`;
    nStarted++;
    if (g > 0.001) nAudible++;
    if (!firstVoiceLogged) { firstVoiceLogged = true; console.log(line('first voice')); }
    if (!firstAudibleLogged && g > 0.001) {
      firstAudibleLogged = true;
      console.log(line('first AUDIBLE voice'));
    }
    const id = nextId++;
    addVoice(state, key, t, id);
    live.set(id, { src, gain });
    if (!looping) {
      src.onended = () => {
        live.delete(id);
        dropVoice(state, id);
        // UNWIRE IT. Nothing here ever disconnected a finished voice, so
        // every sound left a GainNode wired into its bus. The graph is
        // walked every render quantum whether or not a node is doing
        // anything, so a long session pays for every shot it has ever
        // fired — which is what a second game sounding worse than the
        // first looks like from the outside (operator report, laptop over
        // AirPlay). Disconnecting is the whole fix and it costs nothing.
        try { src.disconnect(); gain.disconnect(); } catch { /* already gone */ }
      };
    }
    return { id, src, gain };
  }

  return {
    arm,
    load,
    get ready() { return !!ctx; },
    // What the graph is actually carrying. Without this the only evidence
    // of an audio leak is "it sounds worse now", which is not evidence.
    get voices() { return live.size; },
    get contextState() { return ctx ? `${ctx.state} @${ctx.sampleRate}Hz` : 'none'; },

    // Stop everything and unwire it. A new run should not inherit the last
    // run's graph — a bed whose owner was thrown away keeps playing, and
    // keeps costing, for as long as the page is open.
    panic() {
      for (const id of [...live.keys()]) stopVoice(id, 0.02);
    },
    levels,
    get muted() { return muted; },

    reseed(seed) { jitter = mulberry32(seed >>> 0 || 1); },

    play(key, o = {}) { start(key, o, false); },

    // a handle rather than a key, because the bed is continuous: the
    // caller nudges gain and rate every frame from the tank's speed
    // Returns NULL when it cannot start — deliberately, not a silent stub.
    // A stub handle looks successful to the caller, who stores it and never
    // asks again; that is exactly how the engine bed went silent for a whole
    // session when the first attempt landed before the buffers had decoded.
    // Null makes the caller retry next frame, which costs nothing: start()
    // bails before touching the voice budget when there is no buffer.
    loop(key, o = {}) {
      const v = start(key, o, true);
      if (!v) return null;
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
