#!/usr/bin/env python3
"""Turn recorded persona crawls into flow analysis, verified findings and a report.

  analyze  --study-dir DIR   navigation.json, flows.json, demographics.json, feedback.json
  verify   --study-dir DIR   check findings.json against the recordings -> verified_findings.json
  render   --study-dir DIR   report.html and report.md

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


def stage_of(study: dict, url: str):
    hit = None
    for stage in study.get("stages", []):
        if re.search(stage["match"], url, re.I):
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
                       "effort": st["decision"]["effort"], "emotion": st["decision"]["emotion"]} for st in steps],
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
            "back_presses": int(ps["back_presses"]), "refused_by_driver": int(ps["refused_by_driver"]),
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
    (study_dir / "navigation.json").write_text(json.dumps(navigation, indent=2, ensure_ascii=False), encoding="utf-8")
    (study_dir / "flows.json").write_text(json.dumps(flows, indent=2, ensure_ascii=False), encoding="utf-8")
    (study_dir / "demographics.json").write_text(json.dumps(demo_rows, indent=2, ensure_ascii=False), encoding="utf-8")
    (study_dir / "feedback.json").write_text(json.dumps({"summary": summary, "responses": fb_rows}, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"sessions": len(navigation), "pages": len(pages),
                      "top_bottlenecks": [(p["handle"], p["page"], p["bottleneck_score"]) for p in pages[:3]],
                      "feedback_missing": summary.get("missing", list(navigation))}, ensure_ascii=False))
    return flows


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
            spots = {(e.get("session"), e.get("step")) for e in evidence}
            if len(spots) < 2 or not f.get("conflict") or len(f.get("conflict", [])) < 2:
                problems.append("a contradiction needs two evidence spots and a conflict list stating both claims")
        if f.get("category") == "bottleneck" and f.get("page") not in pages:
            problems.append("a bottleneck must name a page from flows.json")
        if problems:
            removed.append({"id": f.get("id"), "title": f.get("title"), "reasons": problems})
        else:
            if notes:
                f["verification_notes"] = notes
            kept.append(f)
    kept.sort(key=lambda f: SEV_ORDER.index(f["severity"]))
    (study_dir / "verified_findings.json").write_text(json.dumps({"kept": kept, "removed": removed}, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"kept": len(kept), "removed": removed}, ensure_ascii=False))
    return 0


# ---------------------------------------------------------------- render

def esc(x) -> str:
    return html.escape(str(x if x is not None else ""))


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

    css = """:root{--ink:#1d2433;--muted:#5b6475;--line:#e3e6ec;--bg:#fff;--soft:#f5f6f9;--crit:#b3261e;--high:#d9480f;--med:#b7791f;--low:#4a5568;--ok:#2f855a}
@media (prefers-color-scheme:dark){:root{--ink:#e8eaf0;--muted:#a3abbc;--line:#333a48;--bg:#14171d;--soft:#1c2029}}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 system-ui,Segoe UI,Helvetica,Arial,sans-serif}
main{max-width:1100px;margin:0 auto;padding:28px 16px 80px}h1{font-size:28px;margin:0 0 6px}h2{margin:38px 0 10px;font-size:21px;border-bottom:1px solid var(--line);padding-bottom:6px}
.muted{color:var(--muted)}table{border-collapse:collapse;width:100%;font-size:13.5px}td,th{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}
th{color:var(--muted);font-weight:600}.wrap{overflow-x:auto}.chip{display:inline-block;background:var(--soft);border:1px solid var(--line);border-radius:12px;padding:1px 8px;margin:2px;font-size:12.5px}
.sev{font-weight:700;text-transform:uppercase;font-size:11.5px;letter-spacing:.04em}.critical{color:var(--crit)}.high{color:var(--high)}.medium{color:var(--med)}.low{color:var(--low)}
.finding{border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin:14px 0}.finding img{max-width:100%;border:1px solid var(--line);border-radius:6px;margin:6px 0}
.bar{height:12px;background:#3b6fd8;border-radius:3px}.fail{color:var(--crit);font-weight:700}.pass{color:var(--ok)}.headline{font-size:19px;margin:14px 0}"""

    out = [f"<!doctype html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
           f"<title>{esc(study.get('product'))} persona crawl</title><style>{css}</style></head><body><main>"]
    out.append(f"<h1>{esc(study.get('product'))}: visual persona crawl</h1>")
    out.append(f"<p class='muted'>Study {esc(study.get('id'))} · {n} simulated personas ({', '.join(f'{v} {k}' for k, v in devices.items())}) · "
               f"mode {esc(study.get('mode'))} · start {esc(study.get('start_url'))}</p>")
    if ins.get("headline"):
        out.append(f"<p class='headline'><b>{esc(ins['headline'])}</b></p>")

    # outcomes
    out.append("<h2>Who went where</h2><div class='wrap'><table><tr><th>Persona</th><th>Device</th><th>Outcome</th><th>Steps</th><th>Est. time</th><th>Path</th></tr>")
    for name, v in nav.items():
        path = " → ".join(f"<span class='chip'>{esc(p['page'])} ×{p['steps']}</span>" for p in v["path"])
        out.append(f"<tr><td><b>{esc(v['persona'].get('name'))}</b><br><span class='muted'>{esc(name)}</span></td><td>{esc(v['device'])}</td>"
                   f"<td>{esc(v['outcome'])}<br><span class='muted'>{esc(v.get('reason'))}</span></td><td>{v['steps_taken']}</td>"
                   f"<td>{round((v.get('est_seconds') or 0) / 60, 1)} min</td><td>{path}</td></tr>")
    out.append("</table></div>")
    if flows["funnel"]:
        out.append("<h3>How far personas got</h3><table>")
        for f in flows["funnel"]:
            out.append(f"<tr><td style='width:28%'>{esc(f['label'])}</td><td><div class='bar' style='width:{100 * f['reached'] / max(f['of'], 1):.0f}%'></div></td>"
                       f"<td style='width:14%'>{f['reached']} of {f['of']}</td></tr>")
        out.append("</table><p class='muted'>Counts of simulated personas, not conversion rates.</p>")

    # bottlenecks
    out.append("<h2>Where the flow slows down</h2><div class='wrap'><table><tr><th></th><th>Page</th><th>Visitors</th><th>Steps / visitor</th><th>Dead clicks</th>"
               "<th>Backtracked from</th><th>Left here, short of goal</th><th>Friction reports</th><th>Clarity · trust · effort</th><th>Score</th></tr>")
    for p in flows["pages"]:
        sp = p["score_parts"]
        out.append(f"<tr><td>{p['handle']}</td><td>{esc(p['page'])}</td><td>{p['visitors']}</td><td>{sp['steps_per_visitor']}</td><td>{sp['dead_clicks']}</td>"
                   f"<td>{sp['backtracked_from']}</td><td>{sp['exits_short_of_goal']}</td><td>{p['friction_reports']}</td>"
                   f"<td>{p['avg_clarity']} · {p['avg_trust']} · {p['avg_effort']}</td><td><b>{p['bottleneck_score']}</b></td></tr>")
    out.append(f"</table></div><p class='muted'>Score = {esc(flows['score_formula'])}. Clarity and trust 1 to 5, higher is better; effort 1 to 5, higher is worse.</p>")

    # findings
    out.append(f"<h2>Findings ({len(findings)})</h2>")
    for f in findings:
        out.append(f"<div class='finding'><span class='sev {f['severity']}'>{f['severity']}</span> · <span class='chip'>{esc(f['category'])}</span> "
                   f"<b>{esc(f.get('id'))}: {esc(f.get('title'))}</b><p>{esc(f.get('description'))}</p>")
        if f.get("conflict"):
            out.append("<p><b>Says one thing:</b> " + esc(f["conflict"][0]) + "<br><b>…and another:</b> " + esc(f["conflict"][1]) + "</p>")
        if f.get("measured"):
            m = f["measured"]
            out.append(f"<p>Measured <span class='fail'>{m['ratio']}:1</span> ({esc(m['foreground'])} on {esc(m['background'])}), target {m['target']}:1 · {esc(f.get('measurement'))}</p>")
        for e in f.get("evidence", []):
            crop = study_dir / e.get("crop", "")
            if e.get("crop") and crop.exists():
                out.append(f"<figure style='margin:8px 0'><img alt='{esc(f.get('title'))}' src='{img_data(crop)}'>"
                           f"<figcaption class='muted'>{esc(e['session'])}, step {e['step']}{(' · “' + esc(e['quote']) + '”') if e.get('quote') else ''}</figcaption></figure>")
        affected = ", ".join(f.get("personas", []))
        out.append(f"<p><b>Fix:</b> {esc(f.get('recommendation'))}</p><p class='muted'>Affects: {esc(affected)} · confidence {esc(f.get('confidence'))}</p></div>")

    # measurements
    if measurements:
        out.append("<h2>Contrast and size measurements</h2><div class='wrap'><table><tr><th>Id</th><th>What</th><th>Colours</th><th>Ratio</th><th>Body text 4.5</th><th>Large text / UI 3.0</th><th>Size (CSS px)</th></tr>")
        for m in measurements:
            ok = m.get("wcag", {})
            cls = lambda b: "pass" if b else "fail"
            out.append(f"<tr><td>{esc(m['id'])}</td><td>{esc(m.get('what'))}</td><td>{esc(m.get('foreground'))} on {esc(m.get('background'))}</td>"
                       f"<td>{esc(m.get('contrast_ratio'))}</td><td class='{cls(ok.get('body_text_4_5'))}'>{'pass' if ok.get('body_text_4_5') else 'fail'}</td>"
                       f"<td class='{cls(ok.get('large_text_3'))}'>{'pass' if ok.get('large_text_3') else 'fail'}</td><td>{m['size_css_px'][0]}×{m['size_css_px'][1]}</td></tr>")
        out.append("</table></div><p class='muted'>Measured from screenshot pixels with an eyedropper method, not from the page's styles.</p>")

    # demographics
    out.append("<h2>The panel</h2><div class='wrap'><table><tr><th>Persona</th><th>Demographics</th><th>Outcome</th></tr>")
    for r in demo:
        d = "; ".join(f"{k.replace('_', ' ')}: {v if not isinstance(v, list) else ', '.join(map(str, v))}" for k, v in (r.get("demographics") or {}).items())
        out.append(f"<tr><td><b>{esc(r.get('name'))}</b><br><span class='muted'>{esc(r.get('device'))}</span></td><td>{esc(d)}</td><td>{esc(r.get('outcome'))}</td></tr>")
    out.append("</table></div><p class='muted'>Simulated people. Demographics describe who the panel stands in for, not real respondents.</p>")

    # feedback
    s = fb.get("summary") or {}
    out.append("<h2>What they said afterwards</h2>")
    if s:
        rc = s["recommend_counts"]
        out.append(f"<p>{s['responses']} of {s['of']} exit interviews · ease {s['ease_avg_1_7']}/7 · UMUX-Lite {s['umux_lite_avg_0_100']}/100 · "
                   f"satisfaction {s['satisfaction_avg_1_5']}/5 · would recommend 9–10: {rc['9-10']}, 7–8: {rc['7-8']}, 0–6: {rc['0-6']}</p>")
    out.append("<div class='wrap'><table><tr><th>Persona</th><th>In one word</th><th>Worst</th><th>Best</th><th>What would fix it</th><th>In their words</th></tr>")
    for r in fb.get("responses", []):
        out.append(f"<tr><td>{esc(r.get('session'))}</td><td>{esc(r.get('one_word'))}</td><td>{esc(r.get('worst_thing'))}</td><td>{esc(r.get('best_thing'))}</td>"
                   f"<td>{esc(r.get('what_would_fix_it'))}</td><td>“{esc(r.get('quote'))}”</td></tr>")
    out.append("</table></div>")

    for key, title in (("insights", "Patterns across personas"), ("what_works", "What works"), ("research_questions", "Questions to put to real users")):
        if ins.get(key):
            out.append(f"<h2>{title}</h2><ul>" + "".join(f"<li>{esc(x)}</li>" for x in ins[key]) + "</ul>")
    if vf["removed"]:
        out.append("<h2>Removed in verification</h2><ul>" + "".join(f"<li>{esc(r['id'])} {esc(r['title'])}: {esc('; '.join(r['reasons']))}</li>" for r in vf["removed"]) + "</ul>")
    out.append("<h2>Limits</h2><ul><li>These are simulated personas looking at screenshots. They show where to look, not how many real customers would struggle; counts are not rates.</li>"
               "<li>Personas saw only pixels and the address bar: no page text, markup or accessibility tree. Screen-reader experience was not tested.</li>"
               "<li>Contrast was measured from rendered pixels; anti-aliasing can shift a ratio slightly near a threshold.</li>"
               "<li>Time estimates are the personas' own estimates per screen, not measured time on task.</li></ul></main></body></html>")
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
    print(json.dumps({"report": str(study_dir / "report.html"), "findings": len(findings), "removed": len(vf["removed"])}))
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["analyze", "verify", "render"])
    ap.add_argument("--study-dir", required=True)
    args = ap.parse_args()
    d = Path(args.study_dir)
    if args.cmd == "analyze":
        analyze(d)
        return 0
    return verify(d) if args.cmd == "verify" else render(d)


if __name__ == "__main__":
    sys.exit(main())
