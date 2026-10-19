import { Fragment, useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, Download, Printer } from "lucide-react";
import type { Language } from "../data/portfolio";
import { DocumentContents } from './documents/DocumentContents';

const headingId = (title: string) => `resume-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

export const resumeFiles = {
  backend: "./file/Le_Quang_Khanh_CV_Backend.html",
  fullstack: "./file/Le_Quang_Khanh_CV_FullStack.html",
  game: "./file/Le_Quang_Khanh_CV_Game.html",
  software: "./file/Le_Quang_Khanh_CV_Software.html",
  mobile: "./file/Le_Quang_Khanh_CV_Mobile.html",
  web: "./file/Le_Quang_Khanh_CV_FullStack.html",
};

export const TRACK_LABELS: Record<string, string> = {
  backend: "Backend",
  fullstack: "Full Stack",
  game: "Game",
  software: "Software",
  mobile: "Mobile",
  web: "Full Stack",
};

export const DISPLAY_TRACKS = ['backend', 'fullstack', 'game', 'software', 'mobile'] as const;

// Render only the small, trusted Markdown subset used by the bundled CVs.
// React escapes text; HTML and script links are never interpreted.
function inline(text: string): ReactNode {
  return text
    .split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
    .map((part, index) => {
      const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link && /^(https:\/\/|mailto:)/.test(link[2]))
        return (
          <a key={index} href={link[2]}>
            {link[1]}
          </a>
        );
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={index}>{inline(part.slice(2, -2))}</strong>;
      if (part.startsWith("*") && part.endsWith("*"))
        return <em key={index}>{inline(part.slice(1, -1))}</em>;
      if (part.startsWith("`") && part.endsWith("`"))
        return <code key={index}>{part.slice(1, -1)}</code>;
      return <Fragment key={index}>{part}</Fragment>;
    });
}

export function ResumeContent({ content }: { content: string }) {
  if (content.includes("<!DOCTYPE") || content.includes("<html")) {
    const sanitized = content
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/href=["']javascript:[^"']*["']/gi, 'href="#"');
    const bodyMatch = sanitized.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const innerHtml = bodyMatch ? bodyMatch[1] : sanitized;
    return <div className="resume-html-document" dangerouslySetInnerHTML={{ __html: innerHtml }} />;
  }

  const lines = content.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === "---") continue;
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        if (!/^\|[\s:|\-]+\|$/.test(lines[i].trim()))
          rows.push(
            lines[i]
              .trim()
              .slice(1, -1)
              .split("|")
              .map((cell) => cell.trim()),
          );
        i++;
      }
      i--;
      blocks.push(
        <div className="resume-table" key={i}>
          <table>
            <thead>
              <tr>
                {rows[0].map((cell, j) => (
                  <th key={j}>{inline(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(1).map((row, j) => (
                <tr key={j}>
                  {row.map((cell, k) => (
                    <td key={k}>{inline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    } else if (line.startsWith("- ")) {
      const items = [];
      while (i < lines.length && lines[i].startsWith("- "))
        items.push(<li key={i}>{inline(lines[i++].slice(2))}</li>);
      i--;
      blocks.push(<ul key={i}>{items}</ul>);
    } else if (line.startsWith("### "))
      blocks.push(<h3 key={i}>{inline(line.slice(4))}</h3>);
    else if (line.startsWith("## "))
      blocks.push(<h2 id={headingId(line.slice(3))} key={i}>{inline(line.slice(3))}</h2>);
    else if (line.startsWith("# "))
      blocks.push(<h1 key={i}>{inline(line.slice(2))}</h1>);
    else blocks.push(<p key={i}>{inline(line)}</p>);
  }
  return <>{blocks}</>;
}

export function ResumePage({
  track,
  lang,
  basePath = '#/cv',
  backPath = '#/contact',
}: {
  track: keyof typeof resumeFiles;
  lang: Language;
  basePath?: string;
  backPath?: string;
}) {
  const [content, setContent] = useState("");
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const t = (vi: string, en: string) => (lang === "vie" ? vi : en);
  const targetTrack = track in resumeFiles ? track : 'fullstack';

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setContent("");
    setError(false);
    fetch(resumeFiles[targetTrack], { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("CV unavailable");
        return response.text();
      })
      .then(text => { if (active) setContent(text); })
      .catch((err) => {
        if (active && err.name !== "AbortError") setError(true);
      });
    return () => { active = false; controller.abort(); };
  }, [targetTrack, retry]);

  return (
    <article className="resume-page page-enter">
      <div className="resume-toolbar">
        <a className="text-link" href={backPath}>
          <ArrowLeft size={16} />
          {t("Quay lại", "Back")}
        </a>
        <div>
          <nav aria-label="Resume track">
            {DISPLAY_TRACKS.map(value => (
              <a
                key={value}
                className="text-link"
                href={`${basePath}/${value}`}
                aria-current={(track === value || (track === 'web' && value === 'fullstack')) ? 'page' : undefined}
              >
                {TRACK_LABELS[value]}
              </a>
            ))}
          </nav>
          <a className="text-link" href={resumeFiles[targetTrack]} download>
            <Download size={15} />
            Download source
          </a>
          <button
            className="primary-link"
            disabled={!content}
            onClick={() => window.print()}
          >
            <Printer size={15} />
            {t("In / Lưu PDF", "Print / Save PDF")}
          </button>
        </div>
      </div>
      <p className="resume-language-note">
        {t(
          "CV được trình bày bằng tiếng Anh. Chọn In / Lưu PDF để lưu một bản từ trình duyệt.",
          "This CV is in English. Use Print / Save PDF to save a copy from your browser.",
        )}
      </p>
      <div className="document-layout">
        <DocumentContents>
          <nav className="document-tabs" aria-label="Resume contents">
            {content.includes("<!DOCTYPE") ? (
              ['SUMMARY', 'EDUCATION', 'TECHNICAL PROJECTS', 'SKILLS'].map(title => (
                <button
                  key={title}
                  onClick={() => {
                    const headings = Array.from(document.querySelectorAll<HTMLElement>('.section-title'));
                    const target = headings.find(h => h.textContent?.trim().toUpperCase().includes(title));
                    if (target) {
                      target.scrollIntoView({ block: 'start', behavior: 'smooth' });
                    }
                  }}
                >
                  {title}
                </button>
              ))
            ) : (
              content.split(/\r?\n/).filter(line => line.startsWith('## ')).map(line => (
                <button
                  key={line}
                  onClick={event => {
                    const heading = event.currentTarget.closest('.resume-page')?.querySelector<HTMLElement>(`#${headingId(line.slice(3))}`);
                    if (heading) {
                      heading.scrollIntoView({ block: 'start', behavior: 'instant' });
                      heading.tabIndex = -1;
                      heading.focus({ preventScroll: true });
                    }
                  }}
                >
                  {line.slice(3)}
                </button>
              ))
            )}
          </nav>
        </DocumentContents>
        <div className="resume-paper" key={targetTrack} lang="en">
          {error ? (
            <p role="alert">
              {t(
                "Không tải được CV. Bạn có thể mở file trực tiếp bên dưới.",
                "The CV could not be loaded. Open the file directly below.",
              )}{" "}
              <a href={resumeFiles[targetTrack]}>{t("Mở CV", "Open CV")}</a>
              <button onClick={() => setRetry(value => value + 1)}>{t('Thử lại', 'Retry')}</button>
            </p>
          ) : content ? (
            <ResumeContent content={content} />
          ) : (
            <p role="status">{t("Đang tải CV…", "Loading CV…")}</p>
          )}
        </div>
      </div>
    </article>
  );
}
