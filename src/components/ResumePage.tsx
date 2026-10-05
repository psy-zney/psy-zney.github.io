import { Fragment, useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, Download, Printer } from "lucide-react";
import type { Language } from "../data/portfolio";
import { DocumentContents } from './documents/DocumentContents';

const headingId = (title: string) => `resume-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

export const resumeFiles = {
  web: "./file/Le_Quang_Khanh_CV_Web_FullStack.md",
  mobile: "./file/Le_Quang_Khanh_CV_Mobile.md",
};

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
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setContent("");
    setError(false);
    fetch(resumeFiles[track], { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("CV unavailable");
        return response.text();
      })
      .then(text => { if (active) setContent(text); })
      .catch((err) => {
        if (active && err.name !== "AbortError") setError(true);
      });
    return () => { active = false; controller.abort(); };
  }, [track, retry]);
  return (
    <article className="resume-page page-enter">
      <div className="resume-toolbar">
        <a className="text-link" href={backPath}>
          <ArrowLeft size={16} />
          {t("Quay lại", "Back")}
        </a>
        <div>
          <nav aria-label="Resume track">{(['web','mobile'] as const).map(value => <a key={value} className="text-link" href={`${basePath}/${value}`} aria-current={track === value ? 'page' : undefined}>{value === 'web' ? 'Web' : 'Mobile'}</a>)}</nav>
          <a className="text-link" href={resumeFiles[track]} download>
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
      <div className="document-layout"><DocumentContents><nav className="document-tabs" aria-label="Resume contents">{content.split(/\r?\n/).filter(line => line.startsWith('## ')).map(line => <button key={line} onClick={event => { const heading = event.currentTarget.closest('.resume-page')?.querySelector<HTMLElement>(`#${headingId(line.slice(3))}`); if (heading) { heading.scrollIntoView({ block: 'start', behavior: 'instant' }); heading.tabIndex = -1; heading.focus({ preventScroll: true }); } }}>{line.slice(3)}</button>)}</nav></DocumentContents><div className="resume-paper" key={track} lang="en">
        {error ? (
          <p role="alert">
            {t(
              "Không tải được CV. Bạn có thể mở file trực tiếp bên dưới.",
              "The CV could not be loaded. Open the file directly below.",
            )}{" "}
            <a href={resumeFiles[track]}>{t("Mở CV", "Open CV")}</a>
            <button onClick={() => setRetry(value => value + 1)}>{t('Thử lại', 'Retry')}</button>
          </p>
        ) : content ? (
          <ResumeContent content={content} />
        ) : (
          <p role="status">{t("Đang tải CV…", "Loading CV…")}</p>
        )}
      </div></div>
    </article>
  );
}
