import { useEffect, useState } from "react";
import {
  CONSTELLATION_PATHS,
  CONSTELLATION_STARS,
} from "../data/constellation";
import { HyperspaceWarp } from "./HyperspaceWarp";
import type { Language } from "../data/portfolio";
import "./ConstellationIntro.css";

interface ConstellationIntroProps {
  onComplete: () => void;
  lang: Language;
}

type IntroStage =
  | "black" // 0s - 0.5s: Màn hình đen nguyên bản
  | "igniting" // 0.5s - 2.0s: Các điểm sao lần lượt bừng sáng
  | "connecting" // 2.0s - 4.8s: Các đường nối lần lượt vẽ dần
  | "ready" // >= 5s: Hiện chữ nhỏ "start" tại điểm đầu tiên
  | "warping"; // Bấm start -> Phi thuyền nhảy siêu không gian

export function ConstellationIntro({
  onComplete,
  lang,
}: ConstellationIntroProps) {
  const [stage, setStage] = useState<IntroStage>("black");
  const [visibleStars, setVisibleStars] = useState<number>(0);

  useEffect(() => {
    // 0.0s -> 0.5s: Nền đen
    const t0 = setTimeout(() => {
      setStage("igniting");
    }, 450);

    // 0.5s -> 2.0s: Từng điểm sao hiện lên
    const starTimers = CONSTELLATION_STARS.map((_, index) => {
      return setTimeout(() => {
        setVisibleStars(index + 1);
      }, 500 + index * 175);
    });

    // 2.0s: Bắt đầu vẽ các đường nối
    const t1 = setTimeout(() => {
      setStage("connecting");
    }, 2000);

    // 4.9s: Toàn bộ chòm sao hoàn tất, hiện chữ "start" tại điểm đầu tiên
    const t2 = setTimeout(() => {
      setStage("ready");
    }, 4900);

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      starTimers.forEach(clearTimeout);
    };
  }, []);

  const handleStart = () => {
    setStage("warping");
  };

  const handleSkip = () => {
    onComplete();
  };

  // Lắng nghe phím Enter để chuyển về trang giới thiệu luôn
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.code === "Enter" || e.key === "Escape") {
        e.preventDefault();
        onComplete();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onComplete]);

  return (
    <div className={`constellation-intro-root stage-${stage}`}>
      {/* Hiệu ứng buồng lái phi thuyền vượt vũ trụ khi bấm start */}
      {stage === "warping" && (
        <HyperspaceWarp
          origin={{ x: 36.5, y: 26.5 }}
          target={{ x: 36.5, y: 26.5 }}
          targetName={lang === "vie" ? "Khởi nguồn (Story)" : "Genesis (Story)"}
          durationMs={1100}
          onComplete={onComplete}
        />
      )}

      {/* Nút bỏ qua rút gọn >> */}
      <button
        type="button"
        className="intro-skip-btn"
        onClick={handleSkip}
        aria-label="Skip"
        title="Skip"
      >
        <span>&gt;&gt;</span>
      </button>

      {/* Khung trời sao sâu thẳm */}
      <div className="space-canvas-container">
        <svg
          viewBox="0 0 100 100"
          className="constellation-svg"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <defs>
            {/* Lọc sáng tỏa starlight mềm mại */}
            <filter
              id="constellation-glow"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feGaussianBlur stdDeviation="0.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Các đường nối: vẽ tuần tự từ 2s -> 4.8s */}
          <g
            className={`constellation-lines ${
              stage === "connecting" || stage === "ready" || stage === "warping"
                ? "is-drawing"
                : ""
            }`}
          >
            {/* Đoạn 1: A -> B */}
            <path
              d={CONSTELLATION_PATHS.path1_A_to_B}
              className="line-segment line-1"
            />
            {/* Đoạn 2: B -> C (Đường cong chữ Z / cánh cung mềm) */}
            <path
              d={CONSTELLATION_PATHS.path2_B_to_C}
              className="line-segment line-2"
            />
            {/* Đoạn 3: C -> D */}
            <path
              d={CONSTELLATION_PATHS.path3_C_to_D}
              className="line-segment line-3"
            />
            {/* Đoạn 4: D -> E */}
            <path
              d={CONSTELLATION_PATHS.path4_D_to_E}
              className="line-segment line-4"
            />
            {/* Đoạn 5: D -> F */}
            <path
              d={CONSTELLATION_PATHS.path5_D_to_F}
              className="line-segment line-5"
            />
            {/* Đoạn 6: D -> G */}
            <path
              d={CONSTELLATION_PATHS.path6_D_to_G}
              className="line-segment line-6"
            />
            {/* Đoạn 7: G -> H */}
            <path
              d={CONSTELLATION_PATHS.path7_G_to_H}
              className="line-segment line-7"
            />
          </g>

          {/* Các điểm sao: phát sáng tròn đều, thon gọn, không có vòng tròn xanh */}
          {CONSTELLATION_STARS.map((star, idx) => {
            const isVisible = visibleStars > idx;
            const isOriginStar = star.isOrigin;

            return (
              <g
                key={star.id}
                className={`star-node ${isVisible ? "star-ignited" : ""} ${
                  isOriginStar ? "origin-star" : ""
                } ${isOriginStar && stage === "ready" ? "star-clickable" : ""}`}
                style={{ "--star-delay": `${idx * 0.15}s` } as React.CSSProperties}
                onClick={isOriginStar && stage === "ready" ? handleStart : undefined}
              >
                {/* Điểm nhân sao sáng rực, tròn trịa, thanh tú */}
                <circle
                  cx={star.x}
                  cy={star.y}
                  r={isOriginStar ? "0.75" : "0.62"}
                  className="star-core"
                  filter="url(#constellation-glow)"
                />
              </g>
            );
          })}
        </svg>

        {/* Chữ nhỏ "start" đặt thanh lịch cạnh điểm đầu tiên - không khung, không chấm */}
        {stage === "ready" && (
          <div
            className="start-anchor-container"
            style={{
              left: "36.5%",
              top: "26.5%",
            }}
          >
            {/* Chữ start thuần túy không khung, không chấm */}
            <button
              type="button"
              className="start-btn-trigger"
              onClick={handleStart}
              title="Start"
            >
              <span className="start-label">start</span>
            </button>
          </div>
        )}
      </div>

      {/* Thông số tọa độ chòm sao vũ trụ phong cách phi thuyền */}
      <div className="intro-hud-footer">
        <span className="hud-code">CONSTELLATION ZNEY · 8 NODES ALIGNED</span>
        <span className="hud-status">
          {stage === "black" && "DEEP SPACE INITIALIZING..."}
          {stage === "igniting" && "IGNITING CELESTIAL ANCHORS..."}
          {stage === "connecting" && "TRACING STELLAR TRAJECTORIES..."}
          {stage === "ready" &&
            (lang === "vie"
              ? "CHÒM SAO ĐÃ KẾT NỐI — NHẤN ENTER HOẶC START ĐỂ KHỞI HÀNH"
              : "CONSTELLATION ALIGNED — PRESS ENTER OR START TO EMBARK")}
        </span>
      </div>
    </div>
  );
}
