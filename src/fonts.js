// fonts.js — the typeface registry. Same seam as looks.js and towerlooks.js:
// changing how the game SOUNDS on screen never edits what it says.
//
// The problem this solves has two halves. The messages — streak shouts, wave
// banners, the SNAFU card — were set in the system monospace, which is a
// developer's font and reads as one. And the game speaks Japanese in its
// callouts, so any answer has to carry kana as well as Latin or the shouts
// change voice mid-sentence.
//
// The answer is one CJK face used by EVERY pack. DotGothic16 is a dot-matrix
// Japanese font, so 「すげ〜！」 lands as an LED panel whichever Latin face is
// in front of it — which is the register the whole board is already in.
// Vendored, not linked: this repo carries three.js for the same reason, and
// an installed-PWA build must not go to the network for its typeface.
//
// Pure data plus one thin effectful call — the standing testability line.

const MONO = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace';
const CJK = '"DotGothic16"';   // the shared Japanese voice, appended everywhere

export const FONT_PACKS = {
  // the baseline, kept so a candidate can be judged against what shipped
  system: {
    label: 'system mono',
    shout: `${CJK}, ${MONO}`,
    ui: `${CJK}, ${MONO}`,
    track: '0.14em',
    // a halo, not a glow: two stops, the near one tight enough to thicken
    // the stroke and the far one wide enough to sit the text ON the dark
    halo: '0 0 6px currentColor, 0 0 16px rgba(120, 200, 255, 0.28)',
    scale: 1,
    // font-size-adjust normalises x-height across families, so a UI
    // surface does not shrink when the pack changes. `none` = leave the
    // face as drawn; a number = match that ex-height ratio.
    uiAdjust: 'none',
  },
  // DEC VT100. The most literally CRT of the four, and the only one whose
  // letterforms already carry scanline softness in the outlines.
  crt: {
    label: 'VT323 · terminal',
    shout: `"VT323", ${CJK}, ${MONO}`,
    ui: `"VT323", ${CJK}, ${MONO}`,
    track: '0.06em',
    // VT323 is a thin face at size; the halo does structural work here, not
    // just atmosphere, so the near stop is brighter than the others
    halo: '0 0 4px currentColor, 0 0 14px currentColor, 0 0 30px rgba(90, 220, 255, 0.3)',
    scale: 1.28,   // its cap height runs small — matched by eye, not by math
    uiAdjust: '0.53',   // VT323's x-height is ~0.40; without this the HUD shrinks
  },
  // arcade cabinet. Deliberately NOT used for body text: Press Start 2P is a
  // 8x8 bitmap face and a paragraph of it is a punishment.
  arcade: {
    label: 'Press Start 2P · arcade',
    shout: `"Press Start 2P", ${CJK}, ${MONO}`,
    ui: `${CJK}, ${MONO}`,
    track: '0.02em',
    halo: '0 0 5px currentColor, 0 0 18px rgba(255, 200, 90, 0.35)',
    scale: 0.72,   // 8x8 bitmap runs LARGE for its point size
    uiAdjust: 'none',   // the UI stays system mono in this pack anyway
  },
  // technical/military lettering — the stencil register without the gimmick.
  // The most legible of the four at small sizes.
  field: {
    label: 'Share Tech Mono · field',
    shout: `"Share Tech Mono", ${CJK}, ${MONO}`,
    ui: `"Share Tech Mono", ${CJK}, ${MONO}`,
    track: '0.12em',
    halo: '0 0 5px currentColor, 0 0 15px rgba(120, 220, 200, 0.3)',
    scale: 1.06,
    uiAdjust: 'none',
  },
  // one voice for both scripts: the Latin is the same dot grid as the kana,
  // so an English shout and a Japanese one are the same machine talking.
  dot: {
    label: 'DotGothic16 · LED panel',
    shout: `${CJK}, ${MONO}`,
    ui: `${CJK}, ${MONO}`,
    track: '0.10em',
    halo: '0 0 3px currentColor, 0 0 12px currentColor, 0 0 26px rgba(90, 255, 200, 0.22)',
    scale: 1.0,
    uiAdjust: 'none',
  },
};

export const FONT_NAMES = Object.keys(FONT_PACKS);
export const DEFAULT_FONT = 'field';

// Pure: the CSS custom properties a pack becomes. Node-testable, and it is
// where a typo in a pack shows up as a failing test rather than as a font
// that silently does not apply.
export function fontVars(name) {
  const p = FONT_PACKS[name] || FONT_PACKS[DEFAULT_FONT];
  return {
    '--font-shout': p.shout,
    '--font-ui': p.ui,
    '--shout-track': p.track,
    '--shout-halo': p.halo,
    '--shout-scale': String(p.scale),
    '--ui-adjust': p.uiAdjust || 'none',
  };
}

// What is on screen right now — so a GUI control can open on the truth
// rather than on a default it might not be showing.
export function currentFontPack(root = document.documentElement) {
  const d = root.dataset.font;
  return FONT_PACKS[d] ? d : DEFAULT_FONT;
}

// Thin and effectful: the only part that touches the document.
export function applyFontPack(name, root = document.documentElement) {
  const pick = FONT_PACKS[name] ? name : DEFAULT_FONT;
  const vars = fontVars(pick);
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.dataset.font = pick;
  return pick;
}
