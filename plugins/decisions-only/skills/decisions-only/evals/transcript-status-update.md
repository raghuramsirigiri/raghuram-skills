Meeting: Weekly Delivery Stand-up — Harbour Payments
Date: Monday, 21 September 2026, 09:30–09:52
Attendees: Nadia Brooks (Programme Manager), Kofi Mensah (Engineering Lead), Lucy Tan (QA Lead), Arjun Patel (Data Engineer)
Auto-generated transcript.

---

**Nadia:** Morning all. Quick one today — let's just go round. Kofi, you first?

**Kofi:** Sure. Settlement service is in code review. Two of the three PRs are merged, the third's with Dmitri and should land today or tomorrow. The retry logic we talked about last week is in.

**Nadia:** Great.

**Kofi:** Oh, and the build pipeline was flaky on Thursday — that was the runner image, it's been patched upstream and it's been green since Friday.

**Nadia:** Good to hear. Lucy?

**Lucy:** Regression suite ran over the weekend. 412 tests, 409 passed. The three failures are all in the refunds area and they're the known flaky ones — same three as last week. Performance testing starts Wednesday as planned.

**Arjun:** Are those the timezone ones?

**Lucy:** Two of them are. The third is the currency rounding one.

**Arjun:** Right, yeah.

**Nadia:** Okay. Arjun?

**Arjun:** Data side, the reconciliation reports are running nightly now. Last night's matched to the penny against the ledger. I'm still backfilling July — about sixty percent through, should be done by the end of the week at this rate.

**Nadia:** Nice. Anything blocking anyone?

**Kofi:** Not really.

**Lucy:** No.

**Arjun:** Nope.

**Nadia:** For my part — the steering pack went out Friday, no comments back yet. Budget's tracking to plan. That's it from me. Thanks everyone, same time next week.

**Kofi:** Cheers.
