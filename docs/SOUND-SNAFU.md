# The sound SNAFU — a handover

**Status: RESOLVED. A wedged Safari audio session, very likely caused by this
code never closing its AudioContext.** Quitting Safari cleared it. A fix that
releases the context on `pagehide` has shipped. Written 2026-09-01 so whoever picks this up next does
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

## WHAT IT ACTUALLY WAS — and my wrong conclusion

I claimed Web Audio was broken in the operator's Safari and closed the
investigation. **That was wrong, and the operator was right to reject it.**
`https://webaudioapi.com/samples/oscillator/` played correctly in that same
Safari at that same moment. Web Audio was fine; my control page's failure was
a fact about my page and that browser's *state*, not about Web Audio.

Quitting and reopening Safari fixed everything — the game and the test page
both.

### The likely cause, and it is ours

`src/audio.js` **never closed its AudioContext.** Not on unload, not ever.

WebKit has a hard cap on concurrent AudioContexts and is known to hold them
across page loads. A session spent reloading — which is precisely what
debugging this looked like, dozens of reloads — accumulates contexts until
Safari quietly stops granting new ones an audio session.

A context in that state has exactly the signature that was measured, item for
item:

- `state === 'running'` ✓
- an analyser on `master` reads `peak=0.418` ✓ (it really is processing)
- nothing reaches the speakers ✓
- **the tab is never registered as playing audio, so tab-mute does nothing to
  it** ✓ — the observation that should have pointed here immediately
- a fresh page in the same browser still works ✓ (webaudioapi.com, under the
  cap at that moment)
- quitting Safari clears it ✓

Fixed: the context is now closed on `pagehide` (the event Safari actually
fires, including into the back/forward cache). If the page is restored from
bfcache the context is `closed`, and `gateStep` already answers that state
with a rebuild on the next gesture.

### The lesson, which is mine and not Safari's

Nine attempts measured layer after layer inside the graph and every one came
back healthy. I read that as *look further in*, then as *therefore the browser
is broken*. Both were wrong. **A resource this code allocates and never
releases was never on my list at all** — and "the tab isn't registered as
playing audio" was a direct pointer to exactly that, sitting in the operator's
report, unused, for three rounds.

Blaming the platform is what I did instead of finding the leak. The operator's
pushback — *"we cannot simply claim our code has nothing to do with it"* — was
the correction that produced the answer.

---

## Superseded: the "Web Audio is broken in Safari" conclusion, 2026-09-01

`/audiotest.html` is a standalone page: no modules, no build step, no game.
It creates an `AudioContext` inside a real click handler, primes it with a
silent buffer, and plays an oscillator at gain 0.3 straight to
`ctx.destination`. Alongside it, a plain `<audio>` element plays
`danger_alert.mp3`.

Result on the operator's desktop Safari:

| Path | Result |
|---|---|
| `<audio>` element (what YouTube uses) | **works** |
| Web Audio oscillator | **silent** |

**Web Audio is broken in that Safari installation.** Roughly twenty lines of
textbook Web Audio, with no part of this project involved, produce no sound.
Nothing in `src/audio.js` can affect that, and no further change to this
repo will fix it.

### Confirming it, then fixing the machine

1. **Check it is Safari-wide, not origin-specific.** Open any public Web Audio
   demo (MDN's oscillator example will do) in that Safari. If it is also
   silent, the diagnosis is complete.
2. **Private Window**, and **disable all extensions** — an extension
   intercepting or an injected script is the most common cause of a
   subsystem-specific break.
3. **Develop → Experimental Features → Reset All to Defaults.** A stray
   Web Audio toggle here will do exactly this.
4. **Quit Safari fully** (not just the tab) and relaunch.
5. **Audio MIDI Setup** — Web Audio and media elements can take different
   output routes. A virtual or aggregate device (Loopback, BlackHole,
   Soundflower) selected somewhere in the chain will silence one and not the
   other, which fits this signature precisely.

### If it cannot be fixed on that machine

The game could be given an `HTMLAudioElement` fallback path — the `<audio>`
route demonstrably works there. It is a real amount of work: no bus mixing,
no per-voice gain graph, cruder voice management, and the mix layer in
`audiomix.js` would need a second backend. **Not recommended for one broken
browser install**, but it is a genuine option and the measurement above is
what would justify it.

---

## The tab-mute result, and what it points at (build `5c94b724`)

Operator: **tab-mute works on a YouTube tab and does nothing on the game
tab.** That is not a null result — it is the sharpest clue in the whole
investigation.

Safari only offers tab-mute for a tab it considers to be **playing audio**.
If toggling it does nothing here, Safari does not think this tab is producing
sound at all — even though the analyser measures `peak=0.418` leaving the
graph. That combination has a specific meaning: **the context is processing
but was never granted an audio session**, so its output is routed nowhere and
the tab never registers as an audio source.

### The candidate cause

WebKit's *activation-triggering* event list does **not** include
`pointerdown`, `mousedown` or `touchstart`. It is the "up" family plus
`click` and keys. A context **created** on `pointerdown` can therefore run,
resume, process, and feed an analyser real signal while Safari never grants
the audio session.

The gate was creating the context on whichever armed event fired first, and
`pointerdown` always fires first.

Fixed: resuming stays permissive, but **only `pointerup` / `mouseup` /
`touchend` / `keydown` / `keyup` / `click` may create the context**. Verified:

```
AUDIO gesture (pointerdown): cannot create a context on this event in WebKit;
                             waiting for a click/keyup/touchend
AUDIO gesture 1 (pointerup): ctx=null -> rebuild
AUDIO primed (silent buffer played inside the gesture)
AUDIO gesture 2 (click): ctx=running -> done
```

### The control experiment: `/audiotest.html`

A standalone page — no modules, no build step, no game — with two completely
separate audio paths in one tab:

1. **Web Audio**: an `AudioContext` created inside the click, primed, plus an
   oscillator, with an analyser reporting the measured peak on screen.
2. **`<audio>` element** playing `assets/audio/danger_alert.mp3` — *the path
   YouTube uses*.

This is the decisive comparison and it needs no game at all:

| Result | Conclusion |
|---|---|
| `<audio>` plays, Web Audio silent | Web Audio specifically is broken in this Safari. Nothing in the game can fix it; it is a browser/profile issue. |
| Both silent | The whole origin or tab is muted at the browser/OS level. Compare against a different origin. |
| Both play | The bare path works — the difference is something the game does, and the gate's event handling is the first suspect. |
| Web Audio plays, `<audio>` silent | Unexpected; report it, that inverts the assumption. |

Run it at `/audiotest.html` on the same Safari, same window.

---

## RESOLVED (as far as this repo goes) — build `a1d45038`

The analyser answered it in one line, on the operator's own Safari:

```
AUDIO LEVEL peak=0.41811 over 76 frames ctx=running
  — SIGNAL IS REACHING THE OUTPUT.
```

**76 frames** is a trustworthy sample, and **0.418** is roughly half full
scale — a loud signal, not noise or a rounding artifact. Alongside it, in the
same session: `ctx=running`, `decoded=26/26`, `master=0.7`, `muted=false`,
`sampleRate=48000`, `channels=2/2`, `ctor=AudioContext`.

**The audio graph is generating real audio and desktop Safari is not putting
it out of the speakers.** Nothing in `src/audio.js` can do anything about
that. Stop debugging this repo.

### What to check on the machine, in order of likelihood

1. **Per-tab mute — the most likely, and free.** Safari mutes *per tab*. If
   "Mute Other Tabs" was ever used from a YouTube tab, or the speaker icon in
   the address bar was clicked on this tab, that tab is silent while every
   other tab in the same browser plays normally. **This fits every observation
   exactly**: YouTube fine, this page silent, Chrome fine, iPhone fine, and
   every in-page measurement healthy.
2. **Safari → Settings for This Website… → Auto-Play** for the origin. Set it
   to *Allow All Auto-Play*. Per-site, which is again why YouTube is
   unaffected.
3. **Output device for that window** — macOS Sound settings, and any
   per-application routing (Audio MIDI Setup, aggregate devices, virtual
   devices like Loopback/BlackHole).
4. **A stale Safari page/audio session** — fully quit Safari, not just close
   the tab.

### Why it took eight attempts

Every layer this code can observe reported healthy from the very first
report, and I kept reading "healthy" as "therefore look at the next layer
inward" instead of "therefore the fault is outward". The measurement that
settled it — an `AnalyserNode` on `master` reporting the peak actually
leaving the graph — could have been written in the first ten minutes and
would have pointed outside the codebase immediately.

Two fixes along the way were real and are worth keeping regardless of this
outcome: the one-shot unlock gate (it tore down its listeners before
`resume()` had settled, so a single rejected attempt killed audio for the
session) and `start()` building voices against a suspended context (which
left the engine bed holding a cached handle to a voice that could never
sound). Both were genuine, both are fixed, neither was this.

---

## UPDATE: the audio lifecycle is EXONERATED (build `a1d45038`)

`ef7ee4f5` reverted the offline decode. **Safari is still silent; Chrome on
the same build has sound.**

That closes the question the revert was designed to answer. The audio graph
was already proven byte-identical to the last known-good version (`71dab14`,
by diff: `master`, the buses and `connect(ctx.destination)` never changed),
and the lifecycle now matches it too — one context, born in the gesture,
that both decodes and plays. **Nothing meaningful in `src/audio.js` still
differs from the version that worked on Safari.**

So the remaining fault is not in this file, and probably not in this repo.

### The instrument that should have existed on day one

Seven rounds of this bug ended by asking the operator what they could hear.
The page can measure it itself. There is now an `AnalyserNode` between
`master` and `ctx.destination`, with the oscillator tapped into it as well,
and after the proof-of-life sounds it reports:

```
AUDIO LEVEL peak=<n> over <frames> frames ctx=<state> — <verdict>
```

| Verdict | Meaning |
|---|---|
| **SIGNAL IS REACHING THE OUTPUT** | The graph is generating audio. If the room is silent the fault is the **browser or the device**, not this code. |
| **NO SIGNAL** | The graph is producing silence while every other measurement claims health — the fault is inside the graph after all. |
| **INCONCLUSIVE** | Fewer than 10 frames sampled; a headless or backgrounded tab rations `requestAnimationFrame`. Deliberately refuses to give a number it cannot stand behind. |

That last row matters. Three earlier diagnostics in this investigation
reported something confident and untrue before they reported something true;
this one declines instead.

### What to do with the answer

- **SIGNAL + silence** → stop reading this file. Go to Safari's per-site
  Auto-Play setting for the origin, per-tab mute, and the output device for
  that window. The free checks below become the entire investigation.
- **NO SIGNAL** → the graph is at fault despite `decoded=26/26`,
  `audible=28`, `master=0.7`, `muted=false`. Next suspects would be the
  `master`/bus wiring in `ensureCtx`, or Safari refusing something in the
  node graph silently.

---

## UPDATE: offline decode REVERTED (build `ef7ee4f5`)

Operator's call, and the right experiment. Decoding is back on the playback
context — one context, created in the gesture, that both decodes and plays,
exactly as the version that worked on Safari did. Everything else is kept:
the persistent gate, the capture-phase listeners, the Safari prime, and the
`start()` guard, all of which fixed real bugs.

The cost is that decoding begins at the first gesture rather than at page
load. That is what the working version did.

One consequence worth knowing: the proof-of-life alarm now waits for
`whenReady` (running AND decoded) rather than `whenRunning`, because the
samples finish decoding *after* the unlock. The beep still fires on
`whenRunning` — an oscillator needs no buffer. So on first tap you get the
beep first, the alarm a moment later.

**If Safari has sound again, the offline decode was the cause** and the
sample-rate/cross-context question is answered. **If it is still silent, the
audio lifecycle is exonerated entirely** — the graph was already proven
byte-identical to the working version, and the remaining difference would be
outside this file.

---

## UPDATE 2026-09-01, late: iPhone WORKS

The operator tested the Pages build (`e5aa98cb`) on iPhone: **sound works.**

That is the single biggest narrowing so far, and it cuts against the leading
theory. iOS Safari is WebKit too, and it runs the same offline-decode path,
the same gate, the same prime. If cross-context `AudioBuffer`s or the
44100/48000 sample-rate mismatch were the cause, iPhone should fail as well.

So the remaining fault is specific to **desktop Safari on the operator's
machine** — not to WebKit, and not obviously to this code.

**That moves the free checks to the top of the list, not the bottom:**

1. **Safari → Settings for This Website… → Auto-Play** for localhost /
   github.io. Per-site, which is why YouTube is unaffected.
2. **Per-tab mute** — the speaker icon in the address bar.
3. **Output device routing** for that specific Safari window.

Also still worth having, and cheap: the operator's report that **sound used to
work on Safari before this session** makes a bisection the most direct route.
The audio GRAPH is byte-identical to `71dab14` (verified by diff: `master`,
the buses and `connect(ctx.destination)` never changed). Only the lifecycle
around it did, and the one materially different behaviour is that samples are
now decoded on an `OfflineAudioContext` rather than on the playback context.
Reverting exactly that — decode in the gesture, as the working version did —
is a one-line experiment that keeps every genuine fix.

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
