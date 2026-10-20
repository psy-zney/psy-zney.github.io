# Celestial textures

Source and author: [Solar System Scope / INOVE](https://cloud.solarsystemscope.com/textures/).
License: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).
Retrieved 20 October 2026. Source files: `2k_earth_daymap.jpg`, `2k_jupiter.jpg`,
`2k_moon.jpg`, `2k_mars.jpg`, `2k_earth_clouds.jpg`, `8k_stars_milky_way.jpg`.

Local derivatives in `public/img/celestial/`: 2048 and 1024 pixel WebP maps.
The archived Solar System Scope sky uses 4096 pixels on desktop and 2048 on
phone, downsampled from native 8K. The active intro and journey now use the
owner's main.glb sky. Rebuild the archived asset with
`node scripts/prepare-celestial-assets.mjs milkyway`.
Cloud brightness is used as the opacity map of a separate white cloud layer. Other maps
are resized/compressed without painted additions. Reproduce with
`node scripts/prepare-celestial-assets.mjs`.

These are artistic planetary textures based on observation data, with some
filled terrain and adjusted colors as documented by their publisher. They do
not represent the actual planets around Virgo stars. Original portfolio GLBs
and product previews are retained. Generated planetary maps remain the fallback
when these optional local textures fail to load. Attribution is also available
from the portfolio's image credits.

The photosphere also uses Solar System Scope's `2k_sun.jpg`, resized to
`sun-2048.webp` / `sun-1024.webp`, under the same attribution and CC BY 4.0.
Original shader work uses multiscale granulation, limb darkening and independent
coronal geometry. Research references: [NASA solar surface features](https://solarscience.msfc.nasa.gov/feature1.shtml)
and [Cosmos Museum Sun](https://github.com/CosmosMuseum/cosmos-museum-sun).
No source code from the reference portfolios is copied into these shaders.

Owner asset: `public/model/main.glb` (SHA-256 recorded in
`public/model/universe-only.json`). A sky-only derivative was prepared in Blender
5.2. Its original texture is retained, downsampled from 8192×4096 to 4096×2048,
then WebP compressed. Furniture is excluded only from the derivative. The
source asset, workspace derivatives and authentic product previews are unchanged.

Original tunnel media is **not yet available**. Browser reports that local browser
use is disabled in Work settings, so DevTools inspection of the supplied Bilal
page has not been performed. `public/media/intro-source.json` has a null URL;
the application never substitutes the supplied screen recording.
