# Tracing a finding back to the screens

How `ux-visual-persona-crawl` answers *"show me"*. A synthetic usability report gets doubted harder than a real one: no actual customer said any of it. The trace has to show, in one reply, exactly what was on screen, what the persona did, and what was measured, so the reader can judge the finding on the evidence rather than on trust in the method.

The people asking are usually **the designer or product owner of the page**, who knows the intent and is sure it reads fine; **the person who commissioned the study**, deciding what to fix first and whether to pay for real user research; and **an accessibility or QA lead**, who wants the measurement, not an impression.

---

## Handles and the closing line

`F1, F2 …` findings, in severity order · `B1, B2 …` pages ranked by bottleneck score in `flows.json` · `<persona-id>:M1 …` contrast and size measurements · persona ids for sessions · `step N` for a moment in a session.

The summary to the user ends with exactly this line, and nothing follows it:

```
Ask "show me F1" or "how do you know a real person would struggle here?" to see the screens, steps and measurements behind any finding.
```

Traces themselves don't repeat it.

## The trace block

```markdown
### F2: Price on the plan page contradicts the plans list  ·  contradiction · critical

**Persona**
`careful-saver-desktop`: Ravi, budgeting for a new flat, reads carefully, `must_know_before_acting`: the real monthly cost.

**Steps**
| Step | Page | Did | Result |
|---|---|---|---|
| 3 | /plans | clicked "View plan" at (223, 468) | went to /plans/basic |
| 4 | /plans/basic | scrolled up, re-read price | screen changed |
| 5 | /plans/basic | back | returned to /plans (backtrack) |

**On screen**
- Step 3, box [160, 340, 100, 40]: "$45/mo" (crop `evidence/F2-1.jpg`)
- Step 4, box [140, 195, 100, 40]: "$52/mo" (crop `evidence/F2-2.jpg`)
- Ravi at step 4, in his words: "Wait, wasn't this 45 a second ago?" Clarity 2, trust 2.

**Measured**
Not a measurement finding. The page's score in `flows.json` (B2, 6.5): 1.5 steps per visitor + 1.5 × 2 backtracks + 2 friction weight.

**Why this severity**
Critical: it misleads people about what they will pay, and 2 of 4 personas backtracked to check. The severity follows the reviewer's scale (`references/reviewer.md`), not the persona count.

**What would change it**
If the two figures were different things labelled clearly (say, before and after a discount), this becomes a `copy` finding at medium.
```

- **Persona**: who, and the profile fields that matter to this finding: what they lacked, their eyesight, device and zoom.
- **Steps**: the rows from `journey.json`, with positions, results, and `no_visible_response` where it happened.
- **On screen**: each evidence box, the crop path, the words read and who recorded them, and the persona's own scores at that step.
- **Measured**: the measurement record (`id`, foreground, background, ratio, target, size in CSS px), or the page's bottleneck score with its parts written out from `flows.json`.
- **Why this severity**: the rule from the reviewer's scale, then the finding's `exposure` from `verified_findings.json`: hit in how many of the walks that reached the page, and which walks went past it.
- **What would change it**: the fact that would lower it, raise it or clear it.

---

## The questions to expect, and what each answer shows

| They ask | Answer with |
|---|---|
| **"Show me F1."** | The full block, crops first, since that is what they'll look at. |
| **"How do you know a real person would struggle here?"** | We don't. Say so plainly. Show what the simulated person saw (the crop), what they did (the steps), and what doesn't depend on the persona at all: the measured ratio, the dead click (nothing on screen changed), the two contradicting screens. Separate the parts that are fact about the page from the parts that are a simulated reaction. Then give the research question in `insights.json` that would test it with real users. |
| **"It looks fine on my screen."** | The measurement: the hex colours, the ratio, the target. Pixels were read from the rendered screenshot at the persona's device and zoom, which may differ from theirs. If their claim is about a different size or state, measure that state if it's in the recording; if not, say it wasn't captured. |
| **"What's our drop-off rate at sign-up?"** / "How many customers will we lose?" | Refuse the number. These were N simulated personas, and "3 of 5 stopped" says where to look, not a rate. Give the counts, the pages they stopped on and why, and say what data would answer the question (analytics funnel, a real usability test). Never convert to a percentage or forecast. |
| **"Why did Margaret give up?"** | Only her recorded words: the `thought` and `reason` at her last steps, and the `gives_up_when` condition it matches in her profile. Don't add a motive she didn't record. |
| **"The persona just misclicked."** | Check the click position against the screenshot. A result marked `on_blank_space` landed where nothing is drawn: agree, and note it was never counted as a dead click. If the click landed on the control and nothing changed, show that `screen_changed` was false, and say whether the page had parts that move by themselves (`screen_moves_by_itself`), which were left out of that judgement. If it landed off the control, agree, **retract or downgrade the finding**, and say so in the first line. |
| **"Is that just one persona?"** | The finding's `exposure`: how many of the walks that reached its page hit it, and the ones that went past it, with what was different about those people. One of one is a lead to check, not a pattern. |
| **"Did it get better after our fix?"** | If a `compare.html` exists, its row for this finding. If not, say a re-run with the same personas and `report.py compare` would answer it (`references/after-the-run.md`). |
| **"Why is B1 the worst page?"** | Its score parts from `flows.json`, with the formula written out and the numbers substituted, and which part dominates. A high score with one persona looping is weaker than a moderate one hit by everyone: say which this is. |
| **"Where do the demographics come from?"** | The persona's `source` field: illustrative, or built from the user's data (name it). They describe who the panel stands in for. They are not survey respondents. |
| **"Did it read our code or alt text?"** | No. The persona and the driver work from screenshots and the address bar only. A finding can't come from markup, so something present only in the code (an aria-label, hidden text) is outside what this study saw. |
| **"Why isn't X in the report?"** | Whether any persona reached that screen (`navigation.json`). If none did, it wasn't tested; say so. If one did and it held up, say what they did there. |
| **"Can you fix it?"** | Not in a trace. Give the finding's recommendation and stop. |

## Rules

- **Re-read the recording.** Open the journey, the screenshot and the measurement again. Recalling the first pass defeats the point.
- **The trace corrects the report.** A finding whose evidence doesn't hold up (wrong box, a misclick, a measurement that passes) is retracted or downgraded in the first line of the reply.
- **Pushback doesn't move a severity; evidence does.**
- **No new findings in a trace.** If one turns up, name it in one line at the end as an addition, with the next free handle.
- **Say what the method can't see:** screen-reader output, real timing, and anything no persona reached.
