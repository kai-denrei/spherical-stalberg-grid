#!/usr/bin/env bash
# check-emoji.sh — NO EMOJI IN THIS PROJECT (operator, 2026-09-06: a chain
# emoji on the deep-link button "stands out in a bad way").
#
# The distinction this enforces is presentation, not Unicode block. The whole
# interface is built out of MONOCHROME dingbats — ⬢ ⬤ ✦ ⧉ ⇄ ♥ ⌖ ◉ ◈ ▮ — and
# those stay. What is banned is anything a platform renders as a COLOUR
# pictograph, because one full-colour glyph in a terminal-green HUD is louder
# than every deliberate thing on the screen.
#
# Also banned: U+FE0F, the emoji-presentation selector. It is invisible in a
# diff and it is exactly how a monochrome dingbat silently becomes an emoji.
set -euo pipefail
cd "$(dirname "$0")/.."
BAD=$(python3 - <<'PY'
import re, os, subprocess
rng = re.compile(
  '[\U0001F000-\U0001FAFF]'          # pictographs, transport, supplemental symbols
  '|[\U0001F1E6-\U0001F1FF]'         # regional indicators (flags)
  '|️'                          # the emoji-presentation selector itself
  '|[☀-➿]️'           # a dingbat forced to emoji presentation
)
files = subprocess.run(['git','ls-files'],capture_output=True,text=True).stdout.split()
SKIP = ('.png','.jpg','.jpeg','.glb','.mp3','.ogg','.wav','.woff','.woff2','.ttf','.zip','.webm','.mp4','.ico')
out=[]
for p in files:
    if p.endswith(SKIP) or p.startswith('vendor/') or p.startswith('minigames/'): continue
    try: t=open(p,encoding='utf-8').read()
    except Exception: continue
    for i,line in enumerate(t.split('\n'),1):
        for m in rng.findall(line):
            out.append(f'{p}:{i}: {m!r}  {line.strip()[:90]}')
print('\n'.join(out))
PY
)
if [ -n "$BAD" ]; then
  echo "✗ emoji found — this project uses monochrome dingbats only:"
  echo "$BAD"
  exit 1
fi
echo "✓ no emoji"
