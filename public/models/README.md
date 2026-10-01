# Railway models

Loaded by `src/three/RailWorld.ts`. All are converted from the models supplied for the railway:

| File | From | Notes |
| :-- | :-- | :-- |
| `train-lead.glb` | `Train station.obj`, the metro car with cab | Forward is −Z, rail top is y = 0, metres (scaled 1.435 / 5.3 from the model's own gauge). Material names are kept; the livery is applied at runtime by name (`Body`, `Metal`, `GLASS`…). |
| `train-carriage.glb` | the same car | Rear half mirrored about the car's middle, so it has no cab. |
| `track.glb` | the station's rails and sleepers | One 14.7748 m tile (24 sleepers); the scene tiles it along the line near the camera. |
| `station.glb` | the platform side of the station | Third-party signage textures removed; the scene draws its own signs. Scaled ×1.75 at runtime. |
| `billboard.glb` | `BILLBOARD.blend` | Transforms baked; textures downscaled to 512 px. The ad face is drawn on a plane of its own over the panel. |
| `town-block.glb` | `MyBuild.obj`, two shop buildings | The Market Town's shopfronts. Y up, ground at y = 0, metres. Materials merged to `Glass`, `Light`, `Sign`, `Fascia` and the walls; small parts dropped and the rest decimated (130k → 76k faces). The shop's brand panels are plain cyan fascia. Built by `scripts/models/town-block.py`. |
| `bridge.glb` | `lowpoly-manhattan-bridge.glb` | The City's river bridge. Merged to one mesh, repainted one steel material. Deck top at y = 18.6, waterline about y = 2; the scene scales it ×2.2. |

`../textures/ground-color.jpg` and `ground-normal.jpg` are the supplied ground textures, downscaled to 1024 px: the town's and the city's paving, with the street grid drawn over them per pixel.

The reference photo that was mapped onto the car body in the source (a real operator's train, with its logo) is deliberately not included.

To rebuild them, see `scripts/models/README.md`.

`../textures/sky-hdri.hdr` is the supplied HDRI, Poly Haven's *Bell Park Pier* (CC0), averaged down from 4096 × 2048 to 1024 × 512 and written as run-length RGBE. The scene uses it for reflections and image-based light only; the sky drawn is the visitor's own.
