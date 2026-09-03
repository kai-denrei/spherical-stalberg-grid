// cine/kit.js — THE FIXED-STEP CLOCK, and the seam a capture harness drives.
//
// A cinematic has a fixed clock: frame N at F fps is t = N / F, exactly, on
// every run, on any machine. That is what lets scripts/cine-capture.mjs
// render a scene one frame at a time over CDP at any quality and encode the
// frames afterwards, and it is what makes two renders of the same rail the
// same clip. Nothing here touches performance.now().
//
// A scene installs itself with installCine({ seek }), where seek(t) sets the
// scene's state to time t, renders ONE frame synchronously, and returns. The
// kit wraps that: it holds the scene's own animation loop (so it stops
// racing the capture), hides the chrome, and resolves after the browser has
// presented the frame — one rAF after the render — so Page.captureScreenshot
// sees the frame that was asked for and not the one before it.
export function installCine({ seek, hold }) {
  const api = {
    held: false,
    seek(t) {
      if (!api.held) { api.held = true; hold(true); document.body.classList.add('cine-capture'); }
      seek(t);
      return new Promise((resolve) => requestAnimationFrame(() => resolve(t)));
    },
    release() {
      api.held = false; hold(false); document.body.classList.remove('cine-capture');
    },
  };
  window.__cine = api;
  return api;
}
