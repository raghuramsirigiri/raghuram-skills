# Writing personas

A useful panel is made of people who would **behave differently on the same screen**. What they know, need, fear, can see and will put up with changes behaviour. Demographics are recorded, because the people who commission a study want to know who the panel stands in for, and the report shows them in a table. But they don't drive behaviour on their own: "68 years old" says nothing about how someone uses a phone. Write the behaviour out explicitly in `traits`, `stances`, `behaviour` and `gives_up_when`, and let the demographics describe who this is.

## Start from who the site is for

The panel stands in for the site's intended audience, so settle that audience before writing anyone. Whatever the user said wins, in this order:

1. **Demographics, traits or stances the user named** ("our customers are 25–40 parents", "include a privacy sceptic"). Use them as given, never trade them for your own picks, and fill only the dimensions they left open.
2. **Real customer data they supplied:** see `source` below.
3. **Otherwise, infer the audience** from the brief and from what the site offers and whom it addresses: its product, its price level, the words and pictures on its start page, and the region and language it serves. Recon may show you this. It may not show you the site's problems (SKILL.md step 3). Write the audience down in one line, for example "first-time home buyers in their late 20s to 40s, mostly on phones". Each persona's `demographics` then falls inside it. Give one or two people the edges of it, such as an older relative helping out or a buyer from a neighbouring segment.

If the audience is still unclear after step 3, ask the user before writing the panel. This happens when the site serves several distinct groups, or when nothing on it says who it's for. Offer two to four candidate audiences as choices, each with its age band, situation and device mix, and also offer "a spread across all of them". One question is enough; don't interview them. If they can't be asked, pick the broadest reading, and say so under what wasn't tested.

## Decision stances: what shapes how they explore and decide

Traits such as patience and tech confidence say how well someone copes with the interface. A **stance** says what they are looking for while they use it, and what would make them buy, sign up or walk away. Two people with equal skill take different routes through the same site when one checks every claim and the other wants to know where their data goes. Write stances in `stances` (format below). Give a person one or two; a panel where everyone holds every stance behaves like nobody.

Three come ready to use:

| `stance` | Who | Looks for on screen | Explores by | Decides on |
|---|---|---|---|---|
| `sceptic` | Questions claims and assumes the catch is in the small print | Evidence behind "save up to", "best", "free": dated reviews, named sources, the full price, the terms | Opening terms, FAQs and footnotes before acting. Rechecking the price on the last page. Comparing the headline with the detail | Acts only when the claim holds up in their own numbers. A hidden fee or a vague promise ends it |
| `privacy` | Guards personal data and dislikes being tracked | What is asked for and why, cookie choices, sign-in walls, pre-ticked boxes, the privacy notice | Declining optional cookies, looking for a guest checkout, holding back optional fields, noticing a login requested earlier than needed | Leaves when an account or a detail is demanded before it's needed, or when they can't see what happens to it |
| `eco` | Weighs environmental impact alongside price | Sustainability claims and the proof behind them, materials, packaging, delivery options, repair or recycling, certifications | Looking for an eco filter or a product's impact details, and checking whether a green claim has detail behind it or is just a leaf icon | Prefers the lower-impact option when it's clear and fairly priced. Distrusts a vague "eco" badge. May drop a product that hides its sourcing |

**Derive the rest from the task and the product.** Ask what a real customer of *this* site weighs when choosing. Keep a stance only if it changes where they look or what they decide here. Some examples:

- **Money:** `bargain-hunter` (hunts codes and sales, compares unit prices), `total-cost` (adds delivery, fees and renewals before trusting a price), `subscription-wary` (looks for how to cancel before signing up)
- **Risk:** `safety-first` (a parent checking age ratings and recalls, or a patient checking side effects), `returns-checker` (won't buy without seeing the return terms), `reversibility` (wants to know they can undo a switch)
- **Values:** `ethical-sourcing` (labour and origin), `local-first` (local makers or stock in a nearby shop), `inclusive` (notices who the pictures and wording leave out)
- **Way of deciding:** `researcher` (compares specs and reads reviews before anything), `social-proof` (follows ratings and what most people chose), `brand-loyal` (sticks with what they know and is wary of switching), `impulse` (acts on a good first impression)

Use a stance as a range on the panel, not a garnish. When the audience would plausibly include a sceptic, a privacy-minded person or an eco-conscious one, put that person in. A stance nobody on this site's audience holds, such as `eco` on a tax-filing form, adds nothing.

## Cover the range

Choose 4 to 8 people so these are all covered at least once:

| Dimension | Range to cover |
|---|---|
| Intent | Ready to act now / comparing options / only exploring |
| Situation | Has everything needed / missing one thing / possibly not eligible |
| Domain knowledge | Knows the jargon / first time buying this |
| Tech confidence | Low to high |
| Patience | Leaves quickly / sticks with it |
| Device | Mobile for at least a third of the panel, more if the audience is mobile-heavy |
| Eyesight and access | At least one person at `browser_zoom` 150 or 200, or who relies on the keyboard, or who needs plain language. Colour blindness affects about 1 in 12 men: when colour carries meaning on the site (prices, statuses, errors, charts), include a `vision` persona |
| Trust | Existing customer / new to the brand / sceptical |
| Decision stances | At least two different stances across the panel, chosen from what this audience weighs. Include `sceptic`, `privacy` or `eco` when the audience would plausibly contain one |

Give each person a reason to be on the site **today**, and one thing they don't have or don't know. That gap is what surfaces friction: someone holding every document never shows you where the requirements are unclear.

If the user supplied real customer data (segments, survey results, an analytics breakdown), build the demographics from it, and say so in `source`. Otherwise mark the panel `"source": "illustrative"`.

## Format

`personas.json` is a JSON list.

```json
{
  "id": "retired-teacher-mobile",
  "name": "Margaret, retired teacher",
  "source": "illustrative",
  "demographics": {
    "age_band": "65-74",
    "gender": "woman",
    "location": "small town",
    "occupation": "retired primary teacher",
    "household": "lives with partner",
    "income_band": "lower-middle",
    "education": "university degree",
    "primary_language": "English",
    "tech_usage": "phone daily for messages and news, rarely buys online",
    "devices_owned": ["Android phone", "old laptop"],
    "access_needs": ["needs larger text", "uses reading glasses"]
  },
  "device": "mobile",
  "browser_zoom": 150,
  "network": "normal",
  "task": "Find out whether switching electricity supplier would save money, and switch if it clearly does.",
  "situation": "A neighbour said she switched and saved. Margaret's bill went up last month. She has her latest bill on the table.",
  "knows": ["Her current monthly bill is about $70", "Her postcode"],
  "lacks": ["Doesn't know what a meter number is or where to find it"],
  "assumptions_not_allowed": ["Knows this company's prices", "Knows what an exit fee is on this plan"],
  "traits": {"tech_confidence": 2, "patience": 3, "domain_knowledge": 1, "risk_aversion": 4, "reading": "careful", "eyesight": 2},
  "stances": [
    {"stance": "sceptic", "level": 4,
     "why": "Was caught once by a 'fixed' tariff that went up after three months",
     "looks_for": ["How long a quoted price is fixed", "What 'save up to' is measured against"],
     "acts_by": ["Opens the terms before choosing a plan", "Compares the headline saving with her own bill"]}
  ],
  "behaviour": ["Reads every word near a button before pressing it", "Avoids anything that looks like it costs money"],
  "gives_up_when": ["She can't tell the total monthly price", "Something asks for a number she doesn't have",
                    {"when": "She presses two things that do nothing", "after": {"dead_clicks": 2}}],
  "must_know_before_acting": ["The real monthly cost", "Whether she can leave without a fee"]
}
```

| Field | Notes |
|---|---|
| `demographics` | Free-form keys; the ones above are a good default. Use bands, not exact ages or incomes. `gender` is optional and self-described |
| `device` | `desktop` (1280x800) or `mobile` (a Pixel 7-sized phone) |
| `browser_zoom` | 100 (default), 150 or 200. The screenshots the persona sees are taken at that zoom, so cramped and overlapping layouts show up for real |
| `network` | `normal`, or `slow` to throttle the connection. A start page still loading after 90 seconds on `slow` doesn't fail the start: the persona's first screen shows it half-loaded, and `journey.json` notes `start_load` |
| `cpu` | `normal`, or `slow` to run the page about 4 times slower, like a budget phone a few years old. Pair it with `device: mobile` for a customer on an old phone: heavy pages, late-appearing buttons and janky menus show up in their screenshots |
| `vision` | Optional: `deuteranopia`, `protanopia` or `tritanopia` (colour blindness), or `blurred` (uncorrected low vision). The persona's screenshots and zooms are filtered to match; contrast is still measured on the true colours |
| `color_scheme`, `reduced_motion`, `locale`, `timezone` | Optional device settings: `dark` mode, `true` to ask the site for less motion, a language such as `fr-FR`, a zone such as `Europe/Paris`. Use them when the panel's customers would have them, and to see whether the site holds up in that state |
| `task` | What they came to do, in their own terms. The walker brief gives them this, so it's their goal and not the study's |
| `traits` | 1 to 5, where 5 is highest. `reading` is `skims` or `careful`. `eyesight` 1 to 5 tells the persona how hard faint or small text is for them |
| `stances` | Optional list of decision stances (see above). `stance` is `sceptic`, `privacy`, `eco` or a short slug of your own. `level` is 1 to 5, how strongly it steers them. `looks_for` lists what they hunt for on screen and `acts_by` how it changes their route; both are required. `why` is optional: the history behind it. The walker reads these as part of who they are. A stance's deal-breaker belongs in `gives_up_when` and its must-haves in `must_know_before_acting`, so the driver and the exit interview hold the walker to them. The report splits outcomes by stance |
| `assumptions_not_allowed` | Things this person must not know unless they see them on screen. This stops the model's general knowledge leaking in |
| `gives_up_when` | Concrete triggers. Without these, simulated people persist far longer than real ones. The driver enforces them; see below |
| `test_data` | Optional, `test_env` only: this persona's own test values, overriding the study's of the same name. Use it for values that must differ per person but can't take `{persona}`, such as a digits-only phone number. Write what this person would type, never a value chosen to meet or dodge something recon saw (SKILL.md step 3) |
| `start_url` | Optional, if this persona arrives somewhere other than the study's start page (say, an ad landing page) |

## Giving up: what the driver enforces

Left to judge for themselves, simulated people persist far longer than real ones. So `eyes.py` holds two of the fields to account:

**`gives_up_when`** takes two kinds of item, mixed freely:

- A sentence, such as `"She can't tell the total monthly price"`. The brief numbers these, and every step the walker must send `triggers_met` with the numbers this screen meets. Listing one ends the walk as `gave_up` at that step, with that sentence as the reason, whatever action came with it. A step without `triggers_met` is refused.
- A counted trigger, `{"when": "Two buttons in a row do nothing", "after": {"dead_clicks": 2}}`, which the driver checks itself, with no judgement from the walker. Signals: `dead_clicks` (presses with no visible response, excluding taps on blank space), `backtracks` (Back, or returning to a page already left), `scrolls_in_a_row` (on one page), `low_clarity_in_a_row` (clarity 1 or 2), `steps`, `minutes` (from the persona's own time estimates), and `friction:<type>` (how many friction notes of that type the persona has recorded, such as `friction:surprise_requirement`). One signal per trigger.

Use counted triggers for anything the recording can measure, and sentences for things only the person can judge, such as not finding a price.

**`traits.patience`** sets a budget the driver spends down: 8, 14, 22, 32 or 45 points for patience 1 to 5 (3 when left out), multiplied by the study's optional `patience_scale` (say 1.5 for a long application form people expect to take a while). Each action costs 1, and progress gives it back, so a flow that keeps working costs little whatever its length: what drains patience is friction. It costs more for a press that does nothing (+2), going back (+1.5), a fourth scroll in a row (+0.5), effort 4 or 5 (+0.5 or +1), clarity 1 or 2 (+1), a high or critical friction note (+1 or +2), a page taking over 4 seconds (+1), and time over 30 seconds on one screen. Progress with nothing else wrong gives 1 back: reaching a new page the persona finds clear, or a press that did what they expected (`as_expected: yes`) on a screen they understand, which covers sites that work in dialogs, drawers and panels on one address. Going back means the Back action, or arriving at a page already left for another; only the path counts, so closing a dialog or changing a filter that edits the query string is not going back. The walker sees only a word (`plenty`, `some`, `running low`, `almost gone`). When the budget runs out, the driver ends the walk as `gave_up`. Each step's cost and its reasons are in `journey.json`, and `ended_by` says who stopped the walk: `walker`, `gives_up_when`, `patience` or `harness`.

Never use a real person's details, and invent no real business names or identifiers.
