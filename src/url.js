// url.js — MAKE `#tab?a=1` MEAN `?a=1#tab`, once, before anything reads it.
//
// Every tab reads `location.search` (24 files do). A URL written the other
// way round — `#units?unitgroup=hostile&unit=jelly` — puts the query INSIDE
// the fragment, where `location.search` is empty and every parameter is
// silently ignored. The tab opens on its default and looks broken.
//
// That is not a hypothetical: it has now cost three separate debugging
// sessions — the astronaut crew (`#astro?path=crew`), the shooting lab, and
// the units viewer — and each time the answer was "you typed it wrong", which
// is a poor answer when the wrong form is the one people keep typing. It is
// also the more natural form to type, because the tab comes first when you
// think about where you are going.
//
// So the URL is normalised at boot instead: the fragment's query is lifted
// into the real search string and the two are merged, with the SEARCH winning
// on a genuine collision (it is the more explicit place to have put it).
// history.replaceState does it without a reload, so this costs nothing and no
// tab has to learn about it.
//
// THIS MODULE MUST BE IMPORTED FIRST — before roster.js, which is itself first
// for its own reason and reads location.search during module evaluation.
// Anything that reads a parameter before this runs sees the un-normalised URL.
// The merge itself, pure and exported, so the rule can be tested rather than
// trusted: SEARCH WINS on a genuine collision. Returns { search, hash }.
export function mergeHashQuery(search, hash) {
  const h = (hash || '').replace(/^#/, '');
  if (!h.includes('?')) return { search: search || '', hash: h };
  const [frag, ...rest] = h.split('?');
  const fromHash = new URLSearchParams(rest.join('?'));
  const merged = new URLSearchParams(search || '');
  for (const [k, v] of fromHash) if (!merged.has(k)) merged.set(k, v);
  const qs = merged.toString();
  return { search: qs ? `?${qs}` : '', hash: frag };
}

if (typeof location !== 'undefined' && location.hash.includes('?')) {
  const { search, hash } = mergeHashQuery(location.search, location.hash);
  try {
    history.replaceState(null, '',
      `${location.pathname}${search}${hash ? `#${hash}` : ''}`);
  } catch { /* a file:// origin refuses replaceState; the URL stays as typed */ }
}
