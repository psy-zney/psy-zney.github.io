import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

// Render smoke checks, not a replacement for real-browser layout/interaction QA.
const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
globalThis.window = {
  location: { hash: "" },
  matchMedia: () => ({ matches: false }),
};
try {
  const { projects, capabilities } = await server.ssrLoadModule(
    "/src/data/portfolio.ts",
  );
  const {
    journey,
    chapterForHash,
    flightGeometry,
    signalSequence,
    advanceSignal,
  } = await server.ssrLoadModule("/src/data/journey.ts");
  for (const chapter of journey) {
    assert.equal(chapterForHash(`#/${chapter.id}`)?.id, chapter.id);
    const { path, stops } = flightGeometry(chapter.points);
    assert(path.startsWith("M"));
    assert.equal(stops[0], 0);
    assert(Math.abs(stops.at(-1) - 1) < 1e-9);
    assert(stops.every((stop, i) => !i || stop >= stops[i - 1]));
  }
  assert.equal(chapterForHash("#/skills/systems")?.id, "skills");
  assert.equal(chapterForHash("#/unmapped"), undefined);
  for (let note = 0; note < 6; note++) {
    let step = 0;
    for (const star of signalSequence(note))
      step = advanceSignal(step, star, note);
    assert.equal(step, 4, "Correct signal must unlock the note");
    assert.equal(
      advanceSignal(2, (signalSequence(note)[2] + 1) % 4, note),
      0,
      "Wrong signal must reset",
    );
  }
  const { IntroPage } = await server.ssrLoadModule(
    "/src/components/IntroPage.tsx",
  );
  const { ResumeContent } = await server.ssrLoadModule(
    "/src/components/ResumePage.tsx",
  );
  const { ProjectShelf } = await server.ssrLoadModule(
    "/src/components/ProjectShelf.tsx",
  );
  const ids = new Set(projects.map((p) => p.id));
  assert.equal(ids.size, projects.length, "Project IDs must be unique");
  for (const skill of capabilities) {
    for (const id of skill.projects)
      assert(ids.has(id), `Missing project ${id}`);
  }
  for (const project of projects) {
    assert(
      capabilities.some((skill) => skill.projects.includes(project.id)),
      `${project.id} needs a skill connection`,
    );
    for (const field of [
      "role",
      "headline",
      "summary",
      "problem",
      "decision",
      "takeaway",
    ]) {
      for (const lang of ["vie", "eng"])
        assert(
          project[field][lang].trim(),
          `${project.id}.${field}.${lang} is empty`,
        );
    }
  }
  let rendered = 0;
  for (const lang of ["vie", "eng"]) {
    for (const hash of [
      "",
      ...journey.map((chapter) => `#/${chapter.id}`),
      "#/skills/systems",
      "#/unmapped",
      ...projects.map((p) => `#/project/${p.id}`),
      "#/project/unknown",
      "#/cv/web",
      "#/cv/mobile",
    ]) {
      window.location.hash = hash;
      const html = renderToStaticMarkup(
        React.createElement(IntroPage, {
          lang,
          onToggleLang() {},
          onEnterWorkspace() {},
        }),
      );
      for (const [, id] of html.matchAll(/href="#\/project\/([^"]+)"/g))
        assert(ids.has(id), `Broken project link: ${id}`);
      for (const [, id] of html.matchAll(/href="#\/skills\/([^"]+)"/g))
        assert(
          capabilities.some((skill) => skill.id === id),
          `Broken skill link: ${id}`,
        );
      assert(!html.includes("undefined"), `Undefined content at ${hash}`);
      assert(!html.includes("\ufffd"), `Encoding issue at ${hash}`);
      if (!hash.startsWith("#/cv/"))
        assert.equal(
          (html.match(/<h1[ >]/g) || []).length,
          1,
          `Expected one main heading: ${hash}`,
        );
      if (hash === "") {
        assert.equal(
          (html.match(/class="project-card reveal"/g) || []).length,
          0,
          "Home must remain a separate page, not the full project list",
        );
        for (const chapter of journey.slice(1))
          assert(html.includes(`href="#/${chapter.id}"`));
        assert(
          html.includes('href="#/cv/web"') &&
            html.includes('href="#/cv/mobile"'),
        );
      }
      if (hash === "#/projects") {
        assert.equal(
          (html.match(/class="project-card reveal"/g) || []).length,
          projects.length,
        );
        for (const repo of ["chemistryLAB", "Security", "LuckyFood"]) {
          assert(
            html.includes(`href="https://github.com/psy-zney/${repo}"`),
            `${repo} needs a visible GitHub link`,
          );
        }
      }
      if (chapterForHash(hash)) {
        const page = chapterForHash(hash);
        for (const other of journey.filter((item) => item.id !== page.id)) {
          assert(
            !html.includes(`id="${other.id}"`),
            `Other chapter ${other.id} leaked into ${page.id}`,
          );
        }
        assert(
          html.includes("signal-dialog"),
          "Discovery interaction must be available",
        );
        assert(
          !html.includes("Một cậu bé may mắn") && !html.includes("A lucky boy"),
          "Personal note must remain concealed until discovery",
        );
      }
      if (hash === "#/project/unknown" || hash === "#/unmapped")
        assert(html.includes("404 / LOST IN SPACE"));
      rendered++;
    }
    const shelf = renderToStaticMarkup(
      React.createElement(ProjectShelf, { lang, onClose() {} }),
    );
    assert.equal(
      (shelf.match(/href="#\/project\//g) || []).length,
      projects.length,
    );
  }
  assert(
    (await stat(new URL("../public/img/chemistry-lab-3d.png", import.meta.url)))
      .size > 100_000,
  );
  for (const file of [
    "Le_Quang_Khanh_CV_Web_FullStack.md",
    "Le_Quang_Khanh_CV_Mobile.md",
  ]) {
    const content = await readFile(
      new URL(`../public/file/${file}`, import.meta.url),
      "utf8",
    );
    const html = renderToStaticMarkup(
      React.createElement(ResumeContent, { content }),
    );
    assert.equal((html.match(/<h1>/g) || []).length, 1);
    assert(
      html.includes("<table>") &&
        html.includes("<ul>") &&
        html.includes("mailto:lequangkhanh295@gmail.com"),
    );
  }
  const unsafe = renderToStaticMarkup(
    React.createElement(ResumeContent, {
      content: "# CV\n[bad](javascript:alert)\n<script>alert(1)</script>",
    }),
  );
  assert(!unsafe.includes('href="javascript:') && !unsafe.includes("<script>"));
  console.log(
    `PASS: ${rendered} bilingual route renders, ${projects.length} projects and skill links, workspace links, both CVs, and safe Markdown rendering.`,
  );
} finally {
  await server.close();
  delete globalThis.window;
}
