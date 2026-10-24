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

- One continuous world (`meta.style: "continuous"`, or unset with pictures), 9:16, 50–66 s;
  every scene that shows a figure has a picture, and `check-video.js` shows no `pictures`
  warning (or the handover says why a finding rests).
- **Picture fit** (`references/pictures.md` § Choosing), for every finding the video shows
  (a finding left out is listed in the handover):
  - share of new accounts: `blocks` (skin `card` or `plain`), `of` naming new business
    (current) accounts; 41% → 46% as last year, then now on that place;
  - 1.5% of visits: `dots` with `of` naming product page visits (blocks can't show 1.5%);
  - started → submitted → opened: `funnel` (or `columns`), stages in order;
  - quarterly openings: `columns` (or a `ribbon` from a data table), rising, Q3 2026 last;
  - devices: `split` with both parts, `of` naming product page visits;
  - products: `podium`, largest first.
  - Props, if any, are a branch and/or devices; `people` is used for none of these (none
    of the figures counts people).
- "Not yet analysed" shown, if at all, as words or a `desk` with `due: "November"` from
  the scene's own copy; no reason for abandonment anywhere.
- Hedge kept: "roughly 1.5%" (51% may be shown as is, or as "about half").
- Changes in points: 41% → 46% is "5 points", never "up 12%".
- Source card: Fernhill Bank Digital Sales team, 9 Oct 2026.

## Fails

- A change drawn as a share: five blocks for the 5-point rise, or 46 blocks labelled as
  the rise.
- `people` for accounts, visits or applications.
- 1.5% as 1 or 2 blocks of 100 (rounded away), or 51% as blocks of "applications
  submitted" (wrong whole).
- The redesigned form given as a cause of anything (§6 states no link), on screen, in the
  caption or in chat.
- A `pictures` warning left unaddressed, a `world-overlap` or `stage` audit failure.
- Online banking framing (the note is about product pages only).
