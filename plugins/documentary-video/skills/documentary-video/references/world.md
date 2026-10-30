# Step 5: the world

Write `film/world.js`: every place in the bible laid out as **one continuous
world** the camera travels across, with the cast placed in it and the
handles the shots will move. A film that cuts between separate sets reads as
slides; one world the camera crosses reads as a film.

## The contract

```js
window.buildWorld = function () {
  const root = Film.group({ name: 'world' });
  // ... places, props and cast, built with window.Cast from cast.js
  return { root, /* the things shots move, and helpers */ };
};
```

`cast.js` exposes its builders as `window.Cast = { car, rider, tower, ... }`
as well as the `window.CAST` list for the contact sheet, so the world builds
from exactly what the sheet showed.

## Laying it out

- **Follow the film's order in space.** Put places where the camera's path
  between them tells the story: the factory, then the road, then the store;
  the front line moving east; the savanna giving way to ice. A move from one
  place to the next is a shot in itself.
- **Real metres, one scale.** A city block is about 50 m, a road 10 m, a
  pavement 3 m. When everything shares one scale, the camera can go from a
  2 km wide shot to a phone in a hand without a cut.
- **Leave room for the action.** A crowd of 100 at 0.75 m spacing needs
  about 8 x 8 m; 38 cars in bays need a car park. Give each beat's action an
  open space, and keep tall things out of the camera's way: a building between
  the camera and the action blocks the shot, and a camera that ends up inside
  one shows a flat grey frame. The player warns about this when the film loads.
- **Background stays plain.** Places the story only passes through are
  simple and repeated (identical houses, one tree); the places beats happen
  in get the bible's telling details.
- **Ground level.** Roads and markings are `flat` shapes at a few
  millimetres; pavements and blocks are low boxes (0.15 m); things standing on
  them sit at that height.

## Handles for the shots

Return what the shots need to move, and helpers that put the world into a
known state, because each beat's `setup()` must be able to start from
anywhere (the viewer can seek):

- **Collections that carry counts**: 100 cars, 100 riders, a stack of 60
  forms. Make the count the unit the screenplay's `Count` lines use.
- **Spots**: where each unit stands at rest (a grid at the kerb, bays on the
  rank), so a helper can reset them.
- **State helpers**: `crowd(n)` shows the first n riders at their spots in
  their own colours; `carsAt('peak')` parks cars for one beat; `setNight(on)`
  lights windows and lamps (`m.glow = on` on named meshes).
- **Fixed choices**: when k of n must light up, pick them with a seeded
  shuffle (`Film.rng`) so the same ones light every time the beat plays.

Use the world's own nouns for these. The handles are this film's, not a
general API.
