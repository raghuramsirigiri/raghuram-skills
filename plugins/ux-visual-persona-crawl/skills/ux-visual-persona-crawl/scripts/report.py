#!/usr/bin/env python3
"""Turn recorded persona crawls into flow analysis, verified findings and a report.

  analyze  --study-dir DIR   navigation.json, flows.json, demographics.json, feedback.json
  verify   --study-dir DIR   check findings.json against the recordings -> verified_findings.json
  render   --study-dir DIR   report.html and report.md
  export   --study-dir DIR   issues/F1.md ... (one ticket per verified finding) and findings.csv
  compare  --study-dir DIR --baseline OLD   before/after: compare.json and compare.html

Runs under the project's .ux-visual-crawl venv (Pillow is used for evidence crops).
Every number in the report is computed here from journey.json files, so it can be traced.
"""
import argparse
import base64
import html
import io
import json
import re
import sys
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlsplit

import os

LONG_PREFIX = "\\\\?\\"


def lp(path) -> Path:
    """Extended-length form on Windows, so studies in deep folders still read and write."""
    path = Path(path)
    if os.name != "nt" or str(path).startswith(LONG_PREFIX):
        return path
    return Path(LONG_PREFIX + os.path.abspath(str(path)))


def shown(path) -> str:
    text = str(path)
    return text[len(LONG_PREFIX):] if text.startswith(LONG_PREFIX) else text

for stream in (sys.stdout, sys.stderr):
    try:
        stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

SEV_ORDER = ["critical", "high", "medium", "low"]
SEV_WEIGHT = {"critical": 4, "high": 3, "medium": 2, "low": 1}
CLICKS = ("click", "double_click")
SIM_OUTCOMES = {"step_cap", "harness_stall", "harness_stopped"}
CATEGORIES = {"bottleneck", "friction", "contradiction", "ui", "ux", "button", "contrast", "accessibility",
              "copy", "trust", "performance"}


def load(path: Path, default=None):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default


def page_of(url: str) -> str:
    p = urlsplit(url)
    return (p.path.rstrip("/") or "/") + (("?" + p.query) if p.query else "")


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", str(text)).strip().lower()


def sessions(study_dir: Path) -> dict:
    out = {}
    for j in sorted((study_dir / "sessions").glob("*/journey.json")):
        out[j.parent.name] = {"dir": j.parent, "journey": load(j), "feedback": load(j.parent / "feedback.json"),
                              "measurements": [json.loads(l) for l in (j.parent / "measurements.jsonl").open(encoding="utf-8")]
                              if (j.parent / "measurements.jsonl").exists() else []}
    return out


PAGE_URLS = {}  # page path -> a full address seen for it, so stage patterns can name a host


def stage_of(study: dict, page: str):
    """A stage matches if its pattern fits the full address (host included) or the path alone."""
    targets = [PAGE_URLS.get(page, page), page]
    hit = None
    for stage in study.get("stages", []):
        if any(re.search(stage["match"], t, re.I) for t in targets):
            hit = stage["id"]
    return hit


# ---------------------------------------------------------------- analyze

def analyze(study_dir: Path) -> dict:
    study = load(study_dir / "study.json", {})
    people = load(study_dir / "personas.json", [])
    people = people["personas"] if isinstance(people, dict) else people
    data = sessions(study_dir)
    if not data:
        raise SystemExit("No sessions with journey.json under sessions/")

    navigation, page_stats = {}, defaultdict(lambda: defaultdict(float))
    page_personas = defaultdict(set)
    for name, s in data.items():
        j = s["journey"]
        steps = j.get("steps", [])
        path, seen, backtracks, dead = [], [], [], []
        for st in steps:
            page = page_of(st["address_bar"])
            PAGE_URLS.setdefault(page, st["address_bar"])
            d, a, r = st["decision"], st["action"], st["result"]
            if not path or path[-1]["page"] != page:
                if page in seen and path:
                    backtracks.append({"step": st["step"], "returned_to": page, "from": path[-1]["page"], "via": a["type"]})
                path.append({"page": page, "first_step": st["step"], "steps": 0})
                seen.append(page)
            path[-1]["steps"] += 1
            ps = page_stats[page]
            page_personas[page].add(name)
            ps["steps"] += 1
            ps["seconds"] += float(d.get("est_seconds") or 0)
            for k in ("clarity", "trust", "effort"):
                ps[k + "_sum"] += d[k]
            for f in d.get("friction", []):
                ps["friction"] += 1
                ps["friction_weight"] += SEV_WEIGHT.get(f.get("severity"), 1)
            if a["type"] in CLICKS and r.get("no_visible_response"):
                if r.get("on_blank_space"):  # nothing drawn there: a missed click, kept out of the score
                    ps["missed_clicks"] += 1
                else:
                    dead.append({"step": st["step"], "page": page, "x": a.get("x"), "y": a.get("y")})
                    ps["dead_clicks"] += 1
            if a["type"] == "back":
                ps["back_presses"] += 1
            if r.get("blocked"):
                ps["refused_by_driver"] += 1
        outcome = j.get("outcome", "unfinished")
        exit_page = path[-1]["page"] if path else None
        if exit_page and outcome != "reached_goal" and outcome not in SIM_OUTCOMES:
            page_stats[exit_page]["exits_short_of_goal"] += 1
        for b in backtracks:
            page_stats[b["from"]]["backtracked_from"] += 1
        stages = []
        for p in path:
            sid = stage_of(study, p["page"])
            if sid and sid not in stages:
                stages.append(sid)
        navigation[name] = {
            "persona": j["persona"], "device": j["persona"].get("device"), "outcome": outcome,
            "claimed_outcome": j.get("claimed_outcome"), "reason": j.get("reason"),
            "steps_taken": j.get("steps_taken", len(steps)), "est_seconds": j.get("est_seconds"),
            "path": path, "stages_reached": stages, "backtracks": backtracks, "dead_clicks": dead,
            "exit_page": exit_page,
            "steps": [{"step": st["step"], "page": page_of(st["address_bar"]), "screenshot": st["screenshot"],
                       "action": st["action"], "address_after": st["result"].get("address_after"),
                       "screen_changed": st["result"].get("screen_changed"), "blocked": st["result"].get("blocked"),
                       "clarity": st["decision"]["clarity"], "trust": st["decision"]["trust"],
                       "effort": st["decision"]["effort"], "emotion": st["decision"].get("emotion", "")} for st in steps],
        }

    pages = []
    for page, ps in page_stats.items():
        n = ps["steps"] or 1
        visitors = len(page_personas[page])
        parts = {
            "steps_per_visitor": round(ps["steps"] / max(visitors, 1), 1),
            "dead_clicks": int(ps["dead_clicks"]), "backtracked_from": int(ps["backtracked_from"]),
            "exits_short_of_goal": int(ps["exits_short_of_goal"]), "friction_weight": int(ps["friction_weight"]),
        }
        score = (parts["steps_per_visitor"] + 2 * parts["dead_clicks"] + 1.5 * parts["backtracked_from"]
                 + 3 * parts["exits_short_of_goal"] + parts["friction_weight"] / max(visitors, 1))
        pages.append({
            "page": page, "stage": stage_of(study, page), "visitors": visitors, "steps": int(ps["steps"]),
            "est_seconds": round(ps["seconds"]), "friction_reports": int(ps["friction"]),
            "back_presses": int(ps["back_presses"]), "missed_clicks": int(ps["missed_clicks"]), "refused_by_driver": int(ps["refused_by_driver"]),
            "avg_clarity": round(ps["clarity_sum"] / n, 1), "avg_trust": round(ps["trust_sum"] / n, 1),
            "avg_effort": round(ps["effort_sum"] / n, 1), "score_parts": parts, "bottleneck_score": round(score, 1),
        })
    pages.sort(key=lambda p: -p["bottleneck_score"])
    for i, p in enumerate(pages, 1):
        p["handle"] = f"B{i}"

    funnel = []
    for stage in study.get("stages", []):
        reached = [n for n, v in navigation.items() if stage["id"] in v["stages_reached"]]
        funnel.append({"stage": stage["id"], "label": stage.get("label", stage["id"]), "reached": len(reached),
                       "of": len(navigation), "personas": reached})

    flows = {"study": study.get("id"), "personas": len(navigation), "pages": pages, "funnel": funnel,
             "score_formula": "steps_per_visitor + 2*dead_clicks + 1.5*backtracked_from + 3*exits_short_of_goal + friction_weight/visitors (critical 4, high 3, medium 2, low 1)"}

    by_id = {p["id"]: p for p in people}
    demo_rows = []
    for name, v in navigation.items():
        p = by_id.get(v["persona"]["id"], {})
        demo_rows.append({"session": name, "persona": p.get("id"), "name": p.get("name"), "device": p.get("device"),
                          "demographics": p.get("demographics", {}), "outcome": v["outcome"]})
    fb_rows = [dict(s["feedback"], session=n) for n, s in data.items() if s["feedback"]]
    summary = {}
    if fb_rows:
        umux = [((f["meets_needs"] - 1) + (f["easy_to_use"] - 1)) / 12 * 100 for f in fb_rows]
        rec = [f["recommend"] for f in fb_rows]
        summary = {
            "responses": len(fb_rows), "of": len(navigation),
            "ease_avg_1_7": round(sum(f["ease"] for f in fb_rows) / len(fb_rows), 1),
            "umux_lite_avg_0_100": round(sum(umux) / len(umux)),
            "satisfaction_avg_1_5": round(sum(f["satisfaction"] for f in fb_rows) / len(fb_rows), 1),
            "recommend_counts": {"9-10": sum(r >= 9 for r in rec), "7-8": sum(7 <= r <= 8 for r in rec), "0-6": sum(r <= 6 for r in rec)},
            "missing": [n for n in navigation if not data[n]["feedback"]],
        }
    hot = hot_steps(data)
    sheets = {}
    for name, s in data.items():
        try:
            sheets[name] = contact_sheets(s["dir"], s["journey"].get("steps", []), {h["step"] for h in hot.get(name, [])})
        except Exception as exc:  # a missing screenshot must not stop the analysis
            sheets[name] = {"error": str(exc)[:200]}
    (study_dir / "hot_steps.json").write_text(json.dumps(
        {"how": "Steps worth opening at full size, and why. Each session's contact sheets show every step as a "
                "thumbnail, hot steps outlined in red; open the full screenshot only where you need detail.",
         "contact_sheets": sheets, "sessions": hot}, indent=2, ensure_ascii=False), encoding="utf-8")
    (study_dir / "navigation.json").write_text(json.dumps(navigation, indent=2, ensure_ascii=False), encoding="utf-8")
    (study_dir / "flows.json").write_text(json.dumps(flows, indent=2, ensure_ascii=False), encoding="utf-8")
    (study_dir / "demographics.json").write_text(json.dumps(demo_rows, indent=2, ensure_ascii=False), encoding="utf-8")
    (study_dir / "feedback.json").write_text(json.dumps({"summary": summary, "responses": fb_rows}, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"sessions": len(navigation), "pages": len(pages),
                      "hot_steps": sum(len(v) for v in hot.values()),
                      "top_bottlenecks": [(p["handle"], p["page"], p["bottleneck_score"]) for p in pages[:3]],
                      "feedback_missing": summary.get("missing", list(navigation))}, ensure_ascii=False))
    return flows


def hot_steps(data: dict) -> dict:
    """The moments a reviewer should look at closely: where something went wrong for the persona."""
    out = {}
    for name, s in data.items():
        j = s["journey"]
        steps = j.get("steps", [])
        reasons = defaultdict(list)
        seen_pages = []
        for i, st in enumerate(steps):
            d, a, r = st["decision"], st["action"], st["result"]
            n = st["step"]
            page = page_of(st["address_bar"])
            if a["type"] in CLICKS and r.get("no_visible_response") and not r.get("on_blank_space"):
                reasons[n].append("dead click")
            if d["clarity"] <= 2:
                reasons[n].append(f"clarity {d['clarity']}")
            if d["trust"] <= 2:
                reasons[n].append(f"trust {d['trust']}")
            if d["effort"] >= 4:
                reasons[n].append(f"effort {d['effort']}")
            if i:
                prev = steps[i - 1]["decision"]
                for k in ("clarity", "trust"):
                    if prev[k] - d[k] >= 2:
                        reasons[n].append(f"{k} fell {prev[k]}->{d[k]}")
            sev = [f.get("type") for f in d.get("friction", []) if f.get("severity") in ("critical", "high")]
            if sev:
                reasons[n].append("high friction: " + ", ".join(sev))
            if any(f.get("type") == "contradiction" for f in d.get("friction", [])):
                reasons[n].append("reported contradiction")
            if a["type"] == "back" or (seen_pages and seen_pages[-1] != page and page in seen_pages):
                reasons[n].append("backtrack")
            if not seen_pages or seen_pages[-1] != page:
                seen_pages.append(page)
        if steps and j.get("outcome") != "reached_goal":
            for st in steps[-2:]:
                reasons[st["step"]].append(f"before exit ({j.get('outcome')})")
        by_step = {st["step"]: st for st in steps}
        out[name] = [{"step": n, "page": page_of(by_step[n]["address_bar"]), "screenshot": by_step[n]["screenshot"],
                      "why": sorted(set(w)), "thought": str(by_step[n]["decision"].get("thought", ""))[:220]}
                     for n, w in sorted(reasons.items()) if w]
    return out


def contact_sheets(session_dir: Path, steps: list, hot: set, per_sheet: int = 12) -> list:
    """Every step as a numbered thumbnail, a few sheets per session, so a reviewer sees a whole walk in one image."""
    from PIL import Image, ImageDraw, ImageFont

    box, cols, label = 300, 4, 22
    files = []
    for start in range(0, len(steps), per_sheet):
        chunk = steps[start:start + per_sheet]
        thumbs = []
        for st in chunk:
            src = session_dir / "shots" / st["screenshot"]
            if not src.exists():
                continue
            im = Image.open(src).convert("RGB")
            im.thumbnail((box, box))
            thumbs.append((st, im))
        if not thumbs:
            continue
        rows = [thumbs[i:i + cols] for i in range(0, len(thumbs), cols)]
        tops, y = [], 8
        for row in rows:
            tops.append(y)
            y += label + max(im.height for _, im in row) + 10
        sheet = Image.new("RGB", (cols * (box + 8) + 8, y), (245, 246, 248))
        d = ImageDraw.Draw(sheet)
        try:
            font = ImageFont.load_default(size=15)
        except TypeError:  # Pillow older than 10.1
            font = ImageFont.load_default()
        for i, (st, im) in enumerate(thumbs):
            x = 8 + (i % cols) * (box + 8)
            y = tops[i // cols]
            mark = st["step"] in hot
            d.text((x + 2, y + 2), f"step {st['step']}  {st['action']['type']}" + ("  *" if mark else ""),
                   fill=(200, 0, 50) if mark else (40, 40, 40), font=font)
            sheet.paste(im, (x, y + label))
            if mark:
                d.rectangle([x - 3, y + label - 3, x + im.width + 2, y + label + im.height + 2], outline=(220, 0, 60), width=3)
            a = st["action"]
            if a["type"] in CLICKS + ("hover",) and "x" in a:
                k = im.width / max(st["image_size"][0], 1)
                cx, cy = x + a["x"] * k, y + label + a["y"] * k
                d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], outline=(220, 0, 60), width=2)
        out = session_dir / f"contact-{start // per_sheet + 1}.jpg"
        sheet.save(out, quality=80)
        files.append(str(out.relative_to(session_dir.parent.parent)).replace("\\", "/"))
    return files


# ---------------------------------------------------------------- verify

def crop_evidence(src: Path, box, out: Path):
    from PIL import Image, ImageDraw

    img = Image.open(src).convert("RGB")
    x, y, w, h = box
    pad = 60
    l, t = max(0, x - pad), max(0, y - pad)
    r, b = min(img.width, x + w + pad), min(img.height, y + h + pad)
    c = img.crop((l, t, r, b))
    ImageDraw.Draw(c).rectangle([x - l, y - t, x - l + w, y - t + h], outline=(230, 0, 60), width=3)
    if c.width > 900:
        c = c.resize((900, round(c.height * 900 / c.width)))
    c.save(out, quality=85)


def slug_id(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", str(text).lower()).strip("-")


def verify(study_dir: Path) -> int:
    data = sessions(study_dir)
    findings = load(study_dir / "findings.json")
    if findings is None:
        raise SystemExit("No findings.json in the study folder")
    flows = load(study_dir / "flows.json", {"pages": []})
    pages = {p["page"] for p in flows["pages"]}
    ev_dir = study_dir / "evidence"
    ev_dir.mkdir(exist_ok=True)
    kept, removed = [], []
    for f in findings:
        problems, notes = [], []
        if f.get("category") not in CATEGORIES:
            problems.append(f"category must be one of {sorted(CATEGORIES)}")
        if f.get("severity") not in SEV_ORDER:
            problems.append("severity must be critical, high, medium or low")
        evidence = f.get("evidence") or []
        if not evidence:
            problems.append("no evidence")
        for i, e in enumerate(evidence, 1):
            s = data.get(e.get("session"))
            if not s:
                problems.append(f"evidence {i}: no session {e.get('session')}")
                continue
            step = next((st for st in s["journey"]["steps"] if st["step"] == e.get("step")), None)
            if not step:
                problems.append(f"evidence {i}: no step {e.get('step')} in {e['session']}")
                continue
            shot = s["dir"] / "shots" / step["screenshot"]
            box = e.get("box")
            w, h = step["image_size"]
            if not (isinstance(box, list) and len(box) == 4 and box[0] >= 0 and box[1] >= 0 and box[2] > 0 and box[3] > 0
                    and box[0] + box[2] <= w + 2 and box[1] + box[3] <= h + 2):
                problems.append(f"evidence {i}: box must be [x,y,w,h] inside the {w}x{h} screenshot")
                continue
            if e.get("quote"):
                d = step["decision"]
                said = " | ".join([*map(str, d.get("read", [])), str(d.get("noticed", "")), str(d.get("thought", "")),
                                   *[str(x.get("quote", "")) for x in d.get("friction", [])]])
                e["quote_in_record"] = norm(e["quote"]) in norm(said)
                if not e["quote_in_record"]:
                    notes.append(f"evidence {i}: quote read from the screenshot by the reviewer, not in the persona's record")
            out = ev_dir / f"{f.get('id', 'F')}-{i}.jpg"
            crop_evidence(shot, box, out)
            e["crop"] = f"evidence/{out.name}"
        if f.get("category") == "contrast":
            ids = {m["id"]: m for s in data.values() for m in s["measurements"]}
            m = ids.get(f.get("measurement"))
            if not m:
                problems.append("contrast finding needs a measurement id from eyes.py measure")
            elif m.get("contrast_ratio") is None:
                problems.append(f"measurement {m['id']} found only one colour")
            else:
                need = 3.0 if f.get("contrast_target") in ("large_text", "ui_component") else 4.5
                if m["contrast_ratio"] >= need:
                    problems.append(f"measured {m['contrast_ratio']}:1 meets the {need}:1 target")
                f["measured"] = {"ratio": m["contrast_ratio"], "foreground": m["foreground"], "background": m["background"], "target": need}
        if f.get("category") == "contradiction":
            # Two claims that clash can sit on different screens or on one screen (two prices on the same page),
            # but they must be two separate places: different steps, or boxes on the same step that don't overlap.
            def apart(a, b):
                if (a.get("session"), a.get("step")) != (b.get("session"), b.get("step")):
                    return True
                if not all(isinstance(x.get("box"), list) and len(x["box"]) == 4 for x in (a, b)):
                    return False
                (ax, ay, aw, ah), (bx, by, bw, bh) = a["box"], b["box"]
                ix = max(0, min(ax + aw, bx + bw) - max(ax, bx))
                iy = max(0, min(ay + ah, by + bh) - max(ay, by))
                return ix * iy < 0.5 * min(aw * ah, bw * bh)
            separate = any(apart(a, b) for i, a in enumerate(evidence) for b in evidence[i + 1:])
            if not separate or len(f.get("conflict") or []) < 2:
                problems.append("a contradiction needs two evidence spots, on different steps or in separate boxes on one "
                                "step, and a conflict list stating both claims")
        if f.get("category") == "bottleneck" and f.get("page") not in pages:
            problems.append("a bottleneck must name a page from flows.json")
        # How many walks had the chance to hit this, and how many did: a finding hit by 1 of 4 walks that reached
        # the page is weaker than one hit by 4 of 4, whatever its severity. Repeat walks of a persona count separately.
        fpages = {f.get("page")} | {page_of(st["address_bar"]) for e in evidence for s in [data.get(e.get("session"))] if s
                                     for st in s["journey"]["steps"] if st["step"] == e.get("step")}
        fpages.discard(None)
        reached = sorted(n for n, s in data.items() if any(page_of(st["address_bar"]) in fpages for st in s["journey"].get("steps", [])))
        named = {slug_id(p) for p in f.get("personas", [])}
        hit = sorted({e.get("session") for e in evidence if e.get("session") in data}
                     | {n for n in reached if slug_id(data[n]["journey"]["persona"].get("id", "")) in named})
        f["exposure"] = {"pages": sorted(fpages), "walks_reached": len(reached), "walks_hit": len(hit), "hit": hit,
                         "missed": [n for n in reached if n not in hit]}
        if problems:
            removed.append({"id": f.get("id"), "title": f.get("title"), "reasons": problems})
        else:
            if notes:
                f["verification_notes"] = notes
            kept.append(f)
    kept.sort(key=lambda f: SEV_ORDER.index(f["severity"]))
    # A serious finding that one walk produced could be a fluke of that walk. Walking the same persona again
    # is the cheapest way to tell; list who to walk again, most serious first.
    rewalk = {}
    for f in kept:
        ex = f.get("exposure", {})
        if f["severity"] in ("critical", "high") and ex.get("walks_hit") == 1:
            pid = data[ex["hit"][0]]["journey"]["persona"].get("id") if ex.get("hit") and ex["hit"][0] in data else None
            if pid:
                rewalk.setdefault(pid, []).append(f.get("id"))
    rewalk = [{"persona": p, "findings": ids} for p, ids in rewalk.items()]
    (study_dir / "verified_findings.json").write_text(json.dumps({"kept": kept, "removed": removed, "rewalk": rewalk},
                                                                 indent=2, ensure_ascii=False), encoding="utf-8")
    out = {"kept": len(kept), "removed": removed}
    if rewalk:
        out["rewalk"] = rewalk
        out["note"] = "These serious findings each rest on one walk. Walking the persona again tells a pattern from a fluke."
    print(json.dumps(out, ensure_ascii=False))
    return 0


# ---------------------------------------------------------------- render

def esc(x) -> str:
    return html.escape(str(x if x is not None else ""))


def click_heatmaps(study_dir: Path, data: dict, limit: int = 12) -> list:
    """Every persona's clicks drawn on one screen per view: red where nothing happened, blue where the screen changed.
    A click belongs only to the view it was made on, so views are grouped by how they look, not just by page."""
    from PIL import Image, ImageChops, ImageDraw

    def thumb(path):
        im = Image.open(path).convert("L")
        return im.resize((max(1, im.width // 8), max(1, im.height // 8)))

    groups = []  # {page, size, base, thumb, clicks: [(x, y, dead, persona)]}
    for name, s in data.items():
        for st in s["journey"].get("steps", []):
            a = st["action"]
            if a.get("type") not in CLICKS or "x" not in a:
                continue
            shot = s["dir"] / "shots" / st["screenshot"]
            if not shot.exists():
                continue
            page, size, t = page_of(st["address_bar"]), tuple(st["image_size"]), thumb(shot)
            home = None
            for g in groups:
                if g["page"] == page and g["size"] == size:
                    diff = ImageChops.difference(g["thumb"], t).point(lambda v: 255 if v > 16 else 0)
                    if diff.histogram()[255] < 0.03 * t.width * t.height:
                        home = g
                        break
            if home is None:
                home = {"page": page, "size": size, "base": shot, "thumb": t, "clicks": []}
                groups.append(home)
            res = st["result"]
            kind = "blank" if res.get("on_blank_space") else "dead" if res.get("no_visible_response") else "live"
            home["clicks"].append((a["x"], a["y"], kind, name))

    groups.sort(key=lambda g: (-len(g["clicks"]), g["page"]))
    out_dir = study_dir / "heatmaps"
    out_dir.mkdir(exist_ok=True)
    maps = []
    for i, g in enumerate(groups[:limit], 1):
        img = Image.open(g["base"]).convert("RGB")
        over = Image.new("RGBA", img.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(over)
        r = max(10, img.width // 70)
        for x, y, dead, _ in g["clicks"]:
            colour = {"dead": (220, 30, 40), "blank": (130, 130, 130)}.get(dead, (40, 110, 230))
            d.ellipse([x - r, y - r, x + r, y + r], fill=colour + (90,), outline=colour + (255,), width=3)
        img = Image.alpha_composite(img.convert("RGBA"), over).convert("RGB")
        if img.width > 900:
            img = img.resize((900, round(img.height * 900 / img.width)))
        path = out_dir / f"view-{i}.jpg"
        img.save(path, quality=80)
        maps.append({"page": g["page"], "image": path, "clicks": len(g["clicks"]),
                     "dead": sum(c[2] == "dead" for c in g["clicks"]), "personas": sorted({c[3] for c in g["clicks"]})})
    return maps


def replay_data(data: dict) -> dict:
    """Each walk as small screens with the click spot and the persona's words, for the step-through player."""
    from PIL import Image

    walks = {}
    for name, s in data.items():
        frames = []
        for st in s["journey"].get("steps", []):
            shot = s["dir"] / "shots" / st["screenshot"]
            if not shot.exists():
                continue
            im = Image.open(shot).convert("RGB")
            w0, h0 = im.size
            im.thumbnail((640, 900))
            buf = io.BytesIO()
            im.save(buf, "WEBP", quality=55, method=4)
            d, a, r = st["decision"], st["action"], st["result"]
            spot = None
            if a.get("type") in CLICKS + ("hover",) and "x" in a:
                spot = [round(100 * a["x"] / w0, 2), round(100 * a["y"] / h0, 2)]
            did = a.get("type", "")
            if did == "finish":
                did = f"finished: {a.get('outcome', '')}"
            elif did == "scroll":
                did = f"scrolled {a.get('direction', 'down')}"
            elif did == "type":
                did = "typed" + (f" \"{a.get('text')}\"" if a.get("text") else "")
            elif did == "fill":
                did = f"filled {len(a.get('fields') or [])} fields"
            frames.append({
                "img": "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode("ascii"),
                "step": st["step"], "page": page_of(st["address_bar"]), "did": did, "spot": spot,
                "dead": bool(r.get("no_visible_response")) and not r.get("on_blank_space"),
                "blank": bool(r.get("on_blank_space")), "blocked": r.get("blocked"),
                "thought": d.get("thought", ""), "scores": [d.get("clarity"), d.get("trust"), d.get("effort")],
                "friction": [f"{f.get('type')} ({f.get('severity')}): {f.get('note', '')}" for f in d.get("friction", [])],
            })
        if frames:
            walks[name] = {"name": s["journey"]["persona"].get("name") or name, "outcome": s["journey"].get("outcome"), "frames": frames}
    return walks


REPLAY_JS = """
(function(){var W=JSON.parse(document.getElementById('walks').textContent),sel=document.getElementById('rp-who'),
img=document.getElementById('rp-img'),dot=document.getElementById('rp-dot'),cap=document.getElementById('rp-cap'),
pos=document.getElementById('rp-pos'),i=0,cur=null;
Object.keys(W).forEach(function(k){var o=document.createElement('option');o.value=k;o.textContent=W[k].name+' \\u2014 '+W[k].outcome;sel.appendChild(o);});
function esc(t){return String(t==null?'':t).replace(/[&<>]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;'}[c];});}
function show(){var f=cur.frames[i];img.src=f.img;img.alt='Step '+f.step+' on '+f.page;
 if(f.spot){dot.style.display='block';dot.style.left=f.spot[0]+'%';dot.style.top=f.spot[1]+'%';dot.className=f.dead?'rp-dot dead':'rp-dot';}else dot.style.display='none';
 pos.textContent='Step '+f.step+' of '+cur.frames.length;
 cap.innerHTML='<b>'+esc(f.page)+'</b> \\u00b7 '+esc(f.did)+(f.dead?' \\u00b7 <span class=\"fail\">nothing visible happened</span>':'')+(f.blank?' \\u00b7 clicked empty space':'')+(f.blocked?' \\u00b7 refused by the test driver':'')+
 '<br>\\u201c'+esc(f.thought)+'\\u201d<br><span class=\"muted\">clarity '+f.scores[0]+' \\u00b7 trust '+f.scores[1]+' \\u00b7 effort '+f.scores[2]+'</span>'+
 (f.friction.length?'<ul>'+f.friction.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>':'');}
function pick(){cur=W[sel.value];i=0;show();}
document.getElementById('rp-prev').onclick=function(){if(i>0){i--;show();}};
document.getElementById('rp-next').onclick=function(){if(i<cur.frames.length-1){i++;show();}};
document.getElementById('replay').addEventListener('keydown',function(e){if(e.key==='ArrowLeft')document.getElementById('rp-prev').click();if(e.key==='ArrowRight')document.getElementById('rp-next').click();});
sel.onchange=pick;pick();})();
"""


def img_data(path: Path) -> str:
    return "data:image/jpeg;base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def render(study_dir: Path) -> int:
    study = load(study_dir / "study.json", {})
    nav = load(study_dir / "navigation.json")
    flows = load(study_dir / "flows.json")
    if nav is None or flows is None:
        raise SystemExit("Run analyze first")
    demo = load(study_dir / "demographics.json", [])
    fb = load(study_dir / "feedback.json", {"summary": {}, "responses": []})
    vf = load(study_dir / "verified_findings.json", {"kept": [], "removed": []})
    ins = load(study_dir / "insights.json", {})
    data = sessions(study_dir)
    measurements = [m for s in data.values() for m in s["measurements"]]
    findings = vf["kept"]
    n = len(nav)
    devices = defaultdict(int)
    for v in nav.values():
        devices[v["device"] or "desktop"] += 1

    import datetime

    # Follows chart-dashboard's report template (templates/report.html, references/design-rules.md):
    # one 880px paper column; kicker, h1, deck, byline, abstract; numbered h2 sections; figures with
    # "Fig. N" captions; the soft .note surface; a footer of sources and method. No badges, custom cards,
    # KPI strip or coloured verdicts: severity and outcome are words in the text.
    css = """:root{--bg:#efece6;--paper:#f4f4f0;--ink:#111111;--body:#1a1a1a;--muted:#555555;--soft:#666666;--hair:#dcdbd7;--rule:#cfcdc6;
--radius:4px;--surface-soft:#eae8e4;--accent:#243E63;--annotation:#B31B38;--series:#2323FF;--font:'Inter','Segoe UI',Arial,Helvetica,sans-serif}
@media (prefers-color-scheme:dark){:root{--bg:#121315;--paper:#1a1b1e;--ink:#f2f2f0;--body:#dcdcd8;--muted:#a6a6a0;--soft:#9a9a94;--hair:#33343a;
--rule:#3d3e44;--surface-soft:#26272b;--accent:#9db3d6;--annotation:#f08a9b;--series:#8c8cff}}
*{box-sizing:border-box}html,body{margin:0;padding:0;background:var(--bg);color:var(--ink);font-family:var(--font);-webkit-font-smoothing:antialiased}
.paper{max-width:880px;margin:0 auto;background:var(--paper);padding:64px 72px 96px;box-shadow:0 1px 2px rgba(0,0,0,0.04)}
@media (max-width:720px){.paper{padding:40px 24px}}
a{color:var(--accent)}
.kicker{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:1.2px;font-weight:700}
h1{font-size:40px;line-height:1.1;letter-spacing:-0.7px;margin:12px 0 16px;font-weight:700}
@media (max-width:720px){h1{font-size:30px}}
.deck{font-size:18px;color:var(--muted);line-height:1.55;margin:0 0 28px}
.byline{font-size:12px;color:var(--soft);border-top:1px solid var(--hair);border-bottom:1px solid var(--hair);padding:12px 0;margin:0 0 40px;
display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px}.byline b{color:var(--ink)}
.abstract,.note{background:var(--surface-soft);border-radius:var(--radius);padding:18px 22px;margin:0 0 40px;font-size:15px;line-height:1.65;color:var(--body)}
.abstract b.k,.note b.k{text-transform:uppercase;font-size:11px;letter-spacing:1px;display:block;margin-bottom:6px;color:var(--muted)}
.note{margin:0 0 28px}
ol.contents{margin:0 0 8px;padding:0;list-style:none;columns:2;column-gap:32px;font-size:14px;line-height:2}
ol.contents .n{color:var(--soft);display:inline-block;min-width:32px;font-variant-numeric:tabular-nums}
@media (max-width:560px){ol.contents{columns:1}}
h2{font-size:24px;font-weight:700;margin:48px 0 12px;letter-spacing:-0.3px}h2 .n{color:var(--soft);font-weight:700;margin-right:12px}
h3{font-size:17px;font-weight:700;margin:36px 0 8px;line-height:1.35}h3 .n{color:var(--soft);margin-right:8px}
p{font-size:16px;line-height:1.72;color:var(--body);margin:0 0 18px}
.sub{font-size:13px;color:var(--muted);margin:-4px 0 14px}
ul.plain{margin:0 0 18px;padding-left:20px;font-size:16px;line-height:1.65;color:var(--body)}ul.plain li{margin:0 0 6px}
.fig{margin:28px 0 32px}
.fig figcaption{font-size:12px;color:var(--soft);margin-top:8px;padding-top:8px;border-top:1px dotted var(--rule);line-height:1.5}
.fig figcaption b{color:var(--ink);margin-right:6px}
.tablewrap{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:13px;line-height:1.5;color:var(--body);font-variant-numeric:tabular-nums}
th{text-align:left;font-weight:600;color:var(--muted);font-size:12px;padding:8px 10px 8px 0;border-bottom:1px solid var(--ink);vertical-align:bottom}
td{padding:8px 10px 8px 0;border-bottom:1px solid var(--hair);vertical-align:top}
td.num,th.num{text-align:right}td b{color:var(--ink)}.muted{color:var(--muted)}
.bars{display:grid;grid-template-columns:200px minmax(0,1fr) 64px;gap:8px 14px;align-items:center;font-size:13px;color:var(--body)}
.bars .track{height:12px}.bars .fill{height:12px;background:var(--series)}.bars .cnt{text-align:right;color:var(--muted);font-variant-numeric:tabular-nums}
@media (max-width:560px){.bars{grid-template-columns:110px minmax(0,1fr) 52px}}
.shot{display:block;max-width:100%;max-height:min(70vh,640px);width:auto;height:auto;border:1px solid var(--hair);background:#fff}
.pair{display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start}.pair figure{margin:0;flex:0 1 auto;max-width:100%}
blockquote{margin:0 0 18px;padding:0 0 0 18px;border-left:2px solid var(--rule);font-size:16px;line-height:1.65;color:var(--body)}
blockquote cite{display:block;font-style:normal;font-size:12px;color:var(--soft);margin-top:4px}
#replay .controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 14px;font-size:13px}
select,button{font:inherit;font-size:13px;padding:5px 10px;border:1px solid var(--rule);border-radius:var(--radius);background:var(--paper);color:var(--ink)}
.rp-row{display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start}
.rp-frame{position:relative;display:inline-block;line-height:0;flex:0 0 auto;max-width:100%}
.rp-frame img{display:block;max-width:100%;max-height:min(74vh,700px);width:auto;height:auto;border:1px solid var(--hair);background:#fff}
#rp-cap{flex:1 1 240px;min-width:0;font-size:14px;line-height:1.6;color:var(--body)}#rp-cap ul{padding-left:18px;margin:8px 0 0}
.rp-dot{position:absolute;width:24px;height:24px;margin:-12px 0 0 -12px;border-radius:50%;border:3px solid var(--series);background:rgba(35,35,255,.18);display:none}
.rp-dot.dead{border-color:var(--annotation);background:rgba(179,27,56,.2)}.fail{color:var(--annotation);font-weight:700}
.maps{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:20px;align-items:start}.maps .fig{margin:0}
ol.refs{font-size:13px;line-height:1.6;color:var(--body);padding-left:24px}ol.refs li{margin:0 0 6px;overflow-wrap:anywhere}
sup.ref{font-size:11px;line-height:0}
footer.notes{border-top:1px solid var(--hair);margin-top:56px;padding-top:20px;font-size:12px;color:var(--soft);line-height:1.6}footer.notes b{color:var(--ink)}
@media print{body{background:#fff}.paper{box-shadow:none;padding:0}#appendix-replay{display:none}.fig,blockquote{break-inside:avoid}}"""

    sev_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    findings = sorted(findings, key=lambda f: (sev_order.get(f.get("severity"), 9), str(f.get("id"))))
    sev_counts = defaultdict(int)
    for f in findings:
        sev_counts[f.get("severity")] += 1
    reached = sum(1 for v in nav.values() if v["outcome"] == "reached_goal")
    names = {k: v["persona"].get("name") or k for k, v in nav.items()}
    outcome_label = {"reached_goal": "Reached goal", "claimed_goal_unverified": "Claimed goal (unverified)", "saved_for_later": "Saved for later",
                     "gave_up": "Gave up", "left_site": "Left the site", "would_call_or_visit": "Would call or visit", "reached_boundary": "Stopped at a form",
                     "blocked_by_site": "Blocked by the site", "step_cap": "Hit the step limit"}
    ol = lambda o: esc(outcome_label.get(o, o))
    cap = lambda s: esc(str(s or "").capitalize())

    refs = [("wcag-143", "W3C (2023). <i>Web Content Accessibility Guidelines (WCAG) 2.2</i>, Success Criterion 1.4.3 Contrast (Minimum). "
             "https://www.w3.org/TR/WCAG22/#contrast-minimum"),
            ("wcag-1411", "W3C (2023). <i>WCAG 2.2</i>, Success Criterion 1.4.11 Non-text Contrast. https://www.w3.org/TR/WCAG22/#non-text-contrast"),
            ("wcag-258", "W3C (2023). <i>WCAG 2.2</i>, Success Criterion 2.5.8 Target Size (Minimum). https://www.w3.org/TR/WCAG22/#target-size-minimum"),
            ("umux", "Lewis, J. R., Utesch, B. S., &amp; Maher, D. E. (2013). UMUX-LITE: When there's no time for the SUS. "
             "<i>Proceedings of CHI 2013</i>, 2099–2102. ACM."),
            ("artefacts", "Study record, in the study folder: study.json, personas.json, navigation.json, flows.json, verified_findings.json, "
             "feedback.json, insights.json, and each session's journey.json and screenshots under sessions/.")]
    ref_no = {k: i for i, (k, _) in enumerate(refs, 1)}

    def cite(*keys):
        return "<sup class='ref'>[" + ", ".join(f"<a href='#ref-{k}'>{ref_no[k]}</a>" for k in keys) + "]</sup>"

    fig_no = [0]

    def fig(caption):
        fig_no[0] += 1
        return f"<figcaption><b>Fig. {fig_no[0]}</b>{caption}</figcaption>"

    walks = replay_data(data)
    maps = click_heatmaps(study_dir, data)
    toc = [("design", "Study design"), ("outcomes", "Outcomes"), ("findings", "Findings"), ("bottlenecks", "Flow bottlenecks")]
    if measurements:
        toc.append(("accessibility", "Accessibility measurements"))
    toc += [("feedback", "Participant feedback"), ("discussion", "Discussion"), ("limitations", "Limitations"), ("references", "References")]
    appendix = ([("appendix-replay", "Walk replay")] if walks else []) + ([("appendix-clicks", "Click maps")] if maps else []) \
        + ([("appendix-removed", "Removed in verification")] if vf["removed"] else [])
    num = {k: f"{i:02d}" for i, (k, _) in enumerate(toc, 1)}
    num.update({k: chr(65 + i) for i, (k, _) in enumerate(appendix)})

    def h2(key, title):
        return f"<h2 id='{key}'><span class='n'>{num[key]}</span>{esc(title)}</h2>"

    product = study.get("product") or study.get("id")
    today = datetime.date.today().isoformat()
    out = [f"<!doctype html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
           f"<title>{esc(product)} — persona study</title><style>{css}</style></head><body><article class='paper'>"]

    # header: kicker, title, deck, byline
    out.append(f"<div class='kicker'>UX research · Persona study</div><h1>{esc(product)}</h1>")
    if ins.get("headline"):
        out.append(f"<p class='deck'>{esc(ins['headline'])}</p>")
    panel_desc = ", ".join(f"{v} {k}" for k, v in devices.items())
    out.append(f"<div class='byline'><div><b>Study {esc(study.get('id'))}</b> · {n} simulated personas ({esc(panel_desc)}) · mode {esc(study.get('mode'))}</div>"
               f"<div>Report generated {today}</div></div>")

    # abstract: the numbers and the caveat, without restating the deck
    sev_line = ", ".join(f"{sev_counts[s]} {s}" for s in ("critical", "high", "medium", "low") if sev_counts[s])
    out.append(f"<div class='abstract'><b class='k'>Summary</b>{n} personas walked {esc(study.get('start_url'))} by sight alone; {reached} reached a page that verifies "
               f"their goal. Review kept {len(findings)} findings ({esc(sev_line) or 'none'}), each tied to a recorded screenshot, and "
               f"{len(vf['removed'])} were removed in verification. These are simulated people: they show where to look, not how many customers would struggle.</div>")

    out.append("<ol class='contents'>" + "".join(f"<li><span class='n'>{num[k]}</span><a href='#{k}'>{esc(t)}</a></li>" for k, t in toc + appendix) + "</ol>")

    # 01 study design
    out.append(h2("design", "Study design"))
    out.append(f"<p>Each persona used the site from screenshots alone and acted by clicking screen positions, with no access to page text, markup or "
               f"accessibility names. A separate reviewer turned the recordings into findings; each one cites a session, a step and a box on that step's "
               f"screenshot, and was re-checked against the recording before it was kept.{cite('artefacts')}</p>")
    out.append(f"<p><b>Objective.</b> {esc(study.get('goal'))}</p>")
    out.append("<figure class='fig'><div class='tablewrap'><table><thead><tr><th>Persona</th><th>Device</th><th>Profile</th><th>Outcome</th></tr></thead><tbody>")
    for r in demo:
        d = r.get("demographics") or {}
        bits = [d.get(k) for k in ("age_band", "occupation", "location", "tech_usage") if d.get(k)]
        acc = d.get("access_needs") or []
        out.append(f"<tr><td><b>{esc(r.get('name'))}</b></td><td>{esc(r.get('device'))}</td><td>{esc('; '.join(map(str, bits)))}"
                   + (f"<br><span class='muted'>Access: {esc(', '.join(map(str, acc)))}</span>" if acc else "") + f"</td><td>{ol(r.get('outcome'))}</td></tr>")
    out.append("</tbody></table></div>" + fig("The panel. Demographics describe who each simulated persona stands in for; they are not respondents.") + "</figure>")

    # 02 outcomes
    out.append(h2("outcomes", "Outcomes"))
    out.append("<figure class='fig'><div class='tablewrap'><table><thead><tr><th>Persona</th><th>Outcome</th><th class='num'>Steps</th><th>Pages, in order</th></tr></thead><tbody>")
    for name, v in nav.items():
        path = " → ".join(f"{esc(p['page'])} ({p['steps']})" for p in v["path"])
        out.append(f"<tr><td><b>{esc(names[name])}</b><br><span class='muted'>{esc(v['device'])}</span></td>"
                   f"<td>{ol(v['outcome'])}<br><span class='muted'>{esc(v.get('reason'))}</span></td><td class='num'>{v['steps_taken']}</td><td>{path}</td></tr>")
    out.append("</tbody></table></div>" + fig("Every walk, with the steps spent on each page in brackets.") + "</figure>")
    if flows["funnel"]:
        out.append("<figure class='fig'><div class='bars'>")
        for f in flows["funnel"]:
            out.append(f"<div>{esc(f['label'])}</div><div class='track'><div class='fill' style='width:{100 * f['reached'] / max(f['of'], 1):.0f}%'></div></div>"
                       f"<div class='cnt'>{f['reached']} of {f['of']}</div>")
        out.append("</div>" + fig("Personas reaching each journey stage. Counts of simulated personas, not conversion rates.") + "</figure>")

    # 03 findings
    out.append(h2("findings", "Findings"))
    out.append("<p>Ranked by severity. Every finding was checked against the recorded screenshots; the evidence shown is cropped from the cited steps.</p>")
    if findings:
        out.append("<figure class='fig'><div class='tablewrap'><table><thead><tr><th>ID</th><th>Severity</th><th>Page</th><th>Finding</th></tr></thead><tbody>")
        for f in findings:
            out.append(f"<tr><td><a href='#finding-{esc(f.get('id'))}'>{esc(f.get('id'))}</a></td><td>{cap(f.get('severity'))}</td>"
                       f"<td>{esc(f.get('page'))}</td><td>{esc(f.get('title'))}</td></tr>")
        out.append("</tbody></table></div>" + fig("Index of verified findings.") + "</figure>")
    for f in findings:
        fid = esc(f.get("id"))
        out.append(f"<section id='finding-{fid}' aria-label='finding {fid}'><h3><span class='n'>{fid}</span>{esc(f.get('title'))}</h3>"
                   f"<p class='sub'>{cap(f.get('severity'))} severity · {esc(f.get('category'))} · {esc(f.get('page'))} · "
                   f"affects {esc(', '.join(names.get(p, p) for p in f.get('personas', [])))} · confidence {esc(f.get('confidence'))}</p>"
                   f"<p>{esc(f.get('description'))}</p>")
        if f.get("conflict"):
            out.append(f"<p><b>One page says:</b> {esc(f['conflict'][0])}<br><b>Another says:</b> {esc(f['conflict'][1])}</p>")
        if f.get("measured"):
            m = f["measured"]
            out.append(f"<p>Measured {m['ratio']}:1 ({esc(m['foreground'])} on {esc(m['background'])}) against a target of {m['target']}:1, "
                       f"measurement {esc(f.get('measurement'))}.{cite('wcag-143', 'wcag-1411')}</p>")
        crops = [e for e in f.get("evidence", []) if e.get("crop") and (study_dir / e["crop"]).exists()]
        if crops:
            out.append("<div class='pair'>")
            for e in crops:
                q = f", “{esc(e['quote'])}”" if e.get("quote") else ""
                out.append(f"<figure class='fig'><img class='shot' alt='{esc(f.get('title'))}, {esc(e['session'])} step {e['step']}' src='{img_data(study_dir / e['crop'])}'>"
                           + fig(f"{esc(names.get(e['session'], e['session']))}, step {e['step']}{q}.") + "</figure>")
            out.append("</div>")
        ex = f.get("exposure") or {}
        if ex.get("walks_reached"):
            out.append(f"<p class='sub' style='margin-top:4px'>Hit in {ex['walks_hit']} of {ex['walks_reached']} walks that reached {esc(', '.join(ex['pages']))}"
                       + (f"; not by {esc(', '.join(ex['missed']))}" if ex.get("missed") else "") + ".</p>")
        out.append(f"<div class='note'><b class='k'>Recommendation</b>{esc(f.get('recommendation'))}</div></section>")

    # 04 bottlenecks
    out.append(h2("bottlenecks", "Flow bottlenecks"))
    out.append("<p>Pages ranked by a score computed from the recordings: more steps, dead clicks, backtracking and exits on a page raise it.</p>")
    out.append("<figure class='fig'><div class='tablewrap'><table><thead><tr><th></th><th>Page</th><th class='num'>Visitors</th><th class='num'>Steps per visitor</th>"
               "<th class='num'>Dead clicks</th><th class='num'>Backtracked</th><th class='num'>Left short</th><th class='num'>Clarity / trust / effort</th>"
               "<th class='num'>Score</th></tr></thead><tbody>")
    for p in flows["pages"]:
        sp = p["score_parts"]
        out.append(f"<tr><td>{p['handle']}</td><td>{esc(p['page'])}</td><td class='num'>{p['visitors']}</td><td class='num'>{sp['steps_per_visitor']}</td>"
                   f"<td class='num'>{sp['dead_clicks']}</td><td class='num'>{sp['backtracked_from']}</td><td class='num'>{sp['exits_short_of_goal']}</td>"
                   f"<td class='num'>{p['avg_clarity']} / {p['avg_trust']} / {p['avg_effort']}</td><td class='num'><b>{p['bottleneck_score']}</b></td></tr>")
    out.append("</tbody></table></div>" + fig(f"Score = {esc(flows['score_formula'])}. Clarity and trust 1–5, higher is better; effort 1–5, higher is worse.") + "</figure>")

    # 05 accessibility
    if measurements:
        out.append(h2("accessibility", "Accessibility measurements"))
        out.append(f"<p>Contrast and size were measured from screenshot pixels, not from the page's styles, and checked against WCAG 2.2: 4.5:1 for body "
                   f"text{cite('wcag-143')}, 3:1 for large text and interface components{cite('wcag-1411')}, and a 24 × 24 CSS px minimum target{cite('wcag-258')}.</p>")
        out.append("<figure class='fig'><div class='tablewrap'><table><thead><tr><th>ID</th><th>What</th><th>Colours</th><th class='num'>Ratio</th>"
                   "<th>Text 4.5:1</th><th>Large / UI 3:1</th><th class='num'>Size (CSS px)</th></tr></thead><tbody>")
        for m in measurements:
            okk = m.get("wcag", {})
            pf = lambda b: "Pass" if b else "Fail"
            out.append(f"<tr><td>{esc(m['id'])}</td><td>{esc(m.get('what'))}</td><td>{esc(m.get('foreground'))} on {esc(m.get('background'))}</td>"
                       f"<td class='num'><b>{esc(m.get('contrast_ratio'))}:1</b></td><td>{pf(okk.get('body_text_4_5'))}</td><td>{pf(okk.get('large_text_3'))}</td>"
                       f"<td class='num'>{m['size_css_px'][0]} × {m['size_css_px'][1]}</td></tr>")
        out.append("</tbody></table></div>" + fig("Measurements personas took during their walks. Anti-aliasing can shift a ratio slightly near a threshold.") + "</figure>")

    # 06 feedback
    s = fb.get("summary") or {}
    out.append(h2("feedback", "Participant feedback"))
    if s:
        rc = s["recommend_counts"]
        out.append(f"<p>{s['responses']} of {s['of']} personas gave an exit interview. Ease averaged {s['ease_avg_1_7']} of 7, UMUX-Lite "
                   f"{s['umux_lite_avg_0_100']} of 100{cite('umux')}, satisfaction {s['satisfaction_avg_1_5']} of 5. On likelihood to recommend, "
                   f"{rc['9-10']} scored 9–10, {rc['7-8']} scored 7–8 and {rc['0-6']} scored 0–6. These are simulated answers, not a benchmark.</p>")
    for r in fb.get("responses", []):
        if r.get("quote"):
            out.append(f"<blockquote>“{esc(r.get('quote'))}”<cite>{esc(names.get(r.get('session'), r.get('session')))}</cite></blockquote>")
    out.append("<figure class='fig'><div class='tablewrap'><table><thead><tr><th>Persona</th><th>Worst</th><th>Best</th><th>What would fix it</th></tr></thead><tbody>")
    for r in fb.get("responses", []):
        out.append(f"<tr><td><b>{esc(names.get(r.get('session'), r.get('session')))}</b></td><td>{esc(r.get('worst_thing'))}</td>"
                   f"<td>{esc(r.get('best_thing'))}</td><td>{esc(r.get('what_would_fix_it'))}</td></tr>")
    out.append("</tbody></table></div>" + fig("Exit-interview answers, in each persona's words.") + "</figure>")

    # 07 discussion
    out.append(h2("discussion", "Discussion"))
    for key, title in (("insights", "Patterns across personas"), ("what_works", "What works"), ("research_questions", "Questions to put to real users")):
        if ins.get(key):
            out.append(f"<h3>{title}</h3><ul class='plain'>" + "".join(f"<li>{esc(x)}</li>" for x in ins[key]) + "</ul>")

    # 08 limitations
    out.append(h2("limitations", "Limitations"))
    out.append("<ul class='plain'><li>These are simulated personas looking at screenshots. They show where to look, not how many real customers would struggle; counts are not rates.</li>"
               "<li>Personas saw only pixels and the address bar: no page text, markup or accessibility tree. Screen-reader experience was not tested.</li>"
               "<li>Contrast was measured from rendered pixels; anti-aliasing can shift a ratio slightly near a threshold.</li>"
               "<li>Time estimates are the personas' own estimates per screen, not measured time on task.</li></ul>")
    if ins.get("simulation_notes"):
        out.append("<h3>Notes on this run</h3><ul class='plain'>" + "".join(f"<li>{esc(x)}</li>" for x in ins["simulation_notes"]) + "</ul>")

    # 09 references
    out.append(h2("references", "References") + "<ol class='refs'>" + "".join(f"<li id='ref-{k}'>{t}</li>" for k, t in refs) + "</ol>")

    # appendices
    if walks:
        out.append(f"<section id='appendix-replay'>{h2('appendix-replay', 'Walk replay')}"
                   "<p>Step through what each persona saw, where they clicked (<span class='fail'>red</span> when nothing visible happened) "
                   "and what they thought. Arrow keys work once a button has focus.</p>"
                   "<div id='replay'><div class='controls'><select id='rp-who' aria-label='Persona'></select>"
                   "<button id='rp-prev' type='button'>&larr; Back</button><button id='rp-next' type='button'>Next &rarr;</button>"
                   "<span id='rp-pos' class='muted'></span></div><div class='rp-row'>"
                   "<div class='rp-frame'><img id='rp-img' alt=''><span id='rp-dot' class='rp-dot'></span></div>"
                   "<div id='rp-cap'></div></div></div>"
                   "<script type='application/json' id='walks'>" + json.dumps(walks).replace("</", "<\\/") + "</script>"
                   "<script>" + REPLAY_JS + "</script></section>")
    if maps:
        out.append(h2("appendix-clicks", "Click maps") + "<p>Every persona's clicks on each view of a page: blue changed the screen, "
                   "red did nothing visible, grey landed on empty space.</p><div class='maps'>")
        for m in maps:
            out.append(f"<figure class='fig'><img class='shot' src='{img_data(m['image'])}' alt='Clicks on {esc(m['page'])}'>"
                       + fig(f"{esc(m['page'])}: {m['clicks']} clicks, {m['dead']} with no response.") + "</figure>")
        out.append("</div>")
    if vf["removed"]:
        out.append(h2("appendix-removed", "Removed in verification") + "<ul class='plain'>"
                   + "".join(f"<li><b>{esc(r['id'])}</b> {esc(r['title'])}: {esc('; '.join(r['reasons']))}</li>" for r in vf["removed"]) + "</ul>")
    out.append(f"<footer class='notes'><b>Sources.</b> The recorded walks of study {esc(study.get('id'))}{cite('artefacts')}. "
               "<b>Method.</b> Vision-only persona walks driven by ux-visual-persona-crawl; flow metrics computed from the recordings; findings verified "
               "against screenshots. <b>Note.</b> Personas are simulated; ask for any finding by its ID to see the trace behind it.</footer>")
    out.append("</article></body></html>")
    (study_dir / "report.html").write_text("\n".join(out), encoding="utf-8")

    md = [f"# {study.get('product')}: visual persona crawl", "", f"Study {study.get('id')} · {n} simulated personas · mode {study.get('mode')}", ""]
    if ins.get("headline"):
        md += [f"**{ins['headline']}**", ""]
    md += ["## Outcomes", "", "| Persona | Device | Outcome | Steps | Path |", "|---|---|---|---|---|"]
    md += [f"| {v['persona'].get('name')} | {v['device']} | {v['outcome']} | {v['steps_taken']} | {' → '.join(p['page'] for p in v['path'])} |" for v in nav.values()]
    md += ["", "## Bottlenecks", "", "| | Page | Score | Dead clicks | Backtracked from | Left short of goal |", "|---|---|---|---|---|---|"]
    md += [f"| {p['handle']} | {p['page']} | {p['bottleneck_score']} | {p['score_parts']['dead_clicks']} | {p['score_parts']['backtracked_from']} | {p['score_parts']['exits_short_of_goal']} |" for p in flows["pages"][:6]]
    md += ["", "## Findings", ""]
    for f in findings:
        md.append(f"- **{f['id']}** [{f['severity']} · {f['category']}] {f['title']}: {f.get('recommendation', '')}")
    md += ["", 'Ask "show me F1" or "how do you know a real person would struggle here?" to see the screens, steps and measurements behind any finding.']
    (study_dir / "report.md").write_text("\n".join(md), encoding="utf-8")
    print(json.dumps({"report": shown(study_dir / "report.html"), "findings": len(findings), "removed": len(vf["removed"])}))
    return 0


def export(study_dir: Path) -> int:
    """Verified findings as one Markdown ticket each (issues/F1.md ...) and a findings.csv, for an issue tracker or a sheet."""
    import csv

    vf = load(study_dir / "verified_findings.json")
    if vf is None:
        raise SystemExit("Run verify first")
    study = load(study_dir / "study.json", {})
    ins = load(study_dir / "insights.json", {})
    out_dir = study_dir / "issues"
    out_dir.mkdir(exist_ok=True)
    rows = []
    for f in vf["kept"]:
        fid = f.get("id", "F?")
        lines = [f"# {fid}: {f.get('title', '')}", "",
                 f"**Severity:** {f.get('severity')} · **Category:** {f.get('category')} · **Page:** `{f.get('page', '')}` · "
                 f"**Confidence:** {f.get('confidence', '')}", "",
                 f"**Seen by simulated personas:** {', '.join(f.get('personas', []))}"
                 + (f" (hit in {f['exposure']['walks_hit']} of {f['exposure']['walks_reached']} walks that reached the page)"
                    if (f.get("exposure") or {}).get("walks_reached") else ""), "",
                 "## What happens", "", str(f.get("description", "")), ""]
        if f.get("conflict"):
            lines += ["## The two statements", ""] + [f"- {c}" for c in f["conflict"]] + [""]
        if f.get("measurement"):
            lines += ["## Measured", "", f"Measurement `{f['measurement']}`, target `{f.get('contrast_target', '')}`.", ""]
        lines += ["## Evidence", ""]
        for e in f.get("evidence", []):
            where = f"session `{e.get('session')}`, step {e.get('step')}, box {e.get('box')}"
            quote = f' — "{e["quote"]}"' if e.get("quote") else ""
            pic = f"\n\n  ![{fid} evidence](../{e['crop']})" if e.get("crop") else ""
            lines.append(f"- {where}{quote}{pic}")
        lines += ["", "## Suggested fix", "", str(f.get("recommendation", "")), "",
                  f"_From a simulated persona study ({study.get('id')}, {study.get('product')}). "
                  "It shows where to look, not how many real customers are affected._", ""]
        (out_dir / f"{fid}.md").write_text("\n".join(lines), encoding="utf-8")
        rows.append({"id": fid, "title": f.get("title"), "severity": f.get("severity"), "category": f.get("category"),
                     "page": f.get("page"), "personas": "; ".join(f.get("personas", [])),
                     "recommendation": f.get("recommendation"), "measurement": f.get("measurement", ""),
                     "walks_hit": (f.get("exposure") or {}).get("walks_hit", ""),
                     "walks_reached": (f.get("exposure") or {}).get("walks_reached", ""),
                     "evidence": "; ".join(f"{e.get('session')}#{e.get('step')}" for e in f.get("evidence", [])),
                     "ticket": f"issues/{fid}.md"})
    with (study_dir / "findings.csv").open("w", encoding="utf-8-sig", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0]) if rows else ["id"])
        w.writeheader()
        w.writerows(rows)
    if ins.get("research_questions"):
        (out_dir / "research-questions.md").write_text(
            "# Questions to test with real users\n\n" + "\n".join(f"- {q}" for q in ins["research_questions"]) + "\n",
            encoding="utf-8")
    print(json.dumps({"tickets": len(rows), "folder": shown(out_dir), "csv": shown(study_dir / "findings.csv")}))
    return 0


def _words(text: str) -> set:
    return {w for w in re.findall(r"[a-z0-9$]+", str(text).lower()) if len(w) > 2}


def compare(study_dir: Path, baseline: Path, versus: bool = False) -> int:
    """The same panel before and after a change: outcomes, funnel, page scores, and which findings are fixed, remain or are new.
    With versus, the same panel on two different sites (say, ours and a competitor's): pages can't match across
    sites, so findings match by category within the same funnel stage instead."""
    need = ("navigation.json", "flows.json", "verified_findings.json")
    for d in (study_dir, baseline):
        missing = [n for n in need if not (d / n).exists()]
        if missing:
            raise SystemExit(f"{shown(d)} is missing {missing}: run analyze and verify there first")
    old_nav, new_nav = load(baseline / "navigation.json"), load(study_dir / "navigation.json")
    old_flows, new_flows = load(baseline / "flows.json"), load(study_dir / "flows.json")
    old_f, new_f = load(baseline / "verified_findings.json")["kept"], load(study_dir / "verified_findings.json")["kept"]

    by_persona = lambda nav: {v["persona"]["id"]: v for v in nav.values()}
    po, pn = by_persona(old_nav), by_persona(new_nav)
    people = [{"persona": pid, "before": po.get(pid, {}).get("outcome"), "after": pn.get(pid, {}).get("outcome"),
               "steps_before": po.get(pid, {}).get("steps_taken"), "steps_after": pn.get(pid, {}).get("steps_taken")}
              for pid in sorted(set(po) | set(pn))]
    same_panel = set(po) == set(pn)

    fo = {f["stage"]: f for f in old_flows.get("funnel", [])}
    old_list = old_flows.get("funnel", [])
    # Two sites usually get the same stage ids ("plans", "signup") for the same step of the task. If they don't,
    # line the stages up by position.
    by_id = any(f["stage"] in fo for f in new_flows.get("funnel", []))
    funnel = [{"stage": f["stage"], "label": f["label"],
               "before": (fo.get(f["stage"], {}) if by_id else (old_list[i] if i < len(old_list) else {})).get("reached"),
               "after": f["reached"], "of": f["of"]}
              for i, f in enumerate(new_flows.get("funnel", []))]
    so = {p["page"]: p["bottleneck_score"] for p in old_flows["pages"]}
    sn = {p["page"]: p["bottleneck_score"] for p in new_flows["pages"]}
    pages = sorted(({"page": pg, "before": so.get(pg), "after": sn.get(pg)} for pg in set(so) | set(sn)),
                   key=lambda r: -max(r["before"] or 0, r["after"] or 0))

    def quotes(f):
        return {norm(q) for q in [e.get("quote") for e in f.get("evidence", [])] + list(f.get("conflict") or []) if q and len(norm(q)) > 3}

    def stage_finder(d):
        st = load(d / "study.json", {}) or {}
        urls = {}
        for v in load(d / "navigation.json", {}).values():
            for step in v.get("steps", []):
                if step.get("address_after"):
                    urls.setdefault(page_of(step["address_after"]), step["address_after"])

        def find(page):
            if not page:
                return None
            PAGE_URLS.clear()
            PAGE_URLS.update(urls)
            return stage_of(st, page)
        return find
    new_stage, old_stage = stage_finder(study_dir), stage_finder(baseline)
    stage = {id(f): new_stage(f.get("page")) for f in new_f}
    stage.update({id(f): old_stage(f.get("page")) for f in old_f})

    def same(a, b):
        if versus:
            # Two sites never share a page; the same kind of problem at the same step of the task is the match.
            same_page = bool(stage[id(a)]) and stage[id(a)] == stage[id(b)]
        else:
            same_page = bool(a.get("page")) and a.get("page") == b.get("page")
        if same_page and a.get("category") == b.get("category"):
            return True
        if same_page and quotes(a) & quotes(b):  # two wordings of one problem usually quote the same words on screen
            return True
        wa, wb = _words(a.get("title")), _words(b.get("title"))
        return bool(wa and wb) and len(wa & wb) / len(wa | wb) >= 0.35

    here, there = (study_dir.name, baseline.name) if versus else ("after", "before")
    STATUS = ("on both sites", f"only on {here}", f"only on {there}") if versus else ("still there", "new", "not seen again")
    used, rows = set(), []
    for f in new_f:
        # Prefer an old finding not yet matched; one old finding may still match two new ones when a run splits it.
        match = next((o for i, o in enumerate(old_f) if i not in used and same(f, o)), None) \
            or next((o for o in old_f if same(f, o)), None)
        if match is not None:
            used.add(old_f.index(match))
            rows.append({"status": STATUS[0], "after": f.get("id"), "before": match.get("id"), "title": f.get("title"),
                         "severity_before": match.get("severity"), "severity_after": f.get("severity")})
        else:
            rows.append({"status": STATUS[1], "after": f.get("id"), "before": None, "title": f.get("title"), "severity_after": f.get("severity")})
    for i, o in enumerate(old_f):
        if i not in used:
            rows.append({"status": STATUS[2], "after": None, "before": o.get("id"), "title": o.get("title"), "severity_before": o.get("severity")})

    caveat = ("Simulated personas vary from run to run. 'Not seen again' means no persona hit it this time, not that it is fixed; "
              "check the screen itself before closing it.")
    if versus:
        caveat = ("Simulated personas vary from run to run, and the two sites were walked separately. A finding on only one site "
                  "means no persona hit it on the other this time, not that the other site is free of it.")
    if versus:
        pages = [{"site": site, "page": pg, "score": v} for site, sc in ((baseline.name, so), (study_dir.name, sn))
                 for pg, v in sorted(sc.items(), key=lambda kv: -kv[1])[:5]]
    result = {"mode": "versus" if versus else "before_after", "baseline": shown(baseline), "study": shown(study_dir),
              "same_panel": same_panel, "personas": people, "funnel": funnel, "pages": pages, "findings": rows, "caveat": caveat}
    (study_dir / "compare.json").write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")

    TITLE = "Side by side" if versus else "Before and after"
    B, A = (baseline.name, study_dir.name) if versus else ("Before", "After")
    h = ["<!doctype html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
         "<title>" + TITLE + "</title><style>:root{--ink:#1d2433;--muted:#5b6475;--line:#e3e6ec;--bg:#fff}"
         "@media (prefers-color-scheme:dark){:root{--ink:#e8eaf0;--muted:#a3abbc;--line:#333a48;--bg:#14171d}}"
         "body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 system-ui,Segoe UI,Arial,sans-serif}"
         "main{max-width:1000px;margin:0 auto;padding:28px 16px 60px}table{border-collapse:collapse;width:100%;font-size:14px}"
         "td,th{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left}.muted{color:var(--muted)}.wrap{overflow-x:auto}"
         ".up{color:#2f855a;font-weight:600}.down{color:#b3261e;font-weight:600}</style></head><body><main>",
         f"<h1>{TITLE}</h1>",
         f"<p class='muted'>{'Other site' if versus else 'Baseline'} {esc(baseline.name)} · this run {esc(study_dir.name)}</p>"]
    if not same_panel:
        h.append("<p class='down'>The two runs used different personas, so differences may come from the panel, not the site.</p>")
    h.append(f"<h2>Findings</h2><div class='wrap'><table><tr><th>Status</th><th>{esc(B)}</th><th>{esc(A)}</th><th>Finding</th><th>Severity</th></tr>")
    for r in sorted(rows, key=lambda r: [STATUS[1], STATUS[0], STATUS[2]].index(r["status"])):
        sev = " → ".join(x for x in (r.get("severity_before"), r.get("severity_after")) if x)
        cls = "" if versus else "down" if r["status"] == STATUS[1] else "up" if r["status"] == STATUS[2] else ""
        h.append(f"<tr><td class='{cls}'>{esc(r['status'])}</td><td>{esc(r['before'] or '')}</td><td>{esc(r['after'] or '')}</td>"
                 f"<td>{esc(r['title'])}</td><td>{esc(sev)}</td></tr>")
    h.append("</table></div><h2>Outcomes</h2><div class='wrap'><table><tr><th>Persona</th><th>" + esc(B) + "</th><th>" + esc(A) + "</th><th>Steps</th></tr>")
    for p in people:
        h.append(f"<tr><td>{esc(p['persona'])}</td><td>{esc(p['before'])}</td><td>{esc(p['after'])}</td>"
                 f"<td>{esc(p['steps_before'])} → {esc(p['steps_after'])}</td></tr>")
    if funnel:
        h.append("</table></div><h2>How far they got</h2><div class='wrap'><table><tr><th>Stage</th><th>" + esc(B) + "</th><th>" + esc(A) + "</th></tr>")
        for f in funnel:
            b, a = f["before"] or 0, f["after"] or 0
            cls = "" if versus else "up" if a > b else "down" if a < b else ""
            h.append(f"<tr><td>{esc(f['label'])}</td><td>{b} of {f['of']}</td><td class='{cls}'>{a} of {f['of']}</td></tr>")
    if versus:
        # No page is on both sites: show each site's worst pages on their own.
        h.append("</table></div><h2>Worst pages</h2><p class='muted'>Bottleneck score; lower is better.</p><div class='wrap'><table><tr><th>Site</th><th>Page</th><th>Score</th></tr>")
        for p in pages:
            h.append(f"<tr><td>{esc(p['site'])}</td><td>{esc(p['page'])}</td><td>{p['score']}</td></tr>")
    else:
        h.append("</table></div><h2>Page scores</h2><p class='muted'>Bottleneck score; lower is better.</p><div class='wrap'><table><tr><th>Page</th><th>Before</th><th>After</th></tr>")
    for p in ([] if versus else pages[:12]):
        b, a = p["before"], p["after"]
        cls = "up" if (a is not None and b is not None and a < b) else "down" if (a is not None and b is not None and a > b) else ""
        h.append(f"<tr><td>{esc(p['page'])}</td><td>{'' if b is None else b}</td><td class='{cls}'>{'' if a is None else a}</td></tr>")
    h.append(f"</table></div><p class='muted'>{esc(result['caveat'])} Persona counts are not rates.</p></main></body></html>")
    (study_dir / "compare.html").write_text("\n".join(h), encoding="utf-8")
    counts = {s: sum(r["status"] == s for r in rows) for s in STATUS}
    print(json.dumps({"same_panel": same_panel, **counts, "report": shown(study_dir / "compare.html")}))
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["analyze", "verify", "render", "export", "compare"])
    ap.add_argument("--study-dir", required=True)
    ap.add_argument("--baseline", help="compare: an earlier study folder to compare this one against")
    ap.add_argument("--versus", action="store_true", help="compare: the baseline is another site walked by the same panel")
    args = ap.parse_args()
    d = lp(args.study_dir)
    if args.cmd == "analyze":
        analyze(d)
        return 0
    if args.cmd == "compare":
        if not args.baseline:
            raise SystemExit("compare needs --baseline <earlier study folder>")
        return compare(d, lp(args.baseline), versus=args.versus)
    if args.cmd == "export":
        return export(d)
    return verify(d) if args.cmd == "verify" else render(d)


if __name__ == "__main__":
    sys.exit(main())
