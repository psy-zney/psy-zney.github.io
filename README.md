# Lê Quang Khánh / zney — Developer portfolio

React/TypeScript portfolio with a Virgo journey, nine product destinations,
ten project case studies, three source-verified HTML CVs and the original
interactive 3D workspace.

## Run

```sh
pnpm install
pnpm dev
pnpm run check
pnpm run check:ui
pnpm run check:audit
pnpm run check:cache # Run after a production build; Chromium required
```

Mobile uses a native vertical reader; product navigation follows the full
content and actions. Desktop keeps the two-area showcase. A preview-window
passage connects the black hole to the products. The contact page provides
email/copy, GitHub, LinkedIn, CV and a return to the universe.

Read the [current behavior map](docs/feature-preservation.vi.md) and
[flight behavior](docs/straight-flight-contract.vi.md) before journey changes.
These document working functionality, not immutable visual templates. New
owner requests can change content, layout and motion with relevant validation.

- [Content allocation](docs/content-allocation.vi.md)
- [Content provenance](docs/portfolio-content-sources.md)
- [Preview provenance](docs/product-preview-sources.md)
- [Celestial asset attribution](docs/celestial-asset-sources.md)
- [CV conversion and sources](docs/cv-update.vi.md)
- [React Bits source and licensing](docs/react-bits.vi.md)

Generated builds, test screenshots/logs and tool caches are ignored. Current
QA evidence lives in `artifacts/final-audit/`; old rejected design screenshots
and superseded scripts were removed. Browser emulation does not establish
physical touch, sensor, perceived audio quality or device FPS.

Each GitHub Pages build embeds the pushed commit SHA. On the next visit after
deployment, the site clears origin Cache Storage and replaces its worker;
public asset URLs receive that deployment version. HTML/version metadata use
the network, with a one-reload guard that preserves the current query and hash.
An inline gate can recover cached HTML even if its old JS bundle was removed.
Preferences and cookies remain intact, and unchanged deployments retain their
HTTP asset cache. Dev mode does not install the worker. The browser's global
HTTP cache cannot be erased by page JavaScript; versioned URLs avoid stale
responses ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)).
Deployment cache tests and production screenshots are in `artifacts/deployment-cache/`.
