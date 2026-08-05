from __future__ import annotations

import colorsys
import io
import json
import math
import re
import statistics
import textwrap
import time
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Iterable

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps, ImageStat
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image as RLImage,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
AUDIT_DIR = ROOT / "output" / "market-audit"
DATA_PATH = AUDIT_DIR / "listings-mercado-livre.json"
THUMB_DIR = AUDIT_DIR / "thumbs"
CONTACT_DIR = AUDIT_DIR / "contact-sheets"
CHART_DIR = AUDIT_DIR / "charts"
SCREENSHOT_DIR = AUDIT_DIR / "screenshots"
PDF_DIR = ROOT / "output" / "pdf"
ANALYSIS_PATH = AUDIT_DIR / "market-visual-analysis.json"
PDF_PATH = PDF_DIR / "auditoria-visual-kits-festa-mercado-2026-08-05.pdf"

PAGE_W, PAGE_H = landscape(A4)
MARGIN = 15 * mm

THEMES = {
    "Minecraft": ["minecraft"],
    "Sonic": ["sonic"],
    "Pokemon": ["pokemon", "pokémon"],
    "Harry Potter": ["harry potter"],
    "Homem-Aranha": ["homem aranha", "spider man", "spiderman"],
    "Festa Junina": ["festa junina", "arraia", "arraiá", "sao joao", "são joão"],
    "Safari": ["safari", "selva", "floresta"],
    "Stitch/Angel": ["stitch", "angel"],
    "Princesas": ["princesa", "princesas", "rapunzel", "cinderela", "branca de neve"],
    "Bela e a Fera": ["bela e a fera"],
    "Dinossauros": ["dinossauro", "dinossauros", "jurassic"],
    "Carros/Corrida": ["carros", "hot wheels", "formula 1", "fórmula 1", "ferrari", "cr7"],
    "Fazendinha": ["fazendinha", "fazenda"],
    "Mundo Bita": ["mundo bita", "bita"],
    "Baby Shark": ["baby shark"],
    "Minnie/Mickey": ["minnie", "mickey"],
    "Turma da Monica": ["turma da monica", "turma da mônica"],
    "Casa da Gaby": ["casa da gaby", "gabby"],
    "Frozen": ["frozen"],
    "Era do Gelo": ["era do gelo", "ice age"],
    "K-pop": ["k-pop", "kpop", "demon hunters"],
    "Super-herois": ["vingadores", "super heroi", "super-heroi", "batman", "hulk"],
    "Futebol": ["futebol", "corinthians", "flamengo", "palmeiras", "santos", "selecao", "seleção"],
    "Circo": ["circo"],
    "Unicornio": ["unicornio", "unicórnio"],
    "Bebe/Chuva de amor": ["chá revelação", "cha revelacao", "chuva de amor", "ursinho", "mesversario", "mesversário"],
}

PRODUCT_TYPES = {
    "Kit decoracao/so um bolinho": ["só um bolinho", "so um bolinho", "decoracao", "decoração", "festa em casa"],
    "Papelaria/lembrancinhas": ["papelaria", "lembrancinha", "lembrancinhas", "caixa", "sacolinha"],
    "Topo de bolo": ["topo de bolo", "topper"],
    "Displays/mesa": ["display", "totem", "centro de mesa"],
    "Adesivos/apliques": ["adesivo", "aplique", "tag"],
    "Baloes": ["balão", "balao", "bexiga"],
}

HUE_NAMES = [
    (15, "vermelho"),
    (45, "laranja"),
    (70, "amarelo"),
    (165, "verde"),
    (205, "ciano"),
    (255, "azul"),
    (290, "violeta"),
    (335, "rosa"),
    (360, "vermelho"),
]


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.lower()).strip()


def classify(value: str, mapping: dict[str, list[str]], fallback: str) -> str:
    text = normalize_text(value)
    for label, needles in mapping.items():
        if any(needle in text for needle in needles):
            return label
    return fallback


def sales_weight(item: dict) -> float:
    sold = float(item.get("soldMin") or 0)
    rating = float(item.get("rating") or 0)
    badge = 1 if item.get("badges", {}).get("bestSeller") else 0
    rank_bonus = max(0, 25 - int(item.get("rankOverall", 999))) / 25
    return math.log10(sold + 1) * 40 + rating * 5 + badge * 45 + rank_bonus * 8


def safe_filename(index: int) -> Path:
    return THUMB_DIR / f"ml-{index:03d}.jpg"


def download_thumbnail(item: dict, index: int) -> tuple[bool, str]:
    destination = safe_filename(index)
    if destination.exists() and destination.stat().st_size > 2000:
        return True, "cached"
    request = urllib.request.Request(
        item["imageUrl"],
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            raw = response.read()
        with Image.open(io.BytesIO(raw)) as image:
            canvas = Image.new("RGB", image.size, "white")
            if image.mode in ("RGBA", "LA"):
                canvas.paste(image.convert("RGBA"), mask=image.convert("RGBA").getchannel("A"))
            else:
                canvas.paste(image.convert("RGB"))
            canvas.thumbnail((720, 720), Image.Resampling.LANCZOS)
            canvas.save(destination, "JPEG", quality=91, optimize=True)
        return True, "downloaded"
    except Exception as exc:  # Network/media errors are recorded in the report.
        return False, f"{type(exc).__name__}: {exc}"


def rgb_to_hex(rgb: Iterable[int]) -> str:
    values = [max(0, min(255, int(round(value)))) for value in rgb]
    return "#" + "".join(f"{value:02X}" for value in values[:3])


def hue_name(rgb: tuple[int, int, int]) -> str:
    h, s, v = colorsys.rgb_to_hsv(*(channel / 255 for channel in rgb))
    if s < 0.14:
        return "neutro claro" if v > 0.72 else "neutro escuro"
    degree = h * 360
    for upper, name in HUE_NAMES:
        if degree <= upper:
            return name
    return "vermelho"


def dominant_palette(image: Image.Image, count: int = 6) -> list[dict]:
    small = image.convert("RGB").resize((150, 150), Image.Resampling.LANCZOS)
    array = np.asarray(small)
    keep = ~((array[..., 0] > 245) & (array[..., 1] > 245) & (array[..., 2] > 245))
    pixels = array[keep]
    if len(pixels) < 200:
        pixels = array.reshape(-1, 3)
    sample = Image.fromarray(pixels.reshape((-1, 1, 3)).astype(np.uint8), "RGB")
    quantized = sample.quantize(colors=count, method=Image.Quantize.MEDIANCUT)
    palette = quantized.getpalette() or []
    color_counts = sorted(quantized.getcolors() or [], reverse=True)
    total = max(1, sum(amount for amount, _ in color_counts))
    result = []
    for amount, palette_index in color_counts[:count]:
        rgb = tuple(palette[palette_index * 3 : palette_index * 3 + 3])
        result.append({
            "hex": rgb_to_hex(rgb),
            "rgb": list(rgb),
            "share": round(amount / total, 4),
            "family": hue_name(rgb),
        })
    return result


def analyze_image(path: Path) -> dict:
    with Image.open(path) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")
        image.thumbnail((260, 260), Image.Resampling.LANCZOS)
        array = np.asarray(image).astype(np.float32)
        flat = array.reshape(-1, 3)
        mx = flat.max(axis=1)
        mn = flat.min(axis=1)
        saturation = np.where(mx == 0, 0, (mx - mn) / np.maximum(mx, 1))
        luminance = flat @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
        rg = flat[:, 0] - flat[:, 1]
        yb = 0.5 * (flat[:, 0] + flat[:, 1]) - flat[:, 2]
        colorfulness = math.sqrt(float(np.std(rg)) ** 2 + float(np.std(yb)) ** 2) + 0.3 * math.sqrt(float(np.mean(rg)) ** 2 + float(np.mean(yb)) ** 2)
        white_share = float(np.mean((flat[:, 0] > 242) & (flat[:, 1] > 242) & (flat[:, 2] > 242)))
        vivid_share = float(np.mean((saturation > 0.55) & (luminance > 45) & (luminance < 225)))
        dark_share = float(np.mean(luminance < 55))
        gray = image.convert("L")
        edges = np.asarray(gray.filter(ImageFilter.FIND_EDGES), dtype=np.float32)
        edge_density = float(np.mean(edges > 38))
        contrast = float(np.percentile(luminance, 95) - np.percentile(luminance, 5))
        return {
            "width": image.width,
            "height": image.height,
            "meanSaturation": round(float(np.mean(saturation)), 4),
            "meanLuminance": round(float(np.mean(luminance)), 2),
            "whiteShare": round(white_share, 4),
            "vividShare": round(vivid_share, 4),
            "darkShare": round(dark_share, 4),
            "colorfulness": round(colorfulness, 2),
            "entropy": round(float(gray.entropy()), 3),
            "edgeDensity": round(edge_density, 4),
            "contrastSpread": round(contrast, 2),
            "palette": dominant_palette(image),
        }


def weighted_palette(records: list[dict], limit: int = 8, min_saturation: float = 0.0) -> list[dict]:
    weighted_pixels: list[list[int]] = []
    for record in records:
        weight = max(1, int(round(1 + math.log10(float(record.get("soldMin") or 0) + 1) * 2)))
        for color in record.get("visual", {}).get("palette", []):
            rgb_unit = [channel / 255 for channel in color["rgb"]]
            if colorsys.rgb_to_hsv(*rgb_unit)[1] < min_saturation:
                continue
            repeats = max(1, int(round(color["share"] * 20 * weight)))
            weighted_pixels.extend([color["rgb"]] * repeats)
    if not weighted_pixels:
        return []
    pixels = np.asarray(weighted_pixels, dtype=np.uint8).reshape((-1, 1, 3))
    quantized = Image.fromarray(pixels, "RGB").quantize(colors=limit, method=Image.Quantize.MEDIANCUT)
    raw_palette = quantized.getpalette() or []
    counts = sorted(quantized.getcolors() or [], reverse=True)
    total = max(1, sum(amount for amount, _ in counts))
    result = []
    for amount, index in counts[:limit]:
        rgb = tuple(raw_palette[index * 3 : index * 3 + 3])
        result.append({"hex": rgb_to_hex(rgb), "rgb": list(rgb), "share": round(amount / total, 4), "family": hue_name(rgb)})
    return result


def vivid_pixel_palette(records: list[dict], limit: int = 8) -> list[dict]:
    vivid_pixels: list[np.ndarray] = []
    for record in records:
        path = Path(record.get("localImage", ""))
        if not path.exists():
            continue
        with Image.open(path) as source:
            image = source.convert("RGB").resize((110, 110), Image.Resampling.LANCZOS)
        pixels = np.asarray(image, dtype=np.uint8).reshape(-1, 3)
        values = pixels.max(axis=1).astype(np.float32)
        minimum = pixels.min(axis=1).astype(np.float32)
        saturation = np.where(values == 0, 0, (values - minimum) / np.maximum(values, 1))
        mask = (saturation >= 0.62) & (values >= 105) & (values <= 252)
        selected = pixels[mask]
        if len(selected) == 0:
            continue
        stride = max(1, len(selected) // 240)
        selected = selected[::stride][:240]
        weight = max(1, min(4, int(round(math.log10(float(record.get("soldMin") or 0) + 1)))))
        vivid_pixels.extend([selected] * weight)
    if not vivid_pixels:
        return []
    pixel_array = np.concatenate(vivid_pixels, axis=0)
    quantized = Image.fromarray(pixel_array.reshape((-1, 1, 3)), "RGB").quantize(colors=limit, method=Image.Quantize.MEDIANCUT)
    raw_palette = quantized.getpalette() or []
    counts = sorted(quantized.getcolors() or [], reverse=True)
    total = max(1, sum(amount for amount, _ in counts))
    result = []
    for amount, index in counts[:limit]:
        rgb = tuple(raw_palette[index * 3 : index * 3 + 3])
        result.append({"hex": rgb_to_hex(rgb), "rgb": list(rgb), "share": round(amount / total, 4), "family": hue_name(rgb)})
    return result


def percentile(values: list[float], value: int) -> float:
    return round(float(np.percentile(np.asarray(values, dtype=np.float32), value)), 3) if values else 0


def summarize_metrics(records: list[dict]) -> dict:
    keys = ["meanSaturation", "meanLuminance", "whiteShare", "vividShare", "colorfulness", "entropy", "edgeDensity", "contrastSpread"]
    summary = {}
    for key in keys:
        values = [float(record["visual"][key]) for record in records if record.get("visual")]
        summary[key] = {"p25": percentile(values, 25), "median": percentile(values, 50), "p75": percentile(values, 75)}
    return summary


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    filename = "arialbd.ttf" if bold else "arial.ttf"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / filename), size)


def fit_image(image: Image.Image, box: tuple[int, int]) -> Image.Image:
    fitted = ImageOps.contain(image.convert("RGB"), box, Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", box, "white")
    canvas.paste(fitted, ((box[0] - fitted.width) // 2, (box[1] - fitted.height) // 2))
    return canvas


def make_contact_sheets(records: list[dict], per_sheet: int = 20) -> list[Path]:
    CONTACT_DIR.mkdir(parents=True, exist_ok=True)
    regular = load_font(20)
    small = load_font(16)
    bold = load_font(22, bold=True)
    paths = []
    cell_w, cell_h = 360, 310
    columns, rows = 4, 5
    for sheet_index, start in enumerate(range(0, len(records), per_sheet), 1):
        current = records[start : start + per_sheet]
        sheet = Image.new("RGB", (columns * cell_w, rows * cell_h + 70), "#F7F7F8")
        draw = ImageDraw.Draw(sheet)
        draw.text((24, 18), f"Mercado Livre - amostra {start + 1} a {start + len(current)}", font=bold, fill="#251C21")
        for local_index, record in enumerate(current):
            col = local_index % columns
            row = local_index // columns
            x, y = col * cell_w, 70 + row * cell_h
            draw.rounded_rectangle((x + 8, y + 8, x + cell_w - 8, y + cell_h - 8), radius=10, fill="white", outline="#DDD7DA", width=2)
            thumb_path = Path(record["localImage"])
            if thumb_path.exists():
                with Image.open(thumb_path) as thumb:
                    sheet.paste(fit_image(thumb, (cell_w - 32, 190)), (x + 16, y + 16))
            title = textwrap.shorten(record["title"], width=43, placeholder="...")
            draw.text((x + 18, y + 214), f"#{record['rankOverall']} {title}", font=regular, fill="#251C21")
            sold = record.get("soldText") or "vendas nao exibidas"
            rating = f" | nota {record['rating']:.1f}" if record.get("rating") else ""
            draw.text((x + 18, y + 244), f"{sold}{rating}", font=small, fill="#6E5C66")
            palette = record.get("visual", {}).get("palette", [])[:6]
            for palette_index, color in enumerate(palette):
                px = x + 18 + palette_index * 44
                draw.rounded_rectangle((px, y + 270, px + 36, y + 288), radius=5, fill=color["hex"])
        path = CONTACT_DIR / f"ml-amostra-{sheet_index:02d}.jpg"
        sheet.save(path, "JPEG", quality=90, optimize=True)
        paths.append(path)
    return paths


def make_bar_chart(counter: Counter, title: str, output: Path, top_n: int = 12) -> Path:
    items = counter.most_common(top_n)
    width, height = 1500, 760
    image = Image.new("RGB", (width, height), "#FFFFFF")
    draw = ImageDraw.Draw(image)
    title_font = load_font(34, bold=True)
    label_font = load_font(23)
    value_font = load_font(22, bold=True)
    draw.text((60, 40), title, font=title_font, fill="#241A20")
    max_value = max([value for _, value in items] or [1])
    for index, (label, value) in enumerate(items):
        y = 115 + index * 50
        draw.text((60, y), textwrap.shorten(label, width=28), font=label_font, fill="#392C33")
        bar_x = 430
        bar_w = int((value / max_value) * 870)
        draw.rounded_rectangle((bar_x, y + 4, bar_x + bar_w, y + 32), radius=8, fill="#D8467D")
        draw.text((bar_x + bar_w + 16, y + 2), str(value), font=value_font, fill="#392C33")
    image.save(output, "PNG", optimize=True)
    return output


def make_palette_chart(base_palette: list[dict], vivid_palette: list[dict], output: Path) -> Path:
    width, height = 1500, 820
    image = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(image)
    title_font = load_font(34, bold=True)
    label_font = load_font(19)
    row_font = load_font(24, bold=True)
    draw.text((60, 35), "Duas leituras cromaticas da mesma amostra", font=title_font, fill="#241A20")
    swatch_w = 154
    for row_index, (row_title, palette) in enumerate((("Bases e tons de apoio", base_palette), ("Acentos de alta saturacao", vivid_palette))):
        y = 105 + row_index * 350
        draw.text((60, y), row_title, font=row_font, fill="#D13E77")
        for index, color in enumerate(palette[:8]):
            x = 60 + index * 175
            draw.rounded_rectangle((x, y + 45, x + swatch_w, y + 220), radius=12, fill=color["hex"], outline="#D7D0D4", width=2)
            draw.text((x + 6, y + 235), color["hex"], font=label_font, fill="#241A20")
            draw.text((x + 6, y + 265), color["family"], font=label_font, fill="#65545D")
            draw.text((x + 6, y + 294), f"{color['share'] * 100:.1f}%", font=label_font, fill="#65545D")
    image.save(output, "PNG", optimize=True)
    return output


def make_metric_chart(summary: dict, output: Path) -> Path:
    labels = [
        ("Saturacao", "meanSaturation", 1),
        ("Area vibrante", "vividShare", 1),
        ("Fundo branco", "whiteShare", 1),
        ("Entropia", "entropy", 8),
        ("Densidade de borda", "edgeDensity", 1),
        ("Contraste", "contrastSpread", 255),
    ]
    width, height = 1500, 660
    image = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(image)
    draw.text((60, 40), "Faixa observada: P25, mediana e P75", font=load_font(34, True), fill="#241A20")
    for index, (label, key, scale) in enumerate(labels):
        y = 125 + index * 78
        draw.text((60, y), label, font=load_font(24), fill="#392C33")
        x0, x1 = 430, 1370
        draw.line((x0, y + 18, x1, y + 18), fill="#E8E1E5", width=14)
        p25 = summary[key]["p25"] / scale
        median = summary[key]["median"] / scale
        p75 = summary[key]["p75"] / scale
        a = x0 + int(max(0, min(1, p25)) * (x1 - x0))
        b = x0 + int(max(0, min(1, p75)) * (x1 - x0))
        m = x0 + int(max(0, min(1, median)) * (x1 - x0))
        draw.line((a, y + 18, b, y + 18), fill="#D8467D", width=18)
        draw.ellipse((m - 10, y + 8, m + 10, y + 28), fill="#241A20")
        draw.text((x1 - 170, y + 37), f"med {summary[key]['median']:.2f}", font=load_font(17), fill="#65545D")
    image.save(output, "PNG", optimize=True)
    return output


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("Audit", "C:/Windows/Fonts/arial.ttf"))
    pdfmetrics.registerFont(TTFont("Audit-Bold", "C:/Windows/Fonts/arialbd.ttf"))


def page_decorator(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFillColor(colors.HexColor("#241A20"))
    canvas.rect(0, PAGE_H - 10 * mm, PAGE_W, 10 * mm, fill=1, stroke=0)
    canvas.setFont("Audit-Bold", 8.5)
    canvas.setFillColor(colors.white)
    canvas.drawString(MARGIN, PAGE_H - 6.7 * mm, "MOLDEPRONTO | AUDITORIA VISUAL DE MERCADO")
    canvas.setFont("Audit", 8)
    canvas.setFillColor(colors.HexColor("#75646D"))
    canvas.drawRightString(PAGE_W - MARGIN, 7 * mm, f"05/08/2026 | pagina {doc.page}")
    canvas.restoreState()


def add_page_number(canvas, doc) -> None:
    page_decorator(canvas, doc)


def styles():
    register_fonts()
    base = getSampleStyleSheet()
    return {
        "cover_title": ParagraphStyle("cover_title", fontName="Audit-Bold", fontSize=30, leading=34, textColor=colors.HexColor("#241A20"), alignment=TA_LEFT, spaceAfter=8 * mm),
        "cover_sub": ParagraphStyle("cover_sub", fontName="Audit", fontSize=14, leading=20, textColor=colors.HexColor("#65545D"), spaceAfter=8 * mm),
        "h1": ParagraphStyle("h1", fontName="Audit-Bold", fontSize=21, leading=25, textColor=colors.HexColor("#241A20"), spaceBefore=2 * mm, spaceAfter=5 * mm),
        "h2": ParagraphStyle("h2", fontName="Audit-Bold", fontSize=13.5, leading=17, textColor=colors.HexColor("#D13E77"), spaceBefore=3 * mm, spaceAfter=2 * mm),
        "body": ParagraphStyle("body", fontName="Audit", fontSize=9.5, leading=14, textColor=colors.HexColor("#3C3036"), spaceAfter=2.5 * mm),
        "small": ParagraphStyle("small", fontName="Audit", fontSize=7.6, leading=10.2, textColor=colors.HexColor("#62535A"), spaceAfter=1.5 * mm),
        "callout": ParagraphStyle("callout", fontName="Audit-Bold", fontSize=10.8, leading=15, textColor=colors.HexColor("#241A20")),
        "caption": ParagraphStyle("caption", fontName="Audit", fontSize=7.2, leading=9.5, textColor=colors.HexColor("#6E5E66"), alignment=TA_CENTER, spaceBefore=1.5 * mm),
        "table": ParagraphStyle("table", fontName="Audit", fontSize=7.2, leading=9, textColor=colors.HexColor("#30262B")),
        "table_bold": ParagraphStyle("table_bold", fontName="Audit-Bold", fontSize=7.2, leading=9, textColor=colors.HexColor("#30262B")),
    }


def rl_image(path: Path, max_w: float, max_h: float) -> RLImage:
    with Image.open(path) as image:
        width, height = image.size
    scale = min(max_w / width, max_h / height)
    return RLImage(str(path), width=width * scale, height=height * scale)


def metric_table(summary: dict, s: dict) -> Table:
    rows = [[Paragraph("Metrica", s["table_bold"]), Paragraph("P25", s["table_bold"]), Paragraph("Mediana", s["table_bold"]), Paragraph("P75", s["table_bold"]), Paragraph("Uso no curador", s["table_bold"])]]
    labels = {
        "meanSaturation": ("Saturacao media", "Evitar arte lavada; preservar modo elegante sem zerar cor."),
        "vividShare": ("Area vibrante", "Garante opcao colorida com cor ocupando area relevante."),
        "whiteShare": ("Area quase branca", "Distingue respiro intencional de molde vazio."),
        "colorfulness": ("Colorfulness", "Controla impacto cromatico sem exigir neon."),
        "entropy": ("Entropia visual", "Sinaliza riqueza/detalhe e excesso de ruido."),
        "edgeDensity": ("Densidade de contorno", "Ajuda a detectar miniaturas e fundos sem informacao."),
        "contrastSpread": ("Amplitude de contraste", "Mantem leitura do nome e separacao dos planos."),
    }
    for key, (label, usage) in labels.items():
        values = summary[key]
        rows.append([
            Paragraph(label, s["table"]),
            Paragraph(f"{values['p25']:.3f}", s["table"]),
            Paragraph(f"{values['median']:.3f}", s["table"]),
            Paragraph(f"{values['p75']:.3f}", s["table"]),
            Paragraph(usage, s["table"]),
        ])
    table = Table(rows, colWidths=[40 * mm, 24 * mm, 24 * mm, 24 * mm, 120 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F5E7ED")),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#D9CDD3")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def callout_box(text: str, s: dict) -> Table:
    table = Table([[Paragraph(text, s["callout"])]], colWidths=[PAGE_W - 2 * MARGIN])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFF7FA")),
        ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#F0CAD9")),
        ("LEFTPADDING", (0, 0), (-1, -1), 14),
        ("RIGHTPADDING", (0, 0), (-1, -1), 14),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    return table


def build_pdf(analysis: dict, records: list[dict], contact_paths: list[Path], chart_paths: dict[str, Path]) -> None:
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    tmp_dir = ROOT / "tmp" / "pdfs"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    s = styles()
    frame = Frame(MARGIN, 12 * mm, PAGE_W - 2 * MARGIN, PAGE_H - 27 * mm, id="normal")
    template = PageTemplate(id="audit", frames=[frame], onPage=add_page_number)
    doc = BaseDocTemplate(str(PDF_PATH), pagesize=landscape(A4), pageTemplates=[template], leftMargin=MARGIN, rightMargin=MARGIN, topMargin=15 * mm, bottomMargin=12 * mm, title="Auditoria visual de kits festa - MoldePronto", author="MoldePronto")
    story = []

    story.extend([
        Spacer(1, 18 * mm),
        Paragraph("Auditoria visual de kits festa", s["cover_title"]),
        Paragraph("Mapeamento de 236 anuncios publicos do Mercado Livre para orientar paletas, densidade, composicao, hierarquia e apelo comercial sem copiar nenhuma arte.", s["cover_sub"]),
        callout_box("Amostra coletada em 05/08/2026 | Mercado Livre: 236 itens unicos | Shopee: bloqueada por login durante a coleta", s),
        Spacer(1, 8 * mm),
        Table([
            [Paragraph("236", s["h1"]), Paragraph("146", s["h1"]), Paragraph("143", s["h1"]), Paragraph(str(analysis["downloadedImages"]), s["h1"])],
            [Paragraph("anuncios auditados", s["body"]), Paragraph("com volume de vendas", s["body"]), Paragraph("com avaliacao", s["body"]), Paragraph("miniaturas analisadas", s["body"])],
        ], colWidths=[58 * mm] * 4, style=[("ALIGN", (0, 0), (-1, -1), "CENTER"), ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#E6D8DE")), ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#E6D8DE")), ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFF9FB")), ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]),
        Spacer(1, 8 * mm),
        Paragraph("Escopo juridico-criativo", s["h2"]),
        Paragraph("As imagens de terceiros aparecem apenas como evidencia de pesquisa e critica visual. O sistema deve reutilizar apenas ativos licenciados da biblioteca propria e deve recompor hierarquia, fundos, ornamentos, posicoes e paletas; nunca copiar a composicao integral, personagens, logotipos, nomes ou arquivos dos vendedores.", s["body"]),
        PageBreak(),
    ])

    story.extend([
        Paragraph("1. Como a pesquisa foi feita", s["h1"]),
        Paragraph("Foram percorridas cinco paginas consecutivas da busca publica por kit festa e papelaria personalizada. Cada card foi registrado com titulo, URL, posicao, miniatura, avaliacao, texto de vendas e selos. Duplicatas por URL canonica foram removidas.", s["body"]),
        Paragraph("Sinal de demanda", s["h2"]),
        Paragraph("O ranking de referencia combina logaritmo do minimo de vendas exibido, avaliacao, selo de mais vendido e uma pequena correcao de posicao. Ele serve para ordenar a auditoria, nao para estimar faturamento real.", s["body"]),
        Paragraph("Analise visual automatizada", s["h2"]),
        Paragraph("Cada miniatura foi convertida para RGB e medida por saturacao, luminosidade, area quase branca, area vibrante, colorfulness, entropia, densidade de bordas e amplitude de contraste. As paletas foram extraidas por quantizacao median-cut, removendo o branco puro dominante quando possivel.", s["body"]),
        Paragraph("Limites", s["h2"]),
        Paragraph("Os cards misturam mockups, fotos de mesa, arquivos digitais e produtos fisicos; portanto as metricas descrevem o visual comercial da vitrine. A Shopee exigiu login nas sessoes disponiveis e nao foi contornada. Nenhum dado da Shopee e inventado ou inferido a partir de outro site.", s["body"]),
        Paragraph("Criterio de aplicacao", s["h2"]),
        callout_box("O agente deve aprender principios agregados: contraste, proporcao, quantidade de planos, distribuicao de cor, escala de personagens e area reservada ao nome. Ele nao recebe coordenadas nem recortes de um anuncio individual como receita.", s),
        PageBreak(),
    ])

    story.extend([
        Paragraph("2. O que vende visualmente", s["h1"]),
        Paragraph("O padrao recorrente nao e minimalismo vazio. As vitrines de maior demanda usam leitura imediata do tema, grupo de personagens ou simbolos em escala dominante, contraste forte e uma mesa/kit que comunica abundancia. O fundo participa da narrativa, mas preserva uma area limpa para o nome.", s["body"]),
        Table([
            [Paragraph("Camada", s["table_bold"]), Paragraph("Padrao observado", s["table_bold"]), Paragraph("Regra para o gerador", s["table_bold"])],
            [Paragraph("1. Fundo", s["table"]), Paragraph("Textura/padrao tematico, cenario leve ou cor em blocos.", s["table"]), Paragraph("Criar base propria em 2-3 tons; nunca deixar painel principal branco por omissao.", s["table"])],
            [Paragraph("2. Profundidade", s["table"]), Paragraph("Faixas, molduras, nuvens, folhagens, piso, brilho e confete separam planos.", s["table"]), Paragraph("Exigir pelo menos tres planos percebidos: fundo, apoio e herois.", s["table"])],
            [Paragraph("3. Herois", s["table"]), Paragraph("Personagens/elementos grandes, sobrepostos e com contorno claro.", s["table"]), Paragraph("O grupo principal ocupa 38%-58% do painel frontal, sem tocar corte/dobra.", s["table"])],
            [Paragraph("4. Nome", s["table"]), Paragraph("Brasao, faixa ou placa com alto contraste e leitura a distancia.", s["table"]), Paragraph("Reservar zona exclusiva; bloquear sobreposicao por personagens e ornamentos.", s["table"])],
            [Paragraph("5. Acabamento", s["table"]), Paragraph("Laco, topper, flores, estrelas ou selo fecham a composicao.", s["table"]), Paragraph("Adicionar 1-3 acentos coerentes; laco apenas quando compativel com produto/persona.", s["table"])],
        ], colWidths=[33 * mm, 90 * mm, 112 * mm], repeatRows=1, style=[("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F5E7ED")), ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#D9CDD3")), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5), ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]),
        Spacer(1, 4 * mm),
        rl_image(chart_paths["metrics"], PAGE_W - 2 * MARGIN, 78 * mm),
        PageBreak(),
    ])

    story.extend([
        Paragraph("3. Temas e familias de produto", s["h1"]),
        Table([
            [rl_image(chart_paths["themes"], 120 * mm, 92 * mm), rl_image(chart_paths["products"], 120 * mm, 92 * mm)],
            [Paragraph("Frequencia por tema detectado no titulo. 'Outros' reune temas com pouca repeticao ou sem palavra-chave confiavel.", s["caption"]), Paragraph("O termo 'kit festa' inclui decoracao, papelaria, displays e itens avulsos. O agente precisa escolher regras por produto, nao usar uma composicao unica em todos os moldes.", s["caption"])],
        ], colWidths=[125 * mm, 125 * mm], style=[("VALIGN", (0, 0), (-1, -1), "TOP")]),
        Spacer(1, 4 * mm),
        Paragraph("Leitura comercial", s["h2"]),
        Paragraph("Temas com muitos concorrentes exigem reconhecimento instantaneo e acabamento superior. Temas com menor repeticao permitem mais autoria, mas ainda precisam comunicar a categoria em menos de um segundo na miniatura.", s["body"]),
        PageBreak(),
    ])

    story.extend([
        Paragraph("4. Cor: vibrante e elegante sao dois modos validos", s["h1"]),
        rl_image(chart_paths["palette"], PAGE_W - 2 * MARGIN, 138 * mm),
        Paragraph("A primeira linha mostra bases e tons de apoio, fortemente influenciados por fundos e cenarios. A segunda isola cores com saturacao alta; e ela que deve orientar a opcao 'bem colorida'.", s["caption"]),
        PageBreak(),
        Paragraph("4.1 Como aplicar as paletas", s["h1"]),
        Spacer(1, 3 * mm),
        Paragraph("Modo vibrante", s["h2"]),
        Paragraph("Usa 1 cor dominante saturada, 1 cor secundaria de contraste, 1 destaque quente e 1-2 apoios claros. A cor precisa ocupar area real do painel; trocar apenas pontos decorativos nao conta como mudanca de paleta.", s["body"]),
        Paragraph("Modo elegante", s["h2"]),
        Paragraph("Reduz saturacao e quantidade de acentos, mas mantem contraste, textura, profundidade e um ponto focal forte. Elegante nao significa bege vazio, personagem pequeno ou ausencia de elementos infantis quando a persona e crianca.", s["body"]),
        callout_box("Regra operacional", s),
        Paragraph("Toda paleta deve recolorir fundo, faixas, moldura do nome e ornamentos; personagens licenciados permanecem intactos. O curador reprova quando menos de 35% da area decorativa responde a troca de paleta.", s["body"]),
        PageBreak(),
    ])

    story.extend([
        Paragraph("5. Faixas quantitativas observadas", s["h1"]),
        Paragraph("Estas faixas sao referencias de vitrine, nao metas cegas. O curador usa o intervalo interquartil para detectar resultados pobres e combina o numero com verificacao geometrica do molde.", s["body"]),
        metric_table(analysis["metricSummary"], s),
        Spacer(1, 5 * mm),
        Paragraph("Alertas automaticos recomendados", s["h2"]),
        Paragraph("Reprovar: personagem fora da area segura; nome encoberto; fundo principal quase branco sem intencao; grupo heroico abaixo de 30% do painel; contraste insuficiente entre placa e texto; unica imagem repetida em todas as faces; elemento importante cortado por dobra; paleta selecionada sem alterar massas cromaticas.", s["body"]),
        Paragraph("Revisar: saturacao abaixo do P25 no modo vibrante; entropia acima do P75 junto com nome pouco legivel; mais de dois focos competindo; ornamento atravessando aba de cola; contorno branco excessivo; personagens soltos sem apoio de piso/sombra.", s["body"]),
        PageBreak(),
    ])

    story.extend([
        Paragraph("6. Curador de arte: contrato de aprovacao", s["h1"]),
        Table([
            [Paragraph("Dimensao", s["table_bold"]), Paragraph("Peso", s["table_bold"]), Paragraph("Teste obrigatorio", s["table_bold"])],
            [Paragraph("Integridade do molde", s["table"]), Paragraph("25%", s["table"]), Paragraph("Nada cruza corte, dobra, encaixe, alca, aba de cola ou sangria inadequada.", s["table"])],
            [Paragraph("Hierarquia e escala", s["table"]), Paragraph("20%", s["table"]), Paragraph("Tema reconhecivel; herois grandes; nome dominante depois do tema.", s["table"])],
            [Paragraph("Cor e contraste", s["table"]), Paragraph("18%", s["table"]), Paragraph("Paleta aplicada a massas; contraste de leitura; modo vibrante/elegante respeitado.", s["table"])],
            [Paragraph("Riqueza e profundidade", s["table"]), Paragraph("15%", s["table"]), Paragraph("Tres planos, textura coerente e detalhes suficientes sem poluir.", s["table"])],
            [Paragraph("Personalizacao", s["table"]), Paragraph("12%", s["table"]), Paragraph("Nome/idade sem corte, repeticao artificial ou sobreposicao.", s["table"])],
            [Paragraph("Autoria", s["table"]), Paragraph("10%", s["table"]), Paragraph("Composicao nao replica layout individual do Drive ou do mercado; ativos usados sao licenciados.", s["table"])],
        ], colWidths=[58 * mm, 24 * mm, 150 * mm], repeatRows=1, style=[("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F5E7ED")), ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#D9CDD3")), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5), ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]),
        Spacer(1, 5 * mm),
        Paragraph("Gate", s["h2"]),
        callout_box("Aprovacao minima: 86/100 e zero falhas bloqueantes. Qualquer corte de personagem, sobreposicao do nome, SVG invalido, imagem raster ausente, fonte nao incorporada/convertida ou arte fora da area segura bloqueia exportacao, independentemente da nota total.", s),
        Paragraph("Comparacao com referencia", s["h2"]),
        Paragraph("A comparacao deve ser por atributos agregados - impacto, equilibrio, riqueza, contraste e clareza - e nao por semelhanca pixel a pixel. Similaridade estrutural alta com uma unica referencia e motivo de reprovacao, mesmo quando a arte parece bonita.", s["body"]),
        PageBreak(),
    ])

    story.extend([
        Paragraph("7. Diretrizes para mockup de divulgacao", s["h1"]),
        Paragraph("O mockup e opcional e vem depois do SVG/PDF/PNG final. Ele nao pode substituir nem redesenhar a arte. Deve simular uma mesa de festa coerente com a persona, mostrando as lembrancinhas como protagonistas.", s["body"]),
        Table([
            [Paragraph("Persona", s["table_bold"]), Paragraph("Cenario", s["table_bold"]), Paragraph("Evitar", s["table_bold"])],
            [Paragraph("Infantil vibrante", s["table"]), Paragraph("Baloes vivos, bolo tematico, painel, doces coloridos, 3-7 lembrancinhas visiveis, luz clara.", s["table"]), Paragraph("Paleta adulta neutra, folhagem seca, caixa isolada, pouca cor.", s["table"])],
            [Paragraph("Infantil delicado", s["table"]), Paragraph("Pastel com acentos saturados, laco, flores ilustradas, luz suave, bolo e baloes.", s["table"]), Paragraph("Cena bege monocromatica, personagem minusculo, excesso de flores secas.", s["table"])],
            [Paragraph("Tematico jovem/adulto", s["table"]), Paragraph("Material e iluminacao alinhados ao tema, menos personagens, tipografia e objetos cenograficos fortes.", s["table"]), Paragraph("Aplicar automaticamente estetica infantil ou usar mockup generico.", s["table"])],
        ], colWidths=[48 * mm, 116 * mm, 75 * mm], repeatRows=1, style=[("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F5E7ED")), ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#D9CDD3")), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5), ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]),
        Spacer(1, 5 * mm),
        Paragraph("Checklist do mockup", s["h2"]),
        Paragraph("1) arte frontal preservada; 2) forma da caixa fisicamente plausivel; 3) nome legivel; 4) bolo e baloes presentes quando festa infantil; 5) pelo menos tres lembrancinhas tematicas; 6) foco visual no produto; 7) sem texto inventado; 8) sem alterar personagens; 9) resolucao final adequada para rede social; 10) opcao de refazer sem consumir o molde original.", s["body"]),
        PageBreak(),
    ])

    # Evidence screenshots: crops preserve legibility better than fitting a very tall page.
    story.append(Paragraph("8. Capturas da coleta", s["h1"]))
    story.append(Paragraph("Capturas das paginas publicas usadas na auditoria. Elas registram a fonte e o contexto; as folhas de contato seguintes facilitam a comparacao visual.", s["body"]))
    for screenshot in sorted(SCREENSHOT_DIR.glob("ml-p*.png")):
        with Image.open(screenshot) as source:
            image = source.convert("RGB")
            crop_height = min(image.height, int(image.width * 0.62))
            for crop_index, top in enumerate(range(0, image.height, crop_height), 1):
                crop = image.crop((0, top, image.width, min(image.height, top + crop_height)))
                crop_path = tmp_dir / f"{screenshot.stem}-crop-{crop_index}.jpg"
                crop.save(crop_path, "JPEG", quality=88)
                story.extend([
                    rl_image(crop_path, PAGE_W - 2 * MARGIN, 145 * mm),
                    Paragraph(f"{screenshot.stem.upper()} | recorte {crop_index}", s["caption"]),
                    PageBreak(),
                ])

    story.append(Paragraph("9. Folhas de contato da amostra", s["h1"]))
    story.append(Paragraph("Cada card mostra posicao, titulo reduzido, venda/avaliacao quando exibidas e seis cores dominantes da miniatura. A ordem segue a coleta, nao uma recomendacao de copia.", s["body"]))
    story.append(PageBreak())
    for contact_path in contact_paths:
        story.extend([
            rl_image(contact_path, PAGE_W - 2 * MARGIN, PAGE_H - 34 * mm),
            PageBreak(),
        ])

    story.extend([
        Paragraph("10. Top 40 sinais de demanda", s["h1"]),
        Paragraph("Ordenacao pelo sinal composto descrito na metodologia. Vendas representam o minimo exibido publicamente no card e podem estar arredondadas.", s["body"]),
    ])
    top_records = sorted(records, key=sales_weight, reverse=True)[:40]
    rows = [[Paragraph("Rank", s["table_bold"]), Paragraph("Tema", s["table_bold"]), Paragraph("Titulo", s["table_bold"]), Paragraph("Vendas", s["table_bold"]), Paragraph("Nota", s["table_bold"]), Paragraph("Paleta", s["table_bold"])]]
    for index, record in enumerate(top_records, 1):
        palette_text = " ".join(color["hex"] for color in record.get("visual", {}).get("palette", [])[:4])
        title_link = f'<link href="{record["url"]}" color="#B83367">{record["title"]}</link>'
        rows.append([
            Paragraph(str(index), s["table"]),
            Paragraph(record["theme"], s["table"]),
            Paragraph(title_link, s["table"]),
            Paragraph(record.get("soldText") or "-", s["table"]),
            Paragraph(f"{record['rating']:.1f}" if record.get("rating") else "-", s["table"]),
            Paragraph(palette_text, s["table"]),
        ])
    table = Table(rows, colWidths=[13 * mm, 35 * mm, 105 * mm, 28 * mm, 17 * mm, 47 * mm], repeatRows=1)
    table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F5E7ED")), ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#D9CDD3")), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 3), ("RIGHTPADDING", (0, 0), (-1, -1), 3), ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]))
    story.extend([table, PageBreak()])

    story.extend([
        Paragraph("11. Apêndice: 236 anuncios registrados", s["h1"]),
        Paragraph("Lista completa da amostra com link clicavel. A presenca aqui documenta a observacao; nao autoriza reutilizacao da arte do vendedor.", s["body"]),
    ])
    appendix_rows = [[Paragraph("#", s["table_bold"]), Paragraph("Tema", s["table_bold"]), Paragraph("Titulo / link", s["table_bold"]), Paragraph("Vendas", s["table_bold"]), Paragraph("Nota", s["table_bold"])]]
    for record in records:
        appendix_rows.append([
            Paragraph(str(record["rankOverall"]), s["table"]),
            Paragraph(record["theme"], s["table"]),
            Paragraph(f'<link href="{record["url"]}" color="#B83367">{record["title"]}</link>', s["table"]),
            Paragraph(record.get("soldText") or "-", s["table"]),
            Paragraph(f"{record['rating']:.1f}" if record.get("rating") else "-", s["table"]),
        ])
    appendix = Table(appendix_rows, colWidths=[12 * mm, 35 * mm, 150 * mm, 28 * mm, 16 * mm], repeatRows=1)
    appendix.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F5E7ED")), ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#DDD3D8")), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 3), ("RIGHTPADDING", (0, 0), (-1, -1), 3), ("TOPPADDING", (0, 0), (-1, -1), 2.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5)]))
    story.extend([appendix, PageBreak()])

    story.extend([
        Paragraph("12. Proximo ciclo do agente", s["h1"]),
        Paragraph("O lote de recriacao deve executar por tema e molde, nunca por imagem de referencia. Para cada saida: gerar duas direcoes (vibrante e elegante), aplicar ativos licenciados distintos, validar geometria SVG, testar nome curto e longo, renderizar PNG de prova, pontuar pelo curador e salvar apenas versoes com 86/100 ou mais.", s["body"]),
        Paragraph("Sequencia recomendada", s["h2"]),
        Paragraph("1. Selecionar tema, persona e tipo de caixa. 2. Escolher paleta agregada compativel. 3. Montar tres planos. 4. Escalar herois dentro da zona segura. 5. Construir placa do nome. 6. Distribuir elementos secundarios sem repeticao mecanica. 7. Aplicar acabamento. 8. Executar gates geometricos e visuais. 9. Comparar atributos com o conjunto de mercado. 10. Exportar SVG puro e, opcionalmente, PDF/PNG e mockup.", s["body"]),
        Paragraph("Fonte da coleta", s["h2"]),
        Paragraph('<link href="https://lista.mercadolivre.com.br/kit-festa-papelaria-personalizada" color="#B83367">Busca publica do Mercado Livre: kit festa papelaria personalizada</link>', s["body"]),
        Paragraph("Status Shopee: a plataforma apresentou a tela 'Login Necessario' em todas as sessoes de navegador disponiveis. A coleta deve ser complementada em sessao autenticada, sem contornar a protecao de acesso.", s["body"]),
        callout_box("Este documento e a base de curadoria; o dataset JSON anexo ao projeto preserva os campos estruturados e as metricas para testes automatizados.", s),
    ])

    doc.build(story)


def main() -> None:
    for directory in (THUMB_DIR, CONTACT_DIR, CHART_DIR, PDF_DIR):
        directory.mkdir(parents=True, exist_ok=True)
    records = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    download_errors = []
    for index, item in enumerate(records, 1):
        ok, status = download_thumbnail(item, index)
        if not ok:
            download_errors.append({"rank": index, "url": item.get("imageUrl"), "error": status})
        elif status == "downloaded":
            time.sleep(0.035)
        image_path = safe_filename(index)
        item["localImage"] = str(image_path)
        item["theme"] = classify(item["title"], THEMES, "Outros")
        item["productType"] = classify(item["title"], PRODUCT_TYPES, "Kit/itens diversos")
        item["demandScore"] = round(sales_weight(item), 3)
        item["visual"] = analyze_image(image_path) if image_path.exists() else None

    analyzed = [item for item in records if item.get("visual")]
    themes = Counter(item["theme"] for item in records)
    product_types = Counter(item["productType"] for item in records)
    market_palette = weighted_palette(analyzed, limit=8)
    vivid_market_palette = vivid_pixel_palette(analyzed, limit=8)
    theme_palettes = {}
    for theme, count in themes.most_common(16):
        subset = [item for item in analyzed if item["theme"] == theme]
        if len(subset) >= 2:
            theme_palettes[theme] = {"sampleSize": len(subset), "colors": weighted_palette(subset, limit=6)}

    metric_summary = summarize_metrics(analyzed)
    analysis = {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "platform": "Mercado Livre",
        "query": "kit festa papelaria personalizada",
        "sampleSize": len(records),
        "downloadedImages": len(analyzed),
        "withSales": sum(1 for item in records if item.get("soldMin", 0) > 0),
        "withRating": sum(1 for item in records if item.get("rating")),
        "downloadErrors": download_errors,
        "themeCounts": dict(themes.most_common()),
        "productTypeCounts": dict(product_types.most_common()),
        "marketPalette": market_palette,
        "vividMarketPalette": vivid_market_palette,
        "themePalettes": theme_palettes,
        "metricSummary": metric_summary,
        "curatorThresholds": {
            "vibrant": {
                "meanSaturationMin": metric_summary["meanSaturation"]["p25"],
                "vividShareMin": metric_summary["vividShare"]["p25"],
                "colorfulnessMin": metric_summary["colorfulness"]["p25"],
            },
            "balanced": {
                "entropyMin": metric_summary["entropy"]["p25"],
                "entropyMax": metric_summary["entropy"]["p75"],
                "edgeDensityMin": metric_summary["edgeDensity"]["p25"],
                "contrastSpreadMin": metric_summary["contrastSpread"]["p25"],
            },
        },
        "records": records,
    }
    ANALYSIS_PATH.write_text(json.dumps(analysis, ensure_ascii=False, indent=2), encoding="utf-8")

    contact_paths = make_contact_sheets(records)
    chart_paths = {
        "themes": make_bar_chart(themes, "Temas detectados nos titulos", CHART_DIR / "themes.png"),
        "products": make_bar_chart(product_types, "Tipos de produto detectados", CHART_DIR / "products.png"),
        "palette": make_palette_chart(market_palette, vivid_market_palette, CHART_DIR / "market-palette.png"),
        "metrics": make_metric_chart(metric_summary, CHART_DIR / "metrics.png"),
    }
    build_pdf(analysis, records, contact_paths, chart_paths)
    print(json.dumps({
        "pdf": str(PDF_PATH),
        "analysis": str(ANALYSIS_PATH),
        "records": len(records),
        "images": len(analyzed),
        "errors": len(download_errors),
        "contactSheets": len(contact_paths),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
