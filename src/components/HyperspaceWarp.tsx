import { useEffect, useRef } from "react";
import "./HyperspaceWarp.css";

interface HyperspaceWarpProps {
  origin?: { x: number; y: number }; // percentage 0-100
  target?: { x: number; y: number }; // percentage 0-100
  targetName?: string;
  durationMs?: number;
  onArrive?: () => void;
  onComplete: () => void;
  playAudio?: boolean;
}

/**
 * Hiệu ứng phi thuyền gia tốc siêu không gian (Hyperspace Warp Drive)
 * Sử dụng HTML5 Canvas 2D tốc độ 60fps mô phỏng buồng lái phi thuyền vượt vũ trụ.
 */
export function HyperspaceWarp({
  origin = { x: 50, y: 50 },
  target = { x: 50, y: 50 },
  targetName,
  durationMs = 800,
  onArrive,
  onComplete,
  playAudio = true,
}: HyperspaceWarpProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onArriveRef = useRef(onArrive);
  onArriveRef.current = onArrive;

  useEffect(() => {
    // Kích hoạt âm thanh phi thuyền bay siêu tốc qua Web Audio API procedurally
    if (playAudio) {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          if (ctx.state === "suspended") {
            void ctx.resume();
          }

          const now = ctx.currentTime;
          const dur = durationMs / 1000;

          // 1. Tiếng động cơ rền siêu trầm (Warp engine hum)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();

          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(45, now);
          osc.frequency.exponentialRampToValueAtTime(160, now + dur * 0.75);
          osc.frequency.linearRampToValueAtTime(30, now + dur);

          filter.type = "lowpass";
          filter.frequency.setValueAtTime(120, now);
          filter.frequency.exponentialRampToValueAtTime(480, now + dur * 0.6);

          gain.gain.setValueAtTime(0.01, now);
          gain.gain.linearRampToValueAtTime(0.18, now + 0.25);
          gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + dur);

          // 2. Tiếng gió siêu không gian (Starlight rush noise)
          const bufferSize = ctx.sampleRate * Math.min(dur, 2);
          const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const output = noiseBuffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
          }

          const whiteNoise = ctx.createBufferSource();
          whiteNoise.buffer = noiseBuffer;

          const noiseFilter = ctx.createBiquadFilter();
          noiseFilter.type = "bandpass";
          noiseFilter.frequency.setValueAtTime(300, now);
          noiseFilter.frequency.exponentialRampToValueAtTime(1400, now + dur * 0.65);
          noiseFilter.Q.setValueAtTime(3, now);

          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(0.01, now);
          noiseGain.gain.linearRampToValueAtTime(0.14, now + dur * 0.4);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          whiteNoise.connect(noiseFilter);
          noiseFilter.connect(noiseGain);
          noiseGain.connect(ctx.destination);

          whiteNoise.start(now);
          whiteNoise.stop(now + dur);
        }
      } catch {
        /* Ignore audio failure */
      }
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Tính toán tâm phát tia theo tọa độ đích
    const centerX = (target.x / 100) * width;
    const centerY = (target.y / 100) * height;

    const STAR_COUNT = 380;
    interface Star {
      x: number;
      y: number;
      z: number;
      pz: number;
      size: number;
      color: string;
    }

    const colors = [
      "#ffffff",
      "#e0f2fe",
      "#bae6fd",
      "#7dd3fc",
      "#38bdf8",
      "#93c5fd",
      "#c084fc",
    ];

    const stars: Star[] = Array.from({ length: STAR_COUNT }, () => {
      const z = Math.random() * 1000 + 50;
      return {
        x: (Math.random() - 0.5) * width * 2.2,
        y: (Math.random() - 0.5) * height * 2.2,
        z,
        pz: z,
        size: Math.random() * 2 + 0.8,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    });

    let startTime: number | null = null;
    let animationId = 0;
    let isFirstFrame = true;
    let hasArrived = false;

    const render = (time: number) => {
      if (startTime === null) {
        startTime = time;
      }
      const elapsed = time - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      // Kích hoạt callback đổi trang tại đỉnh vầng sáng starlight (progress >= 0.72)
      if (progress >= 0.72 && !hasArrived) {
        hasArrived = true;
        onArriveRef.current?.();
      }

      // Làm mờ mượt mà lớp overlay khi tiếp đất thành công (từ 0.82 -> 1.0)
      if (containerRef.current) {
        if (progress > 0.82) {
          const fadeAlpha = 1 - (progress - 0.82) / 0.18;
          containerRef.current.style.opacity = Math.max(0, fadeAlpha).toFixed(3);
        } else {
          containerRef.current.style.opacity = "1";
        }
      }

      // Easing tăng tốc mượt mà ở giữa rồi hạ cánh êm ái
      const speedMultiplier =
        progress < 0.55
          ? Math.pow(progress / 0.55, 2.2) * 55 + 6
          : Math.pow((1 - progress) / 0.45, 1.4) * 60 + 4;

      if (isFirstFrame) {
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);
        isFirstFrame = false;
      } else {
        ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
        ctx.fillRect(0, 0, width, height);
      }

      // Vẽ từng tia sao kéo dài lấp lánh starlight
      for (const star of stars) {
        star.pz = star.z;
        star.z -= speedMultiplier;

        if (star.z <= 10) {
          star.z = 1000;
          star.pz = 1000;
          star.x = (Math.random() - 0.5) * width * 2.2;
          star.y = (Math.random() - 0.5) * height * 2.2;
        }

        const k = 300 / star.z;
        const px = star.x * k + centerX;
        const py = star.y * k + centerY;

        const pk = 300 / star.pz;
        const prevX = star.x * pk + centerX;
        const prevY = star.y * pk + centerY;

        if (
          (px >= -60 && px <= width + 60 && py >= -60 && py <= height + 60) ||
          (prevX >= -60 &&
            prevX <= width + 60 &&
            prevY >= -60 &&
            prevY <= height + 60)
        ) {
          ctx.beginPath();
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(px, py);
          ctx.strokeStyle = star.color;
          ctx.lineWidth = Math.max(
            1,
            Math.min(star.size * (1 - star.z / 1000) * 3.8, 5.5),
          );
          ctx.stroke();

          // Đầu ngôi sao phát sáng starlight trắng
          ctx.beginPath();
          ctx.arc(px, py, Math.max(1, star.size * 0.85), 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
        }
      }

      // Vầng hào quang starlight tỏa ra êm dịu khi tiếp cận vì sao đích đến
      if (progress > 0.72) {
        const flashProgress = (progress - 0.72) / 0.28;
        const alpha = Math.sin(flashProgress * Math.PI) * 0.42;
        const grad = ctx.createRadialGradient(
          centerX,
          centerY,
          10,
          centerX,
          centerY,
          Math.max(width, height) * 0.75,
        );
        grad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 1.2})`);
        grad.addColorStop(0.35, `rgba(186, 230, 253, ${alpha * 0.7})`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      if (progress < 1) {
        animationId = requestAnimationFrame(render);
      } else {
        if (!hasArrived) {
          hasArrived = true;
          onArriveRef.current?.();
        }
        onCompleteRef.current();
      }
    };

    animationId = requestAnimationFrame(render);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Escape" || e.key === " ") {
        e.preventDefault();
        if (!hasArrived) {
          hasArrived = true;
          onArriveRef.current?.();
        }
        onCompleteRef.current();
      }
    };
    window.addEventListener("keydown", handleKey);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKey);
    };
  }, [durationMs, origin, target, playAudio]);

  const handleSkipClick = () => {
    onArriveRef.current?.();
    onCompleteRef.current();
  };

  return (
    <div
      ref={containerRef}
      className="hyperspace-warp-overlay"
      aria-hidden="true"
      onClick={handleSkipClick}
      title="Click to arrive immediately"
    >
      <canvas ref={canvasRef} className="hyperspace-canvas" />
      <div className="cockpit-hud">
        <div className="hud-corner top-left" />
        <div className="hud-corner top-right" />
        <div className="hud-corner bottom-left" />
        <div className="hud-corner bottom-right" />
        <div className="hud-crosshair" />
        <div className="hud-warp-readout">
          <span className="readout-status">
            {targetName
              ? `WARPING TO ${targetName.toUpperCase()}`
              : "HYPERSPACE JUMP INITIATED"}
          </span>
          <span className="readout-velocity">WARP FACTOR 9.8</span>
        </div>
      </div>
    </div>
  );
}
