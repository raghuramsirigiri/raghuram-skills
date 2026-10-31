# Motion

Two layers move differently, on purpose. The **card** behaves like a slide
that never leaves: it holds still and only its words change. The **stage**
behaves like film: it never stops. Keeping the two apart is what lets the
words be read while the world keeps going.

## The numbers

- **Read time** (`copy.md` § Read time): max(1.2 s, 0.5 + 0.25 s/word),
  counted from when the headline lands; a figure 1.5 s after it lands; the
  source card 2 s; the final frame 1 s. A beat holds at least 2 s, so the
  stage gets looked at too.
- **Hook by 0.5 s**: the first headline is on screen by frame 15 at 30 fps.
- **Stagger**: lines up to 100 ms, bar rows 100 ms.
- **Data is critically damped**: counters and bars land on their value and
  never pass it.
- **Eases**: words and data in on `outQuint`, the camera and a thing's
  change on `glide` and a smoothstep, words out on expo-in.

## The card layer

The accent bar, the kicker line under it and the footer (a hairline over
the source line) sit in one place for the whole video, per format, and stay
still through every transition. The headline always starts at the same
point under the kicker, at one size, and the units line follows it. Under
them, a beat may hold one figure or one flat chart.

- **The kicker** rolls up through its own line's mask when the next beat's
  kicker differs, and doesn't move when it is the same.
- **The source line** fades out and in on the same rows when it differs.
- **The words** of a beat rise in through their line masks, and on their
  way out rise a little and fade (0.35 s). Nothing in the card ever zooms,
  pans, slides across or changes size.

## Transitions

**One transition for the words, every time.** The outgoing words rise and
fade; for a quiet stretch the shared frame holds still and only swaps its
words; then the incoming words rise in. When the next beat's action needs the
stage to itself (the story's clock moves, or the beat sets `wait`), the
quiet stretch runs longer (1.4 s by default) and the world acts in it. The words never wait on anything else, and nothing sweeps, wipes
or crossfades the frame.

## The stage's motion

- **The camera** has one angle for the whole video and only pans and zooms
  on the world (`stage.md` § The camera). Between beats it eases over the
  words' swap and half a second into the next words; during a beat it
  holds on its focus, following it if the focus moves.
- **Each beat's action** runs from the previous words leaving to the
  middle of its own read. Its pace, its easing and its shape are the
  story's (a crowd gathers slowly, a light snaps on); the engine gives the
  progress and the story's clock eases on `glide`. Rates ease from one
  beat's to the next, so nothing jerks. The stage arrives over the first
  0.6 s.
- **Never static**: the audit warns (`frozen`) when nothing moves for longer
  than the beat's read.

## Banned

Particle bursts, shockwave rings, lens flares, glows and bloom, camera
shake, a rotating or tilting camera, a zoom on the card or on any words,
RGB split, glitches, full-frame crossfades, bouncy or elastic easing on
data, stock "HUD" décor, fake UI of a real product, emoji, spinning logos,
gradient panels. The one decoration is the halftone (`design.md` §
Artwork), kept to the paper around the card and never on the stage.
