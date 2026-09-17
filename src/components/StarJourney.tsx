import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  Radio,
  Sparkles,
  Telescope,
  X,
} from "lucide-react";
import {
  advanceSignal,
  flightGeometry,
  journey,
  signalSequence,
  type Chapter,
} from "../data/journey";
import type { Language } from "../data/portfolio";
import type { fieldNotes } from "../data/fieldNotes";
import "./StarJourney.css";

export function useStarFlight(
  root: RefObject<HTMLDivElement>,
  route: string,
  paused: boolean,
  filter: string,
) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let frame = 0;
    const flights = Array.from(
      el.querySelectorAll<SVGSVGElement>("[data-flight]"),
    ).map((svg) => {
      const path = svg.querySelector<SVGPathElement>("[data-flight-path]")!;
      return {
        path,
        length: path.getTotalLength(),
        runner: svg.querySelector<SVGGElement>("[data-flight-runner]"),
        trail: svg.querySelector<SVGPathElement>("[data-flight-trail]"),
        stars: Array.from(
          svg.querySelectorAll<SVGCircleElement>("[data-stop]"),
        ),
      };
    });
    const paint = () => {
      frame = 0;
      const distance = el.scrollHeight - el.clientHeight;
      const progress =
        distance > 0 ? Math.min(1, Math.max(0, el.scrollTop / distance)) : 0;
      el.style.setProperty("--flight-progress", String(progress));
      el.style.setProperty("--space-drift", `${paused ? 0 : progress * -90}px`);
      el.querySelector<HTMLElement>(".reading-progress")?.style.setProperty(
        "transform",
        `scaleX(${progress})`,
      );
      for (const flight of flights) {
        // Paused mode keeps the route legible without a travelling light.
        const p = paused ? 0 : progress;
        const point = flight.path.getPointAtLength(p * flight.length);
        flight.runner?.setAttribute(
          "transform",
          `translate(${point.x} ${point.y})`,
        );
        flight.trail?.setAttribute("stroke-dasharray", `${p * 100} 100`);
        flight.stars.forEach((star) =>
          star.classList.toggle(
            "is-reached",
            Number(star.dataset.stop) <= p + 0.005,
          ),
        );
      }
    };
    const queue = () => {
      if (!frame && !document.hidden) frame = requestAnimationFrame(paint);
    };
    const visibility = () => {
      el.classList.toggle("tab-asleep", document.hidden);
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else queue();
    };
    const observer = new ResizeObserver(queue);
    if (el.querySelector("main")) observer.observe(el.querySelector("main")!);
    el.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    document.addEventListener("visibilitychange", visibility);
    visibility();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      el.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [root, route, paused, filter]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let card: HTMLElement | null = null;
    let frame = 0;
    let x = 0,
      y = 0;
    const reset = () => {
      card?.style.removeProperty("--depth-x");
      card?.style.removeProperty("--depth-y");
      card?.classList.remove("depth-active");
      card = null;
    };
    const move = (event: PointerEvent) => {
      if (paused || event.pointerType !== "mouse") return;
      const next = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-depth]",
      );
      if (next !== card) {
        reset();
        card = next;
      }
      if (!card) return;
      const rect = card.getBoundingClientRect();
      x = ((event.clientX - rect.left) / rect.width - 0.5) * 12;
      y = ((event.clientY - rect.top) / rect.height - 0.5) * -10;
      if (!frame)
        frame = requestAnimationFrame(() => {
          card?.style.setProperty("--depth-x", `${y.toFixed(2)}deg`);
          card?.style.setProperty("--depth-y", `${x.toFixed(2)}deg`);
          card?.classList.add("depth-active");
          frame = 0;
        });
    };
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerleave", reset);
    el.addEventListener("scroll", reset, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      reset();
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", reset);
      el.removeEventListener("scroll", reset);
    };
  }, [root, route, paused]);
}

function FlightMap({ chapter }: { chapter: Chapter }) {
  const { path, stops } = flightGeometry(chapter.points);
  return (
    <svg
      viewBox="0 0 100 100"
      data-flight
      aria-hidden="true"
      className="flight-map"
    >
      <circle cx="50" cy="50" r="44" className="flight-orbit" />
      <circle cx="50" cy="50" r="31" className="flight-orbit orbit-slant" />
      <path d={path} data-flight-path className="flight-base" />
      <path
        d={path}
        data-flight-trail
        pathLength="100"
        strokeDasharray="0 100"
        className="flight-trail"
      />
      {chapter.points.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r="1.05"
          data-stop={stops[i]}
          className="flight-star"
        />
      ))}
      <g
        data-flight-runner
        transform={`translate(${chapter.points[0].join(" ")})`}
        className="flight-runner"
      >
        <circle r="4.5" className="flight-corona" />
        <circle r="1.3" />
        <path d="M-5 0H5M0-5V5" />
      </g>
    </svg>
  );
}

export function JourneyAtmosphere({ chapter }: { chapter: Chapter }) {
  return (
    <>
      <div className="nebula-scene" aria-hidden="true">
        <i className="nebula-veil" />
        <i className="orbital-horizon" />
        <i className="shooting-star" />
      </div>
      <aside className="flight-hud" aria-hidden="true">
        <span>{chapter.sky}</span>
        <FlightMap chapter={chapter} />
        <span>0{journey.indexOf(chapter) + 1} / 05</span>
      </aside>
    </>
  );
}

export function ChapterHeading({
  chapter,
  lang,
}: {
  chapter: Chapter;
  lang: Language;
}) {
  return (
    <header className="chapter-heading section-shell">
      <div>
        <a className="text-link" href="#/home">
          <ArrowLeft size={14} />
          {lang === "vie" ? "Bản đồ khởi hành" : "Departure map"}
        </a>
        <p className="eyebrow">
          0{journey.indexOf(chapter) + 1} / {chapter.sky}
        </p>
        <h1>{chapter.title[lang]}</h1>
        <p className="chapter-description">{chapter.description[lang]}</p>
        <span className="chapter-scroll">
          <span />
          {lang === "vie" ? "Cuộn theo ánh sao" : "Follow the starlight"}
        </span>
      </div>
      <div className="chapter-sky" data-depth>
        <div className="sky-sphere" />
        <FlightMap chapter={chapter} />
        <span>
          {chapter.sky} /{" "}
          {lang === "vie" ? "PHÁC HỌA CHÒM SAO" : "CONSTELLATION STUDY"}
        </span>
      </div>
    </header>
  );
}

export function DepartureRoutes({
  lang,
  onEnterWorkspace,
}: {
  lang: Language;
  onEnterWorkspace: () => void;
}) {
  return (
    <section className="departure-routes section-shell">
      <div className="section-kicker">
        <span>
          {lang === "vie" ? "CHỌN MỘT HƯỚNG KHÁM PHÁ" : "CHOOSE A DIRECTION"}
        </span>
        <Compass size={20} />
      </div>
      <h2>
        {lang === "vie"
          ? "Có nhiều cách để hiểu một người."
          : "More than one way to know a person."}
      </h2>
      <div className="departure-grid">
        {journey.slice(1).map((chapter, i) => (
          <a
            href={`#/${chapter.id}`}
            key={chapter.id}
            style={{ "--chapter-color": chapter.color } as CSSProperties}
            className="departure-link"
            data-depth
          >
            <span className="departure-number">
              0{i + 2} <Sparkles size={19} />
            </span>
            <span className="eyebrow">{chapter.sky}</span>
            <h3>{chapter.label[lang]}</h3>
            <p>{chapter.description[lang]}</p>
            <ArrowRight className="departure-arrow" size={23} />
          </a>
        ))}
      </div>
      <div className="departure-shortcuts">
        <a href="#/cv/web">
          CV · Web <ArrowRight size={14} />
        </a>
        <a href="#/cv/mobile">
          CV · Mobile <ArrowRight size={14} />
        </a>
        <button onClick={onEnterWorkspace}>
          <OrbitIcon />
          {lang === "vie" ? "Khám phá phòng 3D" : "Explore the 3D room"}
          <ArrowRight size={14} />
        </button>
      </div>
    </section>
  );
}

function OrbitIcon() {
  return <Telescope size={18} />;
}

export function ChapterPassage({
  chapter,
  lang,
}: {
  chapter: Chapter;
  lang: Language;
}) {
  const index = journey.indexOf(chapter);
  const next = journey[(index + 1) % journey.length];
  const previous = journey[(index + journey.length - 1) % journey.length];
  return (
    <section className="chapter-passage section-shell">
      <SecretSignal key={chapter.id} fragment={index} lang={lang} />
      <p className="eyebrow">
        {lang === "vie" ? "HÀNH TRÌNH CÒN TIẾP" : "THE JOURNEY CONTINUES"}
      </p>
      <a className="passage-next" href={`#/${next.id}`}>
        <div>
          <small>{next.sky}</small>
          <h2>{next.label[lang]}</h2>
        </div>
        <ArrowRight size={40} strokeWidth={1} />
      </a>
      <a className="text-link" href={`#/${previous.id}`}>
        <ArrowLeft size={14} />
        {previous.label[lang]}
      </a>
      <nav
        className="chapter-dots"
        aria-label={
          lang === "vie" ? "Các trang trong hành trình" : "Journey pages"
        }
      >
        {journey.map((item) => (
          <a
            key={item.id}
            href={`#/${item.id}`}
            aria-current={item.id === chapter.id ? "page" : undefined}
            aria-label={item.label[lang]}
            title={item.label[lang]}
          >
            <span />
            {item.sky}
          </a>
        ))}
      </nav>
    </section>
  );
}

function SecretSignal({
  fragment,
  lang,
}: {
  fragment: number;
  lang: Language;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const noteTitle = useRef<HTMLHeadingElement>(null);
  const [index, setIndex] = useState(fragment);
  const [step, setStep] = useState(0);
  const [notes, setNotes] = useState<typeof fieldNotes | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [miss, setMiss] = useState(false);
  const t = (vi: string, en: string) => (lang === "vie" ? vi : en);
  useEffect(() => {
    if (step === 4 && notes && dialog.current?.open) noteTitle.current?.focus();
  }, [step, notes]);
  useEffect(() => {
    if (step !== 4 || notes) return;
    let cancelled = false;
    setFailed(false);
    import("../data/fieldNotes")
      .then((module) => {
        if (!cancelled) setNotes(module.fieldNotes);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [step, notes, retry]);
  const close = () => dialog.current?.close();
  return (
    <div className="secret-signal">
      <button
        ref={trigger}
        className="signal-trigger"
        onClick={() => {
          setStep(0);
          setMiss(false);
          dialog.current?.showModal();
        }}
        aria-label={t("Quan sát tín hiệu 29.5", "Observe signal 29.5")}
      >
        <span>29.5</span>
        <Sparkles size={15} />
        <span>·· — ·</span>
      </button>
      <dialog
        ref={dialog}
        className="signal-dialog"
        aria-labelledby="signal-title"
        onClose={() => trigger.current?.focus()}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="signal-window">
          <button
            className="signal-close"
            onClick={close}
            aria-label={t("Đóng tín hiệu", "Close signal")}
            autoFocus
          >
            <X size={21} />
          </button>
          <p className="eyebrow">
            <Radio size={14} /> 29.5 / {String(index + 1).padStart(2, "0")}
          </p>
          {step < 4 ? (
            <>
              <h2 id="signal-title">
                {t("Có ai ở đó không?", "Is anybody there?")}
              </h2>
              <p>
                {t(
                  "Bốn điểm chạm. Đi theo ngôi sao có vòng sáng, đến khi tín hiệu trở nên rõ ràng.",
                  "Four touches. Follow the ringed star until the signal becomes clear.",
                )}
              </p>
              <div className="signal-puzzle">
                {[0, 1, 2, 3].map((star) => {
                  const lit = star === signalSequence(index)[step];
                  return (
                    <button
                      key={star}
                      className={lit ? "signal-star is-calling" : "signal-star"}
                      aria-label={`${t("Sao", "Star")} ${star + 1}${lit ? t(", đang phát tín hiệu", ", transmitting") : ""}`}
                      onClick={() => {
                        const next = advanceSignal(step, star, index);
                        setMiss(next === 0);
                        setStep(next);
                      }}
                    >
                      <Sparkles size={28} strokeWidth={1} />
                      <span>{["α", "β", "γ", "δ"][star]}</span>
                    </button>
                  );
                })}
              </div>
              <p className="signal-status" role="status">
                {miss
                  ? t(
                      "Lạc một nhịp. Lắng nghe lại từ đầu.",
                      "A missed beat. Listen from the beginning.",
                    )
                  : `${step} / 4 · ${t("Đang bắt tín hiệu", "Tuning in")}`}
              </p>
            </>
          ) : notes ? (
            <article className="field-note page-enter">
              <span className="eyebrow">
                {t("MỘT MẨU CHUYỆN NGOÀI QUỸ ĐẠO", "A NOTE OUTSIDE THE ORBIT")}
              </span>
              <h2 id="signal-title" ref={noteTitle} tabIndex={-1}>
                {notes[index].title[lang]}
              </h2>
              <p>{notes[index].text[lang]}</p>
              <span className="note-signature">— khánh.</span>
              <button
                className="text-link"
                onClick={() => {
                  setIndex((index + 1) % notes.length);
                  setStep(0);
                  setMiss(false);
                }}
              >
                {t("Một tần số khác", "Another frequency")}
                <ArrowRight size={15} />
              </button>
            </article>
          ) : (
            <>
              <h2 id="signal-title" role="status">
                {failed
                  ? t("Tín hiệu gián đoạn", "Signal interrupted")
                  : t("Đã bắt được tín hiệu…", "Signal found…")}
              </h2>
              {failed && (
                <button
                  className="text-link"
                  onClick={() => setRetry(retry + 1)}
                >
                  {t("Thử lại", "Try again")}
                </button>
              )}
            </>
          )}
        </div>
      </dialog>
    </div>
  );
}
