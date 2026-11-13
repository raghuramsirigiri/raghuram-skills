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
  "gives_up_when": ["She can't tell the total monthly price", "Something asks for a number she doesn't have"],
  "must_know_before_acting": ["The real monthly cost", "Whether she can leave without a fee"]
}
```

| Field | Notes |
|---|---|
| `demographics` | Free-form keys; the ones above are a good default. Use bands, not exact ages or incomes. `gender` is optional and self-described |
| `device` | `desktop` (1280x800) or `mobile` (a Pixel 7-sized phone) |
| `browser_zoom` | 100 (default), 150 or 200. The screenshots the persona sees are taken at that zoom, so cramped and overlapping layouts show up for real |
| `network` | `normal`, or `slow` to throttle the connection |
| `cpu` | `normal`, or `slow` to run the page about 4 times slower, like a budget phone a few years old. Pair it with `device: mobile` for a customer on an old phone: heavy pages, late-appearing buttons and janky menus show up in their screenshots |
| `vision` | Optional: `deuteranopia`, `protanopia` or `tritanopia` (colour blindness), or `blurred` (uncorrected low vision). The persona's screenshots and zooms are filtered to match; contrast is still measured on the true colours |
| `color_scheme`, `reduced_motion`, `locale`, `timezone` | Optional device settings: `dark` mode, `true` to ask the site for less motion, a language such as `fr-FR`, a zone such as `Europe/Paris`. Use them when the panel's customers would have them, and to see whether the site holds up in that state |
| `task` | What they came to do, in their own terms. The walker brief gives them this, so it's their goal and not the study's |
| `traits` | 1 to 5, where 5 is highest. `reading` is `skims` or `careful`. `eyesight` 1 to 5 tells the persona how hard faint or small text is for them |
| `assumptions_not_allowed` | Things this person must not know unless they see them on screen. This stops the model's general knowledge leaking in |
| `gives_up_when` | Concrete triggers. Without these, simulated people persist far longer than real ones |
| `start_url` | Optional, if this persona arrives somewhere other than the study's start page (say, an ad landing page) |

Never use a real person's details, and invent no real business names or identifiers.
