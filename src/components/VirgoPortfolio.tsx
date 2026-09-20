import { lazy, Suspense, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowDown, ArrowUpRight, Github, Linkedin, X } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { capabilities, projects, type Language, type Project } from "../data/portfolio";
import { ResumePage } from "./ResumePage";
import { VIRGO_STARS } from "../data/virgoStations";
import "./VirgoPortfolio.css";

gsap.registerPlugin(ScrollTrigger);
const VirgoScene = lazy(() => import("./VirgoScene").then(module => ({ default: module.VirgoScene })));

const CHAPTERS = ["cosmos", "home", "story", "projects", "skills", "contact"] as const;

function chapterFromHash(hash: string) {
  const route = hash.replace(/^#\//, "").split("/")[0];
  if (route === "project") return 3;
  if (route === "cv") return 5;
  return Math.max(0, CHAPTERS.indexOf(route as typeof CHAPTERS[number]));
}

function ProjectDetails({ project, lang }: { project: Project; lang: Language }) {
  const t = (vi: string, en: string) => lang === "vie" ? vi : en;
  return <article className="virgo-detail">
    <p className="virgo-kicker">{project.category} / {project.year}</p>
    <h2>{project.name}</h2>
    <p className="virgo-detail-headline">{project.headline[lang]}</p>
    <p>{project.summary[lang]}</p>
    <h3>{t("Bài toán", "The challenge")}</h3><p>{project.problem[lang]}</p>
    <h3>{t("Đóng góp", "Contribution")}</h3>
    <ul>{project.contributions.map((item, index) => <li key={index}>{item[lang]}</li>)}</ul>
    <h3>{t("Quyết định kỹ thuật", "Engineering decisions")}</h3><p>{project.decision[lang]}</p>
    <h3>{t("Điều đọng lại", "The takeaway")}</h3><p>{project.takeaway[lang]}</p>
    {project.note && <p className="virgo-detail-note">{project.note[lang]}</p>}
    <div className="virgo-stack">{project.stack.map(item => <span key={item}>{item}</span>)}</div>
    <div className="virgo-detail-links">
      {project.demo && <a href={project.demo} target="_blank" rel="noreferrer">{t("Trải nghiệm", "Live site")} <ArrowUpRight size={16} /></a>}
      {project.source && <a href={project.source} target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={16} /></a>}
    </div>
  </article>;
}

export function VirgoPortfolio({ lang, onToggleLang, onEnterWorkspace }: {
  lang: Language;
  onToggleLang: () => void;
  onEnterWorkspace: () => void;
}) {
  const t = (vi: string, en: string) => lang === "vie" ? vi : en;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const portalRef = useRef<HTMLButtonElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const [ready, setReady] = useState(false);
  const [hash, setHash] = useState(() => window.location.hash);
  const [active, setActive] = useState(() => chapterFromHash(window.location.hash));
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [selectedSkill, setSelectedSkill] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const project = hash.startsWith("#/project/") ? projects.find(item => item.id === hash.split("/")[2]) : undefined;
  const resumeTrack = hash === "#/cv/web" ? "web" : hash === "#/cv/mobile" ? "mobile" : undefined;
  const allProjects = hash === "#/projects/all";
  const showDialog = !!project || !!resumeTrack || allProjects;
  const onChapter = useCallback((index: number) => setActive(current => current === index ? current : index), []);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReducedMotion(preference.matches);
    preference.addEventListener("change", change);
    return () => preference.removeEventListener("change", change);
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const content = contentRef.current;
    if (!scroller || !content) return;
    // A single GSAP ticker drives Lenis and ScrollTrigger, so the camera does not
    // observe a different scroll frame than the browser's visual position.
    if (!reducedMotion) {
      const lenis = new Lenis({ wrapper: scroller, content, lerp: .09, smoothWheel: true, syncTouch: false });
      lenisRef.current = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      setReady(true);
      return () => {
        setReady(false);
        gsap.ticker.remove(tick);
        lenis.off("scroll", ScrollTrigger.update);
        lenis.destroy();
        lenisRef.current = null;
      };
    }
    setReady(true);
    return () => setReady(false);
  }, [reducedMotion]);

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const index = chapterFromHash(hash);
    const target = contentRef.current?.children[index] as HTMLElement | undefined;
    if (target && hash && Math.abs((scrollerRef.current?.scrollTop ?? 0) - target.offsetTop) > 2) {
      if (lenisRef.current) lenisRef.current.scrollTo(target.offsetTop, { immediate: showDialog });
      else target.scrollIntoView({ behavior: "instant", block: "start" });
    }
    document.title = `${project?.name ?? (resumeTrack ? "CV" : "Virgo Portfolio")} | Lê Quang Khánh — zney`;
  }, [hash, project, ready, resumeTrack, showDialog]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (showDialog && !dialog.open) dialog.showModal();
    if (!showDialog && dialog.open) dialog.close();
  }, [showDialog]);

  const closeDialog = () => { window.location.hash = resumeTrack ? "#/contact" : "#/projects"; };
  const navigate = (index: number) => {
    const target = contentRef.current?.children[index] as HTMLElement | undefined;
    if (target && window.location.hash === `#/${CHAPTERS[index]}`) lenisRef.current?.scrollTo(target.offsetTop);
  };

  return <div className={`virgo-page${active === 0 ? " virgo-is-opening" : ""}`}>
    <a className="virgo-skip" href="#/home" onClick={() => navigate(1)}>{t("Bỏ qua chòm sao mở đầu", "Skip constellation opening")}</a>
    <div ref={scrollerRef} className="virgo-scroll" aria-label={t("Cuộn để bay qua chòm sao Xử Nữ", "Scroll through the Virgo constellation")}>
      <div ref={contentRef} className="virgo-scroll-content" aria-hidden="true">
        {CHAPTERS.map(chapter => <div className="virgo-scroll-step" key={chapter} data-chapter={chapter} />)}
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
      portalRef={portalRef}
    /></Suspense>}
    <div className="virgo-vignette" aria-hidden="true" />

    <header className={`virgo-header${active === 0 ? " virgo-header-hidden" : ""}`}>
      <a href="#/cosmos" className="virgo-brand" onClick={() => navigate(0)}>zney<span>✦</span></a>
      <nav aria-label={t("Điều hướng", "Navigation")}>
        {CHAPTERS.slice(2).map((chapter, i) => <a key={chapter} href={`#/${chapter}`} aria-current={active === i + 2 ? "location" : undefined} onClick={() => navigate(i + 2)}>{t(["Giới thiệu", "Dự án", "Kỹ năng", "Liên hệ"][i], ["About", "Projects", "Skills", "Contact"][i])}</a>)}
      </nav>
      <button className="virgo-language" onClick={onToggleLang} aria-label={t("Switch to English", "Chuyển sang tiếng Việt")}>{lang === "vie" ? "EN" : "VI"}</button>
    </header>

    <main ref={overlayRef} className="virgo-overlay">
      <section className="virgo-overlay-panel virgo-cosmos" aria-label={t("Chòm sao Xử Nữ xuất hiện", "Virgo constellation appearing")} aria-hidden={active !== 0} />
      <section className="virgo-overlay-panel virgo-hero" aria-labelledby="virgo-home-title" aria-hidden={active !== 1}>
        <div className="virgo-panel-content">
          <p className="virgo-kicker">ZNEY / VIRGO CONSTELLATION</p>
          <h1 id="virgo-home-title">{t("Ý tưởng nhỏ.", "Small ideas.")}<br /><em>{t("Vũ trụ rộng.", "Infinite space.")}</em></h1>
          <p className="virgo-description">{t("Mình là Lê Quang Khánh. Cuộn xuống để theo ánh sao, từ câu chuyện của mình đến những sản phẩm đã tạo ra.", "I'm Lê Quang Khánh. Follow the stars from my story to the things I've built.")}</p>
          <span className="virgo-scroll-hint"><ArrowDown size={16} />{t("Cuộn để khám phá", "Scroll to explore")}</span>
        </div>
      </section>

      <section className="virgo-overlay-panel" aria-labelledby="virgo-about-title" aria-hidden={active !== 2}>
        <div className="virgo-panel-content">
          <p className="virgo-kicker">01 / SPICA · {t("GIỚI THIỆU", "ABOUT ME")}</p>
          <h2 id="virgo-about-title">{t("Bắt đầu bằng", "It starts with")}<br /><em>{t("một câu hỏi.", "a question.")}</em></h2>
          <p className="virgo-description">{t("Mình xây dựng giao diện và các hệ thống kết nối phía sau. Mỗi dự án bắt đầu từ việc hiểu người dùng thực sự muốn làm gì.", "I build thoughtful interfaces and the systems behind them. Each project starts with understanding what someone really needs to do.")}</p>
          <p className="virgo-aside">UEH · {t("Công nghệ thông tin · Dự kiến tốt nghiệp 08.2027", "Information Technology · Expected graduation 08.2027")}</p>
        </div>
      </section>

      <section className="virgo-overlay-panel" aria-labelledby="virgo-projects-title" aria-hidden={active !== 3}>
        <div className="virgo-panel-content">
          <p className="virgo-kicker">02 / PORRIMA · {t("DỰ ÁN", "PROJECTS")}</p>
          <h2 id="virgo-projects-title">{t("Những gì mình", "Ideas made")}<br /><em>{t("đã tạo ra.", "real.")}</em></h2>
          <div className="virgo-projects-list">
            {projects.slice(0, 3).map((item, index) => <a key={item.id} href={`#/project/${item.id}`} className="virgo-project-link"
              onMouseEnter={() => setSelectedProject(index)} onFocus={() => setSelectedProject(index)} onMouseLeave={() => setSelectedProject(null)}>
              <span className="virgo-row-star" aria-hidden="true" style={{ "--star-color": item.color } as CSSProperties}>●</span><strong>{item.name}</strong><small>{item.category}</small><ArrowUpRight size={17} />
            </a>)}
          </div>
          <a className="virgo-more" href="#/projects/all">{t(`Xem tất cả ${projects.length} dự án`, `Explore all ${projects.length} projects`)} <ArrowUpRight size={16} /></a>
          <p className="virgo-orbit-caption">{selectedProject === null ? t(`${projects.length} vệ tinh dự án đang quay`, `${projects.length} projects in orbit`) : `${String(selectedProject + 1).padStart(2, "0")} / ${projects[selectedProject].name}`}</p>
        </div>
      </section>

      <section className="virgo-overlay-panel virgo-skills-panel" aria-labelledby="virgo-skills-title" aria-hidden={active !== 4}>
        <div className="virgo-panel-content">
          <p className="virgo-kicker">03 / VINDEMIATRIX · {t("KỸ NĂNG", "SKILLS")}</p>
          <h2 id="virgo-skills-title">{t("Từng chi tiết.", "Every detail.")}<br /><em>{t("Một tổng thể.", "One whole.")}</em></h2>
          <p className="virgo-description">{t("Giao diện, dữ liệu và hệ thống: mình nối từng phần thành một trải nghiệm sử dụng được.", "Interfaces, data and systems: connecting the pieces into one usable experience.")}</p>
          <div className="virgo-skill-list">{capabilities.map((item, index) => <button key={item.id} type="button" aria-pressed={selectedSkill === index}
            onMouseEnter={() => setSelectedSkill(index)} onFocus={() => setSelectedSkill(index)} onClick={() => setSelectedSkill(index)}>
            <span className="virgo-row-star" aria-hidden="true">●</span>{item.title[lang]}
          </button>)}</div>
          <p className="virgo-skill-detail" aria-live="polite">{capabilities[selectedSkill].description[lang]}</p>
        </div>
      </section>

      <section className="virgo-overlay-panel" aria-labelledby="virgo-contact-title" aria-hidden={active !== 5}>
        <div className="virgo-panel-content">
          <p className="virgo-kicker">04 / ZAVIJAVA · {t("LIÊN HỆ", "CONTACT")}</p>
          <h2 id="virgo-contact-title">{t("Cùng tạo nên", "Let's make")}<br /><em>{t("điều có ý nghĩa.", "something that matters.")}</em></h2>
          <a className="virgo-email" href="mailto:lequangkhanh295@gmail.com">lequangkhanh295@gmail.com <ArrowUpRight size={20} /></a>
          <div className="virgo-contact-links">
            <a href="https://github.com/psy-zney" target="_blank" rel="noreferrer"><Github size={16} /> GitHub</a>
            <a href="https://www.linkedin.com/in/psy-zney295" target="_blank" rel="noreferrer"><Linkedin size={16} /> LinkedIn</a>
            <a href="#/cv/web">Web CV</a><a href="#/cv/mobile">Mobile CV</a>
          </div>
          <button className="virgo-workspace" onClick={onEnterWorkspace}>{t("Vào game 3D", "Enter the 3D world")} <ArrowUpRight size={17} /></button>
        </div>
      </section>
    </main>

    <div className={`virgo-opening-cue${active === 0 ? " is-active" : ""}`} aria-hidden="true"><ArrowDown size={19} /></div>
    <button ref={portalRef} className={`virgo-star-portal${active === 5 ? " is-active" : ""}`} type="button"
      aria-label={t("Chạm ngôi sao Zavijava để vào game 3D", "Enter the 3D world through Zavijava")}
      aria-hidden={active !== 5} tabIndex={active === 5 ? 0 : -1} onClick={onEnterWorkspace}>
      <span className="virgo-portal-ring" aria-hidden="true" /><span className="virgo-portal-label">{t("Vào game 3D", "Enter 3D world")} <ArrowUpRight size={13} /></span>
    </button>
    <div className="virgo-index" aria-hidden="true"><span>{String(active + 1).padStart(2, "0")}</span> / 06</div>
    <div className="virgo-station" aria-hidden="true">{active < 2 ? "VIRGO / OVERVIEW" : `${VIRGO_STARS[active - 2].name.toUpperCase()} / ${String(active - 1).padStart(2, "0")}`}</div>

    <dialog ref={dialogRef} className="virgo-dialog" aria-label={project?.name ?? (allProjects ? t("Tất cả dự án", "All projects") : "CV")}
      onCancel={event => { event.preventDefault(); closeDialog(); }}
      onClick={event => { if (event.target === event.currentTarget) closeDialog(); }}>
      <div className="virgo-dialog-inner" data-lenis-prevent>
        <button className="virgo-close" onClick={closeDialog} aria-label={t("Đóng", "Close")} autoFocus><X size={22} /></button>
        {allProjects && <article><p className="virgo-kicker">PORRIMA / ARCHIVE</p><h2>{t("Tất cả dự án", "All projects")}</h2><div className="virgo-archive">{projects.map((item, index) => <a key={item.id} href={`#/project/${item.id}`}
          onMouseEnter={() => setSelectedProject(index)} onFocus={() => setSelectedProject(index)} onMouseLeave={() => setSelectedProject(null)}>
          <span className="virgo-row-star" aria-hidden="true" style={{ "--star-color": item.color } as CSSProperties}>●</span><strong>{item.name}</strong><small>{item.category}</small><ArrowUpRight size={17} /></a>)}</div></article>}
        {project && <ProjectDetails project={project} lang={lang} />}
        {resumeTrack && <ResumePage track={resumeTrack} lang={lang} />}
      </div>
    </dialog>
  </div>;
}
