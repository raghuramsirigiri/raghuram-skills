#!/bin/sh
# finalize.sh — finalize.js for a machine that may not have Node.
#
#   sh <skill-dir>/scripts/finalize.sh <video.html> --stage
#   sh <skill-dir>/scripts/finalize.sh <video.html>
#
# With `node` on PATH this hands straight to finalize.js: same checks, same
# output, same exit code. Without Node it does the steps that need no
# JavaScript, the way finalize.js does them: stage, inline every
# charts-lib/ and motion-lib/ script in the page's order (leaving audit.js
# out), remove the staged copies when they hold only what this skill
# stages. It cannot run check-video.js, so it says on stderr that the static
# checks were skipped. Pass that on when you hand the page over.
# Exit codes: 0 shipped (unchecked), 1 failed, 2 usage.
#
# Needs only sh and awk. FINALIZE_NO_NODE=1 forces the fallback (for tests).

usage='usage: sh finalize.sh <video.html> [--stage]'
SCRIPTS=$(cd "$(dirname "$0")" && pwd)

if [ -z "$FINALIZE_NO_NODE" ] && command -v node >/dev/null 2>&1; then
  exec node "$SCRIPTS/finalize.js" "$@"
fi

ASSETS="$SCRIPTS/../assets"
stage=; target=
for a in "$@"; do
  case "$a" in
    --stage) stage=1 ;;
    --*) ;;
    *) [ -z "$target" ] && target=$a ;;
  esac
done
[ -n "$target" ] || { echo "$usage" >&2; exit 2; }
[ -f "$target" ] || { echo "no such file: $target" >&2; exit 2; }
dir=$(cd "$(dirname "$target")" && pwd)
name=$(basename "$target")

if [ -n "$stage" ]; then
  mkdir -p "$dir/charts-lib" "$dir/motion-lib/scenes" "$dir/motion-lib/shapes" || exit 1
  cp "$ASSETS/charts-lib/theme.js" "$dir/charts-lib/" || exit 1
  cp "$ASSETS/motion-lib/"*.js "$dir/motion-lib/" || exit 1
  cp "$ASSETS/motion-lib/scenes/"*.js "$dir/motion-lib/scenes/" || exit 1
  cp "$ASSETS/motion-lib/shapes/"*.js "$dir/motion-lib/shapes/" || exit 1
  echo "staged charts-lib/ and motion-lib/ beside $name — open the page over http and run the audit (SKILL.md step 7)."
  echo "note: Node was not found, so check-video.js cannot run on this machine." >&2
  exit 0
fi

export LC_ALL=C
tmp="$target.finalize-tmp"
trap 'rm -f "$tmp"' EXIT
awk -v BINMODE=3 -v ASSETS="$ASSETS" '
  function slurp(f,   s) { s = ""; if ((getline s < f) <= 0) s = ""; close(f); return s }
  BEGIN { RS = "\001" }
  { html = $0 }
  END {
    out = ""
    while (match(html, /<script src="(charts-lib|motion-lib)\/[A-Za-z0-9_\/.-]+\.js"><\/script>\n?/)) {
      tag = substr(html, RSTART, RLENGTH)
      file = tag; sub(/^<script src="/, "", file); sub(/"><\/script>\n?$/, "", file)
      rel = file; sub(/^(charts-lib|motion-lib)\//, "", rel)
      lib = (file ~ /^charts-lib\//) ? "charts-lib" : "motion-lib"
      out = out substr(html, 1, RSTART - 1)
      html = substr(html, RSTART + RLENGTH)
      if (rel == "audit.js") continue
      src = slurp(ASSETS "/" lib "/" rel)
      if (src == "") { print "cannot inline " file ": no such file in the skill" > "/dev/stderr"; exit 1 }
      if (index(src, "</script")) { print "refusing to inline " file ": it contains a literal </script" > "/dev/stderr"; exit 1 }
      sub(/[ \t\r\n]+$/, "", src)
      out = out "<script>\n" src "\n</script>\n"; done++
    }
    if (!done) exit 3
    printf "%s", out html
  }' "$target" > "$tmp"
case $? in
  0) cat "$tmp" > "$target" || exit 1; echo "$name: inlined, standalone" ;;
  3) echo "$name: already standalone, nothing to inline" ;;
  *) exit 1 ;;
esac

if grep -Eq '<script src="(charts-lib|motion-lib)/' "$target"; then
  echo "$name still loads charts-lib/ or motion-lib/ after inlining" >&2; exit 1
fi

if [ -d "$dir/charts-lib" ] && [ "$(ls -A "$dir/charts-lib")" = "theme.js" ]; then
  rm -rf "$dir/charts-lib" && echo "removed the staged charts-lib/"
fi
if [ -d "$dir/motion-lib" ]; then
  ours=yes
  for f in $(cd "$dir/motion-lib" && find . -type f | sed 's|^\./||'); do
    [ -f "$ASSETS/motion-lib/$f" ] || ours=no
  done
  if [ $ours = yes ]; then rm -rf "$dir/motion-lib" && echo "removed the staged motion-lib/"
  else echo "left motion-lib/ alone: it holds files this skill does not stage."; fi
fi

echo "UNCHECKED: Node was not found, so check-video.js did not run — the page is standalone but its" \
  "static checks were skipped. Say so when you hand it over." >&2
exit 0
