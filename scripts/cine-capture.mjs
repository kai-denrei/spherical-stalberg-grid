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
if (!url) { console.error('usage: --url <page> [--seconds 3 --fps 30 --size 1920x1080 --out renders/x --scale 1 --swiftshader]'); process.exit(2); }
mkdirSync(out, { recursive: true });

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const flags = ['--headless=new', '--remote-debugging-port=0', `--window-size=${W * scale},${H * scale}`,
  '--hide-scrollbars', '--mute-audio', '--no-first-run'];
if (args.swiftshader) flags.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader');
const chrome = spawn(CHROME, [...flags, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const port = await new Promise((resolve, reject) => {
  let buf = '';
  chrome.stderr.on('data', (d) => {
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
    consoleLines.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
  }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const i = ++id; pending.set(i, { resolve, reject }); ws.send(JSON.stringify({ id: i, method, params }));
});
const evaluate = async (expression, awaitPromise = false) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
  return r.result.value;
};

await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W * scale, height: H * scale, deviceScaleFactor: 1, mobile: false });
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
for (let i = 0; i < frames; i++) {
  const t = from + i / fps;
  await evaluate(`__cine.seek(${t})`, true);
  const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync(join(out, `f${String(i).padStart(5, '0')}.png`), Buffer.from(shot.data, 'base64'));
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
