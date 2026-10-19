import { Fragment, lazy, Suspense, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowDown, ArrowUpRight, Github, Linkedin, Monitor, Volume2, VolumeX, X } from "lucide-react";
import { WorldsShowcase, SingularityDust } from "./WorldsShowcase";
import { VirgoSceneBoundary } from "./VirgoSceneFallback";
import { SHOWCASE_ENABLED, visiblePortfolioHash, showcaseIndexForHash, showcaseProducts } from "../data/productShowcase";
import { stopIntroAudio } from "../utils/audioPreloader";
import gsap from "gsap";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { capabilities, projects, type Language } from "../data/portfolio";
import { ProjectDocument } from "./documents/ProjectDocument";
import { navigateHash, parsePublicDocumentRoute } from "../utils/appRoutes";
import "./documents/Documents.css";
import { ResumePage } from "./ResumePage";
import { VIRGO_STARS } from "../data/virgoStations";
import { FLIGHT_MOTION, flightPositionForScroll, navigationDuration, scrollOffsetForPosition, smooth } from "../data/virgoFlight";
import { FLIGHT_TRACK_VH } from "../data/virgoSpace";
import { storyWheelTarget, storyWheelScale } from "../data/virgoPacing";
import { portfolioAudio } from "../utils/portfolioAudio";
import { NARRATIVE_BEATS, chapterReadingPosition, narrativeRevealStyle } from "../data/virgoNarrative";
import { VirgoIntroFlight } from './VirgoIntroFlight';
import "./VirgoPortfolio.css";
import { motionStyle } from '../data/motionTokens';
import { BlackHoleOrbitControls, createBlackHoleOrbit } from './BlackHoleOrbitControls';

const VirgoScene = lazy(() => import("./VirgoScene").then(module => ({ default: module.VirgoScene })));

const CHAPTERS = ["cosmos", "home", "story", "projects", "projects-more", "skills", "contact"] as const;

function chapterFromHash(hash: string) {
  const route = hash.replace(/^#\//, "").split("/")[0];
  if (route === "project" || route === "showcase") return 3;
  if (route === "cv") return 6;
  return Math.max(0, CHAPTERS.indexOf(route as typeof CHAPTERS[number]));
}

function stationFromChapter(chapter: number) {
  if (chapter < 2) return null;
  if (chapter === 4) return 1;
  return chapter > 4 ? chapter - 3 : chapter - 2;
}

export function VirgoPortfolio({ lang }: {
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
  const blackHoleControlRef = useRef<HTMLDivElement>(null);
  const blackHoleOrbit = useRef(createBlackHoleOrbit());
  const labelsRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const interactionPaused = useRef(false);
  const navigatedHash = useRef<string | null>(null);
  const navigationTarget = useRef<number | null>(null);
  const nativeGestureUntil = useRef(0);
  const [ready, setReady] = useState(false);
  const [hash, setHash] = useState(() => visiblePortfolioHash(window.location.hash));
  const [openingVisible, setOpeningVisible] = useState(() => !window.location.hash || window.location.hash === '#/' || window.location.hash === '#/cosmos');
  const [openingDirection, setOpeningDirection] = useState<1 | -1>(1);
  const [openingAssembled, setOpeningAssembled] = useState(false);
  const [active, setActive] = useState(() => chapterFromHash(window.location.hash));
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const projectHoverTimer = useRef(0), projectHoverCandidate = useRef<number | null>(null);
  const hoverProject = useCallback((index: number | null) => {
    if (projectHoverCandidate.current === index) return;
    projectHoverCandidate.current = index; clearTimeout(projectHoverTimer.current);
    if (index === null) setSelectedProject(null);
    else projectHoverTimer.current = window.setTimeout(() => setSelectedProject(index), 120);
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
  const [passageVisible, setPassageVisible] = useState(false);
  const [passageDirection, setPassageDirection] = useState<1 | -1>(1);
  const [passageStart, setPassageStart] = useState<number | undefined>();
  const finishPassage = useCallback(() => { setPassageVisible(false); setEntering(false); }, []);
  const reversePassage = useCallback((time: number) => {
    setPassageStart(time); setPassageDirection(-1); setEntering(false);
  }, []);
  const [showcaseInside, setShowcaseInside] = useState(false);
  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const wheelSound = (event: WheelEvent) => {
      if (event.ctrlKey || showcaseInside || event.target instanceof Element && event.target.closest('dialog,[data-lenis-prevent],input,textarea,select,[contenteditable="true"]')) return;
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      portfolioAudio.playScroll(delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? page.clientHeight : 1));
    };
    page.addEventListener('wheel', wheelSound, { capture: true, passive: true });
    return () => page.removeEventListener('wheel', wheelSound, true);
  }, [showcaseInside]);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [readingFocus, setReadingFocus] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const documentRoute = parsePublicDocumentRoute(hash);
  const project = documentRoute?.kind === 'project' ? projects.find(item => item.id === documentRoute.projectId) : undefined;
  const resumeTrack = documentRoute?.kind === 'resume' ? documentRoute.track : undefined;
  const allProjects = documentRoute?.kind === 'archive';
  const missingDocument = documentRoute?.kind === 'missing';
  const showcaseIndex = showcaseIndexForHash(hash);
  const isShowcase = SHOWCASE_ENABLED && hash.startsWith('#/showcase');
  const [showcaseActive, setShowcaseActive] = useState(() => showcaseIndex ?? 0);
  const [soundMuted, setSoundMuted] = useState(() => typeof document !== "undefined" && document.documentElement.dataset.journeySound === "off");

  const showDialog = !!documentRoute && documentRoute.kind !== 'capability';
  const returnHash = useRef(hash.startsWith('#/cv') ? '#/contact' : hash.startsWith('#/skills') ? '#/skills' : '#/projects');
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => { if (!showDialog && hash) returnHash.current = hash; }, [hash, showDialog]);
  useEffect(() => { if (documentRoute?.kind === 'capability') setSelectedSkill(documentRoute.index); }, [hash]);
  const selectSkill = (index: number) => { setSelectedSkill(index); const next = `#/skills/${capabilities[index].id}`; navigatedHash.current = next; navigateHash(next, true); };
  interactionPaused.current = showDialog || isShowcase || entering || passageVisible || readingFocus || openingVisible;
  const arriveFromIntro = useCallback(() => {
    const page = pageRef.current, scroller = scrollerRef.current, content = contentRef.current;
    if (!page || !scroller || !content) return;
    navigationTarget.current = null;
    const position = 1.92;
    page.dataset.introArrival = String(position);
    const top = scrollOffsetForPosition(position, Array.from(content.children, child => (child as HTMLElement).offsetTop));
    if (lenisRef.current) lenisRef.current.scrollTo(top, { immediate: true });
    else scroller.scrollTo({ top, behavior: 'instant' });
  }, []);
  const finishIntro = useCallback(() => {
    setOpeningVisible(false);
    navigatedHash.current = '#/home';
    navigateHash('#/home', true);
    scrollerRef.current?.focus({ preventScroll: true });
  }, []);
  const returnFromIntro = useCallback(() => {
    const page = pageRef.current;
    navigationTarget.current = null;
    if (page) page.dataset.introArrival = '0';
    if (lenisRef.current) lenisRef.current.scrollTo(0, { immediate: true });
    else scrollerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    setOpeningDirection(1);
    setOpeningAssembled(true);
    setOpeningVisible(true);
    navigatedHash.current = '#/cosmos';
    navigateHash('#/cosmos', true);
  }, []);
  useEffect(() => {
    if ((!hash || hash === '#/' || hash === '#/cosmos') && navigatedHash.current !== hash) setOpeningAssembled(false);
    setOpeningDirection(1);
    setOpeningVisible(!hash || hash === '#/' || hash === '#/cosmos');
  }, [hash]);

  // At Home, an intentional reverse gesture re-enters the same scroll-driven tunnel.
  useEffect(() => {
    const page = pageRef.current; if (!page) return;
    let reversePixels = 0, lastInput = 0, touchY = 0;
    const reverse = (event: Event, pixels: number) => {
      if (interactionPaused.current || pixels >= 0) { reversePixels = 0; return; }
      if (event.target instanceof Element && event.target.closest('a,button,input,textarea,select,[contenteditable="true"],[data-lenis-prevent]')) return;
      const position = Number(page.style.getPropertyValue('--flight-progress') || 0) * 6;
      if (position > 1.925) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const now = performance.now();
      reversePixels = now - lastInput > 350 ? -pixels : reversePixels - pixels; lastInput = now;
      if (reversePixels < 80) return;
      reversePixels = 0; navigationTarget.current = null;
      if (reducedMotion) returnFromIntro();
      else { interactionPaused.current = true; setOpeningDirection(-1); setOpeningVisible(true); }
    };
    const wheel = (event: WheelEvent) => { if (!event.ctrlKey) reverse(event, event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? page.clientHeight : 1)); };
    const key = (event: KeyboardEvent) => { if (['ArrowUp', 'PageUp'].includes(event.key)) reverse(event, -80); };
    const touchStart = (event: TouchEvent) => { touchY = event.touches[0]?.clientY ?? 0; };
    const touchMove = (event: TouchEvent) => { const next = event.touches[0]?.clientY ?? touchY; reverse(event, (touchY - next) * 2); touchY = next; };
    page.addEventListener('wheel', wheel, { capture: true, passive: false }); page.addEventListener('keydown', key, true);
    page.addEventListener('touchstart', touchStart, { passive: true }); page.addEventListener('touchmove', touchMove, { capture: true, passive: false });
    return () => { page.removeEventListener('wheel', wheel, true); page.removeEventListener('keydown', key, true); page.removeEventListener('touchstart', touchStart); page.removeEventListener('touchmove', touchMove, true); };
  }, [reducedMotion, returnFromIntro]);
  const onChapter = useCallback((index: number) => setActive(current => current === index ? current : index), []);
  useEffect(() => {
    const overlay = overlayRef.current;
    const sync = () => setReadingFocus(!!overlay?.querySelector('.virgo-bare :focus-visible'));
    const out = () => queueMicrotask(sync);
    overlay?.addEventListener('focusin', sync); overlay?.addEventListener('focusout', out);
    return () => { overlay?.removeEventListener('focusin', sync); overlay?.removeEventListener('focusout', out); };
  }, []);
  const enterWorlds = () => {
    if (entering) return;
    setShowcaseInside(false);
    setPassageDirection(1); setPassageStart(undefined);
    setPassageVisible(!reducedMotion);
    setEntering(true);
  };
  const scrollToChapter = useCallback((index: number, immediate = false, position = chapterReadingPosition(index)) => {
    nativeGestureUntil.current = 0;
    const scroller = scrollerRef.current;
    const content = contentRef.current;
    const target = content?.children[index] as HTMLElement | undefined;
    if (!scroller || !content || !target) return;
    const offsets = Array.from(content.children, child => (child as HTMLElement).offsetTop);
    const targetPosition = position;
    const targetTop = scrollOffsetForPosition(targetPosition, offsets);
    if (immediate && pageRef.current) {
      pageRef.current.dataset.introArrival = String(targetPosition);
    }
    if (lenisRef.current) {
      navigationTarget.current = immediate ? null : index;
      if (immediate) {
        lenisRef.current.scrollTo(targetTop, { immediate: true });
      } else {
        lenisRef.current.scrollTo(targetTop, {
          immediate: false,
          lerp: 0,
          duration: navigationDuration((targetTop - scroller.scrollTop) / (scroller.clientHeight * 1.32)),
          easing: value => smooth(0, 1, value),
          onComplete: () => { if (navigationTarget.current === index) navigationTarget.current = null; },
        });
      }
    } else {
      navigationTarget.current = null;
      scroller.scrollTo({ top: targetTop, behavior: "instant" });
    }
  }, []);

  const passageHandoff = useCallback(() => {
    const next = passageDirection > 0 ? `#/showcase/${showcaseProducts[0].id}` : '#/contact';
    navigatedHash.current = next;
    navigateHash(next, true);
    if (passageDirection < 0) scrollToChapter(6, true, 6);
    setEntering(false);
  }, [passageDirection, scrollToChapter]);
  const returnThroughHole = useCallback(() => {
    if (passageVisible) return;
    if (reducedMotion) {
      navigatedHash.current = '#/contact'; navigateHash('#/contact', true); scrollToChapter(6, true, 6);
    } else {
      setPassageDirection(-1); setPassageStart(undefined); setPassageVisible(true);
    }
  }, [passageVisible, reducedMotion, scrollToChapter]);
  useEffect(() => {
    if (reducedMotion && (entering || passageVisible)) { passageHandoff(); finishPassage(); }
  }, [entering, passageVisible, reducedMotion, passageHandoff, finishPassage]);

  useEffect(() => {
    if (showDialog || isShowcase || entering) {
      navigationTarget.current = null;
      lenisRef.current?.scrollTo(scrollerRef.current?.scrollTop ?? 0, { immediate: true });
    }
  }, [showDialog, isShowcase, entering]);


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
    // Lenis advances on GSAP's ticker. The scene samples actual scrollTop inside
    // its render frame, avoiding a second ScrollTrigger scrub animation.
    if (!reducedMotion) {
      // The fixed reading panels and controls are siblings of the scroll track.
      // Receive their wheel events on the page as well as events on the scene.
      const lenis: Lenis = new Lenis({
        wrapper: scroller, content, eventsTarget: page, lerp: FLIGHT_MOTION.scrollLerp, wheelMultiplier: FLIGHT_MOTION.wheelMultiplier, smoothWheel: true, syncTouch: false, virtualScroll: data => {
          if (interactionPaused.current) return false;
          const event = data.event;
          if (event.type !== "wheel" || event.ctrlKey || event.defaultPrevented || Math.abs(data.deltaY) < Math.abs(data.deltaX)) return true;
          if (event.target instanceof Element && event.target.closest("[data-lenis-prevent]")) return true;
          const direction = Math.sign(data.deltaY);
          if (!direction) return false;
          if (event.cancelable) event.preventDefault();
          const progress = page.style.getPropertyValue("--flight-progress");
          const position = progress ? Number(progress) * 6 : 0;
          const offsets = Array.from(content.children, child => (child as HTMLElement).offsetTop);
          const rendered = scrollOffsetForPosition(position, offsets);
          const minimum = scrollOffsetForPosition(1.92, offsets);
          const nextTarget = storyWheelTarget(data.deltaY * FLIGHT_MOTION.wheelMultiplier * storyWheelScale(position), lenis.targetScroll, rendered, scroller.clientHeight, minimum, lenis.limit);
          navigationTarget.current = null;
          // The invisible scroll track changes immediately; camera, words and
          // effects all follow the same paced, reversible render coordinate.
          lenis.scrollTo(nextTarget, { immediate: true });
          return false;
        }
      });
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
      const direction = Math.sign(event.deltaY);
      scroller.scrollTo({ top: storyWheelTarget(event.deltaY * unit * FLIGHT_MOTION.wheelMultiplier * storyWheelScale(position), scroller.scrollTop, scrollOffsetForPosition(position, offsets), scroller.clientHeight, scrollOffsetForPosition(1.92, offsets), scroller.scrollHeight - scroller.clientHeight), behavior: "instant" });
    };
    page.addEventListener("wheel", wheel, { passive: false });
    setReady(true);
    return () => {
      page.removeEventListener("wheel", wheel);
      setReady(false);
    };
  }, [reducedMotion]);

  // Native touch/keyboard scrolling enters the same gallery passage as wheel.
  useEffect(() => {
    const scroller = scrollerRef.current, content = contentRef.current;
    if (!scroller || !content) return;
    let previous = flightPositionForScroll(scroller.scrollTop, Array.from(content.children, child => (child as HTMLElement).offsetTop));
    const touch = () => { nativeGestureUntil.current = performance.now() + 2500; };
    const key = (event: KeyboardEvent) => {
      if (['PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', ' '].includes(event.key) && !interactionPaused.current) touch();
    };
    const scroll = () => {
      const minimum = scrollOffsetForPosition(1.92, Array.from(content.children, child => (child as HTMLElement).offsetTop));
      if (!pageRef.current?.querySelector('.virgo-intro-flight') && scroller.scrollTop < minimum) {
        if (lenisRef.current) lenisRef.current.scrollTo(minimum, { immediate: true });
        else scroller.scrollTop = minimum;
        return;
      }
      const position = flightPositionForScroll(scroller.scrollTop, Array.from(content.children, child => (child as HTMLElement).offsetTop));
      previous = position;
    };
    scroller.addEventListener('touchstart', touch, { passive: true });
    scroller.addEventListener('touchmove', touch, { passive: true });
    pageRef.current?.addEventListener('keydown', key);
    scroller.addEventListener('scroll', scroll, { passive: true });
    return () => {
      scroller.removeEventListener('touchstart', touch);
      scroller.removeEventListener('touchmove', touch);
      pageRef.current?.removeEventListener('keydown', key);
      scroller.removeEventListener('scroll', scroll);
    };
  }, []);

  useEffect(() => {
    const sync = () => {
      const requested = window.location.hash, visible = visiblePortfolioHash(requested);
      if (visible !== requested) navigateHash(visible, true);
      setHash(visible);
    };
    sync();
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
    const offsets = Array.from(contentRef.current?.children ?? [], child => (child as HTMLElement).offsetTop);
    const expectedTop = scrollOffsetForPosition(chapterReadingPosition(index), offsets);
    if (routeChanged && target && hash && Math.abs((scrollerRef.current?.scrollTop ?? 0) - expectedTop) > 2) {
      const shouldJumpImmediate = initialRoute || showDialog || index <= 1 || index < active;
      scrollToChapter(index, shouldJumpImmediate);
    }
    document.title = `${project?.name ?? (resumeTrack ? "CV" : "Virgo Portfolio")} | Lê Quang Khánh — zney`;
  }, [active, hash, project, ready, resumeTrack, showDialog, scrollToChapter]);

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
      scrollToChapter(index, index <= 1 || index < active);
    }
  };

  return <div ref={pageRef} data-showcase-enabled={SHOWCASE_ENABLED} style={motionStyle} className={`virgo-page${active === 0 ? " virgo-is-opening" : ""}${entering ? " virgo-is-entering" : ""}${reducedMotion ? " virgo-reduced-motion" : ""}`}>
    <a className="virgo-skip" href="#/home" onClick={() => navigate(1)}>{t("Bỏ qua chòm sao mở đầu", "Skip constellation opening")}</a>
    <div ref={scrollerRef} className={`virgo-scroll${showDialog || entering ? " is-paused" : ""}`} role="region" tabIndex={0} aria-label={t("Cuộn để bay qua các ngôi sao", "Scroll to travel between stars")}>
      <div ref={contentRef} className="virgo-scroll-content" aria-hidden="true">
        {CHAPTERS.map((chapter, index) => <div className="virgo-scroll-step" key={chapter} data-chapter={chapter} style={{ height: `${FLIGHT_TRACK_VH[index]}dvh` }} />)}
      </div>
    </div>
    {ready && scrollerRef.current && contentRef.current && overlayRef.current && <VirgoSceneBoundary lang={lang}><Suspense fallback={null}><VirgoScene
      scroller={scrollerRef.current}
      content={contentRef.current}
      overlay={overlayRef.current}
      onChapter={onChapter}
      reducedMotion={reducedMotion}
      selectedProject={selectedProject}
      selectedSkill={selectedSkill}
      selectedOrigin={selectedOrigin}
      portalRef={portalRef}
      blackHoleControlRef={blackHoleControlRef}
      blackHoleOrbit={blackHoleOrbit}
      labelsRef={labelsRef}
      entering={entering}
      paused={showDialog || isShowcase || openingVisible}
      showcaseApproach={false}
      readingFocus={readingFocus}
      onPlanetHover={(index, skills) => { if (skills) { if (index !== null) setSelectedSkill(index); } else hoverProject(index); }}
      onPlanetSelect={(index, skills, section) => { if (skills) selectSkill(index); else window.location.hash = `#/project/${projects[index].id}${section ? '/' + section : ''}`; }}
    /></Suspense></VirgoSceneBoundary>}
    <div ref={labelsRef} className="virgo-orbit-labels" aria-hidden="true">{projects.map((item, index) => <div key={item.id} className={`virgo-orbit-label virgo-hologram-${item.category}`} style={{ "--hologram-color": item.color } as CSSProperties}>
      <span className="virgo-hologram-code">{String(index + 1).padStart(2, "0")} / {item.category}</span>
      <strong>{item.name}</strong><span>{item.headline[lang]}</span>
      <small>{item.stack.slice(0, 3).join(" · ")}</small>
    </div>)}</div>
    <div className="virgo-vignette virgo-vignette-right" aria-hidden="true" />
    {openingVisible && <VirgoIntroFlight key={openingDirection} initialDirection={openingDirection} initialAssemblyComplete={openingAssembled} lang={lang} pageRef={pageRef} reducedMotion={reducedMotion} onArrive={arriveFromIntro} onFinish={finishIntro} onReturn={returnFromIntro} />}

    <main ref={overlayRef} className="virgo-overlay">
      <svg className="virgo-reading-accent" aria-hidden="true"><path fill="none" stroke="#b9cde6" strokeWidth="1" /></svg>
      <div className="virgo-narrative" aria-label={t("Dẫn truyện", "Story")}>
        {NARRATIVE_BEATS.map((beat, index) => index >= 3 && index < 8 ? <p data-narrative-index={index} data-reveal={narrativeRevealStyle(index)} key={index} className={`virgo-narrative-line virgo-narrative-${beat.side} virgo-placement-${beat.placement}${index === 0 ? " virgo-identity" : ""}${index === 8 ? " virgo-contact-narrative" : ""}`} aria-hidden="true">
          <span>{beat[lang].split(' ').map((word, i, words) => <Fragment key={i}><span className="virgo-story-word" style={{ '--word-delay': i / words.length * .32 } as CSSProperties}>{word}</span>{i < words.length - 1 ? ' ' : null}</Fragment>)}</span>
        </p> : null)}
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
          <div className="virgo-origin-steps" aria-label={t('Các bước làm dự án', 'How I build')}>{originSteps.map((step, index) => <button key={step.title} aria-pressed={selectedOrigin === index} onMouseEnter={() => setSelectedOrigin(index)} onFocus={() => setSelectedOrigin(index)} onClick={() => setSelectedOrigin(index)} onMouseLeave={() => setSelectedOrigin(null)}>{step.title}</button>)}</div>
          <p className="virgo-origin-description" aria-live="polite">{selectedOrigin === null ? '' : originSteps[selectedOrigin][lang]}</p>
        </div>
        <div className="virgo-single-link"><a href="#/cv/web">{t('Đọc CV', 'Read my CV')}<ArrowUpRight size={16} /></a></div>
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
          <div className="virgo-showcase-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '14px', flexWrap: 'wrap' }}>
            <a className="virgo-more virgo-more-scroll" href="#/projects-more" onClick={() => navigate(4)}>{t(`Cuộn tiếp · ${projects.length - 3} dự án còn lại`, `Keep scrolling · ${projects.length - 3} more projects`)} <ArrowDown size={15} /></a>
            {SHOWCASE_ENABLED && <a className="virgo-showcase-pill" href="#/showcase" onClick={e => { e.preventDefault(); navigate(3); window.location.hash = `#/showcase/${showcaseProducts[showcaseActive].id}`; }} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', fontSize: '13px', color: '#e2e8f0', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
              <Monitor size={15} />
              <span>{t("Các thế giới sản phẩm", "Product worlds")}</span>
              <ArrowUpRight size={14} />
            </a>}
          </div>
          <p className="virgo-orbit-caption">{selectedProject === null ? t(`${projects.length} hành tinh dự án đang quay`, `${projects.length} projects in orbit`) : `${String(selectedProject + 1).padStart(2, "00")} / ${projects[selectedProject].name}`}</p>
        </div>
        <div className="virgo-single-link"><a href={SHOWCASE_ENABLED ? `#/showcase/${showcaseProducts[showcaseActive].id}` : '#/projects/all'}>{SHOWCASE_ENABLED ? t('Khám phá sản phẩm', 'Explore the work') : t('Xem dự án', 'View projects')}<ArrowUpRight size={16} /></a></div>
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
        <div className="virgo-single-link"><a href={SHOWCASE_ENABLED ? `#/showcase/${showcaseProducts[showcaseActive].id}` : '#/projects/all'}>{SHOWCASE_ENABLED ? t('Khám phá sản phẩm', 'Explore the work') : t('Xem dự án', 'View projects')}<ArrowUpRight size={16} /></a></div>
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
          <div className="virgo-skill-evidence" aria-label={t("Dự án chứng minh", "Project evidence")}>{capabilities[selectedSkill].projects.slice(0, 3).map(id => { const item = projects.find(project => project.id === id)!; return <a key={id} href={`#/project/${id}`}><span style={{ color: item.color }}>●</span>{item.name}<ArrowUpRight size={14} /></a>; })}</div>
        </div>
        <div className="virgo-single-link"><a href="#/projects/all">{t('Xem cách mình xây dựng', 'See how I build')}<ArrowUpRight size={16} /></a></div>
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
        </div>
      </section>
    </main>


    {active >= 2 && <div className="virgo-chapters"><button aria-expanded={chaptersOpen} onClick={() => setChaptersOpen(value => !value)}>Chapters</button>{chaptersOpen && <nav aria-label="Chapters">{CHAPTERS.map((chapter, index) => <a key={chapter} href={`#/${chapter}`} onClick={() => { setChaptersOpen(false); setReadingFocus(false); (document.activeElement as HTMLElement)?.blur(); navigate(index); }} aria-current={index === active ? 'page' : undefined}>{['Virgo', 'Home', 'About', 'Projects', 'More projects', 'Skills', 'Contact'][index]}</a>)}</nav>}</div>}

    <BlackHoleOrbitControls controlRef={blackHoleControlRef} orbit={blackHoleOrbit}
      enabled={active === 6 && !entering && !showDialog && !isShowcase}
      resetOnDisable={!entering}
      label={t("Góc nhìn hố đen: kéo chuột để xoay, nhấp đúp hoặc Home để đặt lại; dùng phím mũi tên để đổi góc", "Black hole view: drag to orbit, double-click or press Home to reset; arrow keys change the angle")} />
    <button ref={portalRef} className={`virgo-star-portal${active === 6 ? " is-active" : ""}`} type="button"
      aria-label={t("Khám phá các thế giới qua hố đen", "Explore worlds through the black hole")}
      aria-hidden={active !== 6} tabIndex={active === 6 ? 0 : -1} disabled={entering} onClick={enterWorlds}>
      <span className="virgo-portal-label"><ArrowUpRight size={22} /></span>
    </button>
    <div className="virgo-station" aria-hidden="true">{stationFromChapter(active) === null ? "VIRGO / OVERVIEW" : `${VIRGO_STARS[stationFromChapter(active)!].name.toUpperCase()} / ${String(stationFromChapter(active)! + 1).padStart(2, "0")}`}</div>
    <button className="virgo-sound-toggle" aria-label={soundMuted ? t("Bật âm thanh", "Enable sound") : t("Tắt âm thanh", "Mute sound")} aria-pressed={!soundMuted} onClick={() => {
      const muted = !soundMuted;
      setSoundMuted(muted);
      document.documentElement.dataset.journeySound = muted ? "off" : "on";
      window.dispatchEvent(new CustomEvent("journey-audio-muted", { detail: muted }));
      if (muted) {
        stopIntroAudio();
      }
    }}>{soundMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>

    {passageVisible && !reducedMotion && <SingularityDust direction={passageDirection} initialTime={passageStart} onComplete={finishPassage} onHandoff={passageHandoff} onReverse={reversePassage} />}
    {isShowcase && (
      <WorldsShowcase
        inside={showcaseInside}
        onInsideChange={setShowcaseInside}
        index={showcaseIndex}
        lang={lang}
        reducedMotion={reducedMotion}
        onClose={returnThroughHole}
        onSelect={id => {
          const pIdx = showcaseProducts.findIndex(p => p.id === id);
          if (pIdx >= 0) {
            setShowcaseActive(pIdx);
            navigatedHash.current = `#/showcase/${id}`;
            navigateHash(`#/showcase/${id}`, true);
          }
        }}
      />
    )}

    <dialog ref={dialogRef} className="virgo-dialog" aria-label={project?.name ?? (missingDocument ? 'Not found' : allProjects ? t("Tất cả dự án", "All projects") : "CV")}
      onCancel={event => { event.preventDefault(); closeDialog(); }}
      onClick={event => { if (event.target === event.currentTarget) closeDialog(); }}>
      <div className={`virgo-dialog-inner${project ? " reader-body" : ""}`} data-lenis-prevent>
        <button className="virgo-close" onClick={closeDialog} aria-label={t("Đóng", "Close")} autoFocus><X size={22} /></button>
        {allProjects && <article><p className="virgo-kicker">PORRIMA / ARCHIVE</p><h2>{t("Tất cả dự án", "All projects")}</h2><div className="virgo-archive">{projects.map((item, index) => <a key={item.id} href={`#/project/${item.id}`}
          onMouseEnter={() => setSelectedProject(index)} onFocus={() => setSelectedProject(index)} onMouseLeave={() => setSelectedProject(null)}>
          <span className="virgo-row-star" aria-hidden="true" style={{ "--star-color": item.color } as CSSProperties}>●</span><strong>{item.name}</strong><small>{item.category}</small><ArrowUpRight size={17} /></a>)}</div></article>}
        {project && <ProjectDocument projectId={project.id} lang={lang} section={documentRoute?.kind === 'project' ? documentRoute.section ?? 'overview' : 'overview'} onSection={section => navigateHash(`#/project/${project.id}/${section}`, true)} />}
        {resumeTrack && <ResumePage track={resumeTrack} lang={lang} />}
        {missingDocument && <article><h1>Not found</h1><p>This document isn't here.</p><button onClick={closeDialog}>Back to the portfolio</button></article>}
      </div>
    </dialog>
  </div>;
}
