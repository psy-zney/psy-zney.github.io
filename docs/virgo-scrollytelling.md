# Virgo scrollytelling implementation

This is the live React/Three.js portfolio at `/`. The component structure is:

```text
App.tsx
└── VirgoPortfolio.tsx       HTML overlays, chapter track, Lenis, project/CV dialog
    ├── VirgoPortfolio.css   Fixed layers, mobile layout, reduced motion
    ├── virgoStations.ts     Four named stations and their artistic 3D positions
    └── VirgoScene.tsx       Lazy-loaded WebGL scene and camera timeline
```

The 7 × `112dvh` track is the browser's actual scroll surface: a text-free constellation reveal, the home introduction, Spica, two consecutive Porrima chapters, Vindemiatrix, and Zavijava. The second Porrima chapter reveals the remaining seven projects while the camera and focus stay at the same star. The `<Canvas>` and seven overlay sections remain fixed on top. The canvas ignores pointer events, while only links/buttons in the overlay accept them. A small HTML hit target follows the projected position of Zavijava; clicking it opens the 3D workspace. There are no `OrbitControls` or custom wheel listeners.

The one GSAP timeline spans the track from `top top` to `bottom bottom`. It has six content legs but only five spatial flights: the fourth leg is a deliberate Porrima hold. Moving legs sample a `CatmullRomCurve3` into sixteen `camera.position` tweens; a second tween moves the camera's `lookAt` target and widens the field of view near a station. The opening alternates thirty-two slow reveal beats so each star lights before its next connecting ray is drawn. The named star in focus emits two staggered signal rings. Small liquid-glass HTML cards alternate between the left and right sides and use a short transform/opacity hand-off; the two Porrima cards instead slide horizontally while the camera holds. Porrima has one orbiting 3D planet for each project, with varied orbital planes, speeds, rings, and moons; Vindemiatrix has one for each skill. Hovering or focusing an HTML row brightens its planet. To adjust flight pacing, edit `travel` and the overlay offsets in `CameraFlight`; to change the route, edit `CAMERA_STOPS` and station positions.

```tsx
const timeline = gsap.timeline({
  scrollTrigger: {
    trigger: content,
    scroller,
    start: "top top",
    end: "bottom bottom",
    scrub: reducedMotion ? true : 1,
  },
});

for (let step = 1; step <= 16; step++) {
  const point = path.getPointAt((routeLeg - 1 + step / 16) / 5);
  timeline.to(camera.position, {
    x: point.x, y: point.y, z: point.z,
    duration: travel / 16,
  }, begin + (step - 1) * travel / 16);
}
```

Lenis updates on the GSAP ticker, and its scroll event calls `ScrollTrigger.update`. On reduced-motion devices, Lenis is skipped; native scrolling still drives the timeline. The stars are simple additive sprites and small spheres, the background is a single points geometry, and every constellation edge uses a low-opacity `LineBasicMaterial` rendered behind the planets. Geometry, materials, and texture are disposed when the scene unmounts. The WebGL code is loaded separately from the initial HTML overlay.

Star positions are a designed Virgo motif, not a precise projection of right ascension/declination. Spica, Porrima, Vindemiatrix, and Zavijava are named Virgo stars in the IAU [first](https://www.iau.org/static/science/scientific_bodies/working_groups/280/WGSN_bulletin1.pdf) and [second](https://www.iau.org/static/science/scientific_bodies/working_groups/280/WGSN_bulletin2.pdf) name bulletins. For an astronomical map, derive the coordinates from an authoritative catalogue and project them before configuring the camera.

Reference APIs: [GSAP ScrollTrigger `scrub`](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), [Three.js `CatmullRomCurve3`](https://threejs.org/docs/pages/CatmullRomCurve3.html), and [Lenis + ScrollTrigger synchronization](https://github.com/darkroomengineering/lenis/blob/main/README.md#gsap-scrolltrigger).

Run `pnpm run dev` to inspect the flight, `pnpm run build` for TypeScript and production bundling, and `pnpm run check:portfolio` for route/content smoke checks. Check wheel, touch, keyboard navigation, and the `#/project/...` or `#/cv/...` deep links in a browser, because a static render cannot verify WebGL animation.
