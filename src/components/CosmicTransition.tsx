import { type CSSProperties } from "react";
import "./CosmicTransition.css";

export interface CelestialPoint {
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  starName?: string;
}

// 8 Celestial anchors mapped from the user's real constellation
export const routeAnchors: Record<string, CelestialPoint> = {
  // Star 1 (A: 36.5, 26.5) - Giới thiệu & Khởi nguyên
  "#/story": { x: 36.5, y: 26.5, starName: "α Zney (Khởi nguồn / Story)" },

  // Star 2 (B: 49.6, 14.3) - Kho Dự Án
  "#/projects": { x: 49.6, y: 14.3, starName: "β Polaris (Kho Dự Án)" },

  // Star 3 (C: 36.3, 45.5) - Kỹ Năng & Năng Lực
  "#/skills": { x: 36.3, y: 45.5, starName: "γ Rigel (Kỹ Năng & Năng Lực)" },
  "#/skills/interfaces": { x: 36.3, y: 45.5, starName: "γ Rigel (Giao diện)" },
  "#/skills/systems": { x: 53.2, y: 68.4, starName: "η Antares (Hệ thống)" },
  "#/skills/mobile": { x: 73.6, y: 62.1, starName: "ζ Betelgeuse (Mobile)" },
  "#/skills/delivery": { x: 75.1, y: 31.4, starName: "ε Sirius (Triển khai)" },

  // Star 4 (D: 58.9, 47.8) - Tâm Vũ Trụ & Trang Chủ
  "#/home": { x: 58.9, y: 47.8, starName: "δ Vega (Tâm Vũ Trụ / Home)" },

  // Star 5 (E: 75.1, 31.4) - Web Applications
  "#/project/cloud-pos": { x: 75.1, y: 31.4, starName: "ε Sirius (Cloud POS)" },
  "#/project/mandy-crimson": { x: 75.1, y: 31.4, starName: "ε Sirius (Mandy Crimson)" },
  "#/cv/web": { x: 75.1, y: 31.4, starName: "ε Sirius (Web Full-Stack CV)" },

  // Star 6 (F: 73.6, 62.1) - Mobile Applications
  "#/project/luckyfood": { x: 73.6, y: 62.1, starName: "ζ Betelgeuse (LuckyFood)" },
  "#/project/micro4nerds": { x: 73.6, y: 62.1, starName: "ζ Betelgeuse (Micro4Nerds)" },
  "#/cv/mobile": { x: 73.6, y: 62.1, starName: "ζ Betelgeuse (Mobile CV)" },

  // Star 7 (G: 53.2, 68.4) - Systems & Realtime
  "#/project/security-core": { x: 53.2, y: 68.4, starName: "η Antares (Security Core)" },
  "#/project/beatsync": { x: 53.2, y: 68.4, starName: "η Antares (BeatSync Realtime)" },

  // Star 8 (H: 39.7, 79.3) - Kết Nối & Liên Hệ
  "#/contact": { x: 39.7, y: 79.3, starName: "θ Altair (Kết nối & Liên hệ)" },
};

export function getRouteAnchor(route: string): CelestialPoint {
  if (routeAnchors[route]) return routeAnchors[route];
  if (route.startsWith("#/project/")) {
    const id = route.replace("#/project/", "");
    if (routeAnchors[`#/project/${id}`]) return routeAnchors[`#/project/${id}`];
    return { x: 49.6, y: 14.3, starName: "Kho Dự Án" };
  }
  if (route.startsWith("#/skills/")) {
    return { x: 36.3, y: 45.5, starName: "Kỹ Năng & Năng Lực" };
  }
  return { x: 58.9, y: 47.8, starName: "Tâm Vũ Trụ" };
}

export type TransitionPhase = "idle" | "collapsing" | "shooting" | "expanding";

interface CosmicTransitionProps {
  phase: TransitionPhase;
  origin: CelestialPoint;
  target: CelestialPoint;
}

export function CosmicTransitionOverlay({
  phase,
  target,
}: CosmicTransitionProps) {
  if (phase === "idle") return null;

  return (
    <div
      className={`cosmic-transition-overlay phase-${phase}`}
      aria-hidden="true"
      style={
        {
          "--target-x": `${target.x}%`,
          "--target-y": `${target.y}%`,
        } as CSSProperties
      }
    >
      {/* Tia sáng starlight thanh tú lướt nhanh qua đỉnh trang */}
      <div className="cosmic-starlight-streamer" />

      {/* Vầng sáng starlight nhẹ dịu tỏa ra tại tọa độ vì sao đích đến */}
      <div className="cosmic-celestial-shimmer" />
    </div>
  );
}
