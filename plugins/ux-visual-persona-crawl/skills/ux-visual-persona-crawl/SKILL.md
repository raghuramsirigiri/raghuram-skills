---
name: ux-visual-persona-crawl
description: Create a panel of synthetic personas with demographics, then have each one crawl a website purely by sight, from screenshots, clicking by screen position the way a person does, with no reading of page text, HTML, accessibility tree or other metadata. Records every persona's navigation as JSON, collects in-the-moment reactions and an exit interview, and produces a report of flow bottlenecks, friction points, contradictions, UI and UX problems, unclear or hidden buttons, and measured colour contrast, each backed by a screenshot. Use this whenever someone wants synthetic users, a simulated usability test, persona walkthroughs, a visual or "human-eye" UX audit, a heuristic review of a sign-up, checkout or onboarding flow, or wants to know where people would get stuck, confused or drop off on a site, even if they only say "walk through our site like a customer", "where do users struggle on this page", "check our signup flow for UX issues" or "test this staging site with a few personas".
---

# UX visual persona crawl

Build a panel of distinct people, let each one use a site **with their eyes only**, then have a separate reviewer turn the recordings into findings that each point at a screenshot.

Four ideas shape everything here:

- **Pixels in, positions out.** A person never sees the HTML. They see a screen, read what is drawn, and click where something looks clickable. So the persona gets screenshots and the address bar, nothing else, and acts by x,y position. Problems that exist only visually, such as a call to action that looks disabled, text too faint to read, a fee in grey fine print, or a button that does nothing when pressed, surface only this way. A crawler that reads the markup sees the label "See plans" and clicks it without ever noticing that it is barely visible. `scripts/eyes.py` enforces this: it never reads the page, it only screenshots it.
- **The persona and the reviewer are different agents.** Someone trying to get something done notices different things from someone paid to critique. Mixing them produces polite, generic critique.
- **The numbers come from the recording.** Flow metrics are computed by `scripts/report.py` from each persona's `journey.json`. Contrast is measured from screenshot pixels by `eyes.py measure`, not estimated by eye. Every finding must cite a session, step and box on that step's screenshot, and `report.py verify` removes any that don't hold.
- **Simulated people point at where to look.** They don't tell you how many customers would leave. The report says so, and turns its strongest findings into questions for real users.

## Limits to keep

These exist for reasons that don't change with the request.

- **Live sites are read-only.** In `observe_only` (the default), the driver blocks every request that would send data (POST, PUT and so on) and refuses typing except short search words. Putting invented details into a real company's forms can be a false statement to them, and real details aren't ours to use. Personas stop at the first form and say what they would do.
- **Typing and submitting forms happen only on a test system** (`test_env`), which the driver allows only on local or staging-style hosts, with test values from the study file. Don't relabel a production host to get past this.
- **Stay on the site.** Navigation to hosts not in `allowed_hosts` is refused, analytics calls are dropped so simulated visits don't distort the site's data, and live runs use at most 2 sessions at a time at the default pace.
- **CAPTCHAs, bot checks and logins belong to a person.** Never attempt or bypass them. A persona who meets one finishes with `blocked_by_site`, and that is a note about the run, not a UX finding.
- **Read the site's terms before a live run.** If they restrict automated access, or are unclear, ask the user to confirm they own the site or have permission, or offer a staging copy instead.

## Who runs what

Match each task to how hard it is. Every model step reads screenshots, so none goes below mid tier: a misread price or a missed faint button becomes a wrong finding. The mechanical work is already in the scripts.

| Task | Run by | Model | Step up to the strongest when |
|---|---|---|---|
| Brief, study.json, short recon, personas, final summary, traces | you | your own | — |
| `facts.md` survey (step 3) | subagent | mid tier, such as Sonnet | key pages carry dense price tables or fine print |
| Walking each persona (step 5) | one subagent each | mid tier, such as Sonnet | the persona relies on fine visual reading (`browser_zoom` 150+, a `vision` condition, a task about small print), or the user asks for the most thorough walks |
| Review, and correcting findings verify removed (steps 7–8) | one subagent | the strongest, such as Opus | already there; on a large panel keep it one reviewer rather than splitting it |

Run the orchestrator on the strongest model where you can. If you can't choose models, run everything on the current one; the table still says who does what.

## Workflow

### 1. Set up (once per project)

```bash
python <skill>/scripts/setup_env.py --project .
```

This installs Playwright, Pillow and Chromium under `.ux-visual-crawl/` in the project. Skip it if `.ux-visual-crawl/venv` exists. Run `report.py` with that venv's Python (`.ux-visual-crawl/venv/Scripts/python.exe` on Windows, `.ux-visual-crawl/venv/bin/python` elsewhere), because it needs Pillow. `eyes.py` finds the venv by itself, and `eyes.py check` prints the exact command to use for `report.py` as `report_command`.

### 2. Agree the brief

Collect only what's missing: the start URL, the hosts the flow crosses, what a person is trying to get done there (the task), who the customers are, and whether this is a live site or a test system. If the user has analytics, survey data or a customer profile, build the panel from it rather than from guesses.

| Mode | When | What personas can do |
|---|---|---|
| `observe_only` (default) | Any live site, or whenever the user says not to fill anything | Look, scroll, click, hover, type short search words. Nothing is sent. |
| `test_env` | The user confirms a local or staging system | Also fill and submit forms, with `test:<name>` values from `test_data` or plainly fake words |

### 3. Write the study

Create `ux-crawl-runs/<study-id>/study.json`:

```json
{
  "id": "acme-signup-2026-11",
  "product": "Acme home broadband",
  "mode": "observe_only",
  "start_url": "https://www.acme.com/broadband",
  "allowed_hosts": ["www.acme.com", "join.acme.com"],
  "goal": "Choose a plan and reach the start of the sign-up form",
  "goal_match": "join\\.acme\\.com",
  "max_steps": 30,
  "pace_ms": 1200,
  "stages": [
    {"id": "landing", "label": "Landing page", "match": "/broadband$"},
    {"id": "plans", "label": "Plans", "match": "/plans"},
    {"id": "signup", "label": "Sign-up", "match": "join\\.acme\\.com"}
  ]
}
```

Keep `id` short and each persona `id` to 24 characters or fewer; they become folder names. Deep folders are fine: the scripts write through Windows' long-path form, so there's no need to move a study to a shorter folder.

`pace_ms` is the pause after every action. Leave it out and it defaults to 1200 when any allowed host is a live site, and 300 when every host is local or staging, where politeness doesn't apply. Hosts may be written with a port or scheme (`localhost:8765`); they're reduced to the host name. `eyes.py check` prints `treated_as` and `pace_ms`, so a local system mistaken for a live site shows up before the walks.

Write `goal_match` and `stages` from addresses you have seen, not guessed. Write the rest of the file first, start a recon session (below), click once along the main path and note each address bar, then fill them in. A stage that matches nothing leaves a hole in the funnel. This short recon has to come before the walks; the full survey for `facts.md` doesn't. If recon finds no goal page at all (the way forward is broken), set `"goal_match": null` and note it in `facts.md`. Every `reached_goal` claim is then recorded as unverified, and the missing page is itself something to report.

`goal_match` is a pattern on the address bar. A persona that claims `reached_goal` without ever reaching a matching address is recorded as `claimed_goal_unverified`. `stages`, in journey order, give the report its funnel; each `match` is tried against the full address and against the path alone, so `^/$` and `join\\.acme\\.com` both work. `test_env` also needs `environment_confirmation` (who confirmed it's a test system) and `test_data` (for example `{"meter": "0000000000"}`). Check the file with `eyes.py check --study <path>`.

The short recon works by sight, like everything else:

```bash
python <skill>/scripts/eyes.py start --study <study.json> --recon [--device mobile]
```

Then `look`, `zoom`, `scroll` and `click` as a persona would. Here `act` needs only the `action`, for example `echo '{"action": {"type": "click", "x": 640, "y": 410}}' | python <skill>/scripts/eyes.py act --session <recon-session>`. The action types are the table in `references/walker.md`. Recon sessions live in `recon/` and stay out of the analysis. Never fetch the HTML, run curl, open the page source or use a web-fetch tool: the markup says things the screen doesn't, and they would reach the report as if a visitor saw them.

Then hand the survey to a subagent with `references/surveyor.md`, the study path and the driver path, and nothing else. It writes `facts.md`: the prices, conditions and promises the site makes, with the page each is on. That file goes to the reviewer only, so they can tell when a persona came away with a wrong belief. Nothing before the review needs it, so start the surveyor alongside the walkers (step 5). On a live site its session counts toward the two that may run at once. Without subagents, follow `surveyor.md` yourself.

### 4. Create the personas

Read `references/personas.md` and write `personas.json` in the study folder: usually 4 to 8 people who would behave differently, each with a `demographics` block and a `task`. Check it with `eyes.py check --study <study.json> --personas <personas.json>`, which stops a walk-breaking mistake before any walker starts and warns about gaps in the panel. Show the user a one-line summary of each before running, because a panel missing their key customer wastes the whole run. If the user named the panel size, keep to it, and list `check`'s coverage warnings under what wasn't tested.

### 5. Walk each persona

Start the sessions, then hand each one to its own subagent:

```bash
python <skill>/scripts/eyes.py start --study <study.json> --personas <personas.json> --all
```

This opens every persona's browser at once. Use `--persona a,b` to choose personas. On a live site it opens two and lists the rest as `queued`; start each queued one as a walk finishes. Each session gets `brief.md`, the brief from `references/walker.md` with the persona, paths and typing rule filled in. Give each subagent its session's `walker_prompt` as the whole prompt, and nothing else. That one line points it at its brief. Pick each walker's model from the table above. In testing a mid-tier walker clicked as accurately as the top model at twice the speed, but tended to give up sooner, so when a walk ends within two or three steps, read its `reason` before trusting the gap in coverage. Start the walkers together. Your knowledge of the site, the findings you expect and the other personas would contaminate the run. Don't steer or rescue a stuck persona: getting stuck is the data.

If you can't run subagents, walk the personas one at a time yourself, working only from that persona's profile and from what the screenshots show.

`start` also takes each walker's first screen, which its prompt names, so the walker opens its brief and first screenshot together. Every session ends with an exit interview, sent along with the walker's `finish` action. When the walkers report back, run `eyes.py status --study <study.json>`. It lists each session's steps, outcome and walk times, and whether its exit interview is in. `all_done` must be true before analysis, and `waiting_on` names any session that isn't finished. If it prints `stop` (several sessions ended as `blocked_by_site`), tell the user rather than burning more runs.

### 6. Compute the flows

```bash
<venv-python> <skill>/scripts/report.py analyze --study-dir <study-dir>
```

This writes `navigation.json` (every persona's path and every step), `flows.json` (per-page bottleneck scores with their parts, plus the funnel), `demographics.json`, the panel's `feedback.json`, and for the reviewer `hot_steps.json` (the steps worth a close look, with reasons) and a contact sheet per session (`sessions/<id>/contact-N.jpg`, every step as a thumbnail). The sheets let the reviewer see whole walks in a few images and open full screenshots only where it matters.

### 7. Review

Give a fresh subagent on the strongest model `references/reviewer.md` with the study folder path. It reads the journeys, the screenshots, `flows.json` and `facts.md`, measures anything it wants to call a contrast problem, and writes `findings.json` and `insights.json`. If you can't run subagents, do this step yourself after all the walks.

### 8. Verify and report

```bash
<venv-python> <skill>/scripts/report.py verify --study-dir <study-dir>
<venv-python> <skill>/scripts/report.py render --study-dir <study-dir>
```

Read the `removed` list in `verified_findings.json`. A `rewalk` list names personas whose one walk is the only support for a critical or high finding. Mention it to the user, and offer the re-walk in `references/after-the-run.md`. A finding with a wrong step or box can be corrected against the recording and verified again: send the `removed` list back to the reviewer, which still has the walks in view. Never edit a journey or measurement to make a claim pass.

`report.html` is one self-contained file: the outcomes and paths, the funnel and each persona's stages, the bottleneck table, a step-through replay of every walk, a click map per page view, the findings with cropped evidence and how many walks hit each, the contrast measurements, the panel's demographics, the exit interviews, and the limits.

For tickets or a spreadsheet, walking a persona again, a stakeholder brief, or re-running after a fix, read `references/after-the-run.md`.

### 9. Tell the user

Give the headline, then the top three findings by handle with their fix, each persona's outcome in one line, and where `report.html` and the JSON files are. Mention anything that wasn't tested. End with the closing line from `references/tracing.md`.

## Tracing

Readers push back on synthetic findings: "a real user wouldn't do that", "it looks fine on my screen", "so what's our drop-off rate?". Read `references/tracing.md` before answering any follow-up. It defines the handles (`F1` findings, `B1` pages ranked as bottlenecks, `<persona>:M1` measurements, persona ids), the fixed closing line, the trace block (*Persona · Steps · On screen · Measured · Why this severity · What would change it*), and the questions to expect. A trace re-reads the recording and corrects the report if a finding doesn't hold.

## What this can and can't tell you

Good for: things people can't see or misread, buttons that don't look like buttons or don't respond, fine print that changes the offer, prices or promises that contradict each other across pages, requirements that appear late, dead ends, layout that hides the next step on a phone, and differences between kinds of customer.

Not for: conversion rates, true time on task, or screen-reader experience (personas have no accessibility tree, by design). Large-text and keyboard personas are partly role-played, so treat those findings as prompts for a proper accessibility audit.
