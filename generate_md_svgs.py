#!/usr/bin/env python3
"""Generate SVG replacements for all Markdown tables and diagrams.

Run from the repository root:
    python generate_md_svgs.py

Scans all Markdown files, converts tables, ASCII diagrams, and tree structures
to professional SVG graphics, and rewrites each Markdown file with image refs.
"""

import html
import re
import textwrap
from pathlib import Path

# ── Style Constants ──────────────────────────────────────────────────────────

FONT = "system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
MONO = "'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace"

HDR_BG   = "#5a4218"
HDR_FG   = "#ffffff"
EVEN_BG  = "#ffffff"
ODD_BG   = "#f8f4ee"
BORDER   = "#d4c4a0"
TXT      = "#2d2d2d"
TITLE_C  = "#5a4218"
ACCENT   = "#c4a66a"
LINK_C   = "#1a6fb5"

FONT_SZ    = 13
HDR_FONT   = 13
TITLE_FONT = 15
MONO_SZ    = 12

PAD_X = 12
PAD_Y = 8
ROW_H  = FONT_SZ + 2 * PAD_Y
HDR_H  = HDR_FONT + 2 * PAD_Y


# ── Text Helpers ─────────────────────────────────────────────────────────────

def _char_w(font_size: float = FONT_SZ) -> float:
    return font_size * 0.60


def _text_w(text: str, font_size: float = FONT_SZ) -> float:
    return len(text) * _char_w(font_size)


_MD_LINK = re.compile(r'\[([^\]]*)\]\([^)]*\)')
_MD_BOLD = re.compile(r'\*\*(.+?)\*\*')
_MD_CODE = re.compile(r'`([^`]+)`')
_ESCAPED = re.compile(r'\\([_*`])')
_EMOJI   = {
    ':white_check_mark:': '✅',
    ':x:': '❌',
    ':star:': '⭐',
    ':warning:': '⚠️',
}


def _clean(text: str) -> str:
    """Strip Markdown formatting, return plain display text."""
    for code, char in _EMOJI.items():
        text = text.replace(code, char)
    text = _ESCAPED.sub(r'\1', text)
    text = _MD_LINK.sub(r'\1', text)
    text = _MD_BOLD.sub(r'\1', text)
    text = _MD_CODE.sub(r'\1', text)
    return text.strip()


def _is_bold(text: str) -> bool:
    stripped = text.strip()
    return stripped.startswith('**') and '**' in stripped[2:]


def _esc(text: str) -> str:
    return html.escape(_clean(text))


# ── SVG Generators ───────────────────────────────────────────────────────────

def table_to_svg(headers: list[str], rows: list[list[str]], title: str = "") -> str:
    """Render a Markdown table as a professional SVG."""
    n_cols = len(headers)
    # Compute column widths
    col_w: list[float] = []
    for i in range(n_cols):
        w = _text_w(_clean(headers[i]), HDR_FONT)
        for row in rows:
            if i < len(row):
                w = max(w, _text_w(_clean(row[i])))
        col_w.append(max(60, min(w + 2 * PAD_X, 480)))

    total_w = sum(col_w) + 2
    title_h = 32 if title else 0
    total_h = title_h + HDR_H + len(rows) * ROW_H + 2

    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" '
           f'width="{total_w:.0f}" height="{total_h:.0f}" '
           f'viewBox="0 0 {total_w:.0f} {total_h:.0f}">']
    svg.append(f'<style>text{{font-family:{FONT}}}</style>')

    y = 1.0
    if title:
        svg.append(f'<text x="{total_w/2:.0f}" y="{y+21}" text-anchor="middle" '
                   f'font-size="{TITLE_FONT}" font-weight="700" fill="{TITLE_C}">'
                   f'{html.escape(title)}</text>')
        y += title_h

    # Header background
    svg.append(f'<rect x="1" y="{y:.0f}" width="{total_w-2:.0f}" '
               f'height="{HDR_H}" fill="{HDR_BG}" rx="4"/>')
    if rows:
        svg.append(f'<rect x="1" y="{y+HDR_H-4:.0f}" width="{total_w-2:.0f}" '
                   f'height="4" fill="{HDR_BG}"/>')

    # Header text
    x = 1.0
    for i, h in enumerate(headers):
        tx = x + col_w[i] / 2
        ty = y + HDR_H / 2 + HDR_FONT * 0.35
        svg.append(f'<text x="{tx:.0f}" y="{ty:.1f}" text-anchor="middle" '
                   f'font-size="{HDR_FONT}" font-weight="700" fill="{HDR_FG}">'
                   f'{_esc(h)}</text>')
        x += col_w[i]
    y += HDR_H

    # Data rows
    for ri, row in enumerate(rows):
        bg = EVEN_BG if ri % 2 == 0 else ODD_BG
        last = ri == len(rows) - 1
        rx = "0 0 4 4" if last else "0"
        svg.append(f'<rect x="1" y="{y:.0f}" width="{total_w-2:.0f}" '
                   f'height="{ROW_H}" fill="{bg}"/>')
        if not last:
            svg.append(f'<line x1="1" y1="{y+ROW_H:.0f}" x2="{total_w-1:.0f}" '
                       f'y2="{y+ROW_H:.0f}" stroke="{BORDER}" stroke-width="0.5"/>')

        x = 1.0
        for i in range(n_cols):
            cell = row[i] if i < len(row) else ""
            fw = "700" if _is_bold(cell) else "400"
            tx = x + PAD_X
            ty = y + ROW_H / 2 + FONT_SZ * 0.35
            svg.append(f'<text x="{tx:.0f}" y="{ty:.1f}" font-size="{FONT_SZ}" '
                       f'font-weight="{fw}" fill="{TXT}">{_esc(cell)}</text>')
            if i > 0:
                svg.append(f'<line x1="{x:.0f}" y1="{y:.0f}" x2="{x:.0f}" '
                           f'y2="{y+ROW_H:.0f}" stroke="{BORDER}" '
                           f'stroke-width="0.5"/>')
            x += col_w[i]
        y += ROW_H

    # Outer border
    svg.append(f'<rect x="1" y="{title_h+1:.0f}" width="{total_w-2:.0f}" '
               f'height="{total_h-title_h-2:.0f}" fill="none" stroke="{BORDER}" '
               f'stroke-width="1" rx="4"/>')
    svg.append('</svg>')
    return '\n'.join(svg)


def diagram_to_svg(text: str, title: str = "") -> str:
    """Render an ASCII art diagram / tree / code block as a styled SVG."""
    lines = text.rstrip().split('\n')
    max_len = max((len(l) for l in lines), default=0)
    char_w = MONO_SZ * 0.602
    line_h = MONO_SZ * 1.6

    pad = 20
    title_h = 32 if title else 0
    w = max_len * char_w + 2 * pad + 2
    h = title_h + len(lines) * line_h + 2 * pad + 2

    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" '
           f'width="{w:.0f}" height="{h:.0f}" '
           f'viewBox="0 0 {w:.0f} {h:.0f}">']
    svg.append(f'<style>text{{font-family:{MONO};white-space:pre}}</style>')

    y_off = 1.0
    if title:
        svg.append(f'<text x="{w/2:.0f}" y="{y_off+21}" text-anchor="middle" '
                   f'font-size="{TITLE_FONT}" font-weight="700" fill="{TITLE_C}" '
                   f'style="font-family:{FONT}">{html.escape(title)}</text>')
        y_off += title_h

    # Background
    svg.append(f'<rect x="1" y="{y_off:.0f}" width="{w-2:.0f}" '
               f'height="{h-y_off-1:.0f}" fill="#f6f1ea" rx="6" '
               f'stroke="{BORDER}" stroke-width="1"/>')
    # Left accent bar
    svg.append(f'<rect x="1" y="{y_off:.0f}" width="4" '
               f'height="{h-y_off-1:.0f}" fill="{HDR_BG}" rx="2"/>')

    for i, line in enumerate(lines):
        tx = pad + 4
        ty = y_off + pad + (i + 0.75) * line_h
        svg.append(f'<text x="{tx}" y="{ty:.1f}" font-size="{MONO_SZ}" '
                   f'fill="{TXT}">{html.escape(line)}</text>')

    svg.append('</svg>')
    return '\n'.join(svg)


# ── Markdown Parser ──────────────────────────────────────────────────────────

_TABLE_ROW = re.compile(r'^\s*\|.+\|\s*$')
_TABLE_SEP = re.compile(r'^\s*\|[\s:]*-[-\s:|]*\|\s*$')


def _parse_row(line: str) -> list[str]:
    cells = line.strip().strip('|').split('|')
    return [c.strip() for c in cells]


class MdBlock:
    """Represents a replaceable block in markdown (table or code diagram)."""
    def __init__(self, kind: str, start: int, end: int, raw: str,
                 title: str = "", data=None):
        self.kind = kind        # 'table' | 'diagram' | 'tree'
        self.start = start      # line index (0-based)
        self.end = end          # exclusive end line
        self.raw = raw
        self.title = title
        self.data = data        # (headers, rows) for tables; text for diagrams


def find_blocks(lines: list[str]) -> list[MdBlock]:
    """Find all tables and code-block diagrams in markdown lines."""
    blocks: list[MdBlock] = []
    i = 0
    n = len(lines)

    while i < n:
        # ── Table detection ──
        if _TABLE_ROW.match(lines[i]):
            start = i
            # Collect consecutive table rows
            while i < n and _TABLE_ROW.match(lines[i]):
                i += 1
            end = i
            chunk = lines[start:end]
            # Need at least header + separator + 1 data row
            if len(chunk) >= 3 and _TABLE_SEP.match(chunk[1]):
                headers = _parse_row(chunk[0])
                rows = [_parse_row(r) for r in chunk[2:]
                        if not _TABLE_SEP.match(r)]
                # Look for a heading above as title
                title = ""
                for j in range(start - 1, max(start - 4, -1), -1):
                    if j < 0:
                        break
                    stripped = lines[j].strip()
                    if stripped.startswith('#'):
                        title = stripped.lstrip('#').strip()
                        break
                    if stripped and not stripped.startswith('>') and stripped != '---':
                        break
                raw = '\n'.join(chunk)
                blocks.append(MdBlock('table', start, end, raw, title,
                                      (headers, rows)))
            continue

        # ── Code block detection ──
        if lines[i].strip().startswith('```'):
            start = i
            lang = lines[i].strip()[3:].strip().lower()
            i += 1
            content_lines = []
            while i < n and not lines[i].strip().startswith('```'):
                content_lines.append(lines[i].rstrip())
                i += 1
            if i < n:
                i += 1  # skip closing ```
            end = i
            content = '\n'.join(content_lines)

            # Classify: diagram if has box-drawing chars, tree chars, or dir tree
            has_box = any(c in content for c in '┌┐└┘├┤│─┬┴═║╔╗╚╝')
            has_tree = '├──' in content or '└──' in content
            # Detect indented directory trees (lines ending with / or
            # containing common file extensions like .ts, .js, .json, .css)
            dir_lines = [l for l in content_lines if l.strip()]
            is_dir_tree = (
                not lang
                and len(dir_lines) >= 3
                and sum(1 for l in dir_lines
                        if l.rstrip().endswith('/')
                        or re.search(r'\.\w{1,4}\b', l)) > len(dir_lines) * 0.4
            )
            is_code = lang in ('typescript', 'ts', 'tsx', 'javascript', 'js',
                               'python', 'py', 'json', 'bash', 'sh', 'css',
                               'html', 'yaml', 'yml', 'sql')

            if (has_box or has_tree or is_dir_tree) and not is_code:
                kind = 'tree' if has_tree and not has_box else 'diagram'
                title = ""
                for j in range(start - 1, max(start - 4, -1), -1):
                    if j < 0:
                        break
                    stripped = lines[j].strip()
                    if stripped.startswith('#'):
                        title = stripped.lstrip('#').strip()
                        break
                    if stripped and not stripped.startswith('>') and stripped != '---':
                        break
                blocks.append(MdBlock(kind, start, end,
                                      '\n'.join(lines[start:end]),
                                      title, content))
            continue

        i += 1

    return blocks


# ── File Processing ──────────────────────────────────────────────────────────

def process_file(md_path: Path) -> int:
    """Process a single markdown file. Returns number of SVGs generated."""
    text = md_path.read_text(encoding='utf-8')
    lines = text.split('\n')
    blocks = find_blocks(lines)

    if not blocks:
        return 0

    svg_dir = md_path.parent / 'svg'
    svg_dir.mkdir(exist_ok=True)

    # Generate SVGs and build replacement map
    replacements: list[tuple[int, int, str]] = []  # (start, end, new_md)
    stem = md_path.stem

    for idx, block in enumerate(blocks, 1):
        if block.kind == 'table':
            headers, rows = block.data
            svg_content = table_to_svg(headers, rows, block.title)
            fname = f'{stem}-table-{idx:02d}.svg'
        else:
            svg_content = diagram_to_svg(block.data, block.title)
            fname = f'{stem}-{block.kind}-{idx:02d}.svg'

        svg_path = svg_dir / fname
        svg_path.write_text(svg_content, encoding='utf-8')

        # Build replacement markdown (image ref)
        alt = block.title or f'{block.kind.title()} {idx}'
        rel = f'svg/{fname}'
        new_md = f'\n![{alt}]({rel})\n'
        replacements.append((block.start, block.end, new_md))

    # Apply replacements in reverse order to preserve line numbers
    new_lines = list(lines)
    for start, end, new_md in reversed(replacements):
        new_lines[start:end] = [new_md]

    md_path.write_text('\n'.join(new_lines), encoding='utf-8')
    print(f"  ✓ {md_path.relative_to(ROOT)}: {len(blocks)} SVG(s)")
    return len(blocks)


# ── Main ─────────────────────────────────────────────────────────────────────

ROOT = Path(__file__).resolve().parent

# Files to process (relative to repo root)
MD_FILES = [
    'README.md',
    'legacy/ROADMAP.md',
    'legacy/pantry-cabinet-plans/plan-a/double-pantry-cabinet-plan.md',
    'legacy/pantry-cabinet-plans/plan-a/double-pantry-cabinet-plan-plan-a.md',
    'legacy/pantry-cabinet-plans/plan-b/plan-b-optimized-depth.md',
    'legacy/pantry-cabinet-plans/plan-c/plan-c-maximum-optimisation.md',
    '.github/SECURITY.md',
]


def main():
    total = 0
    print("Generating SVGs for Markdown tables and diagrams...\n")
    for rel in MD_FILES:
        md_path = ROOT / rel
        if md_path.exists():
            total += process_file(md_path)
        else:
            print(f"  ⚠ {rel}: file not found, skipping")
    print(f"\nDone — {total} SVG(s) generated.")


if __name__ == '__main__':
    main()
