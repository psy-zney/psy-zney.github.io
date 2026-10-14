<!-- CODEGRAPH_START -->
## CodeGraph

If `.codegraph/` exists at the repository root, use `codegraph_explore` or
`codegraph explore "<symbols or question>"` before grep/find or reading code.
If it does not exist, skip CodeGraph; do not create an index automatically.
<!-- CODEGRAPH_END -->

## Preserve the current experience across model changes

Read `docs/feature-preservation.vi.md` before changing this portfolio. The
current working tree is the user's baseline, including unfinished and
uncommitted features. Preserve it when refining appearance or refactoring.

- Keep the Virgo journey, wave page loader, black-hole workspace entry,
  one scroll-driven sentence per angle, a true 180-degree camera orbit/reversal,
  varied sentence positions and automatic scroll entry/exit for the showcase,
  curved product gallery, continuous Web experiences → Apps & tools chapters,
  optional chapter shortcuts, live preview, case-study
  return routes, mute, keyboard/pointer/wheel navigation and recovery states.
- Keep dense lists out of the spatial reading view; retain archive/CV access
  through its quiet links. Do not restore the central Manager placeholder.
- Keep all nine supplied product destinations, ten case studies, five CVs,
  and the existing workspace/OS/keyboard/GIF interactions.
- Use the existing checks as regression requirements. When the user changes
  a feature, update its checks and the preservation document in the same task.
  Do not remove a failing assertion just to make a command pass.
- Run `pnpm run check` after changes. For gallery, loader, portal, routing or
  layout changes, also run `pnpm run check:ui` and inspect its screenshots.
- The source GLB and authentic preview assets are user-owned content; visual
  polish must not replace them with fabricated images or automatic downloads.

See `docs/feature-preservation.vi.md` for commands, test coverage and browser
limitations. Static checks do not prove visual quality or physical audio/touch
behavior. Do not claim those checks were performed without evidence.
