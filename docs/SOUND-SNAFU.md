# The sound SNAFU — a handover

**Status: UNRESOLVED.** Written 2026-09-01 so whoever picks this up next does
not repeat six attempts that are already known not to work.

The symptom: **the TD tab produces no audible sound in Safari on the
operator's machine**, while YouTube plays fine in the same browser at the same
time.

---

## The state that matters

The operator's own console, from build `bd425e5e`:

```
AUDIO armed ctx=suspended muted=false master=0.7
AUDIO silent: context is suspended, not running (first blocked sound: tank_spool_up)
AUDIO ready ctx=suspended decoded=26/26
AUDIO gesture 1: ctx=suspended -> resume
AUDIO running (after 0 failed, 0 rebuilds)
AUDIO state -> running
AUDIO first voice 'tank_spool_up' gain=0.550 bus=tank(0.80) master=0.7 muted=false rate=0.97 ctx=running
AUDIO first AUDIBLE voice 'tank_spool_up' gain=0.550 ...
AUDIO summary requested=93 refused-by-mix=0 started=32 audible=30 live=1 ctx=running muted=false master=0.7
```

Read that carefully, because it is the whole problem:

- the context reaches **`running`**
- **all 26 samples decode**
- **30 audible voices** are started, at gain 0.550, on bus `tank` (0.80), under
  master 0.7, unmuted
- **and nothing is heard**

Every layer the code can observe reports healthy. The failure is at or beyond
`ctx.destination`.

---

## What is already ruled out — do not re-investigate

| Hypothesis | How it was ruled out |
|---|---|
| Gesture never reaches the unlock | `?gestureprobe=1` PASSes: idle key=1 tap=1, during-shot key=1 tap=1 |
| Audio assets 404 | All return 200 at the live cache-bust token |
| Samples fail to decode | `decoded=26/26`, repeatedly |
| The context never resumes | `AUDIO state -> running`, confirmed on the operator's machine |
| Muted, or master at zero | `muted=false master=0.7` in the same line |
| The mix refuses voices | `refused-by-mix=0` |
| Voices are built at zero gain | `audible=30`, `gain=0.550` |
| Wrong tab / wrong build | Operator confirmed the build token each time |
| `debugging` flag differing between URLs | `gestureprobe` is not in that list; both URLs run the same path |

---

## The fixes that shipped, and what each was actually worth

Six attempts. Two fixed real bugs that were **not** this one. One was a
regression I introduced and then undid. That distinction is the point of this
document.

1. **`a30ece9` — audio unlock moved to the capture phase.**
   Real bug. The unlock listened on `window` in the *bubble* phase, behind
   `camShot`'s skip handler (window/capture + `stopImmediatePropagation`), so
   the first keypress was eaten. Measured: idle `key=1`, during-shot `key=0`.
   **Did not fix the symptom.**

2. **`26d686c` / `04e27f9` — diagnostics.**
   The first cut logged `ctx.state` on the line *after* calling `ctx.resume()`.
   `resume()` is a promise, so it always read `suspended` — identical output
   from a working page and a broken one. A diagnostic that cannot distinguish
   the two states it exists to distinguish is worse than none.

3. **`58341ef` — create the context eagerly. THIS WAS A REGRESSION.**
   It made a page that sometimes worked into one that never did, because a
   context created outside a gesture is the state browsers are least willing
   to start.

4. **`ecb12a1` — the gate overhaul.**
   Real bug, long-standing: the unlock was **one-shot**. It removed its
   listeners *synchronously*, before `resume()` had settled, so a single
   rejected attempt killed audio for the session. Policy now lives in
   `src/audiogate.js` (pure, 33 Node checks): never stop listening until the
   context is genuinely `running`. **Did not fix the symptom.**

5. **`58b882c` — `start()` refuses until the context runs.**
   Real bug, introduced by (3). `start()` *reported* a suspended context and
   then built the voice anyway, against a clock that does not advance. The
   engine bed was the worst case: `loop()` returned a handle to a voice that
   could never sound, and the caller caches that handle and never asks again.
   **Did not fix the symptom.**

6. **`2830776` — the playback context is born in the gesture.**
   Undoes (3) properly: decoding happens on an `OfflineAudioContext` (allowed
   without activation; an `AudioBuffer` is data, not a child of a context), and
   the playback context is created inside the gesture handler.
   **Did not fix the symptom.**

---

## What shipped after that, and what it is for

- **The proof-of-life alarm.** `danger_alert` now plays the instant the
  context reaches `running`, so testing no longer costs a ten-second cold
  open. Operator's request, and it doubles as a diagnostic.
- **`?beep=1`** — a raw **oscillator straight to `ctx.destination`**, using
  none of the sample path: no decoded buffer, no bus, no master, no mix
  admission. This is the question six rounds never asked.
- **The Safari prime.** Creating a context in a gesture and resuming it is
  still not enough on Safari: the output stays dead until a buffer has
  actually been *played* inside that gesture. One sample of silence is the
  standard unlock, and its absence is the most likely remaining explanation
  for everything above measuring healthy while sounding like nothing.
- **Re-decode onto the playback context.** Offline-decoded buffers are
  spec-portable, but Safari has a history of strictness about cross-context
  buffers. Once the real context exists, the samples are decoded again onto
  it — cached files, so a decode and no network.

---

## CONFIRMED 2026-09-01: it is Safari-specific

The operator ran the **same build at the same URL** in both browsers:

- **Chrome — works.**
- **Safari — silent**, with every measurement healthy:

```
AUDIO primed (silent buffer played inside the gesture)
AUDIO running (after 0 failed, 1 rebuild)
AUDIO first AUDIBLE voice 'danger_alert' gain=1.000 bus=ui(0.40) master=0.7 muted=false
AUDIO re-decoded onto the playback context
AUDIO summary requested=128 refused-by-mix=18 started=30 audible=28 live=2 ctx=running
```

So the context is born in the gesture, primed with a silent buffer, running,
re-decoded onto itself, and playing 28 audible voices — into silence, in
Safari only.

### Also ruled out since the first draft

| Hypothesis | How it was ruled out |
|---|---|
| Two `AudioContext`s per page (units-tab + td-tab) exhausting Safari's limit | Tabs initialise **lazily** — `main.js: if (on && !tab.api) tab.api = tab.init(...)`. On a `#td` load, `units-tab` never runs. One playback context. |
| The Safari silent-buffer prime was missing | It is there now and logs `AUDIO primed`. Still silent. |
| Cross-context buffers (offline decode) | Buffers are re-decoded onto the playback context; the log confirms it. Still silent. |

### Free things to check before writing any more code

These cost nothing and would explain "Chrome works, Safari doesn't, YouTube
works in Safari" exactly:

1. **Safari → Settings for This Website… → Auto-Play.** If localhost is set to
   *Stop Media with Sound* or *Never Auto-Play*, set it to **Allow All
   Auto-Play**. This is per-site, which is why YouTube is unaffected.
2. **Per-tab mute.** Safari shows a speaker icon in the address bar; a muted
   tab is silent while every other tab plays normally.
3. **Safari → Settings → Advanced → "Show features for web developers"**, then
   Develop → check no experimental Web Audio feature is toggled.

### The measurement that has never been taken

`?beep=1` was added for this and **has not been run in Safari**. As of the
current build it no longer needs a flag: **every unlock now fires both routes**

- an **oscillator** straight to `ctx.destination` (no buffer, no bus, no
  master, no mix), and
- **`danger_alert`**, a decoded sample through the full graph.

| What you hear in Safari | Conclusion |
|---|---|
| Beep only | The **sample path** is at fault — buffers or the gain graph. Chrome tolerating it and Safari not points at buffer handling. |
| Neither | The context **never reaches the speakers** despite `state === 'running'`. Browser/OS level; the free checks above become the whole investigation. |
| Both | Audio is fine and the fault is elsewhere entirely. |

### One concrete mismatch, now measured

Chrome reports `sampleRate=48000`; the OfflineAudioContext used for eager
decoding is created at **44100**. `AudioBufferSourceNode` is specified to
resample, and Chrome clearly does. **Safari's history here is worse.** The
re-decode onto the playback context is meant to cover this, but the first
sounds after unlock still use offline buffers. If Safari returns and sounds
*wrong in tone rather than absent*, this is the cause; if the beep is audible
and samples are not, this is the first thing to change (decode only on the
playback context, accepting the later start).

---

## Where to start next — in this order

**1. Listen to the unlock.** Both routes now fire automatically on every
load — no flag needed. This bisects the whole problem:

| Result | Conclusion |
|---|---|
| Beep audible, game silent | Output is fine. Fault is in the **sample path** — buffers or the gain graph. Suspect cross-context `AudioBuffer`s, or the bus/master wiring. |
| Neither audible | The context is **not reaching the speakers** despite `state === 'running'`. Safari-level. Next: `ctx.destination.channelCount`, `ctx.sampleRate`, output device selection, and whether a second `AudioContext` exists (`units-tab.js` also calls `makeAudio()` + `arm()` — two contexts per page). |

**2. Check the sample rate.** The offline decode context is created at 44100;
the hardware context may run at 48000. `AudioBufferSourceNode` is specified to
resample, so this should be correct rather than pitch-shifted — but if sound
returns and is *wrong in tone*, this is the cause.

**3. Count the contexts.** `units-tab.js:145` also does
`makeAudio({seed:1})` + `sfx.arm()`. Two independent `AudioContext`s exist per
page load. Safari limits concurrent contexts (historically 4); worth checking
whether the TD tab's context is the one being starved.

**4. Try the simplest possible page.** A bare HTML file on the same origin,
one button, `new AudioContext()` + oscillator, in the operator's Safari. If
*that* is silent, nothing in this repo is at fault and the investigation moves
to the browser/OS.

---

## The process lesson, which cost more than the bug

**I shipped five fixes before building an instrument that could distinguish
the causes.** Silence has at least four: nothing is asking for sound;
everything is asking and being refused; everything plays at zero gain; or
everything plays correctly into a dead output. They are indistinguishable from
outside, and I treated each new theory as if it were evidence.

The `requested / refused-by-mix / started / audible` summary — added in
`58b882c`, the fifth attempt — is what finally made the problem legible, and
it immediately proved the gain chain (which I had been about to rewrite) was
never wrong.

Three of the diagnostics were themselves wrong before they were right: one
read an async result too early, one was claimed by a transient, one reported
`decoded=0/26` because `load()` returned an already-resolved promise. **A
probe is code. It fails the same ways. Its first PASS or FAIL deserves the
same suspicion as the code under test.**

If the next attempt starts anywhere other than `?beep=1`, it is guessing.
