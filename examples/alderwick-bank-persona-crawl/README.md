# Alderwick Bank — a visual persona crawl

A finished run of the [`ux-visual-persona-crawl`](../../plugins/ux-visual-persona-crawl/)
skill. Six walks by simulated customers (four personas, two of them walked twice;
three walks on a phone, three on a desktop) each tried one task on **Alderwick Bank**, a fictional demo bank site
built only as a test target. They worked from screenshots alone and clicked by
screen position, with no page text or markup.

Open [`index.html`](index.html) — it is the whole report in one file: outcomes and
paths, the funnel, flow bottlenecks, ten findings with cropped screenshot evidence,
contrast measurements, the exit interviews, a step-by-step **walk replay** of every
persona, and click maps.

| Persona | Device | Task |
|:--|:--|:--|
| `checking-switcher` | desktop | Pick a checking account with no monthly fee and open it online |
| `cafe-owner-merchant` | mobile | Find what the bank charges per card payment, and any monthly fees |
| `retiree-wealth-callback` | desktop | Arrange a call from the private banking team |
| `cd-rate-checker-phone` | mobile | Find the 12-month CD rate and the minimum to open |

## What's in the folder

| Path | What it is |
|:--|:--|
| `index.html` | The report (self-contained, opens offline) |
| `report.md` | The same headline, outcomes and bottlenecks as Markdown |
| `issues/F1.md` … `F10.md`, `findings.csv` | One ticket per finding, ready to paste into a tracker; evidence crops in `evidence/` |
| `data/study.json`, `data/personas.json` | The study set-up and the panel |
| `data/navigation.json` | Every persona's path and every step, each with its exact `url` |
| `data/flows.json` | Per-page bottleneck scores with their parts, and the funnel |
| `data/verified_findings.json`, `data/insights.json` | The reviewed findings and research questions |
| `data/facts.md`, `data/feedback.json`, `data/demographics.json` | What the site claims, the exit interviews, the panel's make-up |

The per-step screenshots (about 50 MB) are left out; the report embeds what it needs.

## Recreating a screen

The walk replay shows each step's full address, query string and anchor included
(for example `/open?product=everyday-checking` or `/rates#cds`). The site ran
locally at `http://127.0.0.1:5188`, so those links open only while the demo site
is running there; on any other copy of the site, keep the path, query and anchor
and change the host.

## A note on the people

These are simulated personas, not customers. The report shows where to look, not
how many real people would struggle. Form values typed during the walks are the
study's test data (`data/study.json` → `test_data`), not anyone's details.
