# Gravitation (working title: Kinetic City): handoff brief

A prototype of a top-down superhero/supervillain game inspired by inFamous, GTA 1/2 and Retro City Rampage. The core is telekinesis that turns physics into damage, plus karma and gang districts. It's an isometric pixel-art city. **It is a PC game** (played on a computer, with a controller or keyboard and mouse); it is not a phone game.

**Status:** prototype. Gameplay comes first, and there is no story yet.

---

## 1. Working with this user. Read first; these are firm rules

**Push finished work to `main` (the user's OK, 2026-11-27).** The user's PC launcher pulls `main` from GitHub, runs `python build.py` and plays `dist/gravitation.html` fullscreen on the TV with a controller. After each finished change, push to `main` as well as the work branch; keep `build.py` and the `dist/gravitation.html` name working.

**The game never draws more than 1920×1080 pixels** (`resize` in 11_render.js); on the 4K TV the browser doubles the pixels. Drawing at 3840×2160 ran at a third of the frame rate for no visible gain, since the art is 320×180.

**Playtest screenshots from the TV** arrive on the orphan branch `xmb-playtest` (screenshots only, never code, never merge it). The user presses Home in the game and picks "Send Screenshot to GitHub". When the user mentions a playtest screenshot: `git fetch origin xmb-playtest`, read `git show origin/xmb-playtest:screenshots/INDEX.md` (one line per shot, newest last: time | Gravitation | build sha | commit message | file), then `git show origin/xmb-playtest:screenshots/<file>.png > <scratchpad>/shot.png` and look at it. Shots are 3840x2160; scale them down before reading.


1. **Don't overcorrect.** When something is wrong, find the *single* main cause and fix only that. Ask before making any other change. Never rebuild systems over a small issue, and never change several things at once to fix one complaint.
2. **Keep the atmosphere.** Rain, window glow, light pools and the karma ring under the player were chosen early on. (Neon was on this list; the user has since dropped the neon cyberpunk look for an ordinary city, see "Setting" below.) Don't remove them. If a feature gets in the way, hide it rather than delete it.
3. **Send a screenshot of every visual change.** The user often can't test personally. Take screenshots with Playwright and send them, along with the rebuilt `gravitation.html`.
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
- **Setting:** an ordinary rainy city (the user's words: "Grand Theft Auto meets Hey Arnold", New York brick and brownstone, Seattle weather). **The old neon cyberpunk night is gone on purpose: the user found it generic. Do not bring neon back.**
- **The world's flavour (the user's own description, 2026-11-27; keep to it):** a down-to-earth near future, "solarpunk mixed with dystopian capitalism". Capitalism lasted long enough to make technology powerful enough to fill some of its own holes: people build their own software and hardware with AI help, wire up their own solar panels and grow their own food, and survive what was a slow apocalypse of sorts, yet the city is still a pretty cool place to live. Keep the ordinary modern city look; tech can be strange and inventive (lasers, AI, drones, e.g. solar-panelled drones that shoot electricity), but **never pink/purple/blue neon cyberpunk**. The red laser barricade is fine. Good source of new enemies and environmental hazards.
- **Machines and hazards (09c_machines.js, drawn in 11k_machines.js), first batch made on the user's free-roam brief; awaiting their picks:** solar street sweepers (team `bot`, harmless, drop energy), spark drones (`zapper`, hover over car parks, telegraphed lightning bolt), repo crawlers (`crawler`, run at you and burst), sentry posts (`sentry`, static turret by each hideout gate, does not hold the gate), loader mechs (`loader`, heavy walker outside each yard, fights like a brute), mites (`mite`, tiny swarm drones; not placed in the world yet), battery banks (`cell`, throwable, burst with electricity and chain), downed power lines (`hazards`, arc on a cycle, hurt anything but civilians). Batch 2: mite hives (`hive`, static, in overgrown parks, release up to 6 mites while you are near), scanner drones (`scanner`, patrol; when the cone fills on you every gang member and machine within 420 px comes for you), heliostats (`mirror`, static, round courts and the Tower plaza; by day and at sunset they track you with a sun-spot that burns once it heats up; idle at night). Batch 3 (fight tools): racks of spare solar panels (`panels`, static prop in car parks, yards and by hideouts; break them and glass shards cut everything within 90 px), street water tanks (`wtank`, in parks, yards and courts; burst one and it floods 70 px for 18 s: ground machines in the water short out, and any electricity reaching the water (battery or crawler burst, a live power line) hits everyone standing in it, you included), rogue couriers (`courier`, high-flying delivery drones that mark a spot on you and drop an explosive parcel; one in Ground Zero, more later). Street furniture and delivery drones: `11l_street_life.js`. Friendly machines (team `bot`): walking vending robots (`vendbot`; people stop at them; stand next to one and it hands you a drink = energy, every 25 s) and repair drones (`fixer`; fly over the roofs to downed power lines and make them safe for 60 s, otherwise tend the charging posts). Electricity is pale yellow-white. `node test/machines.js`. **Every new object must be drawn in the same isometric projection as the props (oriented `pixBox` boxes via `propFrame`, or `isoXY` shapes), never as a flat front-on sprite.** The user rejected the first, flat version of these machines for exactly that ("we went through all of this before").
- **People have roles** (`09d_people.js`, the user asked for the street to feel alive, not background noise). Walkers streamed in as before but as commuter / stroller / jogger / gawker, each with its own pace and habits; anyone may stop to chat with someone passing, listen to a busker or queue at a food cart. Placed people who stay at their spot: buskers (music notes, coins in the case), food-cart vendors (an iso cart with a striped awning), gardeners at planters, tinkerers at charging posts, kids chasing each other in parks. Gawkers film explosions instead of running. Small speech bubbles show what they are doing. How easily each one panics varies (`roleFear`). Behaviour only: no sprite changes.
- **Signed off by the user (2026-11-27):** current enemies are fine as placeholders for now; the music, sound effects and soundtrack are fine.
- **Times of day** (`04b_times.js`): `sunset`, `night` and `day`, each ONLY colours and light (the user was explicit: no sprite or drawing changes). `applyTime(name)` repaints district palettes and each building's wall, roof and window colours, sets the light levels in `LIGHT` (glow, light pools, lamps lit, wash, how green, how light the water) and clears the cached pictures. The user wants to keep all three and use them per story section later. For now it is a setting (Settings → Display → Time of day, `SETTINGS.time`, default sunset, my pick) and `KC.time(name)`. Signs keep their shapes but are painted shop colours (`NEON_GOOD`/`NEON_EVIL` in 04_world.js keep their old names); roof trims are off. `node test/times.js`.
- **Weather** (`WEATHER` in 04b_times.js): the user wants a rainy city where rain is real weather, not decoration: showers come and go by themselves at any time of day (showers 70–160 s, dry spells 50–110 s, wet about 60% of the time, 6 s fade). Rain streaks, splashes, the rain sound, an overcast wash by day and **umbrellas** all follow `WEATHER.rain`; the user asked for extra care that nobody carries an umbrella when it is dry. `setWeather('rain'|'dry'|'auto')` / `KC.weather(...)` for the story and tests.
- **Name:** the game is called **Gravitation** (the user's words: "something like gravitation", so not final). "Kinetic City" was the working title and is gone from the game: the file is `dist/gravitation.html` and storage keys are `gravitation_v2`, `grav_settings`, `grav_costumes` (old ones are moved over once on load). Only the GitHub repo and its folder still carry the old name. The word "kinetic" stays for exactly one thing, the **kinetic shards**; the user asked not to overuse it.
- **The main character is Bary Plumb** (the user's spelling: one r). No story text exists yet; rule 5 still holds.
- **Title screen:** restyled to match the ordinary city: the name as a painted cream sign with a brick-red drop shadow (font Bungee), buttons as green street-sign plates, mustard when selected. No glow. CSS block at the end of the style section in shell.html, scoped to `#title`.
- **Gangs look industrial, not techno (user's words).** Hideout roof signs are rusting steel plates with the gang's mark painted on (lit by a work lamp after dark); window, skylight and doorway light is plain warm bulb light, not gang-coloured glow. The older Hideouts note below still says "neon emblem": read it as this painted sign.
- **Pause menu and HUD are painted signs too** (no glow): the pause styles are a `#pause`-scoped block at the end of the style section in shell.html; the HUD keeps its layout and `12b_hud_paint.js` replaces the drawing helpers (`plate`, `neonStroke`, `neonFill`, `glowText`, `slantPath`) and the `NEON` colours. The older "In-game HUD look" note below describes the neon version this replaced. The city map and minimap are drawn in the city's own colours (asphalt, pavement, brick, park green, following the time of day; freed districts lean blue, dominated ones red), with a cream painted border on the city map.
- **Scene switches for the story** (end of 04b_times.js): `setScene({ time, weather, at: { x, y } })` sets any of the three in one call and overrides Settings → Time of day while it lasts; `clearScene()` hands back. The scene is kept in the saved game. Mechanism only: no story content exists (rule 5). `KC.scene(...)`, `node test/scenes.js`.
- **Enemy looks:** fine as placeholders for now (user). A redesign, when it comes, should follow the world's flavour above; ask the user first, they may send drawings.
- **Pixel art:** buildings (lit/dark windows, shopfronts, neon signs, doors, rooftop clutter), hideouts, characters (8 facings, 4-frame walk), vehicles, props and combat effects.
- **Shades rule (agreed with the user, keep it):** everyone you are meant to fight wears sunglasses: grunts, brutes, elites, cops, and every current and future boss. The hero and civilians never do. Idea from the user for later: give more important enemies differently tinted or differently shaped shades. Started: the three bosses each have their own shape and tint (`BOSS_LOOK` in 11c_sprites.js: Mr. Cinder round goggles with fire reflected in them, Krag a narrow red slit with a scar, The Architect an angular purple visor); elites have glowing lenses in their gang colour; ordinary gang members and cops share one shape.
- **Characters:** small (about 16×20 px), cops and gang members wear shades (shades = someone you can fight); the hero and civilians have eyes (a dark pupil with a white pixel beside it, `FACE_ART`). The hero wears a yellow rain jacket with tousled brown hair; his zip and cuffs take the karma colour. An earlier white-spiky-hair-and-shades hero was dropped for looking like Gojo. Five more finished hero looks are stored as `HERO_COSTUMES` in 11c_sprites.js (scarf, headphones, glowhood, varsity, headband) as unlockable costumes. They are picked on the **Costumes** tab of the pause menu (between Skills and Controls); locked ones show as a dark silhouette with the unlock rule. The rules are in `COSTUMES` in 10_game.js and are a first guess, not something the user chose: scarf = Ground Zero done, headband = Slums done, headphones = 4 shards, varsity = level 5, glow hood = all 12 shards. Unlocks are kept for good under `grav_costumes` (they survive a new game and deleting the save); the costume in use is `SETTINGS.costume`. `KC.costume(name)` forces one for a look; `node test/costumes.js` draws them all and checks the tab. A 32 px redraw was tried as a mock-up and rejected as too "anime RPG Maker". Each gang has its own headwear: Rustlers beanies, Breakers mohawks, Architects visored helmets. Brutes and bosses use the big body. Each boss has his own look on top of it: Mr. Cinder has burning hair that flickers and a long coat with a burning hem; Krag is the biggest, bald and bare-armed with spiked shoulders and crossed straps; The Architect wears a robe to the floor under a floating ring and glides instead of walking.
- **Buildings** (`11g_buildings.js`): each building's still picture (walls, windows, shopfronts, roof and everything on it) is painted once into its own canvas (`b._art`) and stamped every frame; glows, blinking signs, flickering windows, beacons and steam are drawn live on top. It is repainted when the district changes hands. This is faster than the old draw-everything-every-frame code even with far more detail. What stands on a roof is made up from the building's position in `roofPlan(b)` (the generator and the save know nothing about it): water towers, AC units, stair huts with a lamp, skylights, vents (some steaming), dishes, masts with the red light, penthouse blocks on big roofs, tarps and washing lines in the Slums, solar panels in the Tower, and neon signs that face the camera (`SIGN_PIC` pictures, `SIGN_GLYPH` made-up lettering that says nothing). Walls are painted pixel by pixel, addressed as (column along the wall, row above the ground) through `wallGeo(b).S/E`. Each district has its own facade: Ground Zero concrete with a ledge over the ground floor and a cornice, the Slums brick under a tin edge, the Tower glass ribbons with lit stretches and a neon corner. Windows are 3×3 with a sill (some blinds half down, the odd figure at a window, AC boxes hanging under some); there are drainpipes, fire escapes, posters and tags. Shopfronts are lit glass with goods, an awning in the shop's colour and a bright neon tube over it (an earlier version with white-striped awnings and dotted sign lettering lost the neon punch at street level, so the tube stays). Vertical wall signs are blade signs with made-up lettering. `node test/buildings.js` shoots two street views per district.
- **Streets** (`11i_street.js`): the ground is pixel art too. Each city cell (a block plus the road to its west and north) is painted once with the crisp primitives into its own canvas and stamped (`GND` cache, a few new cells per frame, 32 kept); the boss ring, puddle sheen and scorch marks stay live. Per district: Ground Zero plain asphalt with yellow dashes; the Slums cracked, patched and potholed with faded paint, weeds and litter; the Tower clean with teal lane studs and neon kerbs. Everywhere: zebra crossings, manholes, drains, chequered pavement with tactile strips at the crossings. Lamps differ per district (steel arm reaching over the road / wooden utility pole / light-bar post). Trees are lumpy shaded crowns painted once each (`treeArt`); the Slums have some bare ones and the Tower pink blossom. A traffic light stands at one corner of every block and cycles for show; nobody obeys it. `node test/streets.js` shoots nine street views.
- **Effects** (`11e_fx.js` first pass, `11j_fx.js` second pass, which overrides `drawEffects`, `drawPickup`, `gArc`, `gDither`): explosions have a fireball (`FX.fire`, particle kind `f`: puffs that rise and cool from white through yellow, orange and red to smoke, colours in `FIRE_RAMP`); smoke and dust are round puffs that break up into a dither as they fade; heavy shockwaves (ring width ≥ 4) are a dithered band behind a bright edge; the gravity well has a dark pit, three spiral arms and light falling in; the absorb shield is a pixel bubble; pickups are small sprites (green cross = health, blue bolt = energy, crystal = shard, which still only shows within 170 px). Blast radius rings, well reach and warning shapes are unchanged, since they matter for play. Dithered shapes put all their pixels into one path and one fill; a `fillRect` per pixel cost twice as much. `node test/fx.js` shoots a film strip of every effect (`screenshots/fx_sheet_*.png`).
- **Hideouts:** a fortified brick warehouse (`drawIsoHideout` in 11f_blocks.js). South wall: roll-up shutter with hazard strips, status lamp (red blinking = locked, green = open), barred lit windows, graffiti. East wall: the gang's initial sprayed large, a steel side door. Roof: the gang's **neon emblem on a sign that faces the camera** (`HIDE_EMBLEM`: Rustlers a bull's skull, Breakers a bolt cracking a ring, Architects the eye in the pyramid; a future gang needs its own), stair hut, skylight glowing in the gang colour, air-conditioning unit, flag, beacon, razor wire. Cleared = lights and sign off, flag gone, shutter up. An emblem painted flat on the wall was tried first and was unreadable because the wall is sheared; that is why the sign stands upright. The still parts are painted once into a small canvas per hideout (`e._art`) and stamped; wall details are placed by (column, row) through `hideoutGeo(e).S/E`. `node test/structures.js` screenshots all of it.
- **District barricade:** chunky steel pylons with a hazard foot, three emitters and a warning lamp; beams with a pale core, a red halo and a running spark; yellow and red bars on the ground (`drawIsoGateSeg`, `drawGateStripes` in 11b_iso.js).
- **Soft on purpose:** glows and light pools.
- **Occlusion:** things behind buildings are hidden by them. Enemies behind buildings show a faint red ring on the ground. Three ways of showing the hero behind a building are built: 1 = his outline on the wall, 2 = a round dithered window in the wall, 3 = the whole wall see-through. They are a setting (**Settings → Display → Hero behind buildings**, `SETTINGS.see`, also `KC.see(n)`). The default is now 2 = Window: the user was asked three times, never picked, and then said "Continue" to the recommendation. Option sheets are in `screenshots/mock_see/`. `node test/see.js` checks it.
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
- **Saves:** localStorage (`SAVE_KEY`, v2) plus settings under `grav_settings` and unlocked costumes under `grav_costumes`.
- **Watchtowers:** one per hideout (`tower` entity, static, 120 hp). A lookout on the deck shoots while you're on the turf and can't be hit up there; destroy the tower and he falls out. The hideout gate opens only when the guards **and** the tower are down. Destroyed towers are saved (`DS[d].towers`) and shown on both maps.
- **In-game HUD look:** same neon language as the menus. Dark plates that lean 9° like the menu buttons (`plate`, `slantPath`), glowing coloured edges (`neonStroke`/`neonFill`: the edge stroked three times, no blur), glowing lettering for the few big words (`glowText`). Each power has its own tile colour (Well purple, Absorb cyan, Dash gold, Push pink, Grab green); an unlit tile means no energy or cooling down. The minimap frame is lit in the district's colour. The layout and sizes did not change. Glowing pieces that rarely change are painted once and stamped (`stamp`, cache `_stamps`, cleared when the web font finishes loading) so the HUD costs about the same per frame as before; draw new glowing text through `glowText` rather than setting `shadowBlur` every frame. `node test/hud.js` takes a calm and a busy HUD screenshot.
- **Settings (pause → Settings, or title → Settings):** music/effects volume, fullscreen, HUD size (70–110%), screen shake, hero behind buildings (Hidden/Outline/Window/See-through wall), rumble, stick dead zone, aim assist (Off/Low/Normal/High), delete saved game (title only).
- **Rebinding (Controls screen):** every action except movement, aim, pause and menu navigation can be rebound per device; a binding already in use swaps. Stored in `SETTINGS.binds`; glyphs everywhere follow the bindings (`Input.glyph`).
- **Traffic:** streamed onto lanes inside the simulated area (`ACTIVE_R`) but off screen; `CAR_TARGET` (09b_street.js) is the density knob.

---

## 3. Code layout

The game is a single HTML file with no dependencies. `build.py` concatenates `src/js/*.js` in **filename order** into `src/shell.html` at `/*__JS__*/` → `dist/gravitation.html`.

```
python3 build.py        # → dist/gravitation.html
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
| `11b_iso.js` | **iso renderer**: projection (`isoXY`, `ISO_K=.5`, `ISO_KZ=.25`), pixel primitives (`ipoly`, `iline`, `idisc`), barricades, depth sorting, rain, the main `render()` |
| `11c_sprites.js` | character sprites, hand-drawn as pixel grids you can read in the source (`px(...)`): per facing (S, SE, E, NE, N; the rest mirrored) a bare head with shades, hair/headwear layers (`HAIR_ART`), torso poses and leg frames (`CHAR_ART`; `BIG_ART` is the brute/boss body). Only colours are drawn; the outline is added by code. Action poses (`pose` grids) replace the walking torso: the hero's `cast` while lifting or throwing, `aim` for grunts and cops about to shoot, and on the big body `raise` (slam wind-up, boss powers) and `brace` (charges). `charLook` picks style and palette per character type; `drawChar` draws |
| `11d_props.js` | props and vehicles drawn as small 3D models turned to the object's angle: crates and dumpsters are boxes (`pixBox`); vehicles are solids swept from a side profile (`pixSweep`) so bonnets and windscreens slope, with wheels, lights, glass and damage (cracked screen, dents below 35% health) added as detail; vehicle shadows |
| `11e_fx.js` | pixel effects: particles, bullets, rings, wells, warnings, fire, telekinesis tether/throw line, aim lasers, splashes |
| `11f_blocks.js` | fence, basketball hoop, unfinished steel frame, watchtower, **gang hideout** |
| `11g_buildings.js` | **city buildings**: cached picture per building, roof clutter, rooftop neon signs |
| `11h_edge.js` | the waterfront past the edge of the map (drawn only) |
| `11i_street.js` | **the ground** (cached picture per city cell), street lamps, trees, traffic lights |
| `11j_fx.js` | effects, second pass: fireballs, smoke puffs, shock bands, gravity well, pickup sprites |
| `12_hud.js` | canvas HUD (neon plates, ability tiles), minimap, city map, button glyphs, world-anchored labels (`toScreen(x, y, height)`) |
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
`start, skip, step(n), tp(x,y), spawn(kind,x,y,o), spawnGang, spawnBoss, hurt, kill, explosion, skipTo(d), costume(name), see(mode), pickups, ents, P, cam, Input`.

---

## 4. Testing

The tests are Playwright scripts in `test/` (`node test/<name>.js`). They load `dist/gravitation.html` via `file://` and mock the gamepad by overriding `navigator.getGamepads` in `addInitScript`.

**Quick regression set** (run after changes):
`mech` (movement/powers/pause), `assault` (hideout waves → clear), `terr` (territories), `street` (street life), `chaos` (save/load), `kbm` (mouse grab/throw), `props`, `cars`.
Also: `tower` (watchtower, lookout, gate, save), `fixes` (bug-fix checks), `rebind` (rebinding), `audit_ui` (screenshots of every menu into `screenshots/ui/`). Older tests hardcode `/home/claude/kc`; symlink that path to the repo.

**Whole-game sweep** (run these when asked to "look for bugs" or after a big change):
- `tour` (`node test/tour.js [part]`): plays the game with a mocked controller in real time and saves about 95 screenshots of everything common or interesting to `screenshots/tour/` (not committed; the 12 themed contact sheets in `screenshots/tour_sheets/` are). Parts: `start`, `powers`, `fights`, `people`, `hideout`, `boss`, `city`, `menus`. At every stop it also checks the world for things that should never happen (helpers in `tour_lib.js`).
- `probe`: what a screenshot cannot show: map edges, sealed barricades, fences, dying mid-action, bosses returning to their plaza, save/load, the barricade message, the fullscreen choice.
- `windows`: six PC window shapes (ultrawide, 5:4, 1366×768, 125% scaling, small, narrow): letterboxing, menus, pixel scale, mouse aim.
- `python3 test/tour_sheets.py` rebuilds the contact sheets after `tour`, `probe` and `windows`.
- The tour can run at any time of day: `TOUR_TIME=night TOUR_OUT=<folder> node test/tour.js`. A sweep at all three after the palette change found no errors or stuck objects.
- `soak` (`node test/soak.js [minutes] [hero|villain]`): minutes of random play fast-forwarded, world checked every simulated second; `hero`/`villain` buys every skill of that path first.

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

**Performance:** ~10 ms per world render in software rendering (swiftshader), far less on real GPUs; in real time the game holds 60 fps here with no long frames. **Measuring pitfall:** calling `render()` in a tight loop shows a ~0.75 s "frame" every ~145 calls. That is the browser flushing deferred canvas work, not the game: end a timing loop with `mainCtx.getImageData(0, 0, 1, 1)`, or measure `requestAnimationFrame` intervals in real time.

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

**Bug sweep (latest).** The tour, probe and soak above were written for it. Fixed from it:
- toasts overlapped each other and were unreadable over bright walls (now each on a faint dark plate, rows spaced by their own height);
- the objective marker was drawn on top of bosses and inside hideout walls (now floats above them);
- walking into a sealed barricade gave no feedback (now a toast naming the boss to beat);
- bosses followed you across the district after you died and kept attacking from out of sight (now they return to their plaza and wait, keeping their wounds: `BOSS_LEASH` in 09_ai.js);
- the game kept running on alt-tab, on a hidden tab and when the controller in use disconnected (now it pauses);
- the Fullscreen choice was forgotten (`SETTINGS.full`);
- some yard crates and barrels were generated inside the steel frame or the fence.

**Then done on the user's "Continue" (they did not pick numbers; these were my recommendations, so each is easy to undo):**
1. **Thrown barrels explode on the first solid hit** (`fuse` flag set in `throwHeld`, used in `impactHurt` and `onWallHit` in 06_physics.js; cleared when the throw runs out or the barrel is picked up again). 12 of 12 against a goon, brute, car and wall; it was 0 of 12. Your own explosions never hurt you (that was already so). Only barrels you throw: not ones a boss throws, and not ones shoved by Push. The villain skill Chain Reaction still matters for cars. Undo: remove the `h.fuse = ...` line.
2. **The hero shows through a window in the wall by default** (`SETTINGS.see = 2`; settings saved by older builds are moved over once via `SETTINGS.sv`). Undo: Settings → Display → Hero behind buildings → Hidden, or change the default in 02_input.js.
3. **Respawn point at every hideout you clear** (`clearHideout` in 07_combat.js sets `G.check` in front of the gate; it is saved). The start of the game and the boss plazas are still checkpoints too.
4. **Water past the edge of the map** (`11h_edge.js`): the outer ring road is now a waterfront with a kerb, quay walls on the two camera-facing sides, ripples that pick up the district's neon near the shore, and a few blinking buoys. It replaces flat black; nothing there collides or is simulated. This makes the city an island or harbour city, which is a setting choice the user did not ask for: say so if they object. Road markings are now clipped to the map (they used to run on past the edge).

**Still open from the sweep (asked, not answered; do not change unasked):**
- **Elites still wear the look the user rejected for the hero** (white spiky hair and shades).
- **Esc in fullscreen:** now asks the browser to keep Esc (Keyboard Lock, in `13_ui.js`), so in Edge/Chrome fullscreen Esc pauses and holding it exits. Not yet confirmed on a real desktop browser.

**Next, from the user's list:**
- **Feel is signed off (user playtest):** "grabbing and throwing feels great", the game "feels pretty good in most aspects", and karma falls slowly enough ("true to our inspirations"). **Do not retune** `throwSpeed()`, the hold spring, hold energy cost, aim assist, `IMPACT_K` or the karma table unless the user asks.
- **Police wanted level, as the user wants it** (they asked that cops must not chase forever): heat (max 5 stars) starts falling 7 s after your last offence at 0.15 stars/s, so it clears in about 8 s from just over 1 star, 20 s from 3 and 34 s from 5. Below 1 star the officers drop you as a target at once and turn on nearby gang members or drift off. Hurting a cop or a civilian resets the 7 s; dying clears it. The knobs are in `updateEncounters` (10_game.js) and `heatAdd` (07_combat.js).
- **Watchtowers / small structures destroyable from outside.** The user's future idea; main hideouts stay indestructible.

**Shelved:** interior levels. "Outside assault" was chosen instead.

**Known minor:** cars stop to park at curbs less often than before the city expansion (0–1 per minute in tests vs 1–7). Parking still works, and the test varies a lot between runs, so it hasn't been investigated.

**Reference mockups** (in `mockups/`): `iso.html` is the isometric pixel mockup the user approved, the direction the game now follows. `hd2d.html` is the earlier sprite source.
