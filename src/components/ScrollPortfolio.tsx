import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowDown, ArrowUpRight, ArrowRight, X, Github, Linkedin, Box } from "lucide-react";
import { capabilities, projects, type Language, type Project } from "../data/portfolio";
import { ResumePage } from "./ResumePage";
import "./ScrollPortfolio.css";

const sections = ["home", "story", ...projects.map(p => `work-${p.id}`), "skills", "contact"];
const routeSection = (hash: string) => {
  const parts = hash.replace(/^#\//, "").split("/");
  if (parts[0] === "projects") return sections[2];
  if (parts[0] === "project" || parts[0] === "work") return `work-${parts[1]}`;
  if (parts[0] === "cv") return "contact";
  return sections.includes(parts[0]) ? parts[0] : "home";
};

function ProjectVisual({ project, lang }: { project: Project; lang: Language }) {
  if (project.id === "chemistry-lab") return <div className="sp-project-visual sp-lab"><img src="./img/chemistry-lab-3d.png" alt={lang === "vie" ? "Không gian Chemistry Lab 3D" : "Chemistry Lab 3D environment"} loading="lazy" /></div>;
  return <div className={`sp-project-visual sp-visual-${project.category}`} aria-hidden="true">
    <div className="sp-visual-orbit" />
    <div className="sp-object">
      <div className="sp-object-top"><span /><span /><span /><small>{project.name}</small></div>
      <div className="sp-object-body">
        <span className="sp-object-mark">{project.name.slice(0, 1)}<i>.</i></span>
        {project.id === "beatsync" ? <div className="sp-wave">{Array.from({ length: 27 }, (_, i) => <i key={i} style={{ height: `${20 + ((i * 31) % 80)}%` }} />)}</div> : <div className="sp-system-lines"><i /><i /><i /><i /></div>}
        <div className="sp-object-path">{project.path.map((step, i) => <span key={step}><b>0{i + 1}</b>{step}</span>)}</div>
      </div>
    </div>
    <span className="sp-visual-caption">{lang === "vie" ? "SƠ ĐỒ Ý TƯỞNG" : "CONCEPT STUDY"} / {project.category}</span>
  </div>;
}

export function ScrollPortfolio({ lang, onToggleLang, onEnterWorkspace }: { lang: Language; onToggleLang: () => void; onEnterWorkspace: () => void }) {
  const t = (vi: string, en: string) => lang === "vie" ? vi : en;
  const root = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const progressBar = useRef<HTMLElement>(null);
  const [hash, setHash] = useState(() => window.location.hash);
  const [active, setActive] = useState("home");
  const project = hash.startsWith("#/project/") ? projects.find(p => p.id === hash.split("/")[2]) : undefined;
  const track = hash === "#/cv/web" ? "web" : hash === "#/cv/mobile" ? "mobile" : undefined;
  const modal = !!project || !!track;

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    const section = root.current?.querySelector<HTMLElement>(`#${routeSection(hash)}`);
    section?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches || modal ? "instant" : "smooth", block: "start" });
    document.title = `${project?.name ?? (track ? "CV" : "Portfolio")} | Lê Quang Khánh — zney`;
  }, [hash, modal, project, track]);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) entry.target.classList.add("sp-seen");
        if (entry.intersectionRatio >= .5) setActive(entry.target.id);
      }
    }, { root: element, threshold: [.12, .5, .75] });
    element.querySelectorAll(".sp-panel").forEach(panel => observer.observe(panel));
    let frame = 0;
    const update = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        const progress = element.scrollTop / Math.max(1, element.scrollHeight - element.clientHeight);
        if (progressBar.current) progressBar.current.style.transform = `scaleX(${progress})`;
        frame = 0;
      });
    };
    element.addEventListener("scroll", update, { passive: true });
    return () => { observer.disconnect(); element.removeEventListener("scroll", update); cancelAnimationFrame(frame); };
  }, []);

  useEffect(() => {
    if (modal && !dialog.current?.open) dialog.current?.showModal();
    if (!modal && dialog.current?.open) dialog.current.close();
  }, [modal]);

  const close = () => { window.location.hash = project ? `#/work/${project.id}` : "#/contact"; };
  const current = active.startsWith("work-") ? "projects" : active;
  const nav = [["story", t("Giới thiệu", "About")], ["projects", t("Dự án", "Work")], ["skills", t("Năng lực", "Practice")], ["contact", t("Liên hệ", "Contact")]];

  return <div className="sp-shell" onClick={event => {
    // A repeated anchor still needs to work after the reader has scrolled away.
    const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#/"]');
    if (anchor?.hash === window.location.hash && !modal) {
      root.current?.querySelector(`#${routeSection(anchor.hash)}`)?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        block: "start",
      });
    }
  }}>
    <a className="sp-skip" href="#/projects">{t("Đến các dự án", "Skip to work")}</a>
    <header className="sp-header">
      <a href="#/home" className="sp-brand" aria-label="zney — Home">zney<span>®</span></a>
      <nav aria-label={t("Điều hướng chính", "Main navigation")}>{nav.map(([id, label]) => <a key={id} href={`#/${id}`} aria-current={current === id ? "location" : undefined}>{label}</a>)}</nav>
      <button className="sp-language" onClick={onToggleLang} aria-label={t("Switch to English", "Chuyển sang tiếng Việt")}>{lang === "vie" ? "EN" : "VI"}<span>↗</span></button>
    </header>

    <main ref={root} className="sp-scroll" tabIndex={0} aria-label={t("Portfolio — cuộn để khám phá", "Portfolio — scroll to explore")}>
      <section id="home" className="sp-panel sp-home sp-seen" aria-labelledby="sp-title">
        <div className="sp-home-top"><span>{t("LÊ QUANG KHÁNH · DEVELOPER", "LÊ QUANG KHÁNH · DEVELOPER")}</span><span>WEB / MOBILE / SYSTEMS</span></div>
        <div className="sp-hero-content">
          <p className="sp-eyebrow">{t("TÒ MÒ. TỈ MỈ. KHÔNG NGỪNG TẠO RA.", "CURIOUS MIND. THOUGHTFUL CODE.")}</p>
          <h1 id="sp-title">{t("Từ ý tưởng.", "From a thought.")}<br /><span>{t("Đến trải nghiệm.", "To an experience.")}</span></h1>
          <p className="sp-lead">{t("Mình là Khánh. Mình xây dựng giao diện tinh tế và những hệ thống kết nối phía sau.", "I’m Khánh. I build thoughtful interfaces and the connected systems behind them.")}</p>
        </div>
        <div className="sp-sculpture" aria-hidden="true"><div className="sp-sculpture-ring" /><div className="sp-sculpture-core" /><div className="sp-sculpture-ring sp-ring-two" /></div>
        <div className="sp-panel-bottom"><a href="#/story" className="sp-scroll-cue"><ArrowDown size={16} />{t("Cuộn để khám phá", "Scroll to explore")}</a><span>{t("Ý tưởng nhỏ. Khả năng rộng mở.", "Small ideas. Open possibilities.")}</span></div>
      </section>

      <section id="story" className="sp-panel sp-story" aria-labelledby="sp-story-title">
        <div className="sp-content sp-story-grid sp-reveal">
          <figure><img src="./social/AVT.jpg" alt="Lê Quang Khánh" loading="lazy" /><figcaption>Lê Quang Khánh <span>aka. zney</span></figcaption></figure>
          <div><p className="sp-eyebrow">01 / {t("NGƯỜI ĐỨNG SAU", "BEHIND THE WORK")}</p><h2 id="sp-story-title">{t("Bắt đầu bằng", "It starts with")}<br /><em>{t("một câu hỏi.", "a question.")}</em></h2><p className="sp-lead">{t("Làm sao để nhiều thiết bị nghe cùng một bài nhạc? Một chiếc điện thoại có thể bảo vệ chiếc PC ở xa thế nào?", "How can several devices share one song? How can a phone protect a PC miles away?")}</p><p className="sp-body">{t("Mình đi từ điều người dùng muốn làm, qua giao diện, dữ liệu và hệ thống để biến nó thành một trải nghiệm sử dụng được.", "I start with what someone needs to do, then work through interfaces, data, and systems to make it happen.")}</p><div className="sp-story-note"><span>UEH · {t("Công nghệ thông tin", "Information Technology")}</span><span>{t("Dự kiến tốt nghiệp 08.2027", "Expected graduation 08.2027")}</span></div></div>
        </div>
      </section>

      {projects.map((p, i) => <section key={p.id} id={`work-${p.id}`} className={`sp-panel sp-work ${i % 2 ? "sp-work-light" : "sp-work-dark"}`} style={{ "--sp-accent": p.color } as CSSProperties} aria-labelledby={`title-${p.id}`}>
        <div className="sp-work-top"><span>02 / {t("DỰ ÁN CHỌN LỌC", "SELECTED WORK")}</span><span>{String(i + 1).padStart(2, "0")} — {String(projects.length).padStart(2, "0")}</span></div>
        <div className="sp-content sp-work-grid sp-reveal">
          <div className="sp-work-copy"><p className="sp-eyebrow">{p.name} <span>· {p.year}</span></p><h2 id={`title-${p.id}`}>{p.headline[lang]}</h2><p className="sp-lead">{p.summary[lang]}</p><div className="sp-tags">{p.stack.slice(0, 4).map(s => <span key={s}>{s}</span>)}</div><div className="sp-actions"><a className="sp-button" href={`#/project/${p.id}`}>{t("Khám phá dự án", "Explore project")}<ArrowUpRight size={17} /></a>{p.source && <a className="sp-icon-link" href={p.source} target="_blank" rel="noreferrer" aria-label={`${p.name} — GitHub`}><Github size={20} /></a>}{p.demo && <a className="sp-text-link" href={p.demo} target="_blank" rel="noreferrer">{t("Trải nghiệm", "Live site")}<ArrowUpRight size={15} /></a>}</div></div>
          <ProjectVisual project={p} lang={lang} />
        </div>
        <div className="sp-panel-bottom"><span>{p.role[lang]}</span><span>{p.category.toUpperCase()} <ArrowDown size={14} /></span></div>
      </section>)}

      <section id="skills" className="sp-panel sp-skills" aria-labelledby="sp-skills-title"><div className="sp-content sp-skills-grid sp-reveal"><div><p className="sp-eyebrow">03 / {t("CÁCH MÌNH LÀM VIỆC", "MY PRACTICE")}</p><h2 id="sp-skills-title">{t("Từng chi tiết.", "Every detail.")}<br /><em>{t("Một tổng thể.", "One whole.")}</em></h2><p className="sp-lead">{t("Giao diện, dữ liệu và hệ thống. Mỗi phần đều góp vào trải nghiệm cuối cùng.", "Interfaces, data, and systems. Every part shapes the experience.")}</p></div><div className="sp-capabilities">{capabilities.map(c => <details key={c.id}><summary><span>{c.number}</span><strong>{c.title[lang]}</strong><span className="sp-plus">+</span></summary><p>{c.description[lang]}</p><div className="sp-tags">{c.tools.map(tool => <span key={tool}>{tool}</span>)}</div></details>)}</div></div></section>

      <section id="contact" className="sp-panel sp-contact" aria-labelledby="sp-contact-title"><div className="sp-contact-content sp-reveal"><p className="sp-eyebrow">04 / {t("MỘT KHỞI ĐẦU MỚI", "THE NEXT CHAPTER")}</p><h2 id="sp-contact-title">{t("Cùng tạo nên", "Let’s make")}<br /><em>{t("điều có ý nghĩa.", "something matter.")}</em></h2><a className="sp-email" href="mailto:lequangkhanh295@gmail.com">lequangkhanh295@gmail.com <ArrowUpRight /></a><div className="sp-contact-links"><a href="https://github.com/psy-zney" target="_blank" rel="noreferrer"><Github size={17} /> GitHub</a><a href="https://www.linkedin.com/in/psy-zney295" target="_blank" rel="noreferrer"><Linkedin size={17} /> LinkedIn</a><a href="#/cv/web">Web CV <ArrowUpRight size={16} /></a><a href="#/cv/mobile">Mobile CV <ArrowUpRight size={16} /></a></div><button onClick={onEnterWorkspace} className="sp-workspace"><Box size={18} />{t("Ghé không gian 3D của mình", "Step inside my 3D workspace")}<ArrowRight size={17} /></button></div><div className="sp-panel-bottom"><span>© {new Date().getFullYear()} zney</span><a href="#/home">{t("Về đầu trang", "Back to top")} ↑</a></div></section>
    </main>
    <div className="sp-progress" aria-hidden="true"><i ref={progressBar} style={{ transform: "scaleX(0)" }} /></div>
    <div className="sp-position" aria-hidden="true">{String(sections.indexOf(active) + 1).padStart(2, "0")}<span>/ {String(sections.length).padStart(2, "0")}</span></div>

    <dialog ref={dialog} className="sp-dialog" aria-label={project?.name ?? "CV"} onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="sp-dialog-inner"><button className="sp-close" autoFocus onClick={close} aria-label={t("Đóng", "Close")}><X size={22} /></button>
        {project && <article className="sp-detail"><p className="sp-eyebrow">{project.name} / {project.year}</p><h2>{project.headline[lang]}</h2><p className="sp-lead">{project.summary[lang]}</p><p className="sp-detail-role">{project.role[lang]}</p><h3>{t("Bài toán", "The challenge")}</h3><p>{project.problem[lang]}</p><h3>{t("Đóng góp của mình", "My contribution")}</h3><ul>{project.contributions.map((c, i) => <li key={i}>{c[lang]}</li>)}</ul><h3>{t("Quyết định kỹ thuật", "Engineering decisions")}</h3><p>{project.decision[lang]}</p><h3>{t("Điều đọng lại", "The takeaway")}</h3><p>{project.takeaway[lang]}</p>{project.note && <aside>{project.note[lang]}</aside>}<div className="sp-tags">{project.stack.map(s => <span key={s}>{s}</span>)}</div><div className="sp-actions">{project.demo && <a className="sp-button" href={project.demo} target="_blank" rel="noreferrer">{t("Mở dự án", "Open project")}<ArrowUpRight size={17} /></a>}{project.source && <a className="sp-text-link" href={project.source} target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={17} /></a>}</div></article>}
        {track && <ResumePage track={track} lang={lang} />}
      </div>
    </dialog>
  </div>;
}
