# Portfolio content notes

Updated 2026-09-16. These notes describe the evidence used for the bilingual project stories. They are editorial notes, not displayed in the site.

## Sources

The two existing CVs in `public/file` supply education, contact details, project dates, Cloud POS team contribution, Security Core, Mandy Crimson, and Micro4Nerds. Local Security and Mandy Crimson repositories were also available for context. Micro4Nerds and Cloud POS were not found in the public account listing; do not invent source-code links for them.

Five public repositories were shallow-cloned into a temporary research directory. Source code was inspected without executing these applications.

Chemistry Lab 3D was also reviewed from the owner's existing local repository at snapshot `d15a246` and the [public GitHub README](https://github.com/psy-zney/chemistryLAB). Its case study reflects the Unity/C# desktop simulation, curated-first reaction rules, sample staging, and safety consequences. The portfolio's gameplay image is copied from that repository's `docs/gameplay/desktop-lab-3d.png` and kept locally at `public/img/chemistry-lab-3d.png`. The linked interactive compound-matrix viewer is documentation; the desktop game itself is not presented as a web demo.

| Repository | Snapshot | Evidence used |
| --- | --- | --- |
| [BeatSync](https://github.com/psy-zney/beatsync) | `89f826a` | README architecture, Go memory monitor and storage client, MIT license |
| [SentinelLAN](https://github.com/psy-zney/SentinelLAN) | `0759489` | README, agent command allow-list and simulation defaults, HMAC verifier |
| [LuckyFood](https://github.com/psy-zney/LuckyFood) | `ffeb9aa` | README, AuthProvider with Google integration disabled |
| [Zney Backup](https://github.com/psy-zney/BackupData) | `046b2c1` | README, .NET 8 WPF project, BackupRestoreService staging and SHA-256 verification |
| [Study Cabin](https://github.com/psy-zney/LearningEnglish) | `39fc02f` | README, Prisma seed preserving review state and archiving retired content |

## Corrections to the previous portfolio

- BeatSync's current backend is Go with a Rust extractor. Bun remains tooling; it is not described as the current backend.
- BeatSync is an adaptation of freeman-jiang's open-source project. Attribution is visible in the case study and Web CV; do not describe the entire project as original authorship.
- LuckyFood's current Google Sign-In implementation is disabled. Its local account flow is described separately.
- SentinelLAN lock/isolation behavior is simulated by default. The story does not imply production endpoint protection or measured security guarantees.
- No fabricated performance metrics, adoption figures, business results, or employment history were added.
- Narrative takeaways are interpretations of the documented architecture. They are not user testimonials or claims of measured outcomes.

## Flow and maintenance

The journey now has five separate pages: `#/home` (Virgo), `#/story` (Lyra), `#/projects` (Orion), `#/skills` (Cygnus), and `#/contact` (Cassiopeia). Constellations outside Virgo are stylized sketches, not astronomical charts. Previous/next links and a five-star navigation connect the pages. Each case study links back to projects, to its capabilities, to contact, and to another case study. Each capability links to the projects supporting it. The original 3D workspace is reachable from home and story.

Project content and skill relationships live in `src/data/portfolio.ts`. Both languages use the same records. Project filters derive counts from the data. Hash routes work on GitHub Pages without server routing.

The three repositories the owner highlighted in the follow-up — Chemistry Lab 3D, Security Core, and LuckyFood — have case studies and direct GitHub links on the project listing. Their links also appear in the 3D bookshelf. All three are reachable from the constellation.

- `#/project/:id`: project story
- `#/skills/:id`: specific capability
- `#/cv/web` and `#/cv/mobile`: readable CV, source download, browser print/PDF
- `#/workspace`: existing 3D experience

The Web and Mobile CV files were updated for the corrections above. Preserve role scope and attribution when updating them again. Live demo links were retained from the existing site/README; their availability was not verified during this change.

## Personal fragments — 2026-09-18

The owner supplied autobiographical notes in `story.md` and requested small, concealed Easter eggs. Six bilingual fragments in `src/data/fieldNotes.ts` preserve the math result and exam reversal, chemistry motivation, 2023 physics result, limited early exposure to computers, university learning journey, and “lucky boy” outlook. These are the owner's recollections, not independently verified achievements. They stay outside the professional introduction and CVs. The original scratch file was removed after adaptation, as requested in that file.

The unobtrusive 29.5 signal at each chapter's end opens an accessible native dialog. Four correct star selections unlock one fragment; a wrong selection resets progress. Another frequency requires another sequence. Note text is dynamically imported only on unlock. This is a discovery mechanic, not encryption or access control.

Verification: `check:portfolio` now covers 42 bilingual route renders, chapter isolation, deep skill links, missing pages, flight geometry and signal state transitions, plus existing project/CV checks. Production build passes. No connected browser was available for visual, touch, keyboard or frame-rate QA; those checks remain necessary on a real device.
