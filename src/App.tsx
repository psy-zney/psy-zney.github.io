import React, { lazy, Suspense, useState, useEffect } from "react";
import { VirgoPortfolio as IntroPage } from "./components/VirgoPortfolio";
import { startIntroAudioFromGesture } from "./utils/audioPreloader";
import { trackPageView } from "./utils/visitorTracker";
import { isWorkspaceHash } from "./utils/appRoutes";

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
  return isWorkspaceHash(window.location.hash) ? "workspace" : "intro";
}

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>(readViewMode);
  const lang = "eng" as const;

  const navigateTo = (mode: ViewMode) => {
    let nextUrl = window.location.pathname;
    if (mode === "workspace") {
      nextUrl += "#/workspace";
    } else if (mode === "admin") {
      nextUrl += "?admin";
    } else if (viewMode === "workspace") {
      nextUrl += "#/contact";
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
    document.documentElement.lang = "en";
    try {
      localStorage.setItem("zney-language", lang);
    } catch {
      /* Storage may be unavailable in private browsing. */
    }
  }, []);

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
      {viewMode === "intro" ? (
        <IntroPage
          onPrepareWorkspace={() => {
            startIntroAudioFromGesture(0);
          }}
          onEnterWorkspace={() => navigateTo("workspace")}
          lang={lang}
        />
      ) : (
        <Suspense
          fallback={
            <div role="status" className="p-8 text-slate-200">
              Opening the 3D workspace…
              <button
                className="block mt-5 underline"
                onClick={() => navigateTo("intro")}
              >
                Back to portfolio
              </button>
            </div>
          }
        >
          <ModelAnalyzer
            onBackToIntro={() => navigateTo("intro")}
            lang={lang}
          />
        </Suspense>
      )}
    </div>
  );
}
