# Local Basis transcoder

`basis_transcoder.js` and `basis_transcoder.wasm` are copied from the installed Three.js 0.185.1 distribution (`examples/jsm/libs/basis`). They are served locally by `KTX2Loader`; no runtime CDN is required. The Meshopt decoder is bundled from the same Three.js distribution.

Basis Universal is Apache-2.0 licensed; see LICENSE and https://github.com/BinomialLLC/basis_universal. The offline encoder used by `scripts/workspace-ktx.mjs` is pinned to commit `99f52d63aa6799cbdaecfe977111dc5ec3b31d47`, checked against SHA-256 and cached outside version control in `scripts/.cache/basis`.

KTX2Loader detects supported ASTC/BC/ETC formats and transcodes accordingly; its RGBA fallback is included in the conservative texture budget. Generated GLBs and manifest hashes are produced with `pnpm prepare:workspace`.
