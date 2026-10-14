import { useEffect, useRef, useState } from "react";
import { startIntroAudioFromGesture, stopIntroAudio } from "../utils/audioPreloader";

interface WavePageLoaderProps {
  onFinish?: () => void;
  label?: string;
}

export function WavePageLoader({
  onFinish,
  label = "Loading",
}: WavePageLoaderProps) {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const MIN_DURATION = reduced ? 0 : 1800;
    const startTime = performance.now();
    let finished = false;
    let animId = 0;
    let finishTimer = 0;

    // Attempt auto-start if browser policy allows (âm lượng nhỏ 0.12 dịu nhẹ cho loading)
    if (document.documentElement.dataset.journeySound !== "off") {
      startIntroAudioFromGesture(0.12);
    }

    const tick = (now: number) => {
      if (finished) return;
      const elapsed = now - startTime;
      const t = MIN_DURATION === 0 ? 1 : Math.min(1, elapsed / MIN_DURATION);
      // Natural cubic-out easing curve
      const eased = 1 - Math.pow(1 - t, 2.5);
      const progress = Math.min(100, eased * 100);

      setDisplayProgress(progress);

      if (progress >= 100) {
        finished = true;
        setFadingOut(true);
        stopIntroAudio(); // Dừng ngay lập tức khi hoàn thành tải
        finishTimer = window.setTimeout(() => {
          onFinishRef.current?.();
        }, reduced ? 0 : 350);
        return;
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    // Any gesture during loading unlocks Web Audio context and starts audio
    const handleGesture = () => {
      if (!finished && document.documentElement.dataset.journeySound !== "off") {
        startIntroAudioFromGesture(0.12);
      }
    };
    window.addEventListener("pointerdown", handleGesture, { passive: true });
    window.addEventListener("touchstart", handleGesture, { passive: true });
    window.addEventListener("click", handleGesture, { passive: true });
    window.addEventListener("wheel", handleGesture, { passive: true });
    window.addEventListener("keydown", handleGesture, { passive: true });

    return () => {
      finished = true;
      stopIntroAudio(); // Đảm bảo dừng hẳn khi unmount
      cancelAnimationFrame(animId);
      window.clearTimeout(finishTimer);
      window.removeEventListener("pointerdown", handleGesture);
      window.removeEventListener("touchstart", handleGesture);
      window.removeEventListener("click", handleGesture);
      window.removeEventListener("wheel", handleGesture);
      window.removeEventListener("keydown", handleGesture);
    };
  }, []);

  // Twinkling background starfield
  const stars = useRef(
    Array.from({ length: 65 }, (_, i) => ({
      id: i,
      top: `${(i * 17.3 + 7) % 100}%`,
      left: `${(i * 31.7 + 13) % 100}%`,
      size: i % 6 === 0 ? 2 : 1,
      delay: `${((i * 0.3) % 3).toFixed(2)}s`,
      duration: `${(1.8 + (i % 4) * 0.7).toFixed(2)}s`,
    }))
  ).current;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#000000] text-slate-100 select-none overflow-hidden transition-opacity duration-350"
      data-page-loader
      style={{
        opacity: fadingOut ? 0 : 1,
        pointerEvents: fadingOut ? "none" : "auto",
      }}
      onClick={() => {
        if (document.documentElement.dataset.journeySound !== "off") {
          startIntroAudioFromGesture(0.12);
        }
      }}
    >
      {/* Background Starfield */}
      {stars.map((s) => (
        <span
          key={s.id}
          style={{
            position: "absolute",
            top: s.top,
            left: s.left,
            width: `${s.size}px`,
            height: `${s.size}px`,
            borderRadius: "50%",
            background: "#ffffff",
            opacity: 0.22,
            animation: 'var(--loader-star-animation)',
            '--loader-star-animation': `twinkle ${s.duration} ${s.delay} ease-in-out infinite`,
            pointerEvents: "none",
          } as React.CSSProperties}
        />
      ))}

      {/* Center Wave Loader Content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "32px",
          width: "min(360px, 84vw)",
        }}
      >
        {/* Animated Wave Text */}
        <div className="wave-loader" aria-hidden="true" />

        {/* Progress Bar Track */}
        <div
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(displayProgress)}
          className="scene-progress-track"
        >
          <div
            className="scene-progress-fill"
            style={{ transform: `scaleX(${displayProgress / 100})` }}
          />
          <div
            className="scene-progress-head"
            style={{
              left: `${displayProgress}%`,
              transform: "translate3d(-50%, -50%, 0)",
            }}
          />
        </div>

        {/* Percentage Counter */}
        <span className="scene-progress-value" aria-live="polite">
          {Math.round(displayProgress)}%
        </span>
      </div>
    </div>
  );
}
