import { useEffect, useState, type CSSProperties } from "react";
import "./CosmicTransition.css";

export interface CelestialPoint {
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  starName?: string;
}

// Celestial anchors mapped from the Virgo constellation & hero map
export const routeAnchors: Record<string, CelestialPoint> = {
  "#/home": { x: 50, y: 48, starName: "Tâm Z / Core" },
  "#/story": { x: 50, y: 26, starName: "γ Porrima" },
  "#/projects": { x: 48, y: 78, starName: "α Spica" },
  "#/project/beatsync": { x: 48, y: 78, starName: "α Spica" },
  "#/project/sentinellan": { x: 50, y: 26, starName: "γ Porrima" },
  "#/project/chemistry-lab": { x: 81, y: 15, starName: "ε Vindemiatrix" },
  "#/project/cloud-pos": { x: 67, y: 23, starName: "δ Minelauva" },
  "#/project/study-cabin": { x: 18, y: 16, starName: "β Zavijava" },
  "#/project/mandy-crimson": { x: 33, y: 25, starName: "η Zaniah" },
  "#/project/backup-data": { x: 25, y: 56, starName: "θ Vir" },
  "#/project/security-core": { x: 73, y: 54, starName: "ζ Heze" },
  "#/project/luckyfood": { x: 74, y: 70, starName: "ι Syrma" },
  "#/project/micro4nerds": { x: 86, y: 84, starName: "μ Rijl al Awwa" },
  "#/skills": { x: 73, y: 54, starName: "ζ Heze" },
  "#/skills/interfaces": { x: 67, y: 23, starName: "δ Minelauva" },
  "#/skills/systems": { x: 50, y: 26, starName: "γ Porrima" },
  "#/skills/mobile": { x: 74, y: 70, starName: "ι Syrma" },
  "#/skills/simulation": { x: 81, y: 15, starName: "ε Vindemiatrix" },
  "#/skills/delivery": { x: 48, y: 78, starName: "α Spica" },
  "#/contact": { x: 80, y: 75, starName: "ι Syrma" },
  "#/cv/web": { x: 48, y: 78, starName: "α Spica" },
  "#/cv/mobile": { x: 74, y: 70, starName: "ι Syrma" },
};

export function getRouteAnchor(route: string): CelestialPoint {
  if (routeAnchors[route]) return routeAnchors[route];
  if (route.startsWith("#/project/")) {
    const id = route.replace("#/project/", "");
    if (routeAnchors[`#/project/${id}`]) return routeAnchors[`#/project/${id}`];
    return { x: 50, y: 48, starName: "Chòm sao Xử Nữ" };
  }
  if (route.startsWith("#/skills/")) {
    return { x: 70, y: 54, starName: "ζ Heze" };
  }
  return { x: 50, y: 48, starName: "Tâm Z" };
}

export type TransitionPhase = "idle" | "collapsing" | "shooting" | "expanding";

interface CosmicTransitionProps {
  phase: TransitionPhase;
  origin: CelestialPoint;
  target: CelestialPoint;
}

export function CosmicTransitionOverlay({
  phase,
  origin,
  target,
}: CosmicTransitionProps) {
  if (phase === "idle") return null;

  // Calculate the flight angle for the comet tail
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  // Comet tail should point opposite to direction of travel
  const angleRad = Math.atan2(dy, dx);
  const tailAngleDeg = (angleRad * 180) / Math.PI + 180;

  return (
    <div
      className="cosmic-transition-overlay"
      aria-hidden="true"
      style={
        {
          "--origin-x": `${origin.x}%`,
          "--origin-y": `${origin.y}%`,
          "--target-x": `${target.x}%`,
          "--target-y": `${target.y}%`,
          "--comet-angle": `${tailAngleDeg}deg`,
        } as CSSProperties
      }
    >
      {/* Phase 1: Black Hole Collapse */}
      {phase === "collapsing" && <div className="black-hole-vortex" />}

      {/* Phase 2: Comet Transit with Particle Tail & Warp Rays */}
      {phase === "shooting" && (
        <>
          <div className="cosmic-warp-field">
            {Array.from({ length: 14 }, (_, i) => (
              <span
                key={i}
                className="warp-ray"
                style={
                  {
                    left: `${(i * 17) % 95}%`,
                    top: `${(i * 29) % 92}%`,
                    width: `${40 + ((i * 37) % 120)}px`,
                    transform: `rotate(${tailAngleDeg - 180}deg)`,
                    opacity: 0.4 + (i % 3) * 0.25,
                  } as CSSProperties
                }
              />
            ))}
          </div>
          <div className="comet-transit-flight">
            <div className="comet-nucleus" />
            <div className="comet-tail" />
          </div>
        </>
      )}

      {/* Phase 3: White Hole Supernova Unfold Burst */}
      {phase === "expanding" && <div className="white-hole-supernova" />}
    </div>
  );
}
