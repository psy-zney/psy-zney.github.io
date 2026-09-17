import React, { lazy, Suspense, useState, useEffect } from "react";
import { IntroPage } from "./components/IntroPage";
import { startIntroAudioFromGesture } from "./utils/audioPreloader";
import { trackPageView } from "./utils/visitorTracker";

type ViewMode = "intro" | "workspace" | "admin";
const ModelAnalyzer = lazy(() =>
  import("./components/ModelAnalyzer").then((module) => ({
    default: module.ModelAnalyzer,
  })),
);
const AdminDashboard = lazy(() =>
  import("./components/AdminDashboard").then((module) => ({
    default: module.AdminDashboard,
  })),
);

function readViewMode(): ViewMode {
  if (window.location.search.includes("admin")) return "admin";
  return window.location.hash === "#/workspace" ? "workspace" : "intro";
}

function getIsPortraitMobile(): boolean {
  const viewport = window.visualViewport;
  const width = viewport?.width ?? window.innerWidth;
  const height = viewport?.height ?? window.innerHeight;
  const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const isSmallScreen =
    Math.min(width, height) <= 768 && Math.max(width, height) <= 1024;
  const isPortrait =
    window.matchMedia("(orientation: portrait)").matches || height > width;
  return isCoarsePointer && isSmallScreen && isPortrait;
}

function usePortraitMobile(): boolean {
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);

  useEffect(() => {
    const checkOrientation = () => setIsPortraitMobile(getIsPortraitMobile());

    checkOrientation();
    const orientationQuery = window.matchMedia("(orientation: portrait)");
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);
    window.visualViewport?.addEventListener("resize", checkOrientation);
    if (orientationQuery.addEventListener) {
      orientationQuery.addEventListener("change", checkOrientation);
    } else {
      orientationQuery.addListener(checkOrientation);
    }
    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
      window.visualViewport?.removeEventListener("resize", checkOrientation);
      if (orientationQuery.removeEventListener) {
        orientationQuery.removeEventListener("change", checkOrientation);
      } else {
        orientationQuery.removeListener(checkOrientation);
      }
    };
  }, []);

  return isPortraitMobile;
}

function MobileLandscapeOverlay({
  lang,
  onBack,
}: {
  lang: "vie" | "eng";
  onBack: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#0c1017]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center text-white animate-in fade-in duration-300">
      <button
        onClick={onBack}
        className="absolute top-6 left-6 px-4 py-3 text-sm border border-slate-500 rounded-lg"
      >
        {lang === "vie" ? "← Về portfolio" : "← Back to portfolio"}
      </button>
      <div className="w-24 h-24 mb-8 relative flex items-center justify-center">
        <div className="w-12 h-20 border-2 border-sky-400 rounded-xl flex items-center justify-center animate-rotate-phone shadow-[0_0_25px_rgba(56,189,248,0.3)] bg-slate-900/50">
          <div className="w-2 h-2 rounded-full bg-sky-400 absolute bottom-2" />
        </div>
      </div>
      <h3 className="text-xl font-bold font-mono text-sky-400 mb-3 tracking-widest uppercase">
        {lang === "vie" ? "Xoay Ngang Màn Hình" : "Rotate Your Device"}
      </h3>
      <p className="text-sm text-slate-300 max-w-xs leading-relaxed mb-8 font-sans">
        {lang === "vie"
          ? "Vui lòng xoay ngang điện thoại hoặc máy tính bảng để có trải nghiệm không gian 3D & giao diện tốt nhất!"
          : "Please rotate your phone or tablet to landscape mode for the optimal 3D workspace experience!"}
      </p>
      <div className="inline-flex items-center gap-3 text-xs text-sky-300 font-mono bg-sky-950/40 px-5 py-2.5 rounded-full border border-sky-500/30 shadow-sm animate-pulse">
        <span className="text-base">📱 ➔ 🔄</span>
        <span>
          {lang === "vie" ? "Chế Độ Landscape" : "Landscape Required"}
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>(readViewMode);
  const [lang, setLang] = useState<"vie" | "eng">(() => {
    try {
      return localStorage.getItem("zney-language") === "vie" ? "vie" : "eng";
    } catch {
      return "eng";
    }
  });
  const isPortraitMobile = usePortraitMobile();

  const toggleLang = () => setLang((prev) => (prev === "vie" ? "eng" : "vie"));

  const navigateTo = (mode: ViewMode) => {
    let nextUrl = window.location.pathname;
    if (mode === "workspace") {
      nextUrl += "#/workspace";
    } else if (mode === "admin") {
      nextUrl += "?admin";
    }
    window.history.pushState({ viewMode: mode }, "", nextUrl);
    setViewMode(mode);
  };

  useEffect(() => {
    const syncViewFromUrl = () => setViewMode(readViewMode());
    window.addEventListener("popstate", syncViewFromUrl);
    window.addEventListener("hashchange", syncViewFromUrl);
    return () => {
      window.removeEventListener("popstate", syncViewFromUrl);
      window.removeEventListener("hashchange", syncViewFromUrl);
    };
  }, []);

  useEffect(() => {
    trackPageView(viewMode);
  }, [viewMode]);

  useEffect(() => {
    document.documentElement.lang = lang === "vie" ? "vi" : "en";
    try {
      localStorage.setItem("zney-language", lang);
    } catch {
      /* Storage may be unavailable in private browsing. */
    }
  }, [lang]);

  useEffect(() => {
    if (viewMode !== "intro")
      document.title =
        viewMode === "workspace" ? "Workspace | zney" : "Admin | zney";
    const favicon =
      (document.getElementById("favicon") as HTMLLinkElement) ||
      document.querySelector("link[rel*='icon']");
    if (favicon) {
      favicon.href =
        viewMode === "intro" ? "./img/black-hole.png" : "./img/hacker.png";
    } else {
      const link = document.createElement("link");
      link.id = "favicon";
      link.rel = "icon";
      link.type = "image/png";
      link.href =
        viewMode === "intro" ? "./img/black-hole.png" : "./img/hacker.png";
      document.head.appendChild(link);
    }
  }, [viewMode]);

  if (viewMode === "admin") {
    return (
      <Suspense
        fallback={
          <div role="status" className="p-8 text-slate-200">
            Loading…
          </div>
        }
      >
        <AdminDashboard onExit={() => navigateTo("intro")} lang={lang} />
      </Suspense>
    );
  }

  return (
    <div
      className="app-shell w-screen overflow-hidden bg-[#0f141d] font-sans text-slate-100 select-none"
      style={{ height: "100dvh" }}
    >
      {viewMode === "workspace" && isPortraitMobile && (
        <MobileLandscapeOverlay
          lang={lang}
          onBack={() => navigateTo("intro")}
        />
      )}
      {viewMode === "intro" ? (
        <IntroPage
          onEnterWorkspace={() => {
            if (!getIsPortraitMobile()) {
              startIntroAudioFromGesture(0);
            }
            navigateTo("workspace");
          }}
          lang={lang}
          onToggleLang={toggleLang}
        />
      ) : (
        <Suspense
          fallback={
            <div role="status" className="p-8 text-slate-200">
              {lang === "vie"
                ? "Đang mở không gian 3D…"
                : "Opening the 3D workspace…"}
              <button
                className="block mt-5 underline"
                onClick={() => navigateTo("intro")}
              >
                {lang === "vie" ? "Về portfolio" : "Back to portfolio"}
              </button>
            </div>
          }
        >
          <ModelAnalyzer
            onBackToIntro={() => navigateTo("intro")}
            lang={lang}
            loadingAudioBlocked={isPortraitMobile}
          />
        </Suspense>
      )}
    </div>
  );
}
