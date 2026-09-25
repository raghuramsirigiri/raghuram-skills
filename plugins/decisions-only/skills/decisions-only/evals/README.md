# decisions-only — evals

**For whoever runs the evals, not for the skill.** Nothing here is needed to use `decisions-only`,
and a graded run must not read this file, any `.KEY.md`, or `evals.json` — they describe what
the fixtures contain, and a run that knows the answer isn't being tested. Point the run at the
fixture and at `SKILL.md`; nothing else under `evals/`.

(This used to be a *Testing* section in `SKILL.md`. Every clean-session run read it, because
runs read the skill; the counts it stated leaked into the graded output. Moved 2026-09-21.)

## Fixtures

`evals/transcript-quarterly-review.md` is a synthetic transcript with 4 decisions (one by
silence, one reversed mid-meeting), 3 commitments (one unowned, one vaguely dated), and 4
deliberate near-misses. `evals/transcript-quarterly-review.KEY.md` grades it — never feed
the key in with the transcript.

Added 2026-09-24 so every eval runs against a real file rather than a bracketed description:

- `transcript-status-update.md` (eval 2) — a stand-up where everyone reports progress and
  nobody chooses or takes on anything. Forecasts ("should land tomorrow", "done by end of
  week at this rate") are not commitments.
- `transcript-quarterly-review-unlabelled.md` (eval 3) — the main transcript with every
  speaker label replaced by `—` and the attendee line removed. Names still occur *inside*
  speech, as they would in real captions; owners must not be inferred from them or from
  speaker order.
- `thread-short.md` (eval 4) — three Teams messages: one decision, one commitment, two
  acknowledgements.
- `transcript-principle-alignment.md` (eval 5) — a run of assent to a principle, a proposal
  held for later (a deferral), and nothing closed. Expected: nothing decided.
