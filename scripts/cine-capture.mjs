#!/usr/bin/env node
/**
 * cine-capture — render a cinematic one frame at a time, headless, on the
 * real GPU, and encode it.
 *
 *   node scripts/cine-capture.mjs --url 'http://localhost:8144/#portal' \
 *        --seconds 12 --fps 30 --size 1920x1080 --out renders/gate
 *
 * Drives Chrome over CDP with Node's built-in WebSocket (no puppeteer; the
 * shape is blueprint-to-life's scripts/shot.js). The page must have called
 * installCine (src/cine/kit.js): each frame is `await __cine.seek(t)` then
 * Page.captureScreenshot, PNGs to <out>/f%05d.png, then ffmpeg to <out>.mp4.
 *
 * Chrome is launched WITHOUT the SwiftShader flags: headless on this Mac
 * uses ANGLE Metal on the M4 (measured 2026-09-03, portal bench ?bench=:
 * 45 Gfolds/s vs SwiftShader's 1.4). Add --swiftshader to force software.
 */
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) =>
  a.startsWith('--') ? [a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : '1'] : []).filter((x) => x.length));
const url = args.url;
const seconds = Number(args.seconds || 3), fps = Number(args.fps || 30);
const from = Number(args.from || 0);                 // start time on the rail (a still: --from 6 --seconds 0.034)
const [W, H] = (args.size || '1920x1080').split('x').map(Number);
const out = args.out || 'renders/clip';
const scale = Number(args.scale || 1);          // 2 = supersample, downscaled by ffmpeg
const stepMs = Number(args.stepms || 120000);   // a seek or a screenshot slower than this is a hang, not a render
const debug = !!args.debug;                     // echo the page's console as it arrives
if (!url) { console.error('usage: --url <page> [--seconds 3 --fps 30 --size 1920x1080 --out renders/x --scale 1 --swiftshader]'); process.exit(2); }
mkdirSync(out, { recursive: true });
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// --mode launch: ONE CHROME PER FRAME, plain headless --screenshot at ?t=T.
// Slower (a launch and the scene's own load per frame, ~3-5 s at the cinema
// tier) but it is the path that never hung: the CDP-driven page stalled on
// the M4 for any frame where the wormhole disc filled a canvas wider than
// ~1500 px, through every variant tried (filter, colour space, fence, rAF,
// flags), while plain headless drew the same frame at once. Headless=new
// keeps ~87 px of chrome above the viewport, so the window is taller than
// the frame by that much and the screenshot is cropped to the frame.
if ((args.mode || 'cdp') === 'launch') {
  const { execFileSync: run, spawnSync } = await import('node:child_process');
  const CHROME_BAR = Number(args.bar || 87);
  const frames = Math.round(seconds * fps);
  const sep = url.includes('?') ? '&' : '?';
  const [base, hash] = url.split('#');
  console.log(`cine-capture (launch mode): ${url} → ${out}  ${W}x${H} ${fps} fps × ${seconds}s = ${frames} frames`);
  const tStart = Date.now();
  for (let i = 0; i < frames; i++) {
    const t = from + i / fps;
    const f = join(out, `f${String(i).padStart(5, '0')}.png`);
    const u = `${base}${sep}t=${t}&once=1&dump=1${hash ? '#' + hash : ''}`;
    // the PNG arrives as PNGCHUNK console lines on Chrome's stderr; the
    // --screenshot flag only makes headless wait for the budget and exit
    const err = spawnSync(CHROME, ['--headless=new', `--window-size=${W * scale},${H * scale + CHROME_BAR}`, '--hide-scrollbars',
      '--enable-logging=stderr', '--v=0', '--timeout=60000', `--virtual-time-budget=${args.budget || 4000}`,
      `--screenshot=${f}.shot.png`, u], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).stderr || '';
    const chunks = new Map(); let total = 0;
    for (const m of err.matchAll(/PNGCHUNK (\d+)\/(\d+) ([A-Za-z0-9+/=]+)/g)) { chunks.set(Number(m[1]), m[3]); total = Number(m[2]); }
    if (!total || chunks.size !== total) { console.error(`frame ${i}: got ${chunks.size}/${total} chunks — the page did not draw (ready never true?)`); process.exit(1); }
    writeFileSync(f, Buffer.from(Array.from({ length: total }, (_, k) => chunks.get(k + 1)).join(''), 'base64'));
    try { run('rm', ['-f', `${f}.shot.png`]); } catch {}
    if (i % fps === 0 || i === frames - 1) {
      const el = (Date.now() - tStart) / 1000;
      process.stdout.write(`  frame ${i + 1}/${frames}  ${(el / (i + 1)).toFixed(2)} s/frame  eta ${((frames - i - 1) * el / (i + 1)).toFixed(0)}s\n`);
    }
  }
  const mp4 = `${out}.mp4`;
  const vf = scale > 1 ? ['-vf', `scale=${W}:${H}:flags=lanczos`] : [];
  run('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(out, 'f%05d.png'),
    ...vf, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', mp4], { stdio: 'inherit' });
  const info = run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_frames',
    '-show_entries', 'stream=nb_read_frames,width,height', '-of', 'csv=p=0', mp4]).toString().trim();
  console.log(`cine-capture: ${mp4}  [${info}]  ${((Date.now() - tStart) / 1000).toFixed(0)}s total`);
  process.exit(0);
}

// --window WxH: Chrome's window apart from the page's metrics (a 1920x1080
// WINDOW hung on a frame a 1280x720 one rendered; the canvas is what the
// read-back captures, so the window can be anything)
const [WW, WH] = (args.window || `${W * scale}x${H * scale}`).split('x').map(Number);
const flags = ['--headless=new', '--remote-debugging-port=0', `--window-size=${WW},${WH}`];
if (!args.minimal) flags.push('--hide-scrollbars', '--mute-audio', '--no-first-run');
if (args.chromelog) flags.push('--enable-logging=stderr', '--v=0');   // Chrome's own stderr → --chromelog <file>
if (args.swiftshader) flags.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader');
else if (args.angle) flags.push(`--use-angle=${args.angle}`);   // metal (default) | gl
const chrome = spawn(CHROME, [...flags, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const chromeLog = args.chromelog ? (await import('node:fs')).createWriteStream(args.chromelog) : null;
const port = await new Promise((resolve, reject) => {
  let buf = '';
  chrome.stderr.on('data', (d) => {
    if (chromeLog) chromeLog.write(d);
    buf += d;
    const m = buf.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);
    if (m) resolve(Number(m[1]));
  });
  chrome.on('exit', () => reject(new Error('chrome exited before DevTools was up')));
});
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
const consoleLines = [];
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id != null && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  } else if (msg.method === 'Runtime.consoleAPICalled') {
    const line = msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
    consoleLines.push(line);
    if (debug) console.log('  [page]', line.slice(0, 200));
  } else if (msg.method === 'Runtime.exceptionThrown' && debug) {
    console.log('  [page exception]', JSON.stringify(msg.params.exceptionDetails).slice(0, 300));
  }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const i = ++id; pending.set(i, { resolve, reject }); ws.send(JSON.stringify({ id: i, method, params }));
  setTimeout(() => {
    if (!pending.has(i)) return;
    pending.delete(i);
    reject(new Error(`${method} did not answer in ${stepMs} ms`));
  }, stepMs);
});
const evaluate = async (expression, awaitPromise = false) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
  return r.result.value;
};

await send('Runtime.enable');
await send('Page.enable');
// --nometrics: rely on --window-size alone (the override is a suspect when a
// frame that renders fine in plain headless hangs only under the harness)
if (!args.nometrics) await send('Emulation.setDeviceMetricsOverride', { width: W * scale, height: H * scale, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url });
// wait for the scene to install its seam
const t0 = Date.now();
while (!(await evaluate('typeof window.__cine === "object"'))) {
  if (Date.now() - t0 > 60000) { console.error('page never installed __cine'); chrome.kill(); process.exit(1); }
  await new Promise((r) => setTimeout(r, 250));
}
// a scene that exposes __cineReady() is waited for (models landing); others get 1.5 s
const tr = Date.now();
while (Date.now() - tr < 60000) {
  const ready = await evaluate('typeof window.__cineReady === "function" ? window.__cineReady() : null');
  if (ready === true || (ready === null && Date.now() - tr > 1500)) break;
  await new Promise((r) => setTimeout(r, 200));
}

const gl = await evaluate(`(() => { const c = document.querySelector('canvas'); const g = c && (c.getContext('webgl2') || c.getContext('webgl')); if (!g) return '?'; const e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER); })()`);
const frames = Math.round(seconds * fps);
console.log(`cine-capture: ${url} → ${out}  ${W}x${H}${scale > 1 ? ` (rendered at ${scale}x)` : ''} ${fps} fps × ${seconds}s = ${frames} frames  gl="${gl}"`);
const tStart = Date.now();
process.on('unhandledRejection', (e) => { console.error('cine-capture: ' + e.message); try { chrome.kill(); } catch {} process.exit(1); });
for (let i = 0; i < frames; i++) {
  const t = from + i / fps;
  if (debug) console.log(`  seek ${t.toFixed(3)}`);
  // the canvas read-back (no compositor involved) when the scene offers it;
  // the compositor screenshot for a page that only has seek()
  let png;
  const url = await evaluate(`typeof __cine.frame === 'function' ? __cine.frame(${t}) : null`, true);
  if (url) png = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
  else {
    await evaluate(`__cine.seek(${t})`, true);
    if (debug) console.log('  seek done, capturing');
    png = Buffer.from((await send('Page.captureScreenshot', { format: 'png', fromSurface: true })).data, 'base64');
  }
  writeFileSync(join(out, `f${String(i).padStart(5, '0')}.png`), png);
  if (i % fps === 0 || i === frames - 1) {
    const el = (Date.now() - tStart) / 1000;
    process.stdout.write(`  frame ${i + 1}/${frames}  ${(el / (i + 1)).toFixed(2)} s/frame  eta ${((frames - i - 1) * el / (i + 1)).toFixed(0)}s\n`);
  }
}
await evaluate('__cine.release()');
ws.close(); chrome.kill();
const mp4 = `${out}.mp4`;
const vf = scale > 1 ? ['-vf', `scale=${W}:${H}:flags=lanczos`] : [];
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(out, 'f%05d.png'),
  ...vf, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', mp4], { stdio: 'inherit' });
const info = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_frames',
  '-show_entries', 'stream=nb_read_frames,width,height,r_frame_rate', '-of', 'csv=p=0', mp4]).toString().trim();
console.log(`cine-capture: ${mp4}  [${info}]  ${((Date.now() - tStart) / 1000).toFixed(0)}s total`);
const errs = consoleLines.filter((l) => /error|uncaught/i.test(l));
if (errs.length) console.log('console errors during capture:\n  ' + errs.slice(0, 5).join('\n  '));
