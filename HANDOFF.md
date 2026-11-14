# Kinetic City: handoff brief

A prototype of a top-down superhero/supervillain game inspired by inFamous, GTA 1/2 and Retro City Rampage. The core is telekinesis that turns physics into damage, plus karma and gang districts. It's an isometric pixel-art city. **It is a PC game** (played on a computer, with a controller or keyboard and mouse); it is not a phone game.

**Status:** prototype. Gameplay comes first, and there is no story yet.

---

## 1. Working with this user. Read first; these are firm rules

1. **Don't overcorrect.** When something is wrong, find the *single* main cause and fix only that. Ask before making any other change. Never rebuild systems over a small issue, and never change several things at once to fix one complaint.
2. **Keep the atmosphere.** Rain, window glow, neon, light pools and the karma ring under the player were chosen early on. Don't remove them. If a feature gets in the way, hide it rather than delete it.
3. **Send a screenshot of every visual change.** The user often can't test personally. Take screenshots with Playwright and send them, along with the rebuilt `kinetic_city.html`.
4. **Work one step at a time and show results** before moving on.
5. **No story.** The placeholder story was removed on purpose, and the user hasn't written the real one. Don't add story content or dialogue, and don't run or mention full-story playthroughs.
6. **PC game, controller first.** This is a PC game; design everything (UI, menus, settings, screen sizes) for a computer. The user only *tests* the downloaded HTML file on a phone with a Razer Kishi controller, so never add phone-specific features (no touch controls, no orientation prompts, no mobile layouts). It must work with any controller that uses the standard Gamepad API mapping, plus keyboard and mouse.
7. **Listen to the words used.** Do exactly what was asked. When something is ambiguous, ask a short question instead of guessing large.
8. **Keep replies short and concrete:** what changed, the screenshot, the file, the next step.

---

## 2. What the game is now

### Look
- **Art:** isometric pixel art drawn into a **320×180 art canvas** and scaled up with hard pixels (5× on a 1600×900 frame).
- **Frame:** fixed 16:9 and letterboxed.
- **Setting:** a neon night city in the rain.
- **Pixel art:** buildings (lit/dark windows, shopfronts, neon signs, doors, rooftop clutter), hideouts, characters (8 facings, 4-frame walk), vehicles, props and combat effects.
- **Shades rule (agreed with the user, keep it):** everyone you are meant to fight wears sunglasses: grunts, brutes, elites, cops, and every current and future boss. The hero and civilians never do. Idea from the user for later: give more important enemies differently tinted or differently shaped shades. Started: the three bosses each have their own shape and tint (`BOSS_LOOK` in 11c_sprites.js: Mr. Cinder round goggles with fire reflected in them, Krag a narrow red slit with a scar, The Architect an angular purple visor); elites have glowing lenses in their gang colour; ordinary gang members and cops share one shape.
- **Characters:** small (about 16×20 px), cops and gang members wear shades (shades = someone you can fight); the hero and civilians have eyes (a dark pupil with a white pixel beside it, `FACE_ART`). The hero wears a yellow rain jacket with tousled brown hair; his zip and cuffs take the karma colour. An earlier white-spiky-hair-and-shades hero was dropped for looking like Gojo. Five more finished hero looks are stored as `HERO_COSTUMES` in 11c_sprites.js (scarf, headphones, glowhood, varsity, headband) for possible unlockable costumes; nothing selects them yet (`KC.costume(name)` switches for a look, `node test/costumes.js` draws them all). A 32 px redraw was tried as a mock-up and rejected as too "anime RPG Maker". Each gang has its own headwear: Rustlers beanies, Breakers mohawks, Architects visored helmets. Brutes and bosses use the big body. Each boss has his own look on top of it: Mr. Cinder has burning hair that flickers and a long coat with a burning hem; Krag is the biggest, bald and bare-armed with spiked shoulders and crossed straps; The Architect wears a robe to the floor under a floating ring and glides instead of walking.
- **Soft on purpose:** glows and light pools.
- **Occlusion:** things behind buildings are hidden by them, which the user is fine with. Transparency is an option for later. Enemies behind buildings show a faint red ring on the ground.
- **Minimap:** north-up even though the view is rotated 45°. The user said this is fine.

### Controls (standard gamepad)

| Button | Action |
|---|---|
| RT | Telekinesis: hold to grab, release to throw |
| LT | Absorb |
| RB | Repulse |
| LB | Gravity well |
| A | Dash |
| X (hold) | Heal |
| Y (hold) | Drain |
| B | Drop |
| Start | Pause |
| Back | Map |

- **Keyboard:** WASD move, mouse aims. J or left click is telekinesis, Q absorb, R or right click repulse, E well, Space or Shift dash, F heal, V drain, C drop, Esc/Tab/P pause, M map.
- **Rotated input:** stick and keys are rotated for the iso view, so up on the stick is up on the screen (`isoDir()`).

### City
- **Districts:** 3 districts, each **4×7 blocks**, separated by laser barricades that open as districts are freed:
  - Ground Zero (gang: Rustlers, boss: Mr. Cinder)
  - The Slums (gang: Breakers, boss: Krag)
  - The Tower (gang: Architects, boss: The Architect)
- **Grid:** `TILE=32`, block = 9 tiles + 3-tile road, `BAND=384`. The map is 147×87 tiles.
- **Block kinds:**
  - building blocks
  - parks
  - hideouts (3 per district)
  - boss plaza
  - open blocks:
    - **lot:** parking lot with parked cars
    - **court:** basketball court with hoops
    - **yard:** construction site with a chain-link fence (solid), an unfinished steel frame building, and crates/barrels

  Layout is fixed per district in `LAYOUT` (04_world.js).

### Systems
- **Physics as damage:** kinetic energy turns into damage (`IMPACT_K` in 01_core.js is the main balance knob). Heavier objects throw slower, cost more energy to hold and hit harder.
- **Vehicles:** sedan, compact, taxi, police cruiser, van and bus (`VEHICLES` in 05_entities.js). Mass ranges from 7 to 20.
- **Territories:** gangs defend an area around each hideout (`TERRITORY_R=270`) and don't chase you across the city.
- **Hideout assault from outside:** take down the guards → the gate shutter rolls up → 2 waves come out → a named lieutenant (a brute with gold trim) comes out → the hideout is cleared. Hideouts can't be destroyed from outside, which is deliberate. Clearing 3 hideouts brings out the district boss.
- **Street life (09b_street.js):** pedestrians walk sidewalk loops, go in and out of doors, get into parked cars and drive off, and cars park at curbs. Population streams in around the camera.
- **Karma:**
  - range: ±100 internally, shown ×10
  - ranks: HERO / GOOD / NEUTRAL / BAD / INFAMOUS at ±60/±20
  - tuned to be slow, inFamous-style:

    | Event | Karma change |
    |---|---|
    | Civilian hit | −0.05, throttled to once per 3 s |
    | Civilian kill | −0.4 |
    | Drain | −0.3 |
    | Heal | +0.4 |
    | Cop kill | −0.5 |
    | Ally kill | −1 |

  - an accidental civilian casualty in a fight should never turn you evil
  - the karma meter is always on screen
- **Saves:** localStorage (`SAVE_KEY`, v2) plus settings under `kc_settings`.
- **Watchtowers:** one per hideout (`tower` entity, static, 120 hp). A lookout on the deck shoots while you're on the turf and can't be hit up there; destroy the tower and he falls out. The hideout gate opens only when the guards **and** the tower are down. Destroyed towers are saved (`DS[d].towers`) and shown on both maps.
- **Settings (pause → Settings, or title → Settings):** music/effects volume, fullscreen, HUD size (70–110%), screen shake, rumble, stick dead zone, aim assist (Off/Low/Normal/High), delete saved game (title only).
- **Rebinding (Controls screen):** every action except movement, aim, pause and menu navigation can be rebound per device; a binding already in use swaps. Stored in `SETTINGS.binds`; glyphs everywhere follow the bindings (`Input.glyph`).
- **Traffic:** streamed onto lanes inside the simulated area (`ACTIVE_R`) but off screen; `CAR_TARGET` (09b_street.js) is the density knob.

---

## 3. Code layout

The game is a single HTML file with no dependencies. `build.py` concatenates `src/js/*.js` in **filename order** into `src/shell.html` at `/*__JS__*/` → `dist/kinetic_city.html`.

```
python3 build.py        # → dist/kinetic_city.html
```

It all becomes one script, so **a later `function` declaration replaces an earlier one with the same name.** The iso renderer relies on this: 11b–11f redefine functions from 11_render.js. `const`s can't be redeclared.

| File | What it does |
|---|---|
| `shell.html` | HTML/CSS shell, title/pause/dialog overlays |
| `01_core.js` | constants (grid, `IMPACT_K`, `DCOLS`, `GATE_TX`), math/colour helpers, camera object |
| `02_input.js` | Gamepad API (standard mapping) + keyboard/mouse, glyphs, rumble, settings |
| `03_audio.js` | synthesized sound effects and music |
| `04_world.js` | `buildCity()`: blocks, buildings, open blocks (`openBlock`), lamps, trees, tile map, flow field, minimap |
| `05_entities.js` | `DEFS`, `mk()`, `VEHICLES` + `applyVehicle()`, spawn helpers |
| `06_physics.js` | collisions, impact damage, `canHurt` |
| `07_combat.js` | `hurt`, karma table, effects (FX), explosions, `clearHideout` |
| `08_player.js` | powers, the grab/throw spring, aim (`isoDir` applied to move/aim stick) |
| `09_ai.js` | gang/cop/boss AI, territories, hideout assault waves, car driving |
| `09b_street.js` | pedestrians, doors, parking, population streaming |
| `10_game.js` | `populate`, objectives, district progression, save/load |
| `11_render.js` | **old tilted renderer.** Still used for `drawGround`, ground lights, glows and helpers; most of its drawing is replaced |
| `11b_iso.js` | **iso renderer**: projection (`isoXY`, `ISO_K=.5`, `ISO_KZ=.25`), pixel primitives (`ipoly`, `iline`, `idisc`), buildings, hideouts, trees, lamps, barricades, depth sorting, rain, the main `render()` |
| `11c_sprites.js` | character sprites, hand-drawn as pixel grids you can read in the source (`px(...)`): per facing (S, SE, E, NE, N; the rest mirrored) a bare head with shades, hair/headwear layers (`HAIR_ART`), torso poses and leg frames (`CHAR_ART`; `BIG_ART` is the brute/boss body). Only colours are drawn; the outline is added by code. `charLook` picks style and palette per character type; `drawChar` draws |
| `11d_props.js` | props and vehicles drawn as small 3D models turned to the object's angle: crates and dumpsters are boxes (`pixBox`); vehicles are solids swept from a side profile (`pixSweep`) so bonnets and windscreens slope, with wheels, lights, glass and damage (cracked screen, dents below 35% health) added as detail; vehicle shadows |
| `11e_fx.js` | pixel effects: particles, bullets, rings, wells, warnings, fire, telekinesis tether/throw line, aim lasers, splashes |
| `11f_blocks.js` | fence, basketball hoop, unfinished steel frame |
| `12_hud.js` | canvas HUD, minimap, button glyphs, world-anchored labels (`toScreen(x, y, height)`) |
| `13_ui.js` | DOM menus, controller navigation |
| `14_main.js` | main loop (fixed step, hitstop); `window.KC` debug hooks |

### How the iso renderer works (`render()` in 11b)
1. **Flat pass** (ground affine transform `groundT()`): ground, additive light pools, barricade stripes, shadows, player karma ring.
2. **Standing pass** (art space `artT()`): boxes (buildings, hideouts, fence segments, barricade posts) sorted by `x0+y0+x1+y1`. Points (characters, props, trees, lamps, hoops, pickups) are slotted after the last box they stand in front of, if that box overlaps them on screen.
3. **Overlay pass:** warnings, aim lasers, enemy rings, telekinesis visuals, effects, splashes, rain.
4. **Scale-up:** the art is scaled to the screen with smoothing off, then full-res post effects (karma tint, vignette, low-HP pulse). The HUD is drawn at full res on top.

**Coordinate conversions:**
- `screenToWorld` (mouse) and `isoToScreen` (HUD) convert between screen and world.
- World height → art px:
  - buildings: `ISO_KZ`
  - props: `PROP_KZ=.75`
  - characters: `SPR_K=.6`

### Debug hooks (`window.KC`)
`start, skip, step(n), tp(x,y), spawn(kind,x,y,o), spawnGang, spawnBoss, hurt, kill, explosion, skipTo(d), costume(name), pickups, ents, P, cam, Input`.

---

## 4. Testing

The tests are Playwright scripts in `test/` (`node test/<name>.js`). They load `dist/kinetic_city.html` via `file://` and mock the gamepad by overriding `navigator.getGamepads` in `addInitScript`.

**Quick regression set** (run after changes):
`mech` (movement/powers/pause), `assault` (hideout waves → clear), `terr` (territories), `street` (street life), `chaos` (save/load), `kbm` (mouse grab/throw), `props`, `cars`.
Also: `tower` (watchtower, lookout, gate, save), `fixes` (bug-fix checks), `rebind` (rebinding), `audit_ui` (screenshots of every menu into `screenshots/ui/`). Older tests hardcode `/home/claude/kc`; symlink that path to the repo.

**Visual checks:**
- `iso`, `iso2`: street, hideout and Tower screenshots
- `sprites`: character sheets (`screenshots/sprites_sheet.png`, `sprites_closeup*.png`); also checks every art row has the right width
- `vehicles`: vehicle and prop sheets (`screenshots/vehicles_sheet*.png`, `props_sheet.png`) plus a render-time check
- `fx_iso`: effects
- `bigcity`: layout, reachability, perf

**Pitfalls:**
- Don't name a test global `window.H`, because it clashes with the game's `H`; use `HO`.
- `fetch` doesn't work on `file://`, so inline any data the test needs.
- `flow.js` walks district progression. Avoid anything resembling a story playthrough (rule 5).

**Performance:** ~8 ms per frame in software rendering (swiftshader), far less on real GPUs.

---

## 5. Where it left off / what's next

**Done most recently, in order:**
1. Iso city
2. Pixel characters
3. Pixel props
4. Pixel effects
5. Bigger city (4×7 per district)
6. Open blocks (lot/court/yard)
7. Traffic variety (6 vehicle types)

**Next, from the user's list:**
- **Grab & throw feel tuning.** Needs the user's playtest feedback, so ask what feels off and change only that. The relevant knobs:
  - `throwSpeed()`
  - the hold spring (`k = 320/(1+m*.09)`)
  - hold energy cost (`4 + m*.9`/s)
  - aim assist (`assistTarget`)
  - `IMPACT_K`
- **Watchtowers / small structures destroyable from outside.** The user's future idea; main hideouts stay indestructible.
- **Transparency for things behind buildings.** Only if the user decides occlusion is a bad trade-off.

**Shelved:** interior levels. "Outside assault" was chosen instead.

**Known minor:** cars stop to park at curbs less often than before the city expansion (0–1 per minute in tests vs 1–7). Parking still works, and the test varies a lot between runs, so it hasn't been investigated.

**Reference mockups** (in `mockups/`): `iso.html` is the isometric pixel mockup the user approved, the direction the game now follows. `hd2d.html` is the earlier sprite source.
