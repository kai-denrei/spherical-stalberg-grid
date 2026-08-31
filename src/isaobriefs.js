// isaobriefs.js — what Isao says, and the face he says it with.
//
// Pure data. The presenter lives with the DOM in td-tab; the script lives
// here so it can be read, argued with and rewritten without touching the
// game, and so a translator or a voice pass has one file to work from.
//
// TEXT ONLY for now, by the operator's instruction. Every beat is written
// so a line is a LINE — one breath, one thought — because these are going
// to be spoken eventually (fish audio, on the operator's Ubuntu box) and a
// paragraph that reads fine is a paragraph nobody can perform.
//
// `face` is an emotion id from emotions.js. `once` means the beat fires a
// single time per browser, ever, and is remembered; the rest can repeat.

export const BRIEFS = {
  // 0 — the printer. Fires the first time an order goes on the book, which
  // is the first moment the mechanic is a thing the player has DONE rather
  // than a thing they have been told.
  printer: {
    id: 'printer',
    face: 'focused',
    title: 'HOW THIS WORKS',
    once: true,
    lines: [
      'You have ordered a tower. I will build it. That is the arrangement.',
      'I fly there. I hang over the cell. I print it out of rendered biomass, '
        + 'one layer at a time, at the pace the material sets.',
      'The pace is not negotiable. I have tried.',
      'So: two clocks between you wanting a thing and having it. How far I '
        + 'must fly, and how long it takes to set. Order accordingly.',
    ],
  },

  // 2 — the relay. The single most under-signposted thing on the board: it
  // sits at the far pole and nothing tells you it is there.
  relay: {
    id: 'relay',
    face: 'surprised',
    title: 'I SPOTTED A SERVER ROOM',
    once: true,
    lines: [
      'Structure at the antipode. Powered. Not ours.',
      'You should check it out — it might have interesting data for me to use.',
      'Drive to it and I will get us in. Whatever is on it, I can print from.',
    ],
  },

  // 3 — the ask. Fires when an order is refused for want of biomass, which
  // is the moment the sentence is useful rather than merely charming.
  biomass: {
    id: 'biomass',
    face: 'hungry',
    title: 'BRING ME MORE BIOMASS',
    lines: [
      'Empty. The reservoir is empty.',
      'I cannot print what I am not given. Kill something and bring me what '
        + 'is left of it.',
      'Biomass! ISAO happy!',
    ],
  },

  // the gates, said once, because "shoot it three times" is the shortest
  // rule in the game and nobody has ever been told it
  gates: {
    id: 'gates',
    face: 'determined',
    title: 'THE GATES',
    once: true,
    lines: [
      'The sector sends a fixed number of waves. When they are spent, no '
        + 'more come.',
      'The gates are not armoured. Three shells from close and one is down — '
        + 'at any point, not only at the end.',
      'But every gate you close early is a wave that never arrives. And the '
        + 'biomass in that wave never arrives either.',
      'Your call. I only build what you can pay for.',
    ],
  },
};

export const BRIEF_IDS = Object.keys(BRIEFS);
export const brief = (id) => BRIEFS[id] || null;
