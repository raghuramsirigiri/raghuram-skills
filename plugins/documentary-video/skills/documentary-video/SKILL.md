---
name: documentary-video
description: Turn any document into a short documentary-style film, with a screenplay, a cast, props and places all designed from that document and filmed in a soft, low-detail 3D diorama world in the charts-lib colours, with a free camera. Rendered in JavaScript and exported as MP4 in the browser. Use this whenever someone wants a document, report, article, dashboard's numbers, history chapter or science piece turned into a video, film, documentary, animated story or explainer with characters and a world, even if they only say "make a video of this" or "animate this report". Not for slide-style videos or a single chart animation.
---

# documentary-video

A document goes in; a short film comes out. The film tells the document's
story in a world built for it: the people, things and places the document
talks about, made as simple toy-like 3D models, filmed by a camera that moves
the way a documentary's does. Every figure in the film comes from the
document, and the viewer can see it: the number of things that move, light up
or stack *is* the number.

Nothing in the skill is a library of ready-made things. film-lib has shapes,
a jointed body and a camera, and no laptop, no tree, no building. That is the
point: each film's cast is designed from its own document, so a film about a
coffee chain and a film about a WW2 campaign share nothing but the style.

## The steps

Seven steps, each writing one file in `film/` beside the output. Each step
reads its own reference and the files before it, and ends with a check. Doing
them in order, and checking each before going on, is what keeps the work
small: a mistake is found at the step that made it, not in the finished film.

| Step | Writes | Read first | Check |
| --- | --- | --- | --- |
| 1. Brief | `film/brief.md` | `references/brief.md` | `node scripts/check-brief.js film/brief.md <document>` |
| 2. Screenplay | `film/screenplay.md` | `references/screenplay.md` | `node scripts/check-screenplay.js film/screenplay.md film/brief.md` |
| 3. Bible | `film/bible.md` | `references/bible.md` | `node scripts/check-bible.js film/bible.md film/brief.md film/screenplay.md` |
| 4. Cast | `film/cast.js` + its sheet | `references/cast.md` | the contact sheet (`templates/sheet.html`), looked at |
| 5. World | `film/world.js` | `references/world.md` | the first wide shot, looked at |
| 6. Shots | `film/shots.js` | `references/shots.md` | `templates/film.html?strip` (key frames) and its warnings |
| 7. Render | `<name>.html`, then MP4 | `references/render.md` | `scripts/finalize.js`, one full play, the export |

Run each check from the skill folder, or give it full paths. A check prints
what is wrong with handles and line numbers, and exits non-zero until it's
fixed. Fix and re-run; two passes is usually enough, and if a third would be
needed, the problem is usually in an earlier file.

Steps 1-3 are text and cost little. Show the user the screenplay's logline
and beats before building anything when the document is long, the topic is
sensitive, or the user asked to see the plan; otherwise carry on.

## Questions to ask

Ask at most two, and only when the answer changes the film:
1. Length and frame, if not given. Default about 90 seconds, 16:9.
2. What the viewer should come away knowing, only if the document has no
   clear point of its own.

## What holds every film together

- **The document is the only source.** Every figure on screen, in a caption
  or in the count of things moving, is a claim in the brief's ledger, with
  its hedges kept ("about", "estimated", "up to"). A topic with no figures
  makes a film with no figures; nothing is invented to fill a beat.
- **The world comes from the document's nouns.** The cast is what the
  document mentions or plainly implies, and the bible check fails anything
  that doesn't trace back to it. When the document is abstract (revenue,
  churn, trust), the brief decides what concrete thing in this document's
  world stands for it.
- **Detail only where the story needs it.** A toy-diorama look: few masses,
  softened edges, faceted natural things, a monotone world. A thing gets a
  telling detail only when the viewer has to tell it from its neighbour
  (`references/cast.md` § The look).
- **The highlight carries the claim.** One theme colour (`hl`) marks what the
  current figure counts; everything else stays neutral.
- **Monotone by default; colour on request.** The world is greys unless the
  user asks for colour. Casts name material roles (`leaf`, `roof`, `water`,
  `wall`, `clothA`…) for things with a natural colour, so the same film
  renders either way; `FILM_META.color = true` turns colour on, and
  `compare.html` shows both side by side (`references/cast.md` § Colour).
- **A film, not slides.** One continuous world the camera travels through,
  one transition for the whole film, captions and titles on a fixed layer
  that never zooms (the world may).

## Before step 4

Stage the working folder once, so the contact sheet and the player run in a
browser while the film is made: `node <skill>/scripts/finalize.js <folder>
--stage` (`references/render.md`).

## Tracing

Every number and every look in the film traces back to the document:
beat → claim → quote, and cast item → noun → the document's words. The report
names the handles; the trail itself is shown only when someone asks.
`references/tracing.md` has the handles, the trace block, the questions to
expect (including the pushback and the request to show something the
document doesn't say) and the closing line every report ends with.

## Where things go

```
<name>.html             the film (step 7): plays, and exports MP4/WebM
film/brief.md           1. thesis, claims ledger, noun inventory
film/screenplay.md      2. logline, acts, beats
film/bible.md           3. characters, props, places, era rules
film/cast.js            4. every cast item as code
film/world.js           5. places laid out along the camera's path
film/shots.js           6. the timeline
film.html, sheet.html   the player and the contact sheet while it's made (--stage)
film-lib/               the engine, copied by --stage
```

A later request ("make act 2 shorter", "the tank looks wrong") changes the
file that owns it and re-runs the steps after it, not the whole film.
