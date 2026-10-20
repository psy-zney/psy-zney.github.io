# Project instructions

## Locate code

If `.codegraph/` exists, use `codegraph_explore` or `codegraph explore` before
searching or reading code. Do not create an index automatically.

## Preserve the working experience

Read `docs/feature-preservation.vi.md` before edits. The current working tree,
including unfinished and uncommitted features, is the baseline.
Read `docs/straight-flight-contract.vi.md` before journey/transition changes:
transit stays straight; local reading orbits remain scroll-driven.

Keep authentic assets, product destinations, case studies, CVs, workspace
interactions, navigation and recovery behavior described in the baseline.
Do not replace user-owned GLB or previews with fabricated/downloaded content.
When behavior changes, update its checks and the baseline in the same task.
Do not weaken assertions to hide regressions.

## Validate

Run `pnpm run check` after changes. For gallery, loader, portal, routing or
layout changes, also run `pnpm run check:ui` and inspect screenshots.
Report failures and limits accurately; static checks do not prove visual
quality, physical audio/touch behavior or device performance.
