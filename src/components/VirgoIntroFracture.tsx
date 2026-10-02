export function VirgoIntroFracture({ soundEnabled = false }: { soundEnabled?: boolean }) {
  return <div className="virgo-intro-fracture" data-sound={soundEnabled ? "on" : "off"} aria-hidden="true">
    <div className="virgo-fracture-backdrop" />
    <canvas className="virgo-space-rift" />
    <audio className="virgo-fracture-sound" preload="none" />
  </div>;
}
