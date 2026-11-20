# Writing personas

A useful panel is made of people who would **behave differently on the same screen**. What they know, need, fear, can see and will put up with changes behaviour. Demographics are recorded, because the people who commission a study want to know who the panel stands in for, and the report shows them in a table. But they don't drive behaviour on their own: "68 years old" says nothing about how someone uses a phone. Write the behaviour out explicitly in `traits`, `behaviour` and `gives_up_when`, and let the demographics describe who this is.

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
