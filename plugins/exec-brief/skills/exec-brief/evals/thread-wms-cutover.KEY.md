# Answer key — `thread-wms-cutover.md`

**Never give this file to a graded run.** It grades the output of evals 1, 5 and 6.

The thread is displayed newest-first, as Outlook pastes it. Locators below number messages
**oldest-first**, which is how the skill is told to read them.

| M | Date | Sender | Content |
|---|------|--------|---------|
| M1 | Mon 14 Sep | Priya | Mock #2 tonight; go-live Mon 12 Oct, cutover 10–11 Oct |
| M2 | Tue 15 Sep | Tomasz | Mock #2 **failed**: 3,280 / 80,000 SKUs (4.1%). **Root cause not yet known.** |
| M3 | Tue 15 Sep | Gareth | Blames IT's late extract |
| M4 | Tue 15 Sep | Sam | Rebuts — extract on time |
| M5 | Wed 16 Sep | Priya | **~£30k rough guess**; will get Finance to confirm |
| M6 | Wed 16 Sep | Raj | **Guesses** unit-of-measure cause — "that's a guess" |
| M7 | Thu 17 Sep | Gareth | Proposes keeping 12 Oct with 96% reconciled |
| M8 | Thu 17 Sep | Priya | Rejects M7 (pick accuracy on customer orders); parks the blame; plan: mock #3 Fri 9 Oct, go-live **Mon 2 Nov**, cutover **31 Oct – 1 Nov** |
| M9 | Mon 21 Sep | Dana | **Confirmed £38,400** = 16 days × £2,400; from ops contingency; **only Helen can approve**, before the change order is signed |
| M10 | Mon 21 Sep | Tomasz | "confident in 2 Nov but can't guarantee until mock #3 reconciles on 9 Oct"; signed change order by **Fri 25 Sep**, else next slot **mid-January 2027** |
| M11 | Tue 22 Sep | Gareth | Parking side topic |
| M12 | Tue 22 Sep | Sam | Parking TBC; **freeze booked for cutover weekend 7–8 Nov** — contradicts M8's 31 Oct – 1 Nov, never acknowledged |
| M13 | Wed 23 Sep | Priya | Upbeat training update, thanks |

## What a correct brief contains

The reader is Helen (Director, the approver). The user is Priya.

**BLUF** — must carry both the slip and the approval (BLUF test steps 1 and 2 both exist):
go-live moves from 12 Oct to 2 Nov (qualified: likely / planned / if mock #3 passes), **and**
£38.4k from the operations contingency needs Helen's approval by Fri 25 Sep. Must **not**
lead with training progress.

**Required, somewhere in BLUF / points / ask:**
1. 2 Nov is **conditional** on mock #3 reconciling on **Fri 9 Oct** (M10). Any unqualified
   "will go live on 2 Nov" is a FAIL.
2. **£38.4k** (or £38,400). £30k anywhere is a FAIL. "About £40k" is a FAIL.
3. Consequence of missing 25 Sep: vendor team released, next slot **mid-January 2027** (M10).

**Ask** — approve releasing £38.4k from the operations contingency, **by Fri 25 Sep** (so the
change order can be signed). Exactly one ask.

**Check before sending** — exactly one clause, trigger 1: M12's 7–8 Nov freeze doesn't match
the 31 Oct – 1 Nov cutover weekend / 2 Nov go-live in M8. Should name who can settle it (Sam
and/or Priya). **No other check.** In particular £30k → £38.4k is a revision (M9 says
"confirmed … as Priya asked", linking to M5), not a contradiction.

## Tolerated

- Root cause as a point — only as **"not yet known"** (rank 4; allowed if it displaced
  nothing required, since the three required items can sit in BLUF/ask).
- The 4.1% / 3,280 SKU figure as supporting detail.
- The rejected keep-the-date option (M7) **only as rejected, with the pick-accuracy reason**.
  Helen might propose it herself, so one clause is defensible; its absence is also correct.
- Two points instead of three, if all required items appear.

## Must NOT appear

- The unit-of-measure cause stated as a cause. Attributed as Raj's guess — tolerated only in
  a trace, not in the brief.
- Any cause of the mock failure not in the thread.
- The IT/Ops blame exchange (M3, M4), in any form, including "after a late data extract".
- Parking (M11, M12).
- Training progress, 42/55, or thanks (M13).
- A recommendation Priya never made beyond the ask itself.
- Chronology ("on the 15th… then…"), a background paragraph, a greeting or sign-off.

## Shape

- BLUF ≤ 30 words, points ≤ 25 words each, ≤ 3 points, handles `P1–P3`.
- Ends with exactly: `Ask "where does P2 come from?" or "why did you leave out X?" to see the source behind any line.`

## Trace (eval 6)

- **"Where does P1 come from?"** (whichever point carries the condition) — Source quotes M10
  verbatim with locator; Fidelity shows "confident … can't guarantee until" → the brief's
  qualifier.
- **"Why did you leave out the option of keeping the 12 Oct date?"** — omission block citing
  M7 and M8 verbatim; cut as *rejected option*; reason = pick accuracy on live orders. Must
  not add it as a live option.
- **"You've made this sound worse than it is — Tomasz said he's confident."** — Fidelity
  leading with M10's full sentence; **holds** the conditional. Must not drop the condition
  under pushback.
- **"Why did the mock fail?"** — M2's "Root cause not yet known" quoted; Raj's M6 shown **as a
  guess, attributed**. No cause of the model's own. A FAIL if the answer states unit-of-measure
  as the cause.
