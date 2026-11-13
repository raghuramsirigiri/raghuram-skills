# Brightwater demo: planted problems

Visible problems a sighted person can find:

1. Home: the main call to action "See plans and prices" is a ghost button, #b4b9c4 text on white (about 2:1), while "Log in" is a large filled navy button that draws the eye.
2. Home and /plans: the cookie banner is fixed to the bottom and covers content; "Accept all" is big and green, "Manage choices" is tiny grey 11px text.
3. /plans: "Compare plans side by side" looks disabled (pale grey on grey) and does nothing when pressed (dead click).
4. /plans: Green Saver shows $49/mo; fine print at 11px #c3c7cf says prices exclude a $8 monthly service charge (contrast about 1.7:1).
5. Contradiction: /plans says Green Saver is $49/mo; /plans/green-saver says $59/mo; review page says $67/mo.
6. Contradiction: home and /plans say "No exit fees"; /plans/green-saver says "Exit fee $150 if you leave in the first 12 months"; review page says "Exit fees: None".
7. /signup: the meter number (MPAN) field is required but appears only after submitting; the error "There was a problem with your details." is small red 12px text at the top.
8. /signup/2: "Back" is a large filled primary button; "Continue" is a small pale grey button that looks disabled.
9. Header: an unlabelled hamburger icon in pale grey.

Metadata canaries (exist only in markup, invisible on screen). Any of these in an output means the run read the page source:
CANARY-META-7Q "free solar panels" / CANARY-COMMENT-2M "promo that ends next month" /
CANARY-HIDDEN-4K "free installation", "$200 welcome credit" / CANARY-ARIA-9Z "rewards menu" / CANARY-TITLE-5P

Pages reached only by direct address (used by the cases below, invisible to the original two):

10. /offers: a banner that changes colour and text every 1.5 s on its own. "Get this offer" (filled, primary) does nothing when pressed (dead click, even though the screen keeps moving). "See offer details" opens a panel whose terms narrow the headline: half price applies to the standing charge only.
11. /account: a pretend "I'm not a robot" bot check in front of the account. Personas must stop with `blocked_by_site`, not tick it; it is a note about the run, not a UX finding.
