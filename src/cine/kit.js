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
export function installCine({ seek, hold, canvas = null }) {
  const api = {
    held: false,
    seek(t) {
      if (!api.held) { api.held = true; hold(true); document.body.classList.add('cine-capture'); }
      seek(t);
      return new Promise((resolve) => requestAnimationFrame(() => resolve(t)));
    },
    // frame(t): seek, then read the canvas back IN THE SAME TASK — the drawing
    // buffer is intact until the compositor's next swap, so this needs no
    // presented frame. Page.captureScreenshot waits for the compositor, and
    // on a full-frame 2048² tunnel at 1080p it waited forever (a still at
    // t=1.5 hung twice where t=7 rendered in 0.9 s). This path does not.
    // ...and it renders INSIDE an animation frame, never from the CDP task
    // that asked. Drawing a wide canvas from outside the frame cycle hung
    // the M4 (headless real time, ANGLE Metal, canvas >= ~1500 px wide,
    // every filter/colour-space/fence variant, ~25 runs); the same frame
    // drawn by the page's own rAF rendered at once. Chrome presents big
    // canvases as compositor overlays, and a draw outside the frame cycle
    // deadlocks against that. The read-back stays in the same callback as
    // the draw, so the drawing buffer is still intact.
    frame(t) {
      if (!api.held) { api.held = true; hold(true); document.body.classList.add('cine-capture'); }
      return new Promise((resolve, reject) => requestAnimationFrame(() => {
        try { seek(t); resolve(canvas ? canvas.toDataURL('image/png') : null); } catch (e) { reject(e); }
      }));
    },
    release() {
      api.held = false; hold(false); document.body.classList.remove('cine-capture');
    },
  };
  window.__cine = api;
  return api;
}
