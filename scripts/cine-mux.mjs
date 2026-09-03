#!/usr/bin/env node
/**
 * cine-mux — lay a scene's sound rail (src/cine/sound.js) onto a finished
 * clip with ffmpeg. The same cues the cine tab plays live, so the clip and
 * the tab cannot drift.
 *
 *   node scripts/cine-mux.mjs --scene gate --in renders/gate-film-1080p.mp4 [--out renders/gate-film-1080p-sound.mp4] [--audio assets/audio]
 *
 * Each cue becomes one input delayed by its t (adelay), scaled by its gain
 * (volume); amix sums them with no normalisation (each cue keeps its
 * level), and -shortest trims the mix to the picture.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { SOUND_RAILS } from '../src/cine/sound.js';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) =>
  a.startsWith('--') ? [a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : '1'] : []).filter((x) => x.length));
const scene = args.scene, inp = args.in;
if (!scene || !inp) { console.error('usage: --scene gate|planet|tank --in clip.mp4 [--out x.mp4 --audio assets/audio]'); process.exit(2); }
const rail = SOUND_RAILS[scene];
if (!rail) { console.error(`no rail for scene "${scene}"`); process.exit(2); }
const audioDir = args.audio || 'assets/audio';
const out = args.out || inp.replace(/\.mp4$/, '') + '-sound.mp4';

if (!rail.length) {
  // space silence: a silent track keeps players that expect audio happy
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', inp, '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
    '-c:v', 'copy', '-c:a', 'aac', '-shortest', out], { stdio: 'inherit' });
  console.log(`cine-mux: ${out} (silence)`);
  process.exit(0);
}

const inputs = ['-i', inp];
const filters = [];
rail.forEach((c, i) => {
  const f = `${audioDir}/${c.key}.mp3`;
  if (!existsSync(f)) { console.error(`missing ${f}`); process.exit(1); }
  inputs.push('-i', f);
  const ms = Math.round(c.t * 1000);
  filters.push(`[${i + 1}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=${c.gain ?? 1},adelay=${ms}|${ms}[a${i}]`);
});
const mix = rail.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${rail.length}:normalize=0:dropout_transition=0[mix]`;
filters.push(mix);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filters.join(';'),
  '-map', '0:v', '-map', '[mix]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', out], { stdio: 'inherit' });
const info = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name', '-of', 'csv=p=0', out]).toString().trim().replace(/\n/g, ' ');
console.log(`cine-mux: ${out}  [${info}]  ${rail.length} cues`);
