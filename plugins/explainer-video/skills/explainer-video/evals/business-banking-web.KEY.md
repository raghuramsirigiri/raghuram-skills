# KEY — business-banking-web.md (graders only)

Source [A]: Fernhill Bank Digital Sales team, internal note dated 9 October 2026, Q3 2026
(July–September) unless stated. All names and figures are invented.

| id | display | kind | locator | notes |
| --- | --- | --- | --- | --- |
| F1 | 46% | copied | §1 | new business current accounts opened online, Q3 2026 |
| F2 | 41% | copied | §1 | same, Q3 2025 |
| F3 | 412,000 | copied | §2 | product page visits (business pages only) |
| F4 | 1.5% | copied | §2 | visits ending in an opened account, **hedged "roughly"** |
| F5 | 18,600 / 18.6k | copied | §2 | applications started |
| F6 | 9,200 / 9.2k | copied | §2 | submitted |
| F7 | 6,100 / 6.1k | copied | §2, §3 | opened (also Q3 2026 in the quarterly table) |
| F8 | 51% | copied | §2 | started but never submitted (the note also says "about half") |
| F9–F11 | 4,200 / 4,800 / 5,500 | copied | §3 | Q4 2025, Q1 2026, Q2 2026 |
| F12 | 58% | copied | §4 | visits from mobile |
| F13 | 42% | copied | §4 | desktop and tablet |
| F14–F17 | 3,400 / 1,300 / 820 / 580 | copied | §5 | current account, credit card, merchant services, loan |

## Passes

- Slides (`meta.style: "slides"`, or unset), 9:16, 50–66 s; `check-video.js` shows no
  `pictures` FAIL.
- **Thing or flat chart** (`references/pictures.md`), for every finding the video shows
  (a finding left out is listed in the handover):
  - share of new accounts: the figures, or a flat before/after, 41% → 46% as last year,
    then now;
  - roughly 1.5% of visits: the figure with "roughly", or a flat bar; never a grid of dots;
  - started → submitted → opened: flat bars or columns, stages in order;
  - quarterly openings: flat columns (or a flat line from a data table), Q3 2026 last;
  - devices: a flat split (bar or pie) with both parts;
  - products: flat ranked bars, largest first.
  - A custom painter, if any, draws a real thing the finding counts (accounts opened as
    cards or folders, say), one unit per stated group with its key in words, and reads
    its figure through `api.value`. Nothing counts people, so no people.
- "Not yet analysed" shown, if at all, as words; no reason for abandonment anywhere.
- Hedge kept: "roughly 1.5%" (51% may be shown as is, or as "about half").
- Changes in points: 41% → 46% is "5 points", never "up 12%".
- Source card: Fernhill Bank Digital Sales team, 9 Oct 2026.

## Fails

- Any 3D chart, or any retired world picture (`people`, `dots`, `blocks`, `split`,
  `columns`, `funnel`, `podium`, `ribbon`): `check-video.js` fails them.
- A share drawn as a grid of boxes or dots (46 cubes for 46%).
- A change drawn as a share: five things lit for the 5-point rise.
- A custom painter whose things stand in for a rate rather than counting a thing.
- 1.5% rounded away (drawn as 1 or 2 of 100).
- The redesigned form given as a cause of anything (§6 states no link), on screen, in the
  caption or in chat.
- Online banking framing (the note is about product pages only).
