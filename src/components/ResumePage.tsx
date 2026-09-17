import { Fragment, useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, Download, Printer } from "lucide-react";
import type { Language } from "../data/portfolio";

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
      blocks.push(<h2 key={i}>{inline(line.slice(3))}</h2>);
    else if (line.startsWith("# "))
      blocks.push(<h1 key={i}>{inline(line.slice(2))}</h1>);
    else blocks.push(<p key={i}>{inline(line)}</p>);
  }
  return <>{blocks}</>;
}

export function ResumePage({
  track,
  lang,
}: {
  track: keyof typeof resumeFiles;
  lang: Language;
}) {
  const [content, setContent] = useState("");
  const [error, setError] = useState(false);
  const t = (vi: string, en: string) => (lang === "vie" ? vi : en);
  useEffect(() => {
    const controller = new AbortController();
    setContent("");
    setError(false);
    fetch(resumeFiles[track], { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("CV unavailable");
        return response.text();
      })
      .then(setContent)
      .catch((err) => {
        if (err.name !== "AbortError") setError(true);
      });
    return () => controller.abort();
  }, [track]);
  return (
    <article className="resume-page page-enter">
      <div className="resume-toolbar">
        <a className="text-link" href="#/contact">
          <ArrowLeft size={16} />
          {t("Về phần kết nối", "Back to contact")}
        </a>
        <div>
          <a
            className="text-link"
            href={`#/cv/${track === "web" ? "mobile" : "web"}`}
          >
            {track === "web" ? "Mobile CV" : "Full-stack Web CV"}
            <ArrowUpRight size={15} />
          </a>
          <a className="text-link" href={resumeFiles[track]} download>
            <Download size={15} />
            Markdown
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
      <div className="resume-paper" lang="en">
        {error ? (
          <p role="alert">
            {t(
              "Không tải được CV. Bạn có thể mở file trực tiếp bên dưới.",
              "The CV could not be loaded. Open the file directly below.",
            )}{" "}
            <a href={resumeFiles[track]}>{t("Mở CV", "Open CV")}</a>
          </p>
        ) : content ? (
          <ResumeContent content={content} />
        ) : (
          <p role="status">{t("Đang tải CV…", "Loading CV…")}</p>
        )}
      </div>
    </article>
  );
}
