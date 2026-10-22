"""Rebuild the three standalone CVs from the owner's DOCX/PDF originals.

Run using Python with python-docx and pypdf installed:
  python scripts/convert-resumes.py --source-dir path/to/Resume
The original files are copied unchanged for downloads; no source is edited.
"""
import argparse
import hashlib
import html
from html.parser import HTMLParser
import json
import re
import shutil
from pathlib import Path

from docx import Document
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    "backend": "Le_Quang_Khanh_CV_Backend_Developer.docx",
    "fullstack": "Le_Quang_Khanh_CV_Full_Stack_Developer.docx",
    "software": "Le_Quang_Khanh_CV_Software_Engineer.pdf",
}


def read_docx(path):
    return [(p.style.name, p.text.strip()) for p in Document(path).paragraphs if p.text.strip()]


def read_pdf(path):
    lines = [line.strip() for page in PdfReader(path).pages for line in page.extract_text().splitlines() if line.strip()]
    rows = [("Title", lines[0]), ("Subtitle", lines[1]), ("Contact", lines[2])]
    section = ""
    for line in lines[3:]:
        if line in ("SUMMARY", "EDUCATION", "TECHNICAL PROJECTS", "SKILLS"):
            section = line
            rows.append(("Heading 1", line))
        elif section == "SUMMARY":
            if rows[-1][0] == "Normal":
                rows[-1] = ("Normal", rows[-1][1] + " " + line)
            else:
                rows.append(("Normal", line))
        elif section == "EDUCATION":
            rows.append(("Education Line", line.replace(" Expected", "\tExpected")) if "Expected" in line else ("Education Detail", line))
        elif section == "TECHNICAL PROJECTS":
            title = re.match(r"^(.+? - .+?)\s+((?:Jun )?2026)$", line)
            if title:
                rows.append(("Project Title", title[1] + "\t" + title[2]))
            elif line.startswith("Repository:"):
                rows.append(("Project Link", line))
            elif line.startswith(("•", "\ufffd")):
                rows.append(("Project Bullet", line))
            elif line.startswith("Tech stack:"):
                rows.append(("Project Stack", line))
            else:
                rows[-1] = (rows[-1][0], rows[-1][1] + " " + line)
        elif section == "SKILLS":
            if ":" in line:
                rows.append(("Skill Line", line))
            else:
                rows[-1] = ("Skill Line", rows[-1][1] + "\n" + line)
        else:
            raise ValueError(f"Unrecognized PDF line: {line}")
    return rows


def render(rows, css):
    esc = html.escape
    title, role, contact = [text for _, text in rows[:3]]
    links = {"lequangkhanh295@gmail.com": "mailto:lequangkhanh295@gmail.com", "github.com/psy-zney": "https://github.com/psy-zney", "zney295.id.vn": "https://zney295.id.vn"}
    contacts = " &nbsp;|&nbsp; ".join(f'<a href="{links[value]}" target="_blank" rel="noopener noreferrer">{esc(value)}</a>' if value in links else esc(value) for value in (part.strip() for part in contact.split("|")))
    output = [f'<header><h1>{esc(title)}</h1><p class="cv-role">{esc(role)}</p><p class="cv-contact">{contacts}</p></header>']
    project_open = list_open = False
    section = ""
    for style, text in rows[3:]:
        if list_open and style != "Project Bullet":
            output.append("</ul>")
            list_open = False
        if project_open and style in ("Heading 1", "Project Title"):
            output.append("</article>")
            project_open = False
        if style == "Heading 1":
            if section:
                output.append("</section>")
            section = text
            slug = text.lower().replace(" ", "-")
            output.append(f'<section class="cv-{slug}"><h2 id="resume-{slug}" tabindex="-1">{esc(text)}</h2>')
        elif style == "Education Line":
            institution, date = text.split("\t")
            output.append(f'<p class="cv-row"><strong>{esc(institution)}</strong><time>{esc(date)}</time></p>')
        elif style == "Education Detail":
            output.append(f'<p><em>{esc(text)}</em></p>')
        elif style == "Project Title":
            name, date = text.split("\t")
            project, scope = name.split(" - ", 1)
            output.append(f'<article class="cv-project"><div class="cv-row"><h3><strong>{esc(project)}</strong> - <em>{esc(scope)}</em></h3><time>{esc(date)}</time></div>')
            project_open = True
        elif style == "Project Link":
            url = text.removeprefix("Repository: ")
            output.append(f'<p class="cv-repository"><strong>Repository:</strong> <a href="https://{esc(url)}" target="_blank" rel="noopener noreferrer">{esc(url)}</a></p>')
        elif style == "Project Bullet":
            if not list_open:
                output.append("<ul>")
                list_open = True
            output.append(f'<li>{esc(text.lstrip("•\ufffd "))}</li>')
        elif style in ("Project Stack", "Skill Line"):
            label, value = text.split(":", 1)
            css_class = ' class="cv-stack"' if style == "Project Stack" else ""
            value_html = esc(value).replace("\n", "<br>")
            output.append(f'<p{css_class}><strong>{esc(label)}:</strong>{value_html}</p>')
        elif style == "Normal":
            output.append(f'<p>{esc(text)}</p>')
        else:
            raise ValueError(f"Unrecognized DOCX style: {style}")
    if section:
        output.append("</section>")
    body = "\n".join(output)
    class TextContent(HTMLParser):
        def __init__(self):
            super().__init__()
            self.parts = []

        def handle_data(self, data):
            self.parts.append(data)

    parsed = TextContent()
    parsed.feed(body)
    normalize = lambda text: " ".join(text.replace("\ufffd", "").replace("•", "").split())
    assert normalize(" ".join(parsed.parts)) == normalize(" ".join(text for _, text in rows)), "Generated HTML must preserve every source paragraph"
    return f'<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>{esc(title)} — {esc(role)} CV</title>\n<style>\n{css}</style>\n</head>\n<body><main class="cv-sheet">\n{body}\n</main></body>\n</html>\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", required=True, type=Path)
    args = parser.parse_args()
    destination = ROOT / "public/file"
    originals = destination / "source"
    originals.mkdir(parents=True, exist_ok=True)
    css = (ROOT / "scripts/templates/resume.css").read_text(encoding="utf-8")
    manifest = {}
    for track, filename in SOURCES.items():
        source = args.source_dir / filename
        rows = read_pdf(source) if source.suffix == ".pdf" else read_docx(source)
        assert len([text for style, text in rows if style == "Project Title"]) == 3
        assert len([text for style, text in rows if style == "Project Bullet"]) == 6
        output = destination / (source.stem + ".html")
        output.write_text(render(rows, css), encoding="utf-8")
        if source.resolve() != (originals / filename).resolve():
            shutil.copyfile(source, originals / filename)
        manifest[track] = {"source": filename, "sha256": hashlib.sha256(source.read_bytes()).hexdigest(), "html": output.name}
    (originals / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print("Converted three current CVs and copied byte-identical originals.")


if __name__ == "__main__":
    main()
