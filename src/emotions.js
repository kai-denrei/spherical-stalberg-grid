// emotions.js — Isao's face, ported VERBATIM from the Braille lab's emotion
// module (~/Dev/Braille/emotions/emotions.json). Twenty-one authored
// expressions, each an 8x8 dot matrix; multi-frame entries are animations at
// their own declared fps.
//
// Copied rather than redrawn, and the house rule for the lab applies here
// too: the lab keeps improving, and re-porting should stay MECHANICAL. If an
// expression changes there, regenerate this file from that JSON — do not
// hand-edit a matrix, or the two drift and the lab stops being the source.
//
// The dot grid is the whole point. A face built from a fixed lattice reads
// as something a machine drew with the parts it had, which is exactly what
// Isao is doing: he has a CRT and no font.
//
// Pure data plus pure lookups. No DOM, no three.js — Node-testable, and the
// drawing happens where the canvas is.

export const EMOTIONS = [
  { id: 'neutral', label: 'Neutral', group: 'base',
    fps: 4, frames: [[[0,0,0,0,0,0,0,0],[0,1,1,0,0,1,1,0],[0,0,0,0,0,0,0,0],[0,1,0,0,0,0,1,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,1,1,1,1,1,1,0],[0,0,0,0,0,0,0,0]]] },
  { id: 'happy', label: 'Happy', group: 'positive',
    fps: 4, frames: [[[0,0,1,0,0,1,0,0],[0,1,0,0,0,0,1,0],[0,0,0,0,0,0,0,0],[0,0,1,0,0,1,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,1,0,0,0,0,1,0],[0,0,1,1,1,1,0,0]]] },
  { id: 'glee', label: 'Glee', group: 'positive',
    fps: 4, frames: [[[0,1,1,0,0,1,1,0],[0,0,0,0,0,0,0,0],[0,1,1,0,0,1,1,0],[0,1,1,0,0,1,1,0],[0,0,0,0,0,0,0,0],[1,0,0,0,0,0,0,1],[0,1,0,0,0,0,1,0],[0,0,1,1,1,1,0,0]]] },
  { id: 'awe', label: 'Awe', group: 'positive',
    fps: 4, frames: [[[0,1,1,0,0,1,1,0],[0,0,0,0,0,0,0,0],[0,1,1,0,0,1,1,0],[0,1,1,0,0,1,1,0],[0,0,0,0,0,0,0,0],[0,0,1,1,1,1,0,0],[0,0,1,0,0,1,0,0],[0,0,1,1,1,1,0,0]]] },
  { id: 'sad', label: 'Sad', group: 'negative',
    fps: 4, frames: [[[0,0,0,0,0,0,0,0],[0,0,1,0,0,1,0,0],[0,1,0,0,0,0,1,0],[0,0,1,0,0,1,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,1,1,1,1,0,0],[0,1,0,0,0,0,1,0]]] },
  { id: 'worried', label: 'Worried', group: 'negative',
    fps: 4, frames: [[[0,0,0,0,0,0,0,0],[0,0,1,0,0,1,0,0],[0,1,0,0,0,0,1,0],[0,1,0,0,0,0,1,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,1,1,1,1,0,0],[0,0,0,0,0,0,0,0]]] },
  { id: 'scared', label: 'Scared', group: 'negative',
    fps: 4, frames: [[[0,0,1,0,0,1,0,0],[0,1,0,0,0,0,1,0],[0,1,1,0,0,1,1,0],[0,1,1,0,0,1,1,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,1,1,0,0,0],[0,0,0,1,1,0,0,0]]] },
  { id: 'angry', label: 'Angry', group: 'assertive',
    fps: 4, frames: [[[0,0,0,0,0,0,0,0],[1,0,0,0,0,0,0,1],[0,1,0,0,0,0,1,0],[0,0,1,0,0,1,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,1,1,1,1,0,0],[0,0,0,0,0,0,0,0]]] },
  { id: 'frustrated', label: 'Frustrated', group: 'assertive',
    fps: 4, frames: [[[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,1,1,0,0,1,1,0],[0,0,1,0,0,1,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,1,1,1,1,1,1,0],[0,0,0,0,0,0,0,0]]] },
  { id: 'focused', label: 'Focused', group: 'assertive',
    fps: 4, frames: [[[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,1,1,0,0,1,1,0],[0,0,1,0,0,1,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0]]] },
  { id: 'unimpressed', label: 'Unimpressed', group: 'withdrawn',
    fps: 4, frames: [[[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,1,1,0,0,1,1,0],[0,0,1,0,0,1,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[1,1,1,1,1,1,1,1],[0,0,0,0,0,0,0,0]]] },
  { id: 'skeptical', label: 'Skeptical', group: 'withdrawn',
    fps: 4, frames: [[[0,1,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,1,1,0],[0,1,0,0,0,0,1,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,1,1,1,0,0],[0,0,0,0,0,0,0,0]]] },
  { id: 'suspicious', label: 'Suspicious', group: 'withdrawn',
    fps: 4, frames: [[[0,0,0,0,0,0,0,0],[0,1,0,0,0,0,0,1],[0,0,0,0,0,1,0,0],[0,0,1,0,0,1,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,1,1,1,1,1,1,0],[0,0,0,0,0,0,0,0]]] },
  { id: 'surprised', label: 'Surprised', group: 'reactive',
    fps: 4, frames: [[[0,1,1,0,0,1,1,0],[0,0,0,0,0,0,0,0],[0,1,1,0,0,1,1,0],[0,1,1,0,0,1,1,0],[0,0,0,0,0,0,0,0],[0,0,1,1,1,1,0,0],[0,0,1,0,0,1,0,0],[0,0,1,1,1,1,0,0]]] },
  { id: 'sleepy', label: 'Sleepy', group: 'reactive',
    fps: 4, frames: [[[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,1,0,0,1,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,1,1,1,1,0,0],[0,0,0,0,0,0,0,0]]] },
  { id: 'blink', label: 'Blink', group: 'reactive',
    fps: 2, frames: [[[0,0,0,0,0,0,0,0],[0,1,1,0,0,1,1,0],[0,0,0,0,0,0,0,0],[0,0,1,0,0,1,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,1,1,1,1,1,1,0],[0,0,0,0,0,0,0,0]],[[0,0,0,0,0,0,0,0],[0,1,1,0,0,1,1,0],[0,0,0,0,0,0,0,0],[0,0,1,0,0,1,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,1,1,1,1,1,1,0],[0,0,0,0,0,0,0,0]],[[0,0,0,0,0,0,0,0],[0,1,1,0,0,1,1,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,1,1,1,1,1,1,0],[0,0,0,0,0,0,0,0]]] },
  { id: 'scan', label: 'Scan', group: 'reactive',
    fps: 2, frames: [[[0,0,0,0,0,0,0,0],[0,1,1,0,0,1,1,0],[0,0,0,0,0,0,0,0],[1,0,0,0,1,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,1,1,1,1,1,1,0],[0,0,0,0,0,0,0,0]],[[0,0,0,0,0,0,0,0],[0,1,1,0,0,1,1,0],[0,0,0,0,0,0,0,0],[0,0,1,0,0,1,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,1,1,1,1,1,1,0],[0,0,0,0,0,0,0,0]],[[0,0,0,0,0,0,0,0],[0,1,1,0,0,1,1,0],[0,0,0,0,0,0,0,0],[0,0,0,1,0,0,0,1],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,1,1,1,1,1,1,0],[0,0,0,0,0,0,0,0]],[[0,0,0,0,0,0,0,0],[0,1,1,0,0,1,1,0],[0,0,0,0,0,0,0,0],[0,0,1,0,0,1,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,1,1,1,1,1,1,0],[0,0,0,0,0,0,0,0]]] },
  { id: 'curious', label: 'Curious', group: 'reactive',
    fps: 4, frames: [[[0,1,0,0,0,0,0,0],[0,0,0,0,0,1,1,0],[0,0,0,0,0,0,0,0],[0,1,0,0,0,0,1,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,1,0,0,0,0,1,0],[0,0,1,1,1,1,0,0]]] },
  { id: 'determined', label: 'Determined', group: 'reactive',
    fps: 4, frames: [[[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[1,1,1,0,0,1,1,1],[0,0,1,0,0,1,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,1,1,0,0,0],[0,0,0,0,0,0,0,0]]] },
  { id: 'grin', label: 'Grin', group: 'special',
    fps: 4, frames: [[[0,0,0,0,0,0,0,0],[0,1,1,0,0,1,1,0],[0,0,0,0,0,0,0,0],[0,0,1,0,0,1,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[1,1,1,1,1,1,1,1],[0,1,0,1,0,1,0,1]]] },
  { id: 'love', label: 'Love', group: 'special',
    fps: 4, frames: [[[0,0,1,0,0,1,0,0],[0,1,0,1,1,0,1,0],[1,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,1],[0,1,0,0,0,0,1,0],[0,0,1,0,0,1,0,0],[0,0,0,1,1,0,0,0]]] },
];

// --- PHOSPHOR COLOUR ------------------------------------------------------
// NOT part of the port. The matrices above come from the lab verbatim and
// must stay that way; this is our own layer on top, so a re-port overwrites
// the data and leaves this alone.
//
// Kept simple on the operator's instruction: green is the tube's normal
// colour, red is anger, blue is sorrow. Three states, and a screen that has
// gone red is readable from across the board without reading the face at
// all — which is the point of colouring it rather than trusting an 8x8 grid
// to carry the whole message at distance.
export const PHOSPHORS = {
  green: { core: '#dfffe9', mid: '#7dff9e', bleed: '125, 255, 158', ground: '#07160e' },
  red: { core: '#ffe2e2', mid: '#ff6a6a', bleed: '255, 106, 106', ground: '#180808' },
  blue: { core: '#e2f0ff', mid: '#6ab4ff', bleed: '106, 180, 255', ground: '#070f18' },
};

const EMOTION_PHOSPHOR = {
  angry: 'red',
  frustrated: 'red',
  sad: 'blue',
};

export const phosphorFor = (id) => PHOSPHORS[EMOTION_PHOSPHOR[id] || 'green'];

export const EMOTION_IDS = EMOTIONS.map((e) => e.id);
const BY_ID = new Map(EMOTIONS.map((e) => [e.id, e]));

export function emotion(id) {
  return BY_ID.get(id) || BY_ID.get('neutral');
}

// Which frame an animation is showing at time t. Static expressions have one
// frame and ignore the clock entirely, so a caller never has to ask which
// kind it is holding.
export function emotionFrame(id, t = 0) {
  const e = emotion(id);
  if (e.frames.length === 1) return e.frames[0];
  const i = Math.floor(t * e.fps) % e.frames.length;
  return e.frames[i];
}

export const isAnimated = (id) => emotion(id).frames.length > 1;
