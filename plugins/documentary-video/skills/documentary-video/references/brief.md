# Step 1: the brief

Read the document and write `film/brief.md`: what the film is for, every
claim it may use, and every thing it may show. Everything later is built from
this file, so its job is to hold the document's facts and nouns, not to be
creative yet.

## The format

The check reads this layout, so keep the headings, the field names and the
table columns as shown. Write prose in the cells freely.

```markdown
# Brief: <working title>

Thesis: <one sentence: what the viewer should come away knowing>
Audience: <who watches, and what they already know>
Length: 90 s
Frame: 16:9
Document: <file name or "pasted text">

## Claims

| id | claim | figure | source |
| --- | --- | --- | --- |
| C1 | Online applications made up most loans in 2025 | 72% | "72% of applications arrived online" |
| C2 | Branch applications fell from 2023 to 2025 | 41% → 22% | "down from 41% in 2023 to 22%" |
| C3 | The bank approves loans faster online | — | "online decisions are faster" |

## Nouns

| id | noun | kind | claims | stands for |
| --- | --- | --- | --- | --- |
| N1 | loan application | object | C1 C2 | |
| N2 | bank branch | place | C2 | |
| N3 | applicant | person | C1 C2 C3 | |
| N4 | approval speed | abstract | C3 | a form passing from an in-tray to an out-tray |
```

### Claims

One row per fact the film might use: every number, and every factual
statement a beat may rest on.

- **claim**: the fact in your words, keeping the document's hedges and
  scope ("about", "estimated", "in the UK", "of those surveyed").
- **figure**: the number exactly as the document gives it (`72%`, `1.8
  million`, `£4.2bn`, `1944`, `41% → 22%`), or `—` for a claim with no number.
  Don't round or convert here; a later step may say "about 1.8 million" but
  the ledger keeps what the document said.
- **source**: a short quote from the document that contains the figure, in
  quotation marks, copied exactly. The check finds it in the document, which
  is how a reader can trace any number in the film back to its sentence.

Keep claims the document makes, not ones you'd infer. "Sales rose 12% because
of the new store" is a claim only if the document says *because*.

### Nouns

Every concrete thing the document mentions or plainly implies, which the
film could show:

- **kind**: `person`, `animal`, `object`, `place`, `event`, or `abstract`.
- **claims**: the claim ids it appears in (space-separated), or `—`.
- **stands for**: only for `abstract` nouns. Revenue, churn, approval speed,
  trust, inflation, risk: a film can't show these, so say what *concrete
  thing in this document's world* the camera will show instead. Look for it
  in the document first: revenue of a coffee chain is cups crossing a
  counter; churn of a ride app is riders walking away from the pickup point;
  a decline in a species is fewer animals at a watering hole. Choose
  something from the world the document describes, not a generic symbol
  (coins, arrows, a rising graph).

Plainly implied things count: a document about a hospital's waiting times
implies patients, beds and a waiting room even if it never names a chair. Add
them, and put the implying claim in `claims`. Don't add things only because
they'd look nice: the bible will build only what this table lists.

## Choosing the thesis

The thesis is the document's own point, in one sentence a viewer could
repeat. If the document makes several, pick the one most of its claims serve,
and keep the claims for the others: the screenplay may still use them. If the
document is a list of facts with no point (a dashboard export), the thesis
says what the facts add up to, in words the facts support, and nothing more.

## Check

```
node scripts/check-brief.js film/brief.md <document>
```

It checks that every quote is in the document, every figure is in its quote,
ids are unique, noun claims exist, and every abstract noun says what stands
for it.
