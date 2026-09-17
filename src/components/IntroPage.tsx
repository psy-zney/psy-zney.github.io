import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Github,
  Globe2,
  Linkedin,
  Menu,
  Orbit,
  Pause,
  Play,
  Sparkles,
  X,
  Braces,
  Network,
  Smartphone,
  Box,
  Rocket,
} from "lucide-react";
import {
  capabilities,
  copy,
  projects,
  type Language,
  type Project,
} from "../data/portfolio";
import "./Portfolio.css";
import { ResumePage } from "./ResumePage";
import { chapterForHash, journey } from "../data/journey";
import {
  ChapterHeading,
  ChapterPassage,
  DepartureRoutes,
  JourneyAtmosphere,
  useStarFlight,
} from "./StarJourney";
import {
  CosmicTransitionOverlay,
  getRouteAnchor,
  type CelestialPoint,
  type TransitionPhase,
} from "./CosmicTransition";

interface IntroPageProps {
  onEnterWorkspace: () => void;
  lang: Language;
  onToggleLang: () => void;
}
const chapters = [
  { id: "story", label: copy("Câu chuyện", "My story") },
  { id: "projects", label: copy("Dự án", "Selected work") },
  { id: "skills", label: copy("Năng lực", "Capabilities") },
  { id: "contact", label: copy("Kết nối", "Contact") },
];
const stars = Array.from(
  { length: 65 },
  (_, i) =>
    ({
      left: `${((i * 73 + 17) % 997) / 10}%`,
      top: `${((i * 137 + 29) % 991) / 10}%`,
      "--delay": `${-(i % 9)}s`,
      "--size": `${i % 7 === 0 ? 3 : 1}px`,
    }) as CSSProperties,
);

function ProjectArt({
  project,
  large = false,
}: {
  project: Project;
  large?: boolean;
}) {
  return (
    <div
      className={`project-art art-${project.id} ${large ? "art-large" : ""}`}
      data-depth
      style={{ "--planet-color": project.color } as CSSProperties}
      aria-hidden="true"
    >
      <div className="art-grid" />
      {project.id === "chemistry-lab" && (
        <img
          className="art-gameplay"
          src="./img/chemistry-lab-3d.png"
          alt=""
          loading={large ? "eager" : "lazy"}
        />
      )}
      <div className="art-orbit orbit-one" />
      <div className="art-orbit orbit-two" />
      <div className="art-planet" />
      {project.id === "beatsync" && (
        <div className="audio-bars">
          {Array.from({ length: 25 }, (_, i) => (
            <i
              key={i}
              style={
                {
                  height: `${18 + ((i * 37) % 75)}%`,
                  "--bar-delay": `${i * -0.13}s`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}
      <span className="art-coordinate">
        {String(projects.indexOf(project) + 1).padStart(2, "0")} / ZNEY
        EXPLORATIONS
      </span>
      <span className="art-label">{project.name}</span>
      <span className="art-cross">+</span>
    </div>
  );
}

function Constellation({ lang }: { lang: Language }) {
  const nodes = [
    {
      id: "study-cabin",
      label: "Study Cabin",
      star: "β Zavijava",
      x: 18,
      y: 16,
      cls: "node-blue",
    },
    {
      id: "mandy-crimson",
      label: "Mandy Crimson",
      star: "η Zaniah",
      x: 33,
      y: 25,
      cls: "node-pink",
    },
    {
      id: "sentinellan",
      label: "SentinelLAN",
      star: "γ Porrima",
      x: 50,
      y: 26,
      cls: "node-gold",
    },
    {
      id: "cloud-pos",
      label: "Cloud POS",
      star: "δ Minelauva",
      x: 67,
      y: 23,
      cls: "node-gold",
    },
    {
      id: "chemistry-lab",
      label: "Chemistry Lab 3D",
      star: "ε Vindemiatrix",
      x: 81,
      y: 15,
      cls: "node-cyan",
    },
    {
      id: "backup-data",
      label: "Zney Backup",
      star: "θ Vir",
      x: 25,
      y: 56,
      cls: "node-lavender",
    },
    {
      id: "security-core",
      label: "Security Core",
      star: "ζ Heze",
      x: 73,
      y: 54,
      cls: "node-green",
    },
    {
      id: "beatsync",
      label: "BeatSync",
      star: "α Spica",
      x: 48,
      y: 78,
      cls: "node-blue node-spica",
    },
    {
      id: "luckyfood",
      label: "LuckyFood",
      star: "ι Syrma",
      x: 74,
      y: 70,
      cls: "node-cream",
    },
    {
      id: "micro4nerds",
      label: "Micro4Nerds",
      star: "μ Rijl al Awwa",
      x: 86,
      y: 84,
      cls: "node-purple",
    },
  ];

  const constellationPath =
    "M18 16 33 25 50 26 67 23 81 15 M50 26 25 56 48 78 73 54 50 26 M50 26 48 78 M73 54 74 70 86 84 M48 78 74 70";

  return (
    <div className="constellation-viewport" data-depth>
      <div
        className="constellation"
        aria-label={
          lang === "vie"
            ? "Chòm sao Xử Nữ (Virgo) — chọn một ngôi sao để khám phá dự án"
            : "Virgo constellation — choose a star to explore projects"
        }
      >
        <div className="constellation-halo" />
        <div className="constellation-dust" />
        <div className="celestial-ring ring-outer" />
        <div className="celestial-ring ring-ecliptic" />
        <div className="celestial-ring ring-inner" />
        <svg
          className="constellation-lines"
          viewBox="0 0 100 100"
          aria-hidden="true"
          data-flight
        >
          <defs>
            <linearGradient
              id="starlight-beam"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#a8c8ff" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="100%" stopColor="#7ad3ff" stopOpacity="0.4" />
            </linearGradient>
          </defs>
          <path className="line-glow" d={constellationPath} />
          <path className="line-base" d={constellationPath} />
          <path className="line-pulse" d={constellationPath} />
          <path
            data-flight-path
            className="flight-base"
            d="M18 16 L33 25 L50 26 L67 23 L81 15 L67 23 L50 26 L25 56 L48 78 L73 54 L74 70 L86 84"
          />
          <path
            data-flight-trail
            className="flight-trail"
            pathLength="100"
            strokeDasharray="0 100"
            d="M18 16 L33 25 L50 26 L67 23 L81 15 L67 23 L50 26 L25 56 L48 78 L73 54 L74 70 L86 84"
          />
          <g
            data-flight-runner
            transform="translate(18 16)"
            className="flight-runner"
          >
            <circle r="4" className="flight-corona" />
            <circle r="1.1" />
            <path d="M-5 0H5M0-5V5" />
          </g>
        </svg>
        <a
          className="central-star"
          href="#/story"
          aria-label={
            lang === "vie" ? "Đọc câu chuyện của Khánh" : "Read Khanh’s story"
          }
        >
          <Sparkles size={26} />
          <span>Z</span>
        </a>
        {nodes.map((node) => (
          <a
            key={node.id}
            href={`#/project/${node.id}`}
            className={`constellation-node ${node.cls}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            title={`${node.label} · ${node.star}`}
          >
            <div className="star-point-wrap">
              <i />
              <span className="star-flare" />
              <span className="star-ripple" />
            </div>
            <span>{node.label}</span>
            <small className="node-star-name">{node.star}</small>
          </a>
        ))}
        <span className="map-coordinate coordinate-top">
          VIRGO ♍ &nbsp; 13h 25m · -11°09′ &nbsp; | &nbsp; 10°49′ N 106°41′ E
        </span>
        <span className="map-coordinate coordinate-bottom">
          {lang === "vie"
            ? "CHÒM SAO XỬ NỮ · MỖI DỰ ÁN, MỘT ĐIỂM KẾT NỐI"
            : "VIRGO CONSTELLATION · EACH PROJECT, A POINT OF CONNECTION"}
        </span>
      </div>
    </div>
  );
}

function ProjectDetail({
  project,
  lang,
}: {
  project: Project;
  lang: Language;
}) {
  const t = (vi: string, en: string) => (lang === "vie" ? vi : en);
  const next = projects[(projects.indexOf(project) + 1) % projects.length];
  return (
    <article className="case-page page-enter">
      <a className="text-link" href="#/projects">
        <ArrowLeft size={16} />
        {t("Trở lại các dự án", "Back to selected work")}
      </a>
      <div className="case-heading">
        <p className="eyebrow">
          {t("NHẬT KÝ DỰ ÁN", "PROJECT FIELD NOTES")} / {project.year}
        </p>
        <h1>
          {project.name}
          <span>{project.headline[lang]}</span>
        </h1>
        <p className="lead">{project.summary[lang]}</p>
      </div>
      <div className="case-meta">
        <div>
          <span>{t("VAI TRÒ CỦA MÌNH", "MY ROLE")}</span>
          <p>{project.role[lang]}</p>
        </div>
        <div>
          <span>{t("CÔNG NGHỆ", "BUILT WITH")}</span>
          <p>{project.stack.join(" · ")}</p>
        </div>
      </div>
      <ProjectArt project={project} large />
      {project.note && <p className="case-note">{project.note[lang]}</p>}
      <div className="case-body">
        <aside>
          <p className="eyebrow">{t("KHÁM PHÁ THỰC TẾ", "EXPLORE THE WORK")}</p>
          {project.demo && (
            <a
              className="text-link"
              href={project.demo}
              target="_blank"
              rel="noreferrer"
            >
              {t("Mở sản phẩm", "Visit project")}
              <ArrowUpRight size={16} />
            </a>
          )}
          {project.source && (
            <a
              className="text-link"
              href={project.source}
              target="_blank"
              rel="noreferrer"
            >
              <Github size={16} />
              {t("Xem mã nguồn", "View source")}
            </a>
          )}
          <a className="text-link" href="#/contact">
            {t("Trao đổi về dự án", "Let’s talk about it")}
            <ArrowRight size={16} />
          </a>
        </aside>
        <div className="case-narrative">
          <section>
            <p className="eyebrow">01 / {t("BỐI CẢNH", "CONTEXT")}</p>
            <h2>
              {t("Vấn đề bắt đầu từ đâu?", "Where does the problem begin?")}
            </h2>
            <p>{project.problem[lang]}</p>
          </section>
          <section>
            <p className="eyebrow">
              02 / {t("PHẦN MÌNH ĐÓNG GÓP", "MY CONTRIBUTION")}
            </p>
            <h2>
              {t(
                "Biến ý tưởng thành từng phần cụ thể.",
                "Making the idea concrete.",
              )}
            </h2>
            <ul className="contribution-list">
              {project.contributions.map((item, i) => (
                <li key={i}>
                  <Check size={18} />
                  <span>{item[lang]}</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <p className="eyebrow">
              03 / {t("QUYẾT ĐỊNH KỸ THUẬT", "ENGINEERING DECISION")}
            </p>
            <h2>
              {t("Cách các phần được nối lại.", "How the pieces fit together.")}
            </h2>
            <div className="architecture-flow">
              {project.path.map((step, i) => (
                <div key={step}>
                  <span>{step}</span>
                  {i < project.path.length - 1 && <ArrowRight size={18} />}
                </div>
              ))}
            </div>
            <p>{project.decision[lang]}</p>
          </section>
          <section className="case-takeaway">
            <p className="eyebrow">
              04 / {t("ĐIỀU DỰ ÁN THỂ HIỆN", "WHAT THIS WORK SHOWS")}
            </p>
            <h2>{project.takeaway[lang]}</h2>
            <div className="skill-links">
              {capabilities
                .filter((skill) => skill.projects.includes(project.id))
                .map((skill) => (
                  <a href={`#/skills/${skill.id}`} key={skill.id}>
                    {skill.title[lang]}
                    <ArrowUpRight size={14} />
                  </a>
                ))}
            </div>
          </section>
        </div>
      </div>
      <a className="next-project" href={`#/project/${next.id}`}>
        <div>
          <p className="eyebrow">
            {t("TIẾP TỤC HÀNH TRÌNH", "CONTINUE EXPLORING")}
          </p>
          <h2>{next.name}</h2>
          <p>{next.headline[lang]}</p>
        </div>
        <ArrowRight size={32} />
      </a>
    </article>
  );
}

export function IntroPage({
  onEnterWorkspace,
  lang,
  onToggleLang,
}: IntroPageProps) {
  const t = (vi: string, en: string) => (lang === "vie" ? vi : en);
  const [hash, setHash] = useState(window.location.hash);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [paused, setPaused] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [displayedHash, setDisplayedHash] = useState(
    () => window.location.hash || "#/home",
  );
  const [transitionPhase, setTransitionPhase] =
    useState<TransitionPhase>("idle");
  const [originAnchor, setOriginAnchor] = useState<CelestialPoint>(() =>
    getRouteAnchor(window.location.hash || "#/home"),
  );
  const [targetAnchor, setTargetAnchor] = useState<CelestialPoint>(() =>
    getRouteAnchor(window.location.hash || "#/home"),
  );
  const transitionTimeouts = useRef<number[]>([]);
  const displayedHashRef = useRef(displayedHash);
  displayedHashRef.current = displayedHash;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const handleCosmicTransition = (nextHash: string) => {
    const currentHash = displayedHashRef.current;
    if (nextHash === currentHash) return;

    transitionTimeouts.current.forEach(clearTimeout);
    transitionTimeouts.current = [];

    if (pausedRef.current) {
      setDisplayedHash(nextHash);
      setTransitionPhase("idle");
      return;
    }

    const fromAnchor = getRouteAnchor(currentHash);
    const toAnchor = getRouteAnchor(nextHash);
    setOriginAnchor(fromAnchor);
    setTargetAnchor(toAnchor);
    setTransitionPhase("collapsing");

    const t1 = window.setTimeout(() => {
      setTransitionPhase("shooting");
      setDisplayedHash(nextHash);
      if (!nextHash.startsWith("#/skills/")) {
        root.current?.scrollTo({ top: 0, behavior: "instant" });
      }
    }, 360);

    const t2 = window.setTimeout(() => {
      setTransitionPhase("expanding");
    }, 860);

    const t3 = window.setTimeout(() => {
      setTransitionPhase("idle");
    }, 1280);

    transitionTimeouts.current = [t1, t2, t3];
  };

  const readingProgress = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLElement>(null);
  const initialRoute = useRef(true);
  const page = chapterForHash(displayedHash);
  const resumeTrack =
    displayedHash === "#/cv/web"
      ? "web"
      : displayedHash === "#/cv/mobile"
        ? "mobile"
        : undefined;
  const projectId = displayedHash.startsWith("#/project/")
    ? displayedHash.slice(10)
    : undefined;
  const project = projects.find((item) => item.id === projectId);
  const active = projectId ? "projects" : resumeTrack ? "contact" : page?.id;
  useStarFlight(root, displayedHash, paused, filter);

  useEffect(() => {
    return () => {
      transitionTimeouts.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    const sync = () => {
      const nextHash = window.location.hash || "#/home";
      setHash(nextHash);
      setMenuOpen(false);
      handleCosmicTransition(nextHash);
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPaused(media.matches);
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!displayedHash.startsWith("#/skills/")) {
        root.current?.scrollTo({ top: 0, behavior: "instant" });
      } else {
        document
          .getElementById(displayedHash.replace("#/skills/", "skill-"))
          ?.scrollIntoView({ behavior: "instant" });
      }
      if (!initialRoute.current) main.current?.focus({ preventScroll: true });
      initialRoute.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [displayedHash, projectId, resumeTrack]);
  useEffect(() => {
    document.title = resumeTrack
      ? `${resumeTrack === "web" ? "Full-stack Web" : "Mobile"} CV | Lê Quang Khánh`
      : project
        ? `${project.name} | Lê Quang Khánh — zney`
        : `${page ? page.label[lang] : "404"} | Lê Quang Khánh — zney`;
  }, [project, resumeTrack, page, lang]);
  useEffect(() => {
    if (!root.current) return;
    const reveal = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            reveal.unobserve(entry.target);
          }
        });
      },
      { root: root.current, threshold: 0.08 },
    );
    root.current
      .querySelectorAll(".reveal")
      .forEach((el) => reveal.observe(el));
    return () => {
      reveal.disconnect();
    };
  }, [displayedHash, filter]);

  return (
    <div
      ref={root}
      className={`portfolio ${paused ? "motion-paused" : "motion-enabled"}`}
      style={{ "--chapter-color": (page ?? journey[2]).color } as CSSProperties}
      onKeyDown={(event) => {
        if (event.key === "Escape" && menuOpen) {
          setMenuOpen(false);
          root.current
            ?.querySelector<HTMLButtonElement>(".menu-toggle")
            ?.focus();
        }
      }}
      onClickCapture={(event) => {
        const link = (event.target as HTMLElement).closest<HTMLAnchorElement>(
          'a[href^="#/"]',
        );
        if (
          link &&
          link.getAttribute("href") === displayedHash &&
          !projectId &&
          !resumeTrack
        ) {
          event.preventDefault();
          if (displayedHash.startsWith("#/skills/"))
            document
              .getElementById(displayedHash.replace("#/skills/", "skill-"))
              ?.scrollIntoView({ behavior: paused ? "instant" : "smooth" });
          else
            root.current?.scrollTo({
              top: 0,
              behavior: paused ? "instant" : "smooth",
            });
          setMenuOpen(false);
        }
      }}
    >
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          main.current?.focus();
        }}
      >
        {t("Đến nội dung chính", "Skip to content")}
      </a>
      <div className="star-field" aria-hidden="true">
        {stars.map((style, i) => (
          <i key={i} style={style} />
        ))}
      </div>
      {!resumeTrack && <JourneyAtmosphere chapter={page ?? journey[2]} />}
      <header className="portfolio-header">
        <a className="brand" href="#/home" aria-label="zney — Home">
          <Sparkles size={21} />
          <span>
            zney<span className="brand-dot">.</span>
          </span>
        </a>
        <nav
          className={`main-nav ${menuOpen ? "is-open" : ""}`}
          aria-label={t("Điều hướng chính", "Main navigation")}
          id="portfolio-navigation"
        >
          {chapters.map((chapter) => (
            <a
              key={chapter.id}
              href={`#/${chapter.id}`}
              aria-current={active === chapter.id ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {chapter.label[lang]}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="language-toggle"
            onClick={onToggleLang}
            aria-label={
              lang === "vie" ? "Switch to English" : "Chuyển sang tiếng Việt"
            }
          >
            <Globe2 size={14} />
            {lang === "vie" ? "EN" : "VI"}
          </button>
          <a className="header-cv" href="#/contact">
            CV <ArrowDown size={13} />
          </a>
          <button
            className="menu-toggle"
            aria-label={t("Mở hoặc đóng menu", "Toggle navigation")}
            aria-expanded={menuOpen}
            aria-controls="portfolio-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
        <div
          ref={readingProgress}
          className="reading-progress"
          style={{ transform: "scaleX(0)" }}
        />
      </header>
      <CosmicTransitionOverlay
        phase={transitionPhase}
        origin={originAnchor}
        target={targetAnchor}
      />
      <main
        id="main-content"
        ref={main}
        tabIndex={-1}
        key={page?.id ?? displayedHash}
        className={`route-content page-enter ${
          transitionPhase === "collapsing"
            ? "page-cosmic-collapse"
            : transitionPhase === "expanding"
              ? "page-cosmic-unfold"
              : ""
        }`}
        style={
          {
            "--origin-x": `${originAnchor.x}%`,
            "--origin-y": `${originAnchor.y}%`,
            "--target-x": `${targetAnchor.x}%`,
            "--target-y": `${targetAnchor.y}%`,
          } as CSSProperties
        }
      >
        {resumeTrack ? (
          <ResumePage key={resumeTrack} track={resumeTrack} lang={lang} />
        ) : project ? (
          <ProjectDetail key={project.id} project={project} lang={lang} />
        ) : projectId || !page ? (
          <section className="not-found">
            <p className="eyebrow">404 / LOST IN SPACE</p>
            <h1>
              {t(
                "Ngôi sao này chưa có trên bản đồ.",
                "This star isn’t on the map.",
              )}
            </h1>
            <a className="primary-link" href="#/projects">
              {t("Về các dự án", "Back to projects")}
              <ArrowRight size={16} />
            </a>
          </section>
        ) : (
          <>
            {page.id !== "home" && (
              <ChapterHeading chapter={page} lang={lang} />
            )}
            {page.id === "home" && (
              <>
                <section className="hero section-shell" id="home" data-chapter>
                  <div className="hero-copy page-enter">
                    <p className="eyebrow">
                      <span className="status-dot" />
                      {t(
                        "LÊ QUANG KHÁNH · LẬP TRÌNH VIÊN",
                        "LÊ QUANG KHÁNH · DEVELOPER",
                      )}
                    </p>
                    <h1>
                      {t("Từ những điều", "A little curiosity.")}
                      <br />
                      {t("tò mò nhỏ,", "A wider")}
                      <br />
                      <em>{t("mở một vũ trụ.", "universe.")}</em>
                    </h1>
                    <p className="hero-description">
                      {t(
                        "Mình là Khánh, hay zney. Mình xây dựng ứng dụng web, mobile và những hệ thống kết nối chúng — bắt đầu từ vấn đề gần gũi, đi sâu vào cách mọi thứ hoạt động.",
                        "I’m Khanh, also known as zney. I build web apps, mobile experiences, and the systems that connect them — starting with everyday problems and exploring how things work.",
                      )}
                    </p>
                    <div className="hero-actions">
                      <a className="primary-link" href="#/projects">
                        {t("Khám phá dự án", "Explore my work")}
                        <ArrowUpRight size={17} />
                      </a>
                      <a className="text-link" href="#/story">
                        {t("Câu chuyện của mình", "The story behind it")}
                        <ArrowRight size={16} />
                      </a>
                    </div>
                    <div className="hero-facts">
                      <span>HCMC, VIETNAM</span>
                      <span>WEB · MOBILE · SYSTEMS</span>
                    </div>
                  </div>
                  <div className="hero-map page-enter">
                    <Constellation lang={lang} />
                    <p className="map-caption">
                      <span>
                        {String(projects.length).padStart(2, "0")} PROJECTS
                      </span>
                      {t(
                        "Những dự án tạo nên góc nhìn của mình.",
                        "The projects that shape my perspective.",
                      )}
                    </p>
                  </div>
                  <div className="hero-bottom">
                    <a href="#/story">
                      <ArrowDown size={15} />
                      {t(
                        "Chặng tiếp theo: câu chuyện",
                        "Next chapter: my story",
                      )}
                    </a>
                    <span>
                      {t(
                        "TÌM CƠ HỘI THỰC TẬP · WEB / MOBILE",
                        "SEEKING INTERNSHIP OPPORTUNITIES · WEB / MOBILE",
                      )}
                    </span>
                  </div>
                </section>
                <DepartureRoutes
                  lang={lang}
                  onEnterWorkspace={onEnterWorkspace}
                />
              </>
            )}

            {page.id === "story" && (
              <>
                <section
                  className="story-section section-shell"
                  id="story"
                  data-chapter
                >
                  <div className="section-kicker reveal">
                    <span>01 / {t("ĐIỂM KHỞI ĐẦU", "THE STARTING POINT")}</span>
                    <span className="small-star">✦</span>
                  </div>
                  <div className="story-grid">
                    <div className="reveal">
                      <h2>
                        {t(
                          "Mỗi dự án là một câu hỏi.",
                          "Every project starts with a question.",
                        )}
                        <br />
                        <em>
                          {t(
                            "Các câu trả lời dần nối lại.",
                            "The answers connect.",
                          )}
                        </em>
                      </h2>
                      <figure className="portrait">
                        <img
                          src="./social/AVT.jpg"
                          alt={t(
                            "Chân dung Lê Quang Khánh",
                            "Portrait of Le Quang Khanh",
                          )}
                          loading="lazy"
                        />
                        <figcaption>
                          <span>Lê Quang Khánh</span>
                          <span>aka. zney / UEH</span>
                        </figcaption>
                      </figure>
                    </div>
                    <div className="story-copy reveal">
                      <p className="story-opening">
                        {t(
                          "Làm sao để nhiều thiết bị nghe cùng một bài nhạc? Một chiếc điện thoại có thể bảo vệ chiếc PC ở xa thế nào? Và một bảng Excel có thể trở thành công cụ hữu ích cho một cửa hàng không?",
                          "How can several devices listen to the same track? How can a phone help protect a distant PC? Can a spreadsheet become a useful tool for a small business?",
                        )}
                      </p>
                      <p>
                        {t(
                          "Nhìn lại các dự án của mình, có một mạch chung: bắt đầu từ việc người dùng muốn làm, rồi đi qua giao diện, dữ liệu và hệ thống để biến nó thành một luồng sử dụng được.",
                          "Looking across my projects, a common thread emerges: start with what someone needs to do, then work through the interface, data, and system to make that flow usable.",
                        )}
                      </p>
                      <p>
                        {t(
                          "Mình đang học Công nghệ thông tin tại UEH, dự kiến tốt nghiệp tháng 8/2027. Những dự án cá nhân, dự án nhóm và công cụ cho khách hàng nhỏ cho mình các góc nhìn khác nhau về việc xây dựng phần mềm.",
                          "I’m studying Information Technology at UEH, with graduation expected in August 2027. Personal projects, team work, and a tool for a small business have given me different perspectives on building software.",
                        )}
                      </p>
                      <blockquote>
                        {t(
                          "Điều mình muốn nối lại: sự tỉ mỉ trong từng tương tác và hiểu biết về hệ thống phía sau.",
                          "What I want to connect: care for each interaction and an understanding of the system behind it.",
                        )}
                      </blockquote>
                      <a className="text-link" href="#/projects">
                        {t(
                          "Xem câu chuyện qua những gì mình xây dựng",
                          "See that story through the work",
                        )}
                        <ArrowRight size={16} />
                      </a>
                    </div>
                  </div>
                  <div className="journey-notes reveal">
                    {[
                      [
                        t("Hiểu nhu cầu", "Understand the need"),
                        t(
                          "Bắt đầu từ người sẽ sử dụng.",
                          "Start with the person using it.",
                        ),
                      ],
                      [
                        t("Nối các thành phần", "Connect the pieces"),
                        t(
                          "Giao diện, dữ liệu và hệ thống.",
                          "Interface, data, and system.",
                        ),
                      ],
                      [
                        t("Đưa vào thực tế", "Make it usable"),
                        t(
                          "Triển khai, quan sát, hoàn thiện.",
                          "Deploy, observe, and refine.",
                        ),
                      ],
                    ].map(([title, description], i) => (
                      <div key={i}>
                        <span className="journey-number">0{i + 1}</span>
                        <h3>{title}</h3>
                        <p>{description}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section
                  className="story-milestones-section section-shell"
                  style={{ marginTop: "70px" }}
                >
                  <div className="section-kicker reveal">
                    <span>
                      02 /{" "}
                      {t(
                        "NHỮNG BƯỚC NGOẶT BẤT NGỜ",
                        "UNEXPECTED TURNS & MEMORIES",
                      )}
                    </span>
                    <span className="small-star">✦</span>
                  </div>
                  <div className="section-heading reveal">
                    <h2>
                      {t(
                        "Những mảnh ghép làm nên zney.",
                        "The quirks and sparks behind zney.",
                      )}
                    </h2>
                    <p>
                      {t(
                        "Không phải mọi con đường đều thẳng tắp. Đôi khi những cú rẽ tình cờ và sự bền bỉ âm thầm lại mở ra cả một vũ trụ mới.",
                        "Not every trajectory is a straight line. Sometimes accidental pivots and quiet determination open up an entire new orbit.",
                      )}
                    </p>
                  </div>
                  <div className="story-milestones-grid">
                    {[
                      {
                        icon: "🧪",
                        tag: t("Bước ngoặt học trò", "The Crush Catalyst"),
                        title: t(
                          "Học Hoá vì crush & Á khoa môn Hoá trường THPTQG",
                          "Mastering Chemistry for a Crush & High School Salutatorian",
                        ),
                        desc: t(
                          "Từ một người không mấy mặn mà với Hoá, vì muốn đủ trình độ để chỉ bài cho crush mà mình đã quyết tâm cày nát từng phản ứng và bài tập. Kết quả ngoài mong đợi: điểm Hoá luôn chạm ngưỡng gần 10 suốt từ lớp 9 đến hết cấp 3, và trở thành Á khoa môn Hoá toàn trường trong kỳ thi tốt nghiệp THPTQG. Động lực đôi khi đến từ những điều ngây ngô nhất!",
                          "Starting from square one with zero enthusiasm for chemistry, pure determination to help my crush with questions drove me to relentlessly study. The payoff: near-perfect scores from 9th grade all the way through high school, concluding as the school's Salutatorian in Chemistry on the National High School Exam. Great journeys often ignite from the simplest sparks.",
                        ),
                      },
                      {
                        icon: "⚡",
                        tag: t("Cú lội ngược dòng", "The Underdog Turnaround"),
                        title: t(
                          "Thủ khoa môn Vật lý toàn trường 2023",
                          "School Valedictorian in Physics (2023)",
                        ),
                        desc: t(
                          "Vật lý từng là môn mình cảm thấy yếu nhất và nhiều phen hoang mang nhất trong các môn tự nhiên. Nhưng chính sự kiên trì đào sâu vào bản chất hiện tượng thay vì học vẹt công thức đã tạo nên bước ngoặt ngoạn mục: bứt phá giành ngôi vị Thủ khoa môn Vật lý toàn trường năm 2023.",
                          "Physics was once my most daunting subject, filled with doubt and confusion. Instead of mechanically memorizing formulas, I shifted to questioning first principles and physical mechanics — culminating in an underdog triumph as the school's top-ranking Valedictorian in Physics in 2023.",
                        ),
                      },
                      {
                        icon: "📐",
                        tag: t("Tư duy thuở nhỏ", "The Math Foundation"),
                        title: t(
                          "Giải Ba Olympic Toán tuổi thơ & kỷ niệm khó phai",
                          "3rd Prize Childhood Math Olympiad & Lasting Memories",
                        ),
                        desc: t(
                          "Chiếc huy chương giải Ba Olympic Toán thời niên thiếu đã sớm gieo vào tâm trí mình niềm say mê bẻ khóa những câu hỏi hóc búa. Dù kỳ thi THPT môn Toán mình học nhiều nhất lại mang đến những kỷ niệm bất ngờ, đó vẫn là bài học quý giá về sự điềm tĩnh và tư duy logic kiên định.",
                          "Winning 3rd prize in the childhood Math Olympiad early on ingrained an obsession for cracking intricate puzzles. Even when high school math delivered unexpected twists, it solidified my calm resilience and analytical problem-solving foundation.",
                        ),
                      },
                      {
                        icon: "🍀",
                        tag: t("Cơ duyên công nghệ", "Serendipitous Spark"),
                        title: t(
                          "Ngã rẽ bất ngờ bước vào thế giới máy tính",
                          "The Serendipitous Gateway to Computing",
                        ),
                        desc: t(
                          "Cả tuổi thơ mình hầu như không tiếp xúc với máy tính, môn tin học ở trường cũng rất mờ nhạt. Nhưng như một cơ duyên tình cờ và may mắn, ngọn lửa tò mò mãnh liệt với công nghệ đã thức tỉnh, mở ra một hành trình lập trình đầy đam mê mà mình luôn trân trọng.",
                          "Throughout childhood, computers were practically absent from my daily life, and school computing classes were fleeting. Yet pure serendipity stepped in — an unexpected spark awakened an insatiable curiosity for software, opening an engineering journey I remain deeply grateful for.",
                        ),
                      },
                      {
                        icon: "🚀",
                        tag: t("Hành trình UEH", "The UEH Odyssey"),
                        title: t(
                          "Tờ giấy trắng: Từ if/else đến hệ thống thực tế tại UEH",
                          "Blank Canvas at UEH: From if/else to Production Systems",
                        ),
                        desc: t(
                          "Bước chân vào giảng đường UEH giữa rất nhiều bạn bè xuất sắc và tiếp xúc code từ sớm, mình khởi đầu như một tờ giấy trắng. Không nản lòng, mình tự mò mẫm từ những dòng if/else của trò kéo búa bao đầu tiên, bền bỉ tích lũy từng ngày để hôm nay tự tay xây dựng những ứng dụng và hệ thống thực tế hoàn chỉnh.",
                          "Stepping into UEH surrounded by extraordinarily talented peers who had coded for years, I began as an absolute blank sheet. Undeterred, I built upwards from the humblest if/else rock-paper-scissors game, methodically leveling up every day to now architect real-world production systems and 3D web experiences.",
                        ),
                      },
                    ].map((milestone, idx) => (
                      <div
                        key={idx}
                        className="story-milestone-card reveal"
                      >
                        <div className="story-milestone-tag">
                          <span>{milestone.icon}</span>
                          <span>{milestone.tag}</span>
                        </div>
                        <h3>{milestone.title}</h3>
                        <p>{milestone.desc}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            {page.id === "projects" && (
              <>
                <section
                  className="projects-section section-shell"
                  id="projects"
                  data-chapter
                >
                  <div className="section-kicker reveal">
                    <span>
                      02 / {t("NHỮNG ĐIỂM SÁNG", "SELECTED EXPLORATIONS")}
                    </span>
                    <span>2026</span>
                  </div>
                  <div className="section-heading reveal">
                    <h2>
                      {t("Ý tưởng có hình hài.", "Ideas, made tangible.")}
                    </h2>
                    <p>
                      {t(
                        "Mỗi dự án mở một phần khác trong cách mình suy nghĩ và làm việc.",
                        "Each project reveals a different part of how I think and build.",
                      )}
                    </p>
                  </div>
                  <div
                    className="project-filters"
                    role="group"
                    aria-label={t("Lọc dự án", "Filter projects")}
                  >
                    {[
                      ["all", t("Tất cả", "All work")],
                      ["web", "Web"],
                      ["systems", t("Hệ thống", "Systems")],
                      ["mobile", "Mobile"],
                      ["creative", t("3D & mô phỏng", "3D & simulation")],
                    ].map(([id, label]) => (
                      <button
                        key={id}
                        aria-pressed={filter === id}
                        onClick={() => setFilter(id)}
                      >
                        {label}
                        <span>
                          {String(
                            projects.filter(
                              (p) => id === "all" || p.category === id,
                            ).length,
                          ).padStart(2, "0")}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="projects-grid">
                    {projects
                      .filter((p) => filter === "all" || p.category === filter)
                      .map((p) => (
                        <article key={p.id} className="project-card reveal">
                          <a
                            className="project-card-main"
                            href={`#/project/${p.id}`}
                          >
                            <ProjectArt project={p} />
                            <div className="project-card-meta">
                              <span>{p.role[lang]}</span>
                              <ArrowUpRight size={21} />
                            </div>
                            <h3>
                              {p.name}
                              <span>{p.headline[lang]}</span>
                            </h3>
                            <p>{p.summary[lang]}</p>
                            <div className="project-tags">
                              {p.stack.slice(0, 4).map((tech) => (
                                <span key={tech}>{tech}</span>
                              ))}
                            </div>
                            <span className="case-link">
                              {t(
                                "Đọc câu chuyện dự án",
                                "Read the project story",
                              )}
                              <ArrowRight size={15} />
                            </span>
                          </a>
                          {p.source && (
                            <a
                              className="project-source-link"
                              href={p.source}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`${t("Mở repository", "Open repository")}: ${p.name}`}
                            >
                              <Github size={15} /> GitHub{" "}
                              <ArrowUpRight size={13} />
                            </a>
                          )}
                        </article>
                      ))}
                  </div>
                  <p className="project-count" aria-live="polite">
                    {t("Đang hiển thị", "Showing")}{" "}
                    {
                      projects.filter(
                        (p) => filter === "all" || p.category === filter,
                      ).length
                    }{" "}
                    / {projects.length} {t("dự án", "projects")}
                  </p>
                </section>
              </>
            )}

            {page.id === "skills" && (
              <>
                <section
                  className="skills-section section-shell"
                  id="skills"
                  data-chapter
                >
                  <div className="section-kicker reveal">
                    <span>
                      03 / {t("CHÒM SAO NĂNG LỰC", "A CONSTELLATION OF SKILLS")}
                    </span>
                    <Orbit size={19} />
                  </div>
                  <div className="section-heading reveal">
                    <h2>
                      {t(
                        "Kỹ năng có điểm kết nối.",
                        "Skills with a point of reference.",
                      )}
                    </h2>
                    <p>
                      {t(
                        "Những công nghệ mình sử dụng, những vấn đề mình đã chạm vào, và dự án để bạn tìm hiểu sâu hơn.",
                        "The tools I use, the problems I’ve worked on, and the projects where you can see them in context.",
                      )}
                    </p>
                  </div>
                  <div className="capability-list">
                    {capabilities.map((skill, index) => {
                      const Icon = [Braces, Network, Smartphone, Box, Rocket][
                        index
                      ];
                      return (
                        <article
                          id={`skill-${skill.id}`}
                          className="capability reveal"
                          key={skill.id}
                        >
                          <span className="capability-number">
                            <Icon
                              size={27}
                              strokeWidth={1.3}
                              className="capability-icon"
                            />
                            {skill.number}
                            <i />
                          </span>
                          <div>
                            <h3>{skill.title[lang]}</h3>
                            <p>{skill.description[lang]}</p>
                            <div className="project-tags">
                              {skill.tools.map((tool) => (
                                <span key={tool}>{tool}</span>
                              ))}
                            </div>
                          </div>
                          <div className="capability-evidence">
                            <span className="eyebrow">
                              {t("THỂ HIỆN QUA", "EXPLORE IN")}
                            </span>
                            {skill.projects.map((id) => (
                              <a href={`#/project/${id}`} key={id}>
                                {projects.find((p) => p.id === id)?.name}
                                <ArrowUpRight size={15} />
                              </a>
                            ))}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              </>
            )}

            {page.id === "story" && (
              <>
                <section className="workspace-invite section-shell reveal">
                  <div className="workspace-symbol" aria-hidden="true">
                    <Orbit size={70} strokeWidth={0.65} />
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <p className="eyebrow">
                      04 /{" "}
                      {t("MỘT GÓC KHÁC CỦA MÌNH", "A DIFFERENT SIDE OF ME")}
                    </p>
                    <h2>
                      {t(
                        "Ghé qua góc làm việc trong không gian.",
                        "Step inside my little corner of space.",
                      )}
                    </h2>
                    <p>
                      {t(
                        "Một thử nghiệm tương tác 3D với Three.js: khám phá bàn làm việc, màn hình và những chi tiết mình thích tạo ra.",
                        "An interactive Three.js experiment: explore a desk, a screen, and the small details I enjoy building.",
                      )}
                    </p>
                    <button className="text-link" onClick={onEnterWorkspace}>
                      {t("Vào không gian 3D", "Enter the 3D workspace")}
                      <ArrowUpRight size={17} />
                    </button>
                    <span className="workspace-hint">
                      {t(
                        "Có âm thanh · Trải nghiệm tốt nhất trên desktop",
                        "Includes audio · Best experienced on desktop",
                      )}
                    </span>
                  </div>
                </section>
              </>
            )}

            {page.id === "contact" && (
              <>
                <section
                  className="contact-section section-shell"
                  id="contact"
                  data-chapter
                >
                  <div className="section-kicker reveal">
                    <span>05 / {t("QUỸ ĐẠO TIẾP THEO", "THE NEXT ORBIT")}</span>
                    <span className="small-star">✦</span>
                  </div>
                  <div className="contact-grid">
                    <div className="reveal">
                      <p className="eyebrow">
                        FULL-STACK WEB / MOBILE DEVELOPER INTERN
                      </p>
                      <h2>
                        {t("Một cuộc trò chuyện.", "One conversation.")}
                        <br />
                        <em>{t("Một khởi đầu mới.", "A new beginning.")}</em>
                      </h2>
                      <p>
                        {t(
                          "Mình đang tìm cơ hội thực tập để đóng góp vào sản phẩm thật, học từ đồng đội và phát triển tư duy kỹ thuật. Nếu bạn thấy một điểm kết nối, mình rất muốn được trao đổi.",
                          "I’m looking for an internship where I can contribute to real products, learn from teammates, and deepen my engineering practice. If you see a connection, I’d love to talk.",
                        )}
                      </p>
                      <a
                        className="contact-email"
                        href="mailto:lequangkhanh295@gmail.com"
                      >
                        lequangkhanh295@gmail.com
                        <ArrowUpRight size={22} />
                      </a>
                      <div className="social-links">
                        <a
                          href="https://github.com/psy-zney"
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Github size={17} />
                          GitHub
                          <ArrowUpRight size={13} />
                        </a>
                        <a
                          href="https://www.linkedin.com/in/psy-zney295"
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Linkedin size={17} />
                          LinkedIn
                          <ArrowUpRight size={13} />
                        </a>
                      </div>
                    </div>
                    <aside className="recruiter-note reveal">
                      <span className="eyebrow">
                        {t(
                          "GỬI ANH CHỊ TUYỂN DỤNG",
                          "A QUICK NOTE FOR RECRUITERS",
                        )}
                      </span>
                      <h3>
                        {t("Hồ sơ trong một phút.", "The one-minute overview.")}
                      </h3>
                      <dl>
                        <div>
                          <dt>{t("Định hướng", "Focus")}</dt>
                          <dd>Full-stack Web / Mobile</dd>
                        </div>
                        <div>
                          <dt>{t("Học vấn", "Education")}</dt>
                          <dd>
                            {t("CNTT · UEH", "Information Technology · UEH")}
                            <small>
                              {t(
                                "Dự kiến tốt nghiệp 08/2027",
                                "Expected graduation 08/2027",
                              )}
                            </small>
                          </dd>
                        </div>
                        <div>
                          <dt>{t("Địa điểm", "Based in")}</dt>
                          <dd>
                            {t(
                              "TP. Hồ Chí Minh, Việt Nam",
                              "Ho Chi Minh City, Vietnam",
                            )}
                          </dd>
                        </div>
                      </dl>
                      <p>
                        {t(
                          "Chọn CV theo vị trí bạn đang tìm kiếm.",
                          "Choose the CV that fits your opening.",
                        )}
                      </p>
                      <a className="cv-download" href="#/cv/web">
                        <span>
                          Full-stack Web
                          <small>
                            {t(
                              "Đọc CV · In / Lưu PDF",
                              "Read CV · Print / Save PDF",
                            )}
                          </small>
                        </span>
                        <ArrowUpRight size={18} />
                      </a>
                      <a className="cv-download" href="#/cv/mobile">
                        <span>
                          Mobile Developer
                          <small>
                            {t(
                              "Đọc CV · In / Lưu PDF",
                              "Read CV · Print / Save PDF",
                            )}
                          </small>
                        </span>
                        <ArrowUpRight size={18} />
                      </a>
                      <a className="text-link" href="#/projects">
                        {t("Xem các dự án trước", "Start with the projects")}
                        <ArrowRight size={14} />
                      </a>
                    </aside>
                  </div>
                </section>
              </>
            )}
            <ChapterPassage chapter={page} lang={lang} />
          </>
        )}
      </main>
      <footer className="portfolio-footer section-shell">
        <a className="brand" href="#/home">
          <Sparkles size={17} />
          zney.
        </a>
        <span>
          {t(
            "Một chút tò mò. Một hành trình đang tiếp diễn.",
            "A little curiosity. An ongoing journey.",
          )}
        </span>
        <a href="mailto:lequangkhanh295@gmail.com">
          {t("Gửi lời chào", "Say hello")}
          <ArrowUpRight size={13} />
        </a>
      </footer>
      <button
        className="motion-toggle"
        onClick={() => setPaused(!paused)}
        aria-pressed={paused}
        aria-label={
          paused
            ? t("Bật chuyển động", "Enable motion")
            : t("Tạm dừng chuyển động", "Pause motion")
        }
        title={
          paused
            ? t("Bật chuyển động", "Enable motion")
            : t("Tạm dừng chuyển động", "Pause motion")
        }
      >
        {paused ? <Play size={13} /> : <Pause size={13} />}
        <span>{t("Chuyển động", "Motion")}</span>
      </button>
    </div>
  );
}
