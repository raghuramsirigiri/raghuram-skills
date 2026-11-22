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
- **CAPTCHAs, bot checks and logins belong to a person.** Never attempt or bypass them. A persona who meets one finishes with `blocked_by_site`, and that is a note about the run, not a UX finding. If recon meets one on the start page, every walk would end on its first screen, so stop there: build no panel, and tell the user what blocked the run and how to get past it (a staging copy without the check, the crawler allow-listed, or a start page before the wall).
- **Leave this skill's `evals/` folder alone.** It holds the skill's own test cases and the answer keys to its practice sites, so knowing it would tell you what to expect before anyone walks. Don't list, search or open it; reach the scripts and references by the paths this file gives.
- **Have permission for a live run.** If the user says it's their own site or they have permission, that's enough. Otherwise read the site's terms by sight in the recon session (step 3): click the terms link, usually in the footer, and `zoom` on what governs automated access. Don't fetch the terms page: the no-markup rule covers you too. Terms aren't a fact about the offer, so they stay out of `facts.md`. If the terms restrict automated access, are unclear, or can't be found on screen, ask the user to confirm they own the site or have permission, or offer a staging copy. `eyes.py check` also reads each live host's `robots.txt` and reports under `robots` whether it lets crawlers reach `start_url`. A `disallowed` result means the same: ask the user before walking.

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
  "max_steps": 100,
  "pace_ms": 1200,
  "stages": [
    {"id": "landing", "label": "Landing page", "match": "/broadband$"},
    {"id": "plans", "label": "Plans", "match": "/plans"},
    {"id": "signup", "label": "Sign-up", "match": "join\\.acme\\.com"}
  ]
}
```

`max_steps` defaults to 100, which leaves room for a multi-step form and the screen after Submit. Set `"image_budget": "low"` to cap each screenshot's long side at 1100 px, about half the image tokens per step, when the pages carry no fine print the personas must read; leave it out for price tables, fees or a `browser_zoom` persona.

Keep `id` short and each persona `id` to 24 characters or fewer; they become folder names. Deep folders are fine: the scripts write through Windows' long-path form, so there's no need to move a study to a shorter folder.

`pace_ms` is the pause after every action. Leave it out and it defaults to 1200 when any allowed host is a live site, and 300 when every host is local or staging, where politeness doesn't apply. Hosts may be written with a port or scheme (`localhost:8765`); they're reduced to the host name. `eyes.py check` prints `treated_as` and `pace_ms`, so a local system mistaken for a live site shows up before the walks.

Write `goal_match` and `stages` from addresses you have seen, not guessed. Write the rest of the file first, start a recon session (below), click once along the main path and note each address bar, then fill them in. A stage that matches nothing leaves a hole in the funnel. This short recon has to come before the walks; the full survey for `facts.md` doesn't. If recon finds no goal page at all (the way forward is broken), set `"goal_match": null` and note it in `facts.md`. Every `reached_goal` claim is then recorded as unverified, and the missing page is itself something to report.

Recon is only for finding those addresses. Anything else it shows you, such as a field that refused a value, a button that did nothing or a page that looked confusing, must not shape a choice you make afterwards. Test values, personas, start pages and the panel's make-up come from the customers and the task. A password picked because recon saw a weak one refused, or a start page picked to skip a broken link, decides in advance who meets the problem, and the finding then describes your setup rather than the site. So write test values the way that kind of customer would hold them. If a value or persona did come from what recon showed, record it in `setup_notes` (a list of strings) in `study.json`. Walkers never read that file, and the reviewer weakens any finding it touches.

Optionally set `optimal_path_pages`, the fewest pages the task needs from the start page, if recon showed the shortest route. Lostness in the report measures each successful walk against it; left out, the shortest walk that reached the goal stands in, which flatters the panel when every walk wandered.

`goal_match` is a pattern on the address bar. A persona that claims `reached_goal` without ever reaching a matching address is recorded as `claimed_goal_unverified`. `stages`, in journey order, give the report its funnel; each `match` is tried against the full address and against the path alone, so `^/$` and `join\\.acme\\.com` both work. `test_env` also needs `environment_confirmation` (who confirmed it's a test system) and `test_data` (for example `{"meter": "0000000000", "email": "test+{persona}@example.com"}`). Give every value a site could remember someone by its own copy per persona, either with `{persona}` (replaced by the session id, so a re-walk gets `a-2`) or with the persona's own `test_data`. A site that saves applications by email or phone will otherwise show one persona's half-filled form to the next. `check` warns about values every persona would share; list a value meant to be the same for everyone, such as the test card the site itself publishes, in `shared_test_data`. Check the file with `eyes.py check --study <path>`.

Some details a real customer holds just by being one: an address inside the delivery area, an account or meter number the company issued, a policy reference. Invented ones (`100 Test Street`) are details no customer of that system has, so every walk would start by meeting the site's error for an unknown value, and the run would test that error path instead of the task. On a test system, ask the user for them before recon, since they know what the system holds, or use values the site itself presents as test data on screen (a test-card notice, a sample account it tells visitors to use), and say which in `setup_notes`. A value that turns up in an error message or a suggestion after something failed isn't test data the site published: picking it would be choosing to dodge what recon showed. Leave out a value the task doesn't need. Testing what happens to a customer whose value the site doesn't know is a persona's `situation`, not the default.

The short recon works by sight, like everything else:

```bash
python <skill>/scripts/eyes.py start --study <study.json> --recon [--device mobile]
```

Then `look`, `zoom`, `scroll` and `click` as a persona would. Here `act` needs only the `action`, for example `echo '{"action": {"type": "click", "x": 640, "y": 410}}' | python <skill>/scripts/eyes.py act --session <recon-session>`. The action types are the table in `references/walker.md`. Recon sessions live in `recon/` and stay out of the analysis. Never fetch the HTML, run curl, open the page source or use a web-fetch tool: the markup says things the screen doesn't, and they would reach the report as if a visitor saw them.

Then hand the survey to a `screen-walker` subagent (see step 5) with `references/surveyor.md`, the study path and the driver path, and nothing else. It writes `facts.md`: the prices, conditions and promises the site makes, with the page each is on. That file goes to the reviewer only, so they can tell when a persona came away with a wrong belief. Nothing before the review needs it, so start the surveyor alongside the walkers (step 5). On a live site its session counts toward the two that may run at once. Without subagents, follow `surveyor.md` yourself.

### 4. Create the personas

Read `references/personas.md`. First settle the intended audience. Demographics, traits or stances the user named come first and are kept as given. Otherwise infer the audience from the brief and from what the site offers and whom it addresses. When that leaves it unclear (several distinct audiences, or nothing saying who it's for), ask the user once, offering two to four candidate audiences to choose from. Next list the attributes the product itself judges customers by: what it prices by, sets eligibility by and asks for on its application, such as a business's turnover, headcount and years trading, or a driver's car and record. Then write `personas.json` in the study folder: usually 4 to 8 people from that audience who would behave differently, each with a `demographics` block, a `customer_profile` of those attributes (the same keys for everyone, spread across the bands that change what the site shows), a `task`, and the decision `stances` (sceptic, privacy-minded, eco-conscious, or ones derived from the task and product) that shape how they explore and what they decide. Check it with `eyes.py check --study <study.json> --personas <personas.json>`, which stops a walk-breaking mistake before any walker starts and warns about gaps in the panel. Show the user the audience line and a one-line summary of each persona, including their customer profile and stances, before running, because a panel missing their key customer wastes the whole run. If the user named the panel size, keep to it, and list `check`'s coverage warnings under what wasn't tested.

### 5. Walk each persona

Start the sessions, then hand each one to its own subagent:

```bash
python <skill>/scripts/eyes.py start --study <study.json> --personas <personas.json> --all
```

This opens every persona's browser at once. Use `--persona a,b` to choose personas. A browser that fails to open is listed under `failed`, and its session folder is moved to `failed-starts/` with its log, so it doesn't count as a walk. Read the error before starting that persona again, and don't change the persona to get it started: if it can't run as written, say so under what wasn't tested. On a live site it opens two and lists the rest as `queued`; start each queued one as a walk finishes. Each session gets `brief.md`, the brief from `references/walker.md` with the persona, paths and typing rule filled in. Give each subagent its session's `walker_prompt` as the whole prompt, and nothing else. Start every walker as this plugin's `screen-walker` agent (subagent type `ux-visual-persona-crawl:screen-walker`), which has only file reading, file writing and the shell, and whose shell the plugin's `hooks/walker_guard.py` limits to `eyes.py` commands, one per call. A general-purpose subagent also holds browser, page-reading and web tools: one walker that reached for them read a report open in an editor's browser pane and took in the other personas' findings, and the walk had to be thrown away. Where that agent type isn't available, close every browser pane or tab you have open and open no study output in a browser until all walks are done. That one line points it at its brief. Pick each walker's model from the table above. In testing a mid-tier walker clicked as accurately as the top model at twice the speed, but tended to give up sooner, so when a walk ends within two or three steps, read its `reason` before trusting the gap in coverage. Start the walkers together. Your knowledge of the site, the findings you expect and the other personas would contaminate the run. Don't steer or rescue a stuck persona: getting stuck is the data. The driver, not the walker, decides when a persona has had enough: it ends the walk when a `gives_up_when` condition is met or the patience budget from `traits.patience` runs out (`references/personas.md` § Giving up).

If you can't run subagents, walk the personas one at a time yourself, working only from that persona's profile and from what the screenshots show.

Every browser action, for walkers, recon and the survey, goes through `eyes.py`. It gives each session its own browser with no cookies or storage from another. A Playwright script, a Playwright or browser MCP tool, or an editor's built-in browser keeps one profile across personas, so one persona's form shows up filled in for the next, and the findings describe the leak instead of the site.

`start` also takes each walker's first screen, which its prompt names, so the walker opens its brief and first screenshot together. Every session ends with an exit interview, given after the walk ends: the finish (or the driver's own stop at the step limit) returns a `walk_recap` of what happened, and the walker answers from it with the `feedback` command, a reason for every score. Answering before the recap, or without reasons, drifted every persona to the same polite 5 of 7, whatever their outcome. When the walkers report back, run `eyes.py status --study <study.json>`. It lists each session's steps, outcome and walk times, and whether its exit interview is in. `all_done` must be true before analysis, and `waiting_on` names any session that isn't finished. If it prints `stop` (several sessions ended as `blocked_by_site`), tell the user rather than burning more runs.

### 6. Compute the flows

```bash
<venv-python> <skill>/scripts/report.py analyze --study-dir <study-dir>
```

This writes `navigation.json` (every persona's path and every step), `flows.json` (per-page bottleneck scores with their parts, plus the funnel), `demographics.json`, the panel's `feedback.json`, and for the reviewer `hot_steps.json` (the steps worth a close look, with reasons) and a contact sheet per session (`sessions/<id>/contact-N.jpg`, every step as a thumbnail). The sheets let the reviewer see whole walks in a few images and open full screenshots only where it matters.

### 7. Review

Give a fresh subagent on the strongest model `references/reviewer.md` with the study folder path. It reads the journeys, the screenshots, `flows.json` and `facts.md`, measures anything it wants to call a contrast problem, and writes `findings.json` (each with its severity's parts and a fix effort), `beliefs.json` (what each walk came away believing about the site's key facts) and `insights.json`. If you can't run subagents, do this step yourself after all the walks.

### 8. Verify and report

```bash
<venv-python> <skill>/scripts/report.py verify --study-dir <study-dir>
<venv-python> <skill>/scripts/report.py render --study-dir <study-dir>
```

Read the `removed` list in `verified_findings.json`. A `rewalk` list names personas whose one walk is the only support for a critical or high finding. Mention it to the user, and offer the re-walk in `references/after-the-run.md`. A finding with a wrong step or box can be corrected against the recording and verified again: send the `removed` list back to the reviewer, which still has the walks in view. Never edit a journey or measurement to make a claim pass.

`report.html` is one self-contained, light-only file laid out as a board, insights first: a cover with the headline and three figures (walks that reached the goal, verified problems, personas), the key insights as a grid with the lead one large (each a claim, its detail and the findings behind it) and what's working, every verified problem on a High / Medium / Low board beside its fix, smallest fix first, and the findings as cards that open to their evidence. Everything else folds into panels under "The full analysis", with who took part and how the study ran near the end; a link to a finding or a reference opens the panel it sits in. It holds the outcomes and paths graded as direct or indirect success with each successful walk's lostness, the funnel and each persona's stages, the same funnel split by device, tech confidence, access needs and each strongly held decision stance, an experience curve per walk (clarity and trust by step, with finding IDs pinned where their evidence sits), a who-hit-what grid of findings by walk, a severity × fix-effort matrix for deciding what to fix first, a scorecard of Nielsen's heuristics by journey stage, friction by stage split into Norman's gulfs of execution and evaluation, a grid of what each walk came away believing against what the site states, first impressions and where each page's first press led, the presses that didn't do what the persona expected, the bottleneck table, a step-through replay of every walk, a click map per page view, the findings with cropped evidence, the whole screen with the evidence numbered, a filmstrip of the steps that led there, and how many walks hit each, the contrast measurements and the WCAG criteria findings may fail, the panel's demographics, the exit interviews with the reaction words each persona picked, a plan for testing the top findings with real users, and the limits.

For tickets or a spreadsheet, walking a persona again, a stakeholder brief, or re-running after a fix, read `references/after-the-run.md`.

### 9. Tell the user

Give the headline, then the top three findings by handle with their fix, each persona's outcome in one line, and where `report.html` and the JSON files are. Mention anything that wasn't tested. End with the closing line from `references/tracing.md`.

## Tracing

Readers push back on synthetic findings: "a real user wouldn't do that", "it looks fine on my screen", "so what's our drop-off rate?". Read `references/tracing.md` before answering any follow-up. It defines the handles (`F1` findings, `B1` pages ranked as bottlenecks, `<persona>:M1` measurements, persona ids), the fixed closing line, the trace block (*Persona · Steps · On screen · Measured · Why this severity · What would change it*), and the questions to expect. A trace re-reads the recording and corrects the report if a finding doesn't hold.

## What this can and can't tell you

Good for: things people can't see or misread, buttons that don't look like buttons or don't respond, fine print that changes the offer, prices or promises that contradict each other across pages, requirements that appear late, dead ends, layout that hides the next step on a phone, and differences between kinds of customer.

Not for: conversion rates, true time on task, or screen-reader experience (personas have no accessibility tree, by design). Large-text and keyboard personas are partly role-played, so treat those findings as prompts for a proper accessibility audit. Each session is a fresh browser with no cookies or storage from any other, but all of them come from one machine and one IP address, so a site that personalises by location or device may show every persona the same variant. Where that matters, test a staging copy with personalisation off, and list it under what wasn't tested.
