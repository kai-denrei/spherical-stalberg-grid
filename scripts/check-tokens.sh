#!/bin/sh
# check-tokens.sh — cache-bust token guard.
#
# Two failure modes this repo keeps hitting (see CLAUDE.md):
#   1) split tokens — a partial commit after scripts/bust.sh leaves asset
#      files at different ?v= values, so a client can serve a stale module
#      alongside fresh ones. bust.sh stamps ONE token per run, so a healthy
#      tree has exactly one distinct ?v= value.
#   2) tokened vendor import — a ?v= on a ../vendor/ path makes the browser
#      load a second copy of three.js (the "multiple instances" bug); vendor
#      imports must stay token-free.
#
# Exits non-zero (with a report) on either. Run it by hand before a push, or
# let .githooks/pre-push run it for you (git config core.hooksPath .githooks).

root=$(git rev-parse --show-toplevel) || exit 2
cd "$root" || exit 2
fail=0

# 1. no ?v= on any vendor/ import
vend=$(grep -rnE "vendor/[^'\"]*\?v=" --include='*.js' --include='*.html' --exclude-dir=.git . 2>/dev/null)
if [ -n "$vend" ]; then
  echo "✗ tokened vendor import (a ?v= on vendor/ loads a 2nd copy of three.js):"
  echo "$vend"
  fail=1
fi

# 2. every ?v= cache-bust token must agree
toks=$(grep -rhoE "\?v=[0-9a-f]+" --include='*.js' --include='*.html' \
  --exclude-dir=vendor --exclude-dir=docs --exclude-dir=.git . 2>/dev/null | sort -u)
n=$(printf '%s\n' "$toks" | grep -c .)
if [ "$n" -gt 1 ]; then
  echo "✗ split cache-bust tokens — $n distinct values in the tree:"
  printf '   %s\n' "$toks"
  echo "  fix: ./scripts/bust.sh --quiet && git add -A   (commit ALL of bust's output)"
  fail=1
fi

if [ "$fail" -eq 0 ]; then
  echo "✓ cache-bust tokens OK (${toks:-none})"
fi
exit "$fail"
