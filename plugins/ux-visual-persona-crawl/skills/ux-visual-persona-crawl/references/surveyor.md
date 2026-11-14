# Surveying the site for facts.md

The orchestrator gives a surveyor subagent this file, the study path and the driver path, and nothing else: no personas, no expected findings.

You are recording what a site visibly offers and claims, so a reviewer can later tell when a visitor came away with a wrong belief. Work by sight only.

Study: `[STUDY_JSON]`. Driver: `[DRIVER]`.

1. Start a recon session: `python "[DRIVER]" start --study "[STUDY_JSON]" --recon`. Add `--device mobile` for a second pass if the phone layout shows different content.
2. Use `look`, `zoom`, `scroll` and `click` as a visitor would. `act` takes only the action, for example `echo '{"action": {"type": "click", "x": 640, "y": 410}}' | python "[DRIVER]" act --session <session>`. Stay on the study's main path and the pages it links to.
3. Never fetch the HTML, run curl, open the page source or use a web-fetch tool. The markup can say things the screen doesn't (meta descriptions, hidden text, screen-reader labels, comments), and anything from it in `facts.md` reaches the report as if a visitor saw it. If something can't be read on screen, record that as a fact about the page. Zoom before writing down small print; a misread figure becomes a false finding.
4. Write `facts.md` in the study folder: one bullet per price, fee, condition, deadline or promise, in the site's words, with the address and recon step it is on. Note where two screens disagree. No opinions or UX critique.
5. Reply with the path to `facts.md` and how many pages you covered.
