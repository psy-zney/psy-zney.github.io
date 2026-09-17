import { ArrowUpRight, BookOpen, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { projects, type Language } from "../data/portfolio";

export function ProjectShelf({
  onClose,
  lang,
}: {
  onClose: () => void;
  lang: Language;
}) {
  const t = (vi: string, en: string) => (lang === "vie" ? vi : en);
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);
  return (
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shelf-title"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          close.current();
        }
        if (event.key === "Tab") {
          const controls =
            dialog.current?.querySelectorAll<HTMLElement>("a[href], button");
          if (!controls?.length) return;
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }}
      className="bg-[#0d1625] border border-slate-600 rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl text-slate-100 max-h-[85vh] overflow-y-auto"
    >
      <div className="flex items-start justify-between gap-5 border-b border-slate-700 pb-5 mb-5">
        <div>
          <BookOpen className="text-amber-200 mb-3" size={25} />
          <h2 id="shelf-title" className="text-xl">
            {t(
              "Những câu chuyện từ bàn làm việc",
              "Stories from the workspace",
            )}
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            {t(
              "Mỗi dự án kết nối với một phần năng lực. Chọn để đọc bối cảnh và phần mình đóng góp.",
              "Each project connects to a capability. Explore its context and my contribution.",
            )}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label={t("Đóng dự án", "Close projects")}
          className="p-3 hover:bg-slate-800 rounded-lg"
        >
          <X size={20} />
        </button>
      </div>
      <div className="divide-y divide-slate-700">
        {projects.map((project) => (
          <div key={project.id} className="py-5">
            <a
              href={`#/project/${project.id}`}
              className="block group focus-visible:outline focus-visible:outline-amber-200"
            >
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg group-hover:text-amber-200">
                  {project.name}
                </h3>
                <ArrowUpRight size={18} />
              </div>
              <p className="text-sm text-slate-300 mt-2">
                {project.headline[lang]}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                {project.role[lang]}
              </p>
            </a>
            {project.source && (
              <a
                href={project.source}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-amber-200 hover:text-white mt-3"
              >
                {t("Mở GitHub", "Open GitHub")} <ArrowUpRight size={13} />
              </a>
            )}
          </div>
        ))}
      </div>
      <a
        href="#/skills"
        className="inline-flex gap-3 items-center text-sm text-amber-200 mt-5"
      >
        {t("Xem bản đồ năng lực", "Explore the capabilities")}
        <ArrowUpRight size={16} />
      </a>
    </div>
  );
}
