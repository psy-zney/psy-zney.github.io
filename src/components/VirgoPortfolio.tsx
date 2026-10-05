import { lazy, Suspense, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowDown, ArrowUpRight, Github, Linkedin, X } from "lucide-react";
import gsap from "gsap";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { capabilities, projects, type Language } from "../data/portfolio";
import { ProjectDocument } from "./documents/ProjectDocument";
import { navigateHash, parsePublicDocumentRoute } from "../utils/appRoutes";
import "./documents/Documents.css";
import { ResumePage } from "./ResumePage";
import { VIRGO_STARS } from "../data/virgoStations";
import { FLIGHT_MOTION, navigationDuration, scrollOffsetForPosition, smooth } from "../data/virgoFlight";
import { FLIGHT_TRACK_VH } from "../data/virgoSpace";
import { NARRATIVE_BEATS, advanceStoryGesture } from "../data/virgoNarrative";
import { OPENING_EDGES, OPENING_STARS } from "../data/virgoOpening";
import { VirgoIntroFracture } from "./VirgoIntroFracture";
import "./VirgoPortfolio.css";
import { motionStyle } from '../data/motionTokens';

const VirgoScene = lazy(() => import("./VirgoScene").then(module => ({ default: module.VirgoScene })));

const CHAPTERS = ["cosmos", "home", "story", "projects", "projects-more", "skills", "contact"] as const;

function chapterFromHash(hash: string) {
  const route = hash.replace(/^#\//, "").split("/")[0];
  if (route === "project") return 3;
  if (route === "cv") return 6;
  return Math.max(0, CHAPTERS.indexOf(route as typeof CHAPTERS[number]));
}

function stationFromChapter(chapter: number) {
  if (chapter < 2) return null;
  if (chapter === 4) return 1;
  return chapter > 4 ? chapter - 3 : chapter - 2;
}

export function VirgoPortfolio({ lang, onPrepareWorkspace, onEnterWorkspace }: {
  lang: Language;
  onToggleLang?: () => void;
  onPrepareWorkspace?: () => void;
  onEnterWorkspace: () => void;
}) {
  const t = (vi: string, en: string) => lang === "vie" ? vi : en;
  const pageRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const portalRef = useRef<HTMLButtonElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const interactionPaused = useRef(false);
  const navigatedHash = useRef<string | null>(null);
  const navigationTarget = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [hash, setHash] = useState(() => window.location.hash);
  const [active, setActive] = useState(() => chapterFromHash(window.location.hash));
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const projectHoverTimer = useRef(0), projectHoverCandidate = useRef<number | null>(null);
  const hoverProject = useCallback((index: number | null) => {
    if (projectHoverCandidate.current === index) return;
    projectHoverCandidate.current = index; clearTimeout(projectHoverTimer.current);
    if (index === null) setSelectedProject(null);
    else projectHoverTimer.current = window.setTimeout(() => setSelectedProject(index),120);
  }, []);
  useEffect(() => () => clearTimeout(projectHoverTimer.current), []);
  const [selectedSkill, setSelectedSkill] = useState(0);
  const [selectedOrigin, setSelectedOrigin] = useState<number | null>(null);
  const originSteps = [
    { title: 'Need', vie: 'Tìm hiểu vấn đề người dùng cần giải quyết.', eng: 'Understand the problem people need to solve.' },
    { title: 'Build', vie: 'Biến nhu cầu thành công cụ có thể dùng.', eng: 'Turn that need into a useful tool.' },
    { title: 'Connect', vie: 'Kết nối giao diện, dữ liệu và hệ thống.', eng: 'Connect the interface, data and systems.' },
    { title: 'Learn', vie: 'Học từ những quyết định trong dự án.', eng: 'Learn from the decisions in each project.' },
  ];
  const [entering, setEntering] = useState(false);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [readingFocus, setReadingFocus] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const documentRoute = parsePublicDocumentRoute(hash);
  const project = documentRoute?.kind === 'project' ? projects.find(item => item.id === documentRoute.projectId) : undefined;
  const resumeTrack = documentRoute?.kind === 'resume' ? documentRoute.track : undefined;
  const allProjects = documentRoute?.kind === 'archive';
  const missingDocument = documentRoute?.kind === 'missing';
  const showDialog = !!documentRoute && documentRoute.kind !== 'capability';
  const returnHash = useRef(hash.startsWith('#/cv') ? '#/contact' : hash.startsWith('#/skills') ? '#/skills' : '#/projects');
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => { if (!showDialog && hash) returnHash.current = hash; }, [hash, showDialog]);
  useEffect(() => { if (documentRoute?.kind === 'capability') setSelectedSkill(documentRoute.index); }, [hash]);
  const selectSkill = (index: number) => { setSelectedSkill(index); const next = `#/skills/${capabilities[index].id}`; navigatedHash.current = next; navigateHash(next, true); };
  interactionPaused.current = showDialog || entering || readingFocus;
  const onChapter = useCallback((index: number) => setActive(current => current === index ? current : index), []);
  useEffect(() => {
    const overlay = overlayRef.current;
    const sync = () => setReadingFocus(!!overlay?.querySelector('.virgo-bare :focus-visible'));
    const out = () => queueMicrotask(sync);
    overlay?.addEventListener('focusin', sync); overlay?.addEventListener('focusout', out);
    return () => { overlay?.removeEventListener('focusin', sync); overlay?.removeEventListener('focusout', out); };
  }, []);
  const enterWorkspace = () => {
    if (entering) return;
    onPrepareWorkspace?.();
    setEntering(true);
  };
  const scrollToChapter = useCallback((index: number, immediate = false) => {
    const scroller = scrollerRef.current;
    const content = contentRef.current;
    const target = content?.children[index] as HTMLElement | undefined;
    if (!scroller || !content || !target) return;
    if (lenisRef.current) {
      navigationTarget.current = immediate ? null : index;
      lenisRef.current.scrollTo(target.offsetTop, {
        immediate,
        lerp: 0,
        duration: navigationDuration((target.offsetTop - scroller.scrollTop) / (scroller.clientHeight * 1.32)),
        easing: value => smooth(0, 1, value),
        onComplete: () => { if (navigationTarget.current === index) navigationTarget.current = null; },
      });
    } else {
      navigationTarget.current = null;
      scroller.scrollTo({ top: target.offsetTop, behavior: "instant" });
    }
  }, []);

  useEffect(() => {
    if (!entering) return;
    const timer = window.setTimeout(onEnterWorkspace, reducedMotion ? 0 : (FLIGHT_MOTION.exitDuration + .10) * 1000);
    return () => window.clearTimeout(timer);
  }, [entering, onEnterWorkspace, reducedMotion]);

  useEffect(() => {
    if (showDialog || entering) {
      navigationTarget.current = null;
      lenisRef.current?.scrollTo(scrollerRef.current?.scrollTop ?? 0, { immediate: true });
    }
  }, [showDialog, entering]);


  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReducedMotion(preference.matches);
    preference.addEventListener("change", change);
    return () => preference.removeEventListener("change", change);
  }, []);

  useEffect(() => {
    const page = pageRef.current;
    const scroller = scrollerRef.current;
    const content = contentRef.current;
    if (!page || !scroller || !content) return;
    let gesture = { direction: 0, at: -Infinity, destination: -1 };
    // Lenis advances on GSAP's ticker. The scene samples actual scrollTop inside
    // its render frame, avoiding a second ScrollTrigger scrub animation.
    if (!reducedMotion) {
      // The fixed reading panels and controls are siblings of the scroll track.
      // Receive their wheel events on the page as well as events on the scene.
      const lenis: Lenis = new Lenis({ wrapper: scroller, content, eventsTarget: page, lerp: FLIGHT_MOTION.scrollLerp, wheelMultiplier: FLIGHT_MOTION.wheelMultiplier, smoothWheel: true, syncTouch: false, virtualScroll: data => {
        if (interactionPaused.current) return false;
        const event = data.event;
        if (event.type !== "wheel" || event.ctrlKey || event.defaultPrevented || Math.abs(data.deltaY) < Math.abs(data.deltaX)) return true;
        if (event.target instanceof Element && event.target.closest("[data-lenis-prevent]")) return true;
        const direction = Math.sign(data.deltaY);
        if (!direction || Math.abs(data.deltaY) < 2) return false;
        if (event.cancelable) event.preventDefault();
        const progress = page.style.getPropertyValue("--flight-progress");
        const position = progress ? Number(progress) * 6 : 0;
        const offsets = Array.from(content.children, child => (child as HTMLElement).offsetTop);
        const inputDestination = scrollOffsetForPosition(gesture.destination, offsets);
        const externallyNavigated = navigationTarget.current !== null || gesture.destination >= 0 && Math.abs(lenis.targetScroll - inputDestination) > 2;
        if (externallyNavigated) gesture = { direction: 0, at: -Infinity, destination: -1 };
        const step = advanceStoryGesture(gesture, position, direction, performance.now());
        gesture = step.gesture;
        if (!step.accepted) return false;
        navigationTarget.current = null;
        // The invisible scroll track changes immediately; camera, words and
        // effects all follow the same paced, reversible render coordinate.
        lenis.scrollTo(scrollOffsetForPosition(gesture.destination, offsets), { immediate: true });
        return false;
      } });
      lenisRef.current = lenis;
      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      setReady(true);
      return () => {
        setReady(false);
        gsap.ticker.remove(tick);
        lenis.destroy();
        lenisRef.current = null;
      };
    }
    // Apply the same wheel speed across the scene and its fixed controls,
    // using immediate native scrolling when smooth motion is disabled.
    const wheel = (event: WheelEvent) => {
      if (interactionPaused.current || event.ctrlKey || event.defaultPrevented || Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
      if (event.target instanceof Element && event.target.closest("[data-lenis-prevent]")) return;
      const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? scroller.clientHeight : 1;
      event.preventDefault();
      const offsets = Array.from(content.children, child => (child as HTMLElement).offsetTop);
      const position = Number(page.style.getPropertyValue("--flight-progress") || 0) * 6;
      const step = advanceStoryGesture(gesture, position, Math.sign(event.deltaY * unit), performance.now());
      gesture = step.gesture;
      if (step.accepted) scroller.scrollTo({ top: scrollOffsetForPosition(gesture.destination, offsets), behavior: "instant" });
    };
    page.addEventListener("wheel", wheel, { passive: false });
    setReady(true);
    return () => {
      page.removeEventListener("wheel", wheel);
      setReady(false);
    };
  }, [reducedMotion]);

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const content = contentRef.current;
    if (!scroller || !content) return;
    let previousStep = (content.children[1] as HTMLElement).offsetTop;
    const resize = new ResizeObserver(() => {
      const step = (content.children[1] as HTMLElement).offsetTop;
      if (Math.abs(step - previousStep) < 1) return;
      // Preserve the current story beat when orientation or viewport height changes.
      const progress = scroller.parentElement?.style.getPropertyValue("--flight-progress");
      if (progress) {
        const destination = navigationTarget.current;
        const offsets = Array.from(content.children, child => (child as HTMLElement).offsetTop);
        const top = scrollOffsetForPosition(Number(progress) * 6, offsets);
        lenisRef.current?.resize();
        if (lenisRef.current) lenisRef.current.scrollTo(top, { immediate: true });
        else scroller.scrollTo({ top, behavior: "instant" });
        // Continue a menu flight after resize instead of leaving it halfway
        // between stations with the destination already in the URL.
        if (destination !== null) scrollToChapter(destination);
      }
      previousStep = step;
    });
    resize.observe(scroller);
    return () => resize.disconnect();
  }, [scrollToChapter]);

  useEffect(() => {
    if (!ready) return;
    const initialRoute = navigatedHash.current === null;
    const routeChanged = navigatedHash.current !== hash;
    navigatedHash.current = hash;
    const index = chapterFromHash(hash);
    const target = contentRef.current?.children[index] as HTMLElement | undefined;
    if (routeChanged && target && hash && Math.abs((scrollerRef.current?.scrollTop ?? 0) - target.offsetTop) > 2) {
      scrollToChapter(index, initialRoute || showDialog);
    }
    document.title = `${project?.name ?? (resumeTrack ? "CV" : "Virgo Portfolio")} | Lê Quang Khánh — zney`;
  }, [hash, project, ready, resumeTrack, showDialog, scrollToChapter]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (showDialog && !dialog.open) { previousFocus.current = document.activeElement as HTMLElement | null; dialog.showModal(); }
    if (!showDialog && dialog.open) { dialog.close(); if (previousFocus.current?.isConnected) previousFocus.current.focus({ preventScroll: true }); }
  }, [showDialog]);

  const closeDialog = () => { window.location.hash = returnHash.current; };
  const navigate = (index: number) => {
    const target = contentRef.current?.children[index] as HTMLElement | undefined;
    if (target && window.location.hash === `#/${CHAPTERS[index]}`) {
      scrollToChapter(index);
    }
  };

  return <div ref={pageRef} style={motionStyle} className={`virgo-page${active === 0 ? " virgo-is-opening" : ""}${entering ? " virgo-is-entering" : ""}${reducedMotion ? " virgo-reduced-motion" : ""}`}>
    <a className="virgo-skip" href="#/home" onClick={() => navigate(1)}>{t("Bỏ qua chòm sao mở đầu", "Skip constellation opening")}</a>
    <div ref={scrollerRef} className={`virgo-scroll${showDialog || entering ? " is-paused" : ""}`} aria-label={t("Cuộn để bay qua các ngôi sao", "Scroll to travel between stars")}>
      <div ref={contentRef} className="virgo-scroll-content" aria-hidden="true">
        {CHAPTERS.map((chapter, index) => <div className="virgo-scroll-step" key={chapter} data-chapter={chapter} style={{ height: `${FLIGHT_TRACK_VH[index]}dvh` }} />)}
      </div>
    </div>
    {ready && scrollerRef.current && contentRef.current && overlayRef.current && <Suspense fallback={null}><VirgoScene
      scroller={scrollerRef.current}
      content={contentRef.current}
      overlay={overlayRef.current}
      onChapter={onChapter}
      reducedMotion={reducedMotion}
      selectedProject={selectedProject}
      selectedSkill={selectedSkill}
      selectedOrigin={selectedOrigin}
      portalRef={portalRef}
      labelsRef={labelsRef}
      entering={entering}
      paused={showDialog}
      readingFocus={readingFocus}
      onPlanetHover={(index, skills) => { if (skills) { if (index !== null) setSelectedSkill(index); } else hoverProject(index); }}
      onPlanetSelect={(index, skills, section) => { if (skills) selectSkill(index); else window.location.hash = `#/project/${projects[index].id}${section ? '/' + section : ''}`; }}
    /></Suspense>}
    <div ref={labelsRef} className="virgo-orbit-labels" aria-hidden="true">{projects.map((item, index) => <div key={item.id} className={`virgo-orbit-label virgo-hologram-${item.category}`} style={{ "--hologram-color": item.color } as CSSProperties}>
      <span className="virgo-hologram-code">{String(index + 1).padStart(2, "0")} / {item.category}</span>
      <strong>{item.name}</strong><span>{item.headline[lang]}</span>
      <small>{item.stack.slice(0, 3).join(" · ")}</small>
    </div>)}</div>
    <div className="virgo-vignette virgo-vignette-right" aria-hidden="true" />
    <VirgoIntroFracture soundEnabled />

    <main ref={overlayRef} className="virgo-overlay">
      <svg className="virgo-reading-accent" aria-hidden="true"><path fill="none" stroke="#b9cde6" strokeWidth="1"/></svg>
      <div className="virgo-narrative" aria-label={t("Dẫn truyện", "Story")}>
        {NARRATIVE_BEATS.map((beat, index) => <p key={index} className={`virgo-narrative-line virgo-narrative-${beat.side} virgo-placement-${beat.placement}${index === 0 ? " virgo-identity" : ""}`} aria-hidden="true">
          <span>{beat[lang]}</span>
        </p>)}
      </div>
      <section className="virgo-overlay-panel virgo-cosmos" aria-label={t("Chòm sao Xử Nữ xuất hiện", "Virgo constellation appearing")} aria-hidden={active !== 0}>
      </section>
      <section className="virgo-overlay-panel virgo-panel-center virgo-prologue-hero" aria-labelledby="virgo-home-title" aria-hidden={active !== 1}>
        <h1 className="virgo-sr-only" id="virgo-home-title">Lê Quang Khánh — Portfolio</h1>
      </section>

      {/* Keep the reading area on the side opposite the focused star. */}
      <section className="virgo-overlay-panel virgo-panel-right virgo-bare-chapter" aria-labelledby="virgo-about-title" aria-hidden={active !== 2}>
        <div className="virgo-bare">
          <p className="virgo-bare-label">01 / SPICA · {t("GIỚI THIỆU", "ABOUT ME")}</p>
          <h2 className="virgo-sr-only" id="virgo-about-title">{t("Giới thiệu", "About me")}</h2>
          <p className="virgo-station-caption">{t("Mỗi dự án bắt đầu từ một vấn đề thực tế.", "Every project starts with a practical problem.")}</p>
          <div className="virgo-bare-facts">
            <span><small>{t("Đang học", "Studying")}</small><strong>UEH · IT</strong></span>
            <span><small>{t("Tập trung", "Focus")}</small><strong>{t("Web và hệ thống", "Web & systems")}</strong></span>
            <span><small>{t("Dự kiến", "Expected")}</small><strong>08 / 2027</strong></span>
          </div>
          <div className="virgo-origin-steps" aria-label={t('Các bước làm dự án','How I build')}>{originSteps.map((step,index) => <button key={step.title} aria-pressed={selectedOrigin === index} onMouseEnter={() => setSelectedOrigin(index)} onFocus={() => setSelectedOrigin(index)} onClick={() => setSelectedOrigin(index)} onMouseLeave={() => setSelectedOrigin(null)}>{step.title}</button>)}</div>
          <p className="virgo-origin-description" aria-live="polite">{selectedOrigin === null ? '' : originSteps[selectedOrigin][lang]}</p>
        </div>
      </section>

      {/* CHAPTER 3 — PROJECTS (Porrima) */}
      <section className="virgo-overlay-panel virgo-panel-left virgo-bare-chapter" aria-labelledby="virgo-projects-title" aria-hidden={active !== 3}>
        <div className="virgo-bare">
          <p className="virgo-bare-label">02 / PORRIMA · {t("DỰ ÁN", "PROJECTS")}</p>
          <h2 className="virgo-sr-only" id="virgo-projects-title">{t("Dự án", "Projects")}</h2>
          <div className="virgo-projects-list">
            {projects.slice(0, 3).map((item, index) => <a key={item.id} href={`#/project/${item.id}`} className="virgo-project-link"
              onMouseEnter={() => hoverProject(index)} onFocus={() => setSelectedProject(index)} onMouseLeave={() => hoverProject(null)}>
              <span className="virgo-row-star" aria-hidden="true" style={{ "--star-color": item.color } as CSSProperties}>●</span>
              <span className="virgo-project-copy"><strong>{item.name}</strong><span>{item.headline[lang]}</span></span>
              <small>{item.year} · {item.category}</small><ArrowUpRight size={17} />
            </a>)}
          </div>
          <a className="virgo-more virgo-more-scroll" href="#/projects-more" onClick={() => navigate(4)}>{t(`Cuộn tiếp · ${projects.length - 3} dự án còn lại`, `Keep scrolling · ${projects.length - 3} more projects`)} <ArrowDown size={15} /></a>
          <p className="virgo-orbit-caption">{selectedProject === null ? t(`${projects.length} hành tinh dự án đang quay`, `${projects.length} projects in orbit`) : `${String(selectedProject + 1).padStart(2, "00")} / ${projects[selectedProject].name}`}</p>
        </div>
      </section>

      {/* CHAPTER 4 — PROJECTS MORE (Porrima outer) — top-left */}
      <section className="virgo-overlay-panel virgo-panel-left virgo-projects-more-panel virgo-bare-chapter" aria-labelledby="virgo-projects-more-title" aria-hidden={active !== 4}>
        <div className="virgo-bare">
          <p className="virgo-bare-label">02B / PORRIMA · {t("DỰ ÁN KHÁC", "MORE PROJECTS")}</p>
          <h2 className="virgo-sr-only" id="virgo-projects-more-title">{t("Dự án khác", "More projects")}</h2>
          <div className="virgo-projects-more-list">
            {projects.slice(3).map((item, index) => {
              const projectIndex = index + 3;
              return <a key={item.id} href={`#/project/${item.id}`} onMouseEnter={() => hoverProject(projectIndex)} onFocus={() => setSelectedProject(projectIndex)} onMouseLeave={() => hoverProject(null)}>
                <span className="virgo-row-star" aria-hidden="true" style={{ "--star-color": item.color } as CSSProperties}>●</span>
                <strong>{item.name}</strong><small>{item.year} · {item.category}</small><ArrowUpRight size={14} />
              </a>;
            })}
          </div>
          <div className="virgo-projects-more-footer">
            <span>{t(`${projects.length} dự án`, `${projects.length} projects`)}</span>
            <a href="#/projects/all">{t("Xem tất cả", "View all")} <ArrowUpRight size={14} /></a>
          </div>
        </div>
      </section>

      {/* CHAPTER 5 — SKILLS (Vindemiatrix) — center-right */}
      <section className="virgo-overlay-panel virgo-panel-right virgo-skills-panel virgo-bare-chapter" aria-labelledby="virgo-skills-title" aria-hidden={active !== 5}>
        <div className="virgo-bare">
          <p className="virgo-bare-label">03 / VINDEMIATRIX · {t("KỸ NĂNG", "SKILLS")}</p>
          <h2 className="virgo-sr-only" id="virgo-skills-title">{t("Kỹ năng", "Skills")}</h2>
          <div className="virgo-skill-list">{capabilities.map((item, index) => <button key={item.id} type="button" aria-pressed={selectedSkill === index}
            onMouseEnter={() => setSelectedSkill(index)} onFocus={() => setSelectedSkill(index)} onClick={() => selectSkill(index)}>
            <span className="virgo-row-star" aria-hidden="true">●</span>{item.title[lang]}
          </button>)}</div>
          <p className="virgo-skill-detail" aria-live="polite">{capabilities[selectedSkill].description[lang]}</p>
          <div className="virgo-skill-tools">{capabilities[selectedSkill].tools.map(tool => <span key={tool}>{tool}</span>)}</div>
          <div className="virgo-skill-evidence" aria-label={t("Dự án chứng minh", "Project evidence")}>{capabilities[selectedSkill].projects.slice(0, 3).map(id => { const item = projects.find(project => project.id === id)!; return <a key={id} href={`#/project/${id}`}><span style={{ color: item.color }}>●</span>{item.name}<ArrowUpRight size={14}/></a>; })}</div>
        </div>
      </section>

      {/* CHAPTER 6 — CONTACT (Zavijava) */}
      <section className="virgo-overlay-panel virgo-panel-right" aria-labelledby="virgo-contact-title" aria-hidden={active !== 6}>
        <div className="virgo-bare">
          <p className="virgo-bare-label">04 / ZAVIJAVA · {t("LIÊN HỆ", "CONTACT")}</p>
          <h2 className="virgo-sr-only" id="virgo-contact-title">{t("Liên hệ", "Contact")}</h2>
          <a className="virgo-email" href="mailto:lequangkhanh295@gmail.com">lequangkhanh295@gmail.com <ArrowUpRight size={20} /></a>
          <div className="virgo-contact-links">
            <a href="https://github.com/psy-zney" target="_blank" rel="noreferrer"><Github size={16} /> GitHub</a>
            <a href="https://www.linkedin.com/in/psy-zney295" target="_blank" rel="noreferrer"><Linkedin size={16} /> LinkedIn</a>
            <a href="#/cv/web">Web CV</a><a href="#/cv/mobile">Mobile CV</a>
          </div>
          <button className="virgo-workspace" disabled={entering} onClick={enterWorkspace}>{t("Vào không gian làm việc", "Enter workspace")} <ArrowUpRight size={17} /></button>
        </div>
      </section>
    </main>


    {active >= 2 && <div className="virgo-chapters"><button aria-expanded={chaptersOpen} onClick={() => setChaptersOpen(value => !value)}>Chapters</button>{chaptersOpen && <nav aria-label="Chapters">{CHAPTERS.map((chapter, index) => <a key={chapter} href={`#/${chapter}`} onClick={() => { setChaptersOpen(false); setReadingFocus(false); (document.activeElement as HTMLElement)?.blur(); navigate(index); }} aria-current={index === active ? 'page' : undefined}>{['Virgo', 'Home', 'About', 'Projects', 'More projects', 'Skills', 'Contact'][index]}</a>)}</nav>}</div>}
    <nav className="virgo-constellation-map" aria-label={t("Bản đồ chòm Xử Nữ", "Virgo constellation map")}>
      <svg viewBox="-10 -6 20 12" role="img" aria-label="Virgo">
        <g transform="scale(1,-1)">
          {OPENING_EDGES.map(([a,b], i) => <line key={i} x1={OPENING_STARS[a].position[0]} y1={OPENING_STARS[a].position[1]} x2={OPENING_STARS[b].position[0]} y2={OPENING_STARS[b].position[1]} />)}
          {OPENING_STARS.map((star, i) => <circle key={i} cx={star.position[0]} cy={star.position[1]} r={star.main ? .18 : .08} className={i === stationFromChapter(active) ? "is-active" : ""} />)}
        </g>
      </svg>
      {VIRGO_STARS.map((star, i) => {
        const point = OPENING_STARS[i].position;
        const chapter = [2,3,5,6][i];
        return <a key={star.name} className="virgo-map-star" style={{ left: ((point[0]+10)/20*100)+'%', top: ((6-point[1])/12*100)+'%' }} href={'#/'+CHAPTERS[chapter]} onClick={() => navigate(chapter)} aria-label={star.name+' · '+t(['Giới thiệu','Dự án','Kỹ năng','Liên hệ'][i],['About','Projects','Skills','Contact'][i])} aria-current={stationFromChapter(active) === i ? "location" : undefined}><span>{star.name}</span></a>;
      })}
      <a className="virgo-map-home" href="#/cosmos" onClick={() => navigate(0)}>VIRGO</a>
    </nav>

    <button className={`virgo-opening-cue${active === 0 ? " is-active" : ""}`} aria-hidden={active !== 0} aria-label={t("Cuộn để bắt đầu hành trình", "Begin the journey")} tabIndex={active === 0 ? 0 : -1} onClick={() => { if (window.location.hash === '#/home') navigate(1); else navigateHash('#/home'); }}><ArrowDown size={19} /></button>
    <button ref={portalRef} className={`virgo-star-portal${active === 6 ? " is-active" : ""}`} type="button"
      aria-label={t("Mở không gian làm việc qua sao Zavijava", "Open workspace through Zavijava")}
      aria-hidden={active !== 6} tabIndex={active === 6 ? 0 : -1} disabled={entering} onClick={enterWorkspace}>
      <span className="virgo-portal-ring" aria-hidden="true" /><span className="virgo-portal-label">{t("Vào workspace", "Enter workspace")} <ArrowUpRight size={13} /></span>
    </button>
    <div className="virgo-flight-progress" aria-hidden="true"><span /></div>
    <div className="virgo-index" aria-hidden="true"><span>{String(active + 1).padStart(2, "0")}</span> / 07</div>
    <div className="virgo-station" aria-hidden="true">{stationFromChapter(active) === null ? "VIRGO / OVERVIEW" : `${VIRGO_STARS[stationFromChapter(active)!].name.toUpperCase()} / ${String(stationFromChapter(active)! + 1).padStart(2, "0")}`}</div>

    <dialog ref={dialogRef} className="virgo-dialog" aria-label={project?.name ?? (missingDocument ? 'Not found' : allProjects ? t("Tất cả dự án", "All projects") : "CV")}
      onCancel={event => { event.preventDefault(); closeDialog(); }}
      onClick={event => { if (event.target === event.currentTarget) closeDialog(); }}>
      <div className={`virgo-dialog-inner${project ? " reader-body" : ""}`} data-lenis-prevent>
        <button className="virgo-close" onClick={closeDialog} aria-label={t("Đóng", "Close")} autoFocus><X size={22} /></button>
        {allProjects && <article><p className="virgo-kicker">PORRIMA / ARCHIVE</p><h2>{t("Tất cả dự án", "All projects")}</h2><div className="virgo-archive">{projects.map((item, index) => <a key={item.id} href={`#/project/${item.id}`}
          onMouseEnter={() => setSelectedProject(index)} onFocus={() => setSelectedProject(index)} onMouseLeave={() => setSelectedProject(null)}>
          <span className="virgo-row-star" aria-hidden="true" style={{ "--star-color": item.color } as CSSProperties}>●</span><strong>{item.name}</strong><small>{item.category}</small><ArrowUpRight size={17} /></a>)}</div></article>}
        {project && <ProjectDocument projectId={project.id} lang={lang} section={documentRoute?.kind === 'project' ? documentRoute.section ?? 'overview' : 'overview'} onSection={section => navigateHash(`#/project/${project.id}/${section}`, true)}/>}
        {resumeTrack && <ResumePage track={resumeTrack} lang={lang} />}
        {missingDocument && <article><h1>Not found</h1><p>This document isn't here.</p><button onClick={closeDialog}>Back to the portfolio</button></article>}
      </div>
    </dialog>
  </div>;
}
