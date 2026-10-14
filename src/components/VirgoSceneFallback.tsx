import { Component, type ReactNode } from "react";
import { ArrowUpRight, RotateCcw } from "lucide-react";
import type { Language } from "../data/portfolio";

export class VirgoSceneBoundary extends Component<{ children: ReactNode; lang: Language }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const vi = this.props.lang === "vie";
    return <div className="virgo-scene-recovery" role="status">
      <p className="virgo-atlas-label">VIRGO / PORTFOLIO</p>
      <h2>{vi ? "Vũ trụ đang nghỉ một chút." : "The cosmos is taking a moment."}</h2>
      <p>{vi ? "Không tải được cảnh 3D. Bạn vẫn có thể khám phá tất cả dự án." : "The 3D scene couldn’t load. All the projects are still here to explore."}</p>
      <div><a className="virgo-atlas-button" href="#/projects/all">{vi ? "Xem dự án" : "Explore the work"}<ArrowUpRight size={17} /></a>
        <button onClick={() => window.location.reload()}><RotateCcw size={16} />{vi ? "Thử lại" : "Try again"}</button></div>
    </div>;
  }
}
