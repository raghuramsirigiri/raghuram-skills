# Alderwick Bank (fictional demo bank website): visual persona crawl

Study alderwick-2026-11 · 6 simulated personas · mode test_env

**People found their headline numbers fast, but the conditions that change them sit a page deeper or at the bottom: both merchant walks left unsure about 'Same day*' and unaware of the PCI fee, both checking walks missed the per-cycle wording and paper-statement fee, and the CD penalty sits below the loans.**

## Outcomes

| Persona | Device | Outcome | Steps | Path |
|---|---|---|---|---|
| Luis, cafe owner | mobile | claimed_goal_unverified | 7 | / → /business/merchant-services |
| Luis, cafe owner | mobile | reached_goal | 7 | / → /business/merchant-services |
| Marcus, saver checking rates | mobile | reached_goal | 6 | / → /rates |
| Dana, nurse switching banks | desktop | saved_for_later | 23 | / → /compare/checking → /open?product=everyday-checking |
| Dana, nurse switching banks | desktop | step_cap | 45 | / → /compare/checking → /open?product=everyday-checking |
| Eleanor, recently retired executive | desktop | step_cap | 30 | / → /wealth/contact |

## Bottlenecks

| | Page | Score | Dead clicks | Backtracked from | Left short of goal |
|---|---|---|---|---|---|
| B1 | /open?product=everyday-checking | 53.0 | 8 | 0 | 1 |
| B2 | /wealth/contact | 30.0 | 0 | 0 | 0 |
| B3 | /business/merchant-services | 12.0 | 0 | 0 | 1 |
| B4 | /rates | 6.0 | 0 | 0 | 0 |
| B5 | / | 5.5 | 0 | 0 | 0 |
| B6 | /compare/checking | 3.0 | 0 | 0 | 0 |

## Findings

- **F3** [high · trust] Merchant overview shows 'Same day*' and '$0' monthly with the conditions left off the page: Put the asterisk's footnote under the card ('*Into Alderwick business checking for batches closed by 9 p.m. ET; next business day to any other bank - no Alderwick account required'), show the PCI non-compliance fee next to 'Monthly fee $0' ('$0; $19.95/mo only if PCI not validated'), and add a worked example ('$15,000 a month in person = about $X, plus a terminal from $349 if you need one').
- **F1** [medium · ux] The application doesn't say up front that funding can wait, so a switcher without her old bank's details may stop before she finds out: On step 1, under 'About 10 minutes', add one line: 'You'll need ID and your SSN or ITIN. You can fund now or within 30 days, so no other bank details are needed to apply.' Show the 30-day option as a hint under Funding in the progress bar.
- **F2** [medium · copy] The checking comparison table leaves out conditions and fees the product page states: Write the waiver row as '$500+ in direct deposits per statement cycle, or $1,500 daily balance, or age 17-24', add an 'Other fees' row (paper statements $3/month, $0 for e-statements or 65+), and replace 'easy waiver' on the application card with the actual waiver conditions.
- **F4** [medium · friction] The CD early-withdrawal penalty sits at the bottom of the rates page, past mortgages, loans and cards: Add the penalty to the CD intro line ('Fixed for the term. Early withdrawal: 90 days of interest for 12 months or less, 180 days for longer terms.') and link to /personal/cds.
- **F5** [medium · ux] The home page speaks only to personal checking; business, wealth and rate seekers must find the menu: Add a row of entry points directly under the hero (Business banking and merchant services; Today's rates including the 12-month CD; Private banking, talk to a relationship manager), visible on the first phone screen once the cookie box is dismissed.
- **F6** [medium · contrast] The required consent checkbox on the wealth form has a near-invisible border: Give unchecked checkboxes and radios a border of at least 3:1 (for example the body grey #5c6c6c), enlarge the box to 24 px, and make the whole label a visible click target.
- **F10** [low · ui] The application page opens partway down and then jumps to the top, so the first tap misses: Reset scroll to the top instantly (not smoothly) on route change, so /open first paints at the top.
- **F7** [low · copy] Nothing on the wealth path says who qualifies for private banking: State the private banking threshold, or 'There's no minimum to talk to us', beside the asset question and on the Wealth menu promo.
- **F8** [low · ui] Rate tables on a phone are cut off at the right edge with no sign they scroll: Stack those tables into cards below 600 px, or add a visible scroll shadow or label and keep the APR column in view.
- **F9** [low · ui] The site header hides the comparison table's column names while scrolling: Offset the table's sticky header by the site header's height (about 108 px on desktop) so column names stay fully visible.

Ask "show me F1" or "how do you know a real person would struggle here?" to see the screens, steps and measurements behind any finding.