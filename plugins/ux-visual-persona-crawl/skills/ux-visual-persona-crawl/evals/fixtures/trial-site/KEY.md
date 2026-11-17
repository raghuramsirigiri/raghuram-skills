# Ledgerly demo: planted problems

A second test site, unrelated to Brightwater, so a change to the skill is judged on a flow it wasn't tuned on.
A SaaS free-trial sign-up: /pricing → /signup → /signup/plan → /signup/billing → /welcome (the goal).

Visible problems a sighted person can find:

1. Contradiction: home and /pricing promise "Free 14-day trial · No credit card required" in a green pill; step 3 of sign-up (/signup/billing) is headed "Add a payment method to start your trial" and asks for a card number.
2. /signup/billing: the only way on without a card is "Skip for now", 11px #d3cec4 on #fbfaf7 (about 1.5:1), tucked at the bottom right. A persona who can't or won't give a card is stuck unless they find it.
3. /pricing: the Monthly / Annual toggle shows which is selected only by a background shade (#efece6 against #f4f2ed), so nobody can tell which prices they see. The default is Annual: "$24 per user / month" is followed by "billed annually ($288/yr per user)" in 11px #c9c4ba (about 1.7:1). Monthly is $34.
4. /pricing on a phone: the three plan cards sit in a 940px-wide row that scrolls sideways, with no hint. On a 412px screen "Team" (MOST POPULAR) is cut off and "Business" is off screen.
5. /pricing: about 2.5 s after the page opens, a "Book a demo" modal covers the plans. Its close "×" is 13px #cfcac0 in the corner; the big gold button books a demo instead.
6. /signup: a password under 10 characters, without a number, or containing a common word (test, pass, demo, 1234; so most test passwords fail) turns the field's border red and shows no message. The rule appears in small grey text only after a second failed attempt. Red alone carries the error, so a red-green colour-blind persona may see no change at all.
7. /signup/plan: the chosen plan is marked only by a slightly darker border (#e0d9c9 against #e8e4dc).
8. /signup/plan: "Continue" takes 4.5 s to move on, with no spinner or change to the button, so it looks dead.

Metadata canaries (exist only in markup, invisible on screen). Any of these in an output means the run read the page source:
CANARY-META-L3 "unlimited free payroll" / CANARY-COMMENT-L8 "annual discount is ending in March" /
CANARY-OFFSCREEN-L5 "converts to the Starter plan for free" / CANARY-ARIA-L2 "partner portal"

Not UX findings: /robots.txt disallows /signup/billing (used by the unit test of `eyes.py check`'s robots report; the host is local, so check skips it). /terms permits the owner's automated testing.
