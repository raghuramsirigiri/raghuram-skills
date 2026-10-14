#!/bin/sh
# finalize.sh — finalize.js for a machine that may not have Node.
#
#   sh <skill-dir>/scripts/finalize.sh <page.html> --stage
#   sh <skill-dir>/scripts/finalize.sh <page.html>
#
# With `node` on PATH this hands straight to finalize.js: same checks, same
# output, same exit code. Use it in place of `node finalize.js` whenever you
# are not sure Node is there.
#
# Without Node it does every step that needs no JavaScript, byte for byte the
# way finalize.js does them: stage the library, inline it, remove the staged
# copy only when it holds exactly what this skill stages, and split an
# editable page into its final copy and working copy. What it cannot do is run
# check-page.js — so it confirms only that no `charts-lib/` reference is left,
# and says on stderr that the static checks were skipped. Pass that on when
# you hand the page over. Exit codes: 0 shipped (unchecked), 1 failed,
# 2 usage.
#
# Needs only sh and awk. FINALIZE_NO_NODE=1 forces the fallback (for tests).
# finalize.ps1 is the same fallback for Windows PowerShell.

usage='usage: sh finalize.sh <page.html> [--stage]'
SCRIPTS=$(cd "$(dirname "$0")" && pwd)

if [ -z "$FINALIZE_NO_NODE" ] && command -v node >/dev/null 2>&1; then
  exec node "$SCRIPTS/finalize.js" "$@"
fi

ASSETS="$SCRIPTS/../assets"
LIB="$ASSETS/charts-lib"
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

staged="$(cd "$(dirname "$target")" && pwd)/charts-lib"
name=$(basename "$target")

# ── stage: put the library beside the page so it can be opened ───────
if [ -n "$stage" ]; then
  mkdir -p "$staged" || exit 1
  for f in charts.css charts.js theme.js; do cp "$LIB/$f" "$staged/$f" || exit 1; done
  for f in chart-convert.js page-runtime.js page-editor.js email-snapshot.js audit.js; do
    cp "$ASSETS/$f" "$staged/$f" || exit 1
  done
  echo "staged charts-lib/ beside $name — open the page and run the audit in it" \
    "(charts-lib/audit.js; see SKILL.md step 7), then run this without --stage to ship it."
  echo "note: Node was not found, so the static checks (check-page.js) cannot run on this machine." >&2
  exit 0
fi

# Every awk below reads whole files as one record (RS is a byte no HTML or
# library file contains) in the C locale, so offsets are bytes and nothing is
# re-encoded or gains a newline. BINMODE=3 stops a Windows gawk dropping CRs.
export LC_ALL=C
tmp="$target.finalize-tmp"
trap 'rm -f "$tmp"' EXIT

# ── 1. fold the library into the page (inline-lib.js) ────────────────
awk -v BINMODE=3 -v LIB="$LIB" -v ASSETS="$ASSETS" '
  function slurp(f,   s) { s = ""; if ((getline s < f) <= 0) s = ""; close(f); return s }
  function put(tag, f, op, cl, bad,   i, src) {
    i = index(html, tag); if (!i) return
    src = slurp(f)
    if (index(src, bad)) {
      n = split(f, parts, "/")
      print "refusing to inline " parts[n] ": it contains a literal " bad > "/dev/stderr"; failed = 1; return
    }
    html = substr(html, 1, i - 1) op "\n" src "\n" cl substr(html, i + length(tag)); done++
  }
  BEGIN { RS = "\001" }
  { html = $0 }
  END {
    put("<link rel=\"stylesheet\" href=\"charts-lib/charts.css\">", LIB "/charts.css", "<style>", "</style>", "</style")
    put("<script src=\"charts-lib/theme.js\"></script>",          LIB "/theme.js",            "<script>", "</script>", "</script")
    put("<script src=\"charts-lib/charts.js\"></script>",         LIB "/charts.js",           "<script>", "</script>", "</script")
    put("<script src=\"charts-lib/chart-convert.js\"></script>",  ASSETS "/chart-convert.js", "<script>", "</script>", "</script")
    put("<script src=\"charts-lib/page-runtime.js\"></script>",   ASSETS "/page-runtime.js",  "<script>", "</script>", "</script")
    put("<script src=\"charts-lib/page-editor.js\"></script>",    ASSETS "/page-editor.js",   "<script>", "</script>", "</script")
    put("<script src=\"charts-lib/email-snapshot.js\"></script>", ASSETS "/email-snapshot.js","<script>", "</script>", "</script")
    if (failed) exit 1
    if (!done) exit 3
    printf "%s", html
  }' "$target" > "$tmp"
case $? in
  0) cat "$tmp" > "$target" || exit 1
     echo "$name: inlined, $(( ($(wc -c < "$target") + 512) / 1024 )) KB, standalone" ;;
  3) echo "$name: already standalone, nothing to inline" ;;
  *) exit 1 ;;
esac

# ── 2. the one --final check that needs no JavaScript ────────────────
if grep -Eq '(src|href)="charts-lib/' "$target"; then
  echo "$name still references charts-lib/ after inlining:" >&2
  grep -En '(src|href)="charts-lib/' "$target" >&2
  exit 1
fi

# ── 3. remove the staged copy, if it is ours to remove ───────────────
if [ -d "$staged" ]; then
  found=$(ls -A "$staged" | sort | tr '\n' ' ')
  L='charts.css charts.js theme.js'
  ours=no
  for set in "$L" "$L page-runtime.js" "$L chart-convert.js page-runtime.js" \
             "$L chart-convert.js page-runtime.js page-editor.js" \
             "$L chart-convert.js page-runtime.js page-editor.js audit.js" \
             "$L chart-convert.js page-runtime.js page-editor.js email-snapshot.js audit.js"; do
    [ "$found" = "$(printf '%s\n' $set | sort | tr '\n' ' ')" ] && ours=yes
  done
  if [ $ours = yes ]; then
    rm -rf "$staged" && echo "removed the staged charts-lib/ — nothing references it now."
  else
    echo "left charts-lib/ alone: it holds $(echo $found | sed 's/ /, /g'), which is not what this skill stages." \
      "Delete it yourself if it is a leftover."
  fi
fi

# ── 4. an editable page ships as two files (see finalize.js step 5) ──
awk -v BINMODE=3 '
  BEGIN { RS = "\001" }
  { html = $0 }
  END {
    if (!match(html, /<script>[ \t\r\n\f\v]*\/\*![ \t\r\n\f\v]*\n[ \t\r\n\f\v]*\*[ \t\r\n\f\v]*page-editor\.js/)) exit 3
    s = RSTART; rest = substr(html, s)
    e = index(rest, "</script>"); if (!e) exit 3
    e = s + e - 1 + length("</script>")
    while (substr(html, e, 1) ~ /[ \t\r\n\f\v]/) e++
    fin = substr(html, 1, s - 1) substr(html, e)
    if (index(fin, "<meta name=\"page-edition\"") == 0 && match(fin, /<[hH][eE][aA][dD]>/))
      fin = substr(fin, 1, RSTART + 5) "\n<meta name=\"page-edition\" content=\"final\">" substr(fin, RSTART + 6)
    printf "%s", fin
  }' "$target" > "$tmp"
if [ $? -eq 0 ]; then
  ext=; case "$name" in *.*) ext=".${name##*.}" ;; esac
  base=$(printf '%s' "${target%"$ext"}" | sed 's/ ([Ww][Oo][Rr][Kk][Ii][Nn][Gg] [Cc][Oo][Pp][Yy])$//')
  working="$base (working copy)$ext"; final="$base$ext"
  if [ "$target" != "$working" ]; then cat "$target" > "$working" || exit 1; fi
  cat "$tmp" > "$final" || exit 1
  [ "$target" != "$final" ] && [ "$target" != "$working" ] && rm -f "$target"
  echo "editable page: wrote $(basename "$final") (final, to share) and $(basename "$working") (editable working copy)"
fi

echo "UNCHECKED: Node was not found, so check-page.js did not run — the page is standalone but its" \
  "static checks were skipped. Say so when you hand it over." >&2
exit 0
