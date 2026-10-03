---
description: The reasoning behind the parts that are easy to break — the interface, the holder list, the market feed, the directory — and what to check before changing them.
---

# Engineering notes

The rest of this section says what things are and how to run them. This page says **why they are the way they are**, which is what you need before changing one.

## The railway

* **The track behind the train is the chart.** The line's centreline is sampled every 4 m and extended only as the country ahead is built, at the grade the market is at *then*. Nothing already laid is ever re-graded, so the hills behind the train are a record of the last few minutes of the five-minute move.
* **A floating origin.** Every chunk, car, station and billboard is placed relative to the train each frame, from coordinates kept in JavaScript doubles, so the scene stays near the origin however far the train runs.
* **Chunks are recycled, not rebuilt from nothing.** Thirteen chunks of country (one is 11 track tiles, 162.5 m) are kept; the one that falls behind the train has its vertex buffers and instance matrices rewritten for the next stretch ahead. A chunk is a whole number of track tiles, so the detailed track never straddles two.
* **Detailed track near, simple track far.** The supplied rails and sleepers (25,000 triangles per 14.8 m tile) are instanced only across the three chunks round the camera; further out, a light procedural track stands in, and steps aside where the detailed one is drawn.
* **The livery is painted by height.** The car model's body is one material, so the gloss black, the cyan line and the charcoal roof are a few lines in the material's shader, keyed to the height on the car; the mark, the name and the cab's market-cap display are canvas textures.
* **A carriage uncoupled is left behind, not deleted.** It keeps rolling, braking at 3.5 m/s², until it is 900 m back, so a market falling through a milestone is something you watch happen.

## Runaway

* **The game has no three.js in it.** `src/lib/railGame.ts` is plain state and arithmetic: the page holds it, the keys and taps write into it, the scene reads it, and the tests drive it with no screen. It is seeded (mulberry32, kept in the game's own state), so the same seed always lays the same line.
* **It steps in small slices.** A frame's time is cut into steps of 1/120 s at most, so a rockfall 4 m long cannot slip between two frames at 260 km/h.
* **Every wave leaves a way through, and the test proves it.** A wave closes one or two tracks, never three. The next wave is laid only after the last has stopped closing anything, plus the train's own length and enough time to cross two tracks. A track an earlier oncoming train has still to come down is left alone, because that train will be through and gone before ours arrives. `test/railway.test.mjs` runs an autopilot over six seeds at 30, 60 and 120 Hz and fails if it ever hits anything in 150 s.
* **Oncoming trains are timed off the speed the train will have, not the speed it has.** The train is always accelerating, so a train timed off today's speed arrives late and meets it somewhere it was never meant to. `ahead()` integrates the real acceleration curve, runaway included, to find when the train reaches the meeting point.
* **The server checks the arithmetic, not the run.** A post carries seconds and tokens. The metres (score less 25 a token) must lie between the starting speed times the seconds and the most the acceleration allows. The tokens must fit what the line could have held. Both bounds are the game's own functions (`maxRunDistance`, `maxRunCoins`), imported by the Worker.
* **Three tracks are only laid for the game.** `RailWorld` takes a `runaway` option. With it, the formation is widened, two more rails and sets of sleepers are laid per chunk, the detailed track is tiled three times across, the signals step out past the outer track, and the stations (whose platforms would sit on the outer tracks) are not loaded.

## The tiers

* **One rule, two readers.** `src/lib/tiers.ts` says which ground tier a market cap is in. The scene reads it to choose the world, and the page reads it to announce the change and name the next stop. Both apply the same 8% hysteresis, so they cannot disagree about where the train is.
* **The street grid is in the shader, not the mesh.** The terrain has a vertex every few metres near the line and every hundred-odd far out, far too coarse for a 9 m street. The town's and the city's paving is therefore a separate ribbon on the terrain's own columns (so it lies exactly on the ground), carrying the line's coordinates as an attribute. The fragment shader draws the streets, kerbs, lawns and dashed centre lines per pixel from those, over the supplied concrete texture and its normal map.
* **The buildings stand on the same grid the shader draws.** `scatterUrban` walks the same blocks, so no tower ever stands in a street.
* **Towers are boxes; the windows are maths.** Each tower is one instanced box. Its shader recovers the tower's real size from the instance matrix and cuts panes on a 3.1 m by 3.7 m grid, so floors are the same height on every tower. A hash of the pane and the tower decides which panes are lit at night, and it never changes from frame to frame.
* **The river is ready in every world.** The line runs straight and level for a few hundred metres either side of each river crossing, whatever the tier, because the line's shape cannot change under a train already on it. Only the city cuts the valley and hangs the bridge.
* **The heavy models load late.** The shop buildings and the bridge are fetched the first time the market reaches the town, not with the page.

## Weather

* **The drops stay in the world.** Rain and snow fill a 90 m box round the camera, but each drop's place is wrapped on the world's own grid. The camera's world position is folded to the box size in JavaScript doubles before it reaches the shader, so the drops stay sharp however far the train has run. The train therefore runs through the rain instead of carrying it along.
* **A streak is the drop's motion relative to the camera.** Each drop is one quad, stretched along its fall minus the train's velocity, so the slant and the length come from the physics rather than a fixed angle.
* **Snow and wet are uniforms, not rebuilds.** Settling snow and wet ground are two numbers that ease up and down over tens of seconds. They are read by a small patch on the country's materials: snow on whatever faces up, a darker tint when wet, and lower roughness on the streets and rails. No chunk is rebuilt for weather.
* **The swell's wavelengths divide 1200 m.** The water's normals are worked out per pixel from four swells, on world coordinates wrapped to 1200 m. Each swell's length divides that, so the wrap never shows as a jump.
* **The wipers and the shader share one clock.** The windscreen's drops are cleared wherever a wiper last passed. The shader works out when that was from the same sweep the blades are turned by, so the glass clears exactly under the blade.

## Inherited from Seat Airlines

Some of Seat Airlines' modules are still in the repository but are no longer on the page: the airliner (`airframe.ts`, `airlinerMesh.ts`, `lamps.ts`), its worlds (`WorldScene.ts`, `skyline.ts`, `surfaceWorker.ts`), its cabin, cockpit and cargo hold, and its flying game (`landingGame.ts`, `LandingScene.tsx`). They are kept for reference, and the notes under **Rendering at planet scale** and a few under **Performance** describe them.

## The interface

The page is a soft-UI panel with dark screens set into it — the way a driver's desk is built. One light grey face, controls extruded out of it by light rather than outlined, displays recessed into it, and a single blue that lights whatever is live.

There are almost no borders in `src/index.css`. An edge is a change in shading: a white shadow up and to the left where the light is, a grey one down and to the right where it is not. Swap their positions to inset, and the same control reads as pressed. That is what lets the seat map explain itself without a legend: **an open seat is a socket pressed into the carriage, a held seat is a tile extruded out of it, and your seat is the one wearing the blue.**

Two things about the palette to know before changing it:

* **There are two blues, and the difference is contrast.** The bright gradient `--g-accent` (`#00C9F1 → #0087EA`) lights anything that is a graphic — a meter, a lamp, a ring, an active edge. Anything carrying text gets `--g-accent-text` (`#007ACC → #005FB8`), which holds white at 4.5:1 where the bright one manages 3.7:1.
* **The greys are darker than a soft-UI kit's usually are.** Each was walked down until it carries small text at 4.5:1 against all four grounds it is ever set on — the page, a card, the wall card and the inside of a recess. If you change one, check it against the darkest of those, `--ui-sink`.

The values live in two places that must stay in step: the custom properties at the top of `src/index.css`, and the `ui` palette in `tailwind.config.js`.

Type and spacing are one ratio, φ. Every size is the 15px body size multiplied or divided by 1.618 (or its square root), and every measure of air is a rem stepped by the same number — the scale is `--t-xs` to `--t-5xl` and `--s-1` to `--s-6`.

The train keeps its own materials. Inside the screens the livery and the coach lighting are the train's, because those are what it is made of rather than interface colours — the `seat` palette in `tailwind.config.js`, kept apart from `ui` on purpose.

## Where the holder list comes from

The mint alone is famously not enough: Solana has no "list the holders of this token" call, and the closest, `getTokenLargestAccounts`, returns at most **20** accounts. The train seats **118**: twenty would fill the driver's cab, First Class and a few Business seats, and leave everything from row 7 back empty however many holders the token has.

So three sources are tried in order:

1. **`VITE_HOLDERS_URL`**, an indexer. Uncapped, and still the best answer.
2. **The Worker's `GET /holders`** — the default. It hands back the list the Worker has already read and cached to decide who may read whose card, with the supply alongside. The page and the Worker therefore agree about who is aboard by construction, the chain is read once a minute for the whole site, and no RPC key is ever shipped to a browser.
3. **The chain directly**: every account the token program owns for this mint, summed by owner. Uncapped too, but a scan — some public endpoints refuse it, in which case the twenty are still there underneath.

{% hint style="warning" %}
**Which token program is looked up first matters.** There are two, and a mint belongs to one. Asking the wrong one is not an error — it is an empty list, which reads as "this token has no holders", so the train comes back empty and nothing says why. This code scanned only classic SPL Token until the first real mint it met turned out to be Token-2022.
{% endhint %}

Any list is then read in batches of a hundred, because `getMultipleAccounts` — which separates people from bonding curves — takes no more than that per call. Over the limit it errors, and an error reads as "the chain could not be asked".

## The market feed

`src/lib/marketFeed.ts` reads Jupiter's keyless API — no key, and it sends CORS headers, so the browser calls it directly. One request carries all three numbers the cabin reads: market cap, the five-minute move, and the holder count.

* **Rate.** The keyless tier allows 0.5 requests a second. The page polls every 20 seconds and, on a 429, backs off to 90 rather than retrying on schedule. The limit is per IP and this runs in each visitor's browser, so one visitor is nowhere near it.
* **Parsing by name.** Fields are found by name, at any depth, rather than by a fixed path. Jupiter serves this data from several endpoints that have each moved between versions and do not agree on nesting — only on what the fields are called. Anything missing leaves the previous reading in place: a train that holds its last known reading is better than one whose display drops to zero because a key was renamed.

## The wall: adverts belong to wallets

**Adverts are stored against the wallet, not the seat.** The server has no idea what a seat is, and must not learn — that would be a second copy of the seat ladder, drifting from this one. The page resolves wallet to seat through the manifest it already holds, which is also why an advert follows its holder up and down the cabin, and comes down on its own when they drop off the manifest.

Every publish is signed over a challenge that names the wallet, **pins the exact image bytes**, and is stamped with the time. Pinning the image matters as much as naming the wallet: without it one captured signature would authorise any artwork for that wallet, forever.

## The directory: one seating chart, enforced on the server

* **One signature, not one per action.** A wallet popup for every message would be unusable, and worse, would teach people to approve things unread. The wallet signs one plain-text line to open a session and gets a bearer token good for a day; the server keeps only its hash.
* **Each cabin sees only itself.** Names and roles belong to everyone; contact details, introductions and a cabin's room stay within its own section; a conversation is readable by its two wallets and nobody else. Writing goes exactly as far as reading. `canOverhear` is kept, answering no.
* **The hold is not a cabin.** A wallet without a seat is on no roster. Its cards are not served and its conversations are never read out of the database only to be withheld — the queries ask for the seats, and never for the rest.
* **The seating is shared, not copied.** The ladder lives in `src/lib/seating.ts`, with no browser and no Cloudflare in it, and the page and the Worker import the same file. With no mint configured the Worker fails closed, and `GET /health` says so (`sections: false`, and `seated` out of `cabin`).

## The views

**Turning your head is seat-specific.** From 8A the window is one turn to the left and fills the frame; from 8D the left window is the far side of the coach. Rather than special-casing seat letters, `lookFrom` in `src/content/cabin.ts` models the row as it physically is — left window, left pair, aisle, right pair, right window — and reads it outward from wherever you sit.

**One roll of occupancy.** The seat map, the passengers ahead of you, the people beside you and the lit windows outside all read the same seeded set, so a window lit from outside is a row somebody has genuinely booked.

## Rendering at planet scale (Seat Airlines)

* **Near planes as far out as each view allows.** The logarithmic depth buffer keeps depth *testing* precise from a seatback to the limb of a planet, but clipping still runs on the ordinary projection. With the near plane 5 cm from the eye, anything 600 km out sat within a rounding error of the far plane, and whole triangles dropped out at random — black shards along the limb in space, a different set every frame. The near plane is now 0.1 m in a seat and 1 m outside. The space band's air is drawn on a dome 20 km round the aircraft rather than on a planet-sized shell: its glow is worked out along each ray (`atmosphereShell` in `src/three/skies.ts`), so the mesh is only a canvas and its size changes nothing but the depth.
* **Relief that the mesh can carry.** The near ground is a displaced mesh with a vertex every hundred-odd metres. The height map the other worlds hand it is blurred to about that spacing, because a sharper one aliases: crater rims came out as chains of spikes. The normal map keeps the full resolution, so the light still shows every rim. Toward its edge the relief settles to the ground's average height, where the flat plate beyond carries on — otherwise everything inside stands up out of the plate like a mesa.
* **Nothing laid a hair over the ground.** The lakes were a transparent plane 2.5 cm above the land, which held while the land was the same two-triangle plate. Once the lake beds lay on the relief mesh instead, the two surfaces no longer agreed on their depth to within 2.5 cm from a kilometre up, and every lake blinked on and off with each twitch of the camera. The lakes are now painted by the ground's own shader (`lakeShader` in `src/three/noTile.ts`), so there is no second surface to disagree with. What has to stay a separate layer — the sea crossing in over a coast, and its glint — floats 3 m up and draws before the cloud billboards, which write no depth.
* **Scenery that stands on the paint.** The trees, buildings and ships (`src/three/scenery.ts`) are placed from records the ground painters write as they paint (`src/three/props.ts`), so each stands on its own painted wood, roof or ship's light. The world does not move — the ground's texture slides — so each prop is placed on the GPU every frame from the same shift, wrapped to the nearest copy of the 3 km tile, and stood on the relief mesh's own triangle, read at the same three corners the mesh is displaced by: a tree's foot is exactly where the hillside is drawn, not where the smooth height field would put it. One instanced draw per shape per copy of the tile, culled whole; props shrink into the ground at the edge of their reach, where the paint carries on. Ships are drawn per world tile rather than per copy, so the same fleet is not moored every three kilometres, and lights — windows and navigation lights — are points, which keep their few pixels however far away and do not shimmer the way a sub-pixel window pattern would.

## After a token change

The page detects a mint change on start-up and clears the old token's browser-only adverts and directory session. To force that while testing, run this in the production page's console and reload:

```js
['seat-airlines.banners.v1', 'seat-airlines.directory.session.v1', 'seat-airlines.active-mint.v1']
  .forEach((key) => localStorage.removeItem(key));
location.reload();
```

Avoid a blanket `localStorage.clear()` in production — it removes unrelated visitor state too.

## Performance

* **One animation loop.** Every view animates off refs through a single `requestAnimationFrame` loop; after mount, no React render is involved in the instruments at all.
* **Polling is polite.** It pauses in hidden tabs, aborts superseded requests, and reads fresh when the page is visible again.
* **The 3D scene adapts.** Cloud instances upload at 30 Hz, the pixel ratio follows measured render time, low-power devices ask for the low-power GPU, and the distant terrain's hex-tiling costs three texture reads only where it is used.
* **The airline's other worlds are built off the main thread** (not on the railway's page). The cloud sea, Earth from space, the moon and Mars are generated in the browser — height fields, normal maps, albedo — by a worker (`src/three/surfaceWorker.ts`) that starts a moment after the page settles and builds them in the order the flight is likely to need them. Each is a second or so of arithmetic that would otherwise stall the whole flight on crossing into a level; this way it is waiting when the market gets there.
* **The passengers are one body.** `src/three/passengers.ts` seats every holder from a single seated model, lifted out of a 3ds Max scene by `scripts/passenger-mesh.py` (which reads the file's chunk tree directly) and shipped as 20 KB of quantised geometry in `passengerMesh.ts`. It is smoothed in the browser by Loop subdivision, dressed per instance from a palette packed into three instanced attributes, and drawn at two levels of detail by row — smoothed, with strand-card hair, for the viewer's row and the one ahead; the model as it came for everyone else — with only the plain level built up front and the fine one in idle time after. Faces are painted in the shader; hair is a shell fitted to the skull plus alpha-cut strand cards. The reaper (`src/three/reaper.ts`) is the same body in a robe, with a skull meshed from a distance field by surface nets — also built in idle time.
* **Four lamp bays, not fifty.** Every point light in a scene is paid for by every lit pixel every frame, so the cabin lights only the four bays round the viewer — two ahead, their own, one behind — and moves them from seat to seat, rather than lighting all thirty rows at once.
* **Four kinds of country, one clock** (Seat Airlines' flying game and cabin windows; not on the railway's page). `src/lib/biome.ts` walks farmland → sea → farmland → city → farmland → snow, with a 14-second crossing between each leg, from the wall clock so every view agrees. The city (`src/three/skyline.ts`) is laid out as Manhattan: 100 × 80 m lots, an avenue every three lots and a cross street every block, painted on the ground plate and built in the round on a lattice of lots round the aircraft. A slowly varying district field sets where the towers cluster; tall masonry buildings step back from a streetwall base, glass ones rise from plazas, low ones carry water tanks, and one long park recurs every 13 km. Near the aircraft each building is built in parts, inside a ring that narrows as the aircraft climbs, and as a single box beyond it; the vertex shader slides the lattice with the ground and hashes each lot's coordinates into its building, so nothing costs CPU a frame, and `towerTopAt` repeats the hash on the CPU so the landing game hits what it sees. Snow (`src/three/snow.ts`) is a tint on the farmland and the ranges plus a box of flakes carried round the camera, riding the air mass so they stream past.
* **The airline's aeroplane is an A320's** (not on the railway's page). Its fuselage and engines are read out of a SketchUp 8 model by `scripts/skp-faces.py` (the file is an MFC object archive: component definitions holding faces, loops and edge-uses, placed by groups with their transforms) and triangulated, repainted and packed by `scripts/airliner-mesh.mjs` into `src/three/airlinerMesh.ts`, with the fuselage's measured profile. The wings, fin and tailplane are still built in `airframe.ts`, fitted to the same aeroplane's planform, because they are the parts that move.
* **The airline's aircraft lights light only the aircraft** (not on the railway's page). The strobes, beacons, position and logo lights, the window light and the night moonlight are added to the airframe's own materials in `src/three/lamps.ts`, not as scene lights — so the terrain never pays for a wingtip lamp. Their glare is one instanced draw call.
* **Vendor chunks.** React and three.js are split into stable chunks, so a routine change does not invalidate both in the browser cache.

## Accessibility

* The drawn and rendered views are `aria-hidden`; every value they show is also published as text in the annunciator strip and the readouts beneath them.
* Seats are real buttons with pressed state, the radio log is a polite live region, and zoom and pan are fully keyboard-driven.
* **Reduced motion calms the ride rather than parking it.** Readings ease more slowly, the camera drifts half as far, and the departure board still turns its flaps; shakes and flashes are off. The ground keeps going past, because a train that is not moving is not running.
