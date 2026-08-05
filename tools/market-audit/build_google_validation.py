from __future__ import annotations

import hashlib
import io
import json
import textwrap
import time
import urllib.request
from collections import Counter
from datetime import datetime
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps
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
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

import build_market_audit as market


ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT / "output" / "google-image-validation"
THUMB_DIR = SOURCE_DIR / "thumbs"
CONTACT_DIR = SOURCE_DIR / "contact-sheets"
CHART_DIR = SOURCE_DIR / "charts"
PDF_DIR = ROOT / "output" / "pdf"
ANALYSIS_PATH = SOURCE_DIR / "google-visual-analysis.json"
PDF_PATH = PDF_DIR / "validacao-google-imagens-kit-festa-2026-08-05.pdf"
GENERAL_PATH = SOURCE_DIR / "google-kit-festa-200.json"
SHOPEE_INDEXED_PATH = SOURCE_DIR / "google-shopee-indexed.json"
ML_ANALYSIS_PATH = ROOT / "output" / "market-audit" / "market-visual-analysis.json"

PAGE_W, PAGE_H = landscape(A4)
MARGIN = 15 * mm

PRODUCT_TERMS = {
    "Caixa milk": ["caixa milk", "milk"],
    "Piramide/cone": ["piramide", "pirâmide", "cone"],
    "Maleta/bolsinha": ["maleta", "maletinha", "bolsinha", "sacolinha"],
    "Caixa cubo": ["caixa cubo", "cubo"],
    "Caixa bala": ["caixa bala"],
    "Caixa sushi": ["caixa sushi", "sushi"],
    "Centro de mesa": ["centro de mesa"],
    "Topo de bolo": ["topo de bolo", "topper"],
    "Kit de caixinhas": ["caixinha", "caixinhas", "caixas personalizadas"],
}

COMMERCIAL_TERMS = {
    "Nome/idade": ["nome e idade", "nome idade", "com nome", "personaliz"],
    "Luxo": ["luxo", "premium"],
    "Pegue e monte": ["pegue e monte", "monte você", "monte voce"],
    "Laco": ["laço", "laco", "bow"],
    "Camadas/3D": ["3d", "camada", "scrap"],
    "Acetato": ["acetato"],
    "Festa em casa": ["só um bolinho", "so um bolinho", "festa em casa", "365 sorrisos"],
}


def normalize(value: str) -> str:
    return " ".join(value.lower().split())


def count_terms(records: list[dict], mapping: dict[str, list[str]]) -> Counter:
    result = Counter()
    for record in records:
        text = normalize(record.get("alt", ""))
        for label, needles in mapping.items():
            if any(needle in text for needle in needles):
                result[label] += 1
    return result


def download_image(record: dict, index: int) -> tuple[Path | None, str]:
    destination = THUMB_DIR / f"google-{index:03d}.jpg"
    if destination.exists() and destination.stat().st_size > 1500:
        return destination, "cached"
    request = urllib.request.Request(
        record["src"],
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "Referer": "https://www.google.com/",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            raw = response.read()
        with Image.open(io.BytesIO(raw)) as source:
            source = ImageOps.exif_transpose(source)
            if source.mode in ("RGBA", "LA"):
                rgba = source.convert("RGBA")
                image = Image.new("RGB", rgba.size, "white")
                image.paste(rgba, mask=rgba.getchannel("A"))
            else:
                image = source.convert("RGB")
            image.thumbnail((720, 720), Image.Resampling.LANCZOS)
            image.save(destination, "JPEG", quality=91, optimize=True)
        return destination, "downloaded"
    except Exception as exc:
        return None, f"{type(exc).__name__}: {exc}"


def content_hash(path: Path) -> str:
    with Image.open(path) as source:
        image = ImageOps.fit(source.convert("RGB"), (96, 96), Image.Resampling.LANCZOS)
    return hashlib.sha1(image.tobytes()).hexdigest()


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(
        str(Path("C:/Windows/Fonts") / ("arialbd.ttf" if bold else "arial.ttf")),
        size,
    )


def make_contact_sheets(records: list[dict]) -> list[Path]:
    CONTACT_DIR.mkdir(parents=True, exist_ok=True)
    paths = []
    columns, rows = 4, 4
    cell_w, cell_h = 370, 330
    per_sheet = columns * rows
    for sheet_index, start in enumerate(range(0, len(records), per_sheet), 1):
        current = records[start : start + per_sheet]
        canvas = Image.new("RGB", (columns * cell_w, rows * cell_h + 76), "#F6F4F5")
        draw = ImageDraw.Draw(canvas)
        draw.text(
            (24, 18),
            f"Google Imagens - amostra visual {start + 1} a {start + len(current)}",
            font=font(25, True),
            fill="#261D22",
        )
        for local_index, record in enumerate(current):
            col = local_index % columns
            row = local_index // columns
            x, y = col * cell_w, 76 + row * cell_h
            draw.rounded_rectangle(
                (x + 8, y + 8, x + cell_w - 8, y + cell_h - 8),
                radius=8,
                fill="white",
                outline="#DDD6DA",
                width=2,
            )
            with Image.open(record["localImage"]) as source:
                fitted = ImageOps.contain(source.convert("RGB"), (cell_w - 32, 210), Image.Resampling.LANCZOS)
            paste_x = x + (cell_w - fitted.width) // 2
            paste_y = y + 16 + (210 - fitted.height) // 2
            canvas.paste(fitted, (paste_x, paste_y))
            title = textwrap.shorten(record["alt"], width=54, placeholder="...")
            lines = textwrap.wrap(title, width=44)[:2]
            draw.multiline_text((x + 18, y + 235), "\n".join(lines), font=font(17), fill="#2D2429", spacing=3)
            source_label = "Google geral" if record["sourceKey"] == "google-general" else "Google > Shopee indexada"
            draw.text((x + 18, y + 290), source_label, font=font(15, True), fill="#C53E72")
            for palette_index, color in enumerate(record["visual"]["palette"][:6]):
                px = x + 18 + palette_index * 43
                draw.rounded_rectangle((px, y + 309, px + 35, y + 321), radius=4, fill=color["hex"])
        path = CONTACT_DIR / f"google-amostra-{sheet_index:02d}.jpg"
        canvas.save(path, "JPEG", quality=90, optimize=True)
        paths.append(path)
    return paths


def make_comparison_chart(google_summary: dict, ml_summary: dict, output: Path) -> Path:
    definitions = [
        ("Saturacao", "meanSaturation", 1),
        ("Area vibrante", "vividShare", 1),
        ("Colorfulness", "colorfulness", 150),
        ("Entropia", "entropy", 8),
        ("Densidade", "edgeDensity", 1),
        ("Contraste", "contrastSpread", 255),
    ]
    image = Image.new("RGB", (1540, 790), "white")
    draw = ImageDraw.Draw(image)
    draw.text((55, 35), "Medianas visuais: Google x Mercado Livre", font=font(35, True), fill="#251D21")
    draw.rectangle((1045, 45, 1080, 70), fill="#D8467D")
    draw.text((1095, 43), "Google", font=font(20), fill="#4B3D44")
    draw.rectangle((1250, 45, 1285, 70), fill="#2B7487")
    draw.text((1300, 43), "Mercado Livre", font=font(20), fill="#4B3D44")
    for index, (label, key, scale) in enumerate(definitions):
        y = 125 + index * 98
        draw.text((55, y + 11), label, font=font(24, True), fill="#372B31")
        x0, x1 = 365, 1430
        google_value = min(1, google_summary[key]["median"] / scale)
        ml_value = min(1, ml_summary[key]["median"] / scale)
        draw.rounded_rectangle((x0, y, x0 + int((x1 - x0) * google_value), y + 30), radius=7, fill="#D8467D")
        draw.rounded_rectangle((x0, y + 39, x0 + int((x1 - x0) * ml_value), y + 69), radius=7, fill="#2B7487")
        draw.text((x1 - 160, y + 4), f"{google_summary[key]['median']:.3f}", font=font(18, True), fill="#251D21")
        draw.text((x1 - 160, y + 43), f"{ml_summary[key]['median']:.3f}", font=font(18, True), fill="#251D21")
    image.save(output, "PNG", optimize=True)
    return output


def make_term_chart(counter: Counter, title: str, output: Path) -> Path:
    items = counter.most_common(12)
    image = Image.new("RGB", (1500, 720), "white")
    draw = ImageDraw.Draw(image)
    draw.text((55, 35), title, font=font(33, True), fill="#251D21")
    maximum = max([value for _, value in items] or [1])
    for index, (label, value) in enumerate(items):
        y = 105 + index * 48
        draw.text((55, y), label, font=font(22), fill="#382C32")
        x = 390
        width = int(920 * value / maximum)
        draw.rounded_rectangle((x, y + 2, x + width, y + 31), radius=7, fill="#D8467D")
        draw.text((x + width + 14, y + 2), str(value), font=font(20, True), fill="#382C32")
    image.save(output, "PNG", optimize=True)
    return output


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("Audit", "C:/Windows/Fonts/arial.ttf"))
    pdfmetrics.registerFont(TTFont("Audit-Bold", "C:/Windows/Fonts/arialbd.ttf"))


def styles() -> dict[str, ParagraphStyle]:
    register_fonts()
    getSampleStyleSheet()
    return {
        "cover": ParagraphStyle("cover", fontName="Audit-Bold", fontSize=29, leading=34, textColor=colors.HexColor("#241A20"), alignment=TA_LEFT, spaceAfter=7 * mm),
        "sub": ParagraphStyle("sub", fontName="Audit", fontSize=13.5, leading=19, textColor=colors.HexColor("#65545D"), spaceAfter=7 * mm),
        "h1": ParagraphStyle("h1", fontName="Audit-Bold", fontSize=21, leading=25, textColor=colors.HexColor("#241A20"), spaceAfter=4 * mm),
        "h2": ParagraphStyle("h2", fontName="Audit-Bold", fontSize=13.5, leading=17, textColor=colors.HexColor("#C43C70"), spaceBefore=2 * mm, spaceAfter=2 * mm),
        "body": ParagraphStyle("body", fontName="Audit", fontSize=9.5, leading=14, textColor=colors.HexColor("#3D3137"), spaceAfter=2.5 * mm),
        "small": ParagraphStyle("small", fontName="Audit", fontSize=7.5, leading=10, textColor=colors.HexColor("#63545C"), spaceAfter=1.5 * mm),
        "table": ParagraphStyle("table", fontName="Audit", fontSize=7.4, leading=9.4, textColor=colors.HexColor("#30262B")),
        "table_bold": ParagraphStyle("table_bold", fontName="Audit-Bold", fontSize=7.4, leading=9.4, textColor=colors.HexColor("#30262B")),
        "callout": ParagraphStyle("callout", fontName="Audit-Bold", fontSize=10.3, leading=14.5, textColor=colors.HexColor("#241A20")),
        "caption": ParagraphStyle("caption", fontName="Audit", fontSize=7.3, leading=9.5, textColor=colors.HexColor("#6C5B64"), alignment=TA_CENTER, spaceBefore=1.2 * mm),
    }


def page_decorator(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFillColor(colors.HexColor("#241A20"))
    canvas.rect(0, PAGE_H - 10 * mm, PAGE_W, 10 * mm, fill=1, stroke=0)
    canvas.setFont("Audit-Bold", 8.5)
    canvas.setFillColor(colors.white)
    canvas.drawString(MARGIN, PAGE_H - 6.7 * mm, "MOLDEPRONTO | VALIDACAO GOOGLE IMAGENS")
    canvas.setFont("Audit", 8)
    canvas.setFillColor(colors.HexColor("#75646D"))
    canvas.drawRightString(PAGE_W - MARGIN, 7 * mm, f"05/08/2026 | pagina {doc.page}")
    canvas.restoreState()


def rl_image(path: Path, max_w: float, max_h: float) -> RLImage:
    with Image.open(path) as source:
        width, height = source.size
    scale = min(max_w / width, max_h / height)
    return RLImage(str(path), width=width * scale, height=height * scale)


def callout(text: str, style: ParagraphStyle) -> Table:
    table = Table([[Paragraph(text, style)]], colWidths=[PAGE_W - 2 * MARGIN])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFF7FA")),
        ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#ECC4D4")),
        ("LEFTPADDING", (0, 0), (-1, -1), 13),
        ("RIGHTPADDING", (0, 0), (-1, -1), 13),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    return table


def metric_table(google_summary: dict, ml_summary: dict, s: dict) -> Table:
    rows = [[
        Paragraph("Metrica", s["table_bold"]),
        Paragraph("Google P25", s["table_bold"]),
        Paragraph("Google mediana", s["table_bold"]),
        Paragraph("Google P75", s["table_bold"]),
        Paragraph("ML mediana", s["table_bold"]),
        Paragraph("Leitura", s["table_bold"]),
    ]]
    definitions = {
        "meanSaturation": ("Saturacao media", "Cor ocupa area relevante, mas nao precisa ser neon."),
        "vividShare": ("Area vibrante", "Diferencia colorido real de pequenos pontos de cor."),
        "whiteShare": ("Area quase branca", "Respiro e fundo de catalogo nao podem virar molde vazio."),
        "colorfulness": ("Colorfulness", "Impacto cromatico global da composicao."),
        "entropy": ("Entropia", "Riqueza visual; combinar com legibilidade para evitar ruido."),
        "edgeDensity": ("Densidade de borda", "Quantidade de detalhe e silhuetas perceptiveis."),
        "contrastSpread": ("Contraste", "Separacao entre fundo, personagens e placa do nome."),
    }
    for key, (label, reading) in definitions.items():
        google_values = google_summary[key]
        rows.append([
            Paragraph(label, s["table"]),
            Paragraph(f"{google_values['p25']:.3f}", s["table"]),
            Paragraph(f"{google_values['median']:.3f}", s["table"]),
            Paragraph(f"{google_values['p75']:.3f}", s["table"]),
            Paragraph(f"{ml_summary[key]['median']:.3f}", s["table"]),
            Paragraph(reading, s["table"]),
        ])
    table = Table(rows, colWidths=[38 * mm, 25 * mm, 29 * mm, 25 * mm, 25 * mm, 95 * mm], repeatRows=1)
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


def build_pdf(analysis: dict, contact_paths: list[Path], chart_paths: dict[str, Path]) -> None:
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    s = styles()
    frame = Frame(MARGIN, 12 * mm, PAGE_W - 2 * MARGIN, PAGE_H - 27 * mm, id="normal")
    template = PageTemplate(id="validation", frames=[frame], onPage=page_decorator)
    doc = BaseDocTemplate(
        str(PDF_PATH),
        pagesize=landscape(A4),
        pageTemplates=[template],
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=15 * mm,
        bottomMargin=12 * mm,
        title="Validacao Google Imagens de kits festa - MoldePronto",
        author="MoldePronto",
    )
    story = [
        Spacer(1, 18 * mm),
        Paragraph("Validacao visual no Google Imagens", s["cover"]),
        Paragraph("Complemento da auditoria de mercado para verificar composicao, cor, densidade, tipos de caixa e sinais de personalizacao sem copiar uma arte individual.", s["sub"]),
        callout(
            f"Coleta em 05/08/2026 | 200 resultados gerais | 150 resultados indexados da Shopee | {analysis['downloadedImages']} imagens baixadas | {analysis['uniqueImages']} imagens unicas apos depuracao",
            s["callout"],
        ),
        Spacer(1, 7 * mm),
        Paragraph("O que esta amostra prova", s["h2"]),
        Paragraph("Ela valida padroes visuais recorrentes em resultados publicos: nome e idade como foco, conjunto de modelos diferentes, personagens em escala alta, placa de personalizacao, camadas, cor em grandes massas e acabamentos fisicos ou simulados. Ela nao prova vendas, faturamento ou ranking na Shopee.", s["body"]),
        Paragraph("Separacao obrigatoria de fontes", s["h2"]),
        Paragraph("Os 236 anuncios do Mercado Livre continuam sendo a amostra com sinais de venda/avaliacao. Os resultados do Google sao uma segunda amostra de descoberta visual e podem conter duplicatas, paginas antigas e itens sem venda. As conclusoes abaixo so viram regra do curador quando fazem sentido geometricamente e aparecem em mais de uma origem.", s["body"]),
        PageBreak(),
        Paragraph("1. Metodo e limites", s["h1"]),
        Paragraph("A busca geral usou a consulta 'kit festa personalizado caixinhas nome idade mesa infantil'. A busca restrita usou 'site:shopee.com.br kit festa personalizado caixinhas luxo nome idade'. Foram coletadas miniaturas visiveis e seus textos alternativos, baixadas as imagens publicas, removidas duplicatas exatas pelo conteudo raster e calculadas as mesmas metricas usadas na auditoria do Mercado Livre.", s["body"]),
        Paragraph("Tentativa anonima na Shopee", s["h2"]),
        Paragraph("Uma sessao nova, sem login e sem cookies do usuario, abriu a busca direta da Shopee. A plataforma redirecionou para /verify/traffic/error e exibiu 'Login Necessario'. O bloqueio foi registrado e nao foi contornado. Por isso, os 150 itens da Shopee neste documento sao resultados indexados pelo Google, sem validacao de pagina interna, venda ou posicao.", s["body"]),
        Paragraph("Depuracao", s["h2"]),
        Paragraph(f"Dos {analysis['rawImages']} registros brutos, {analysis['sourceUniqueImages']} tinham URL de miniatura unica, {analysis['downloadedImages']} foram baixados e {analysis['duplicateImages']} repeticoes raster exatas foram removidas. A base quantitativa final contem {analysis['uniqueImages']} imagens.", s["body"]),
        callout("A imagem individual serve como evidencia, nao como receita. O agente recebe faixas agregadas, checklist e contraexemplos; nao recebe coordenadas, recortes ou composicao de um vendedor para replicacao.", s["callout"]),
        PageBreak(),
        Paragraph("2. Comparacao quantitativa", s["h1"]),
        rl_image(chart_paths["comparison"], PAGE_W - 2 * MARGIN, 118 * mm),
        Paragraph("Medianas calculadas sobre miniaturas comerciais. Diferencas pequenas nao devem ser tratadas como meta pixel a pixel.", s["caption"]),
        PageBreak(),
        Paragraph("2.1 Faixas observadas", s["h1"]),
        metric_table(analysis["metricSummary"], analysis["mercadoLivreMetricSummary"], s),
        Spacer(1, 4 * mm),
        Paragraph("Aplicacao no gerador", s["h2"]),
        Paragraph("O modo vibrante deve atingir area de cor relevante, nao apenas trocar confetes. O modo elegante pode reduzir saturacao, mas precisa preservar contraste, profundidade, escala dos personagens e riqueza. Em ambos, personagem e nome precisam sobreviver a recorte, dobra, aba e montagem fisica.", s["body"]),
        PageBreak(),
        Paragraph("3. Paleta agregada da validacao", s["h1"]),
        rl_image(chart_paths["palette"], PAGE_W - 2 * MARGIN, 138 * mm),
        Paragraph("A primeira linha resume bases e apoios; a segunda isola pixels de alta saturacao. O resultado orienta familias cromaticas, nunca a copia da paleta completa de uma unica arte.", s["caption"]),
        PageBreak(),
        Paragraph("4. O que aparece nos titulos indexados", s["h1"]),
        Table([
            [rl_image(chart_paths["products"], 121 * mm, 100 * mm), rl_image(chart_paths["commercial"], 121 * mm, 100 * mm)],
            [Paragraph("Tipos e formatos mencionados. A frequencia depende do texto alternativo e nao substitui classificacao visual manual.", s["caption"]), Paragraph("Sinais de oferta e acabamento. Nome/idade e recorrente; luxo, laco e 3D aparecem como diferenciais, nao como obrigacao universal.", s["caption"])],
        ], colWidths=[125 * mm, 125 * mm], style=[("VALIGN", (0, 0), (-1, -1), "TOP")]),
        PageBreak(),
        Paragraph("5. Regras confirmadas para a curadoria", s["h1"]),
        Table([
            [Paragraph("Dimensao", s["table_bold"]), Paragraph("Regra operacional", s["table_bold"]), Paragraph("Falha bloqueante", s["table_bold"])],
            [Paragraph("Tema", s["table"]), Paragraph("Tema reconhecivel na miniatura por grupo heroico e elementos secundarios coerentes.", s["table"]), Paragraph("Personagem pequeno, isolado ou repetido mecanicamente.", s["table"])],
            [Paragraph("Personalizacao", s["table"]), Paragraph("Nome e idade em placa/faixa exclusiva, com contraste e tamanho legivel depois da montagem.", s["table"]), Paragraph("Nome encoberto, cortado, menor que o detalhe decorativo ou sobre dobra.", s["table"])],
            [Paragraph("Cor", s["table"]), Paragraph("Paleta altera fundo, faixas, placa e ornamentos; deve existir uma variante vibrante e uma elegante.", s["table"]), Paragraph("Selecao de paleta muda apenas pontos pequenos ou deixa grandes faces vazias.", s["table"])],
            [Paragraph("Escala", s["table"]), Paragraph("Herois ocupam area comercial relevante dentro da zona segura; secundarios criam narrativa.", s["table"]), Paragraph("Elemento principal menor que 30% do painel ou tocando corte/dobra.", s["table"])],
            [Paragraph("Profundidade", s["table"]), Paragraph("Minimo de tres planos percebidos: fundo, apoio e herois; usar contorno, sombra e sobreposicao coerentes.", s["table"]), Paragraph("Fundo plano com adesivos soltos, sem apoio e sem hierarquia.", s["table"])],
            [Paragraph("Acabamento", s["table"]), Paragraph("Laco, topper, flores, estrelas ou camadas so quando combinarem com tema, produto e persona.", s["table"]), Paragraph("Enfeite invade corte, alca, fechamento ou reduz legibilidade.", s["table"])],
            [Paragraph("Autoria", s["table"]), Paragraph("Recombinar ativos licenciados em estrutura original e variar grupo, posicao, fundo e ornamentos.", s["table"]), Paragraph("Semelhanca estrutural alta com uma unica referencia do Drive ou do mercado.", s["table"])],
        ], colWidths=[40 * mm, 112 * mm, 84 * mm], repeatRows=1, style=[("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F5E7ED")), ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#D9CDD3")), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5), ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]),
        Spacer(1, 4 * mm),
        callout("Gate recomendado: 86/100 e zero falhas bloqueantes. Beleza comercial sem integridade de molde nao e aprovacao; SVG tecnicamente correto com arte vazia tambem nao e aprovacao.", s["callout"]),
        PageBreak(),
        Paragraph("6. Evidencia: busca geral do Google Imagens", s["h1"]),
        rl_image(SOURCE_DIR / "google-images-kit-festa.png", PAGE_W - 2 * MARGIN, 145 * mm),
        Paragraph("Captura da consulta geral. O arquivo JSON preserva os 200 registros coletados.", s["caption"]),
        PageBreak(),
        Paragraph("7. Evidencia: resultados da Shopee indexados no Google", s["h1"]),
        rl_image(SOURCE_DIR / "google-images-shopee-indexed.png", PAGE_W - 2 * MARGIN, 145 * mm),
        Paragraph("Captura da busca restrita ao dominio shopee.com.br. Estes resultados nao equivalem a acesso autenticado ao catalogo.", s["caption"]),
        PageBreak(),
        Paragraph("8. Evidencia: bloqueio da sessao anonima", s["h1"]),
        rl_image(SOURCE_DIR / "shopee-anonymous.png", PAGE_W - 2 * MARGIN, 145 * mm),
        Paragraph("A busca direta redirecionou para a tela de verificacao com login necessario.", s["caption"]),
        PageBreak(),
        Paragraph("9. Folhas de contato depuradas", s["h1"]),
        Paragraph("As paginas seguintes apresentam as imagens unicas com origem, texto alternativo reduzido e seis cores dominantes. A ordem documenta a amostra e nao indica permissao de reutilizacao.", s["body"]),
        PageBreak(),
    ]

    for contact_path in contact_paths:
        story.extend([rl_image(contact_path, PAGE_W - 2 * MARGIN, PAGE_H - 34 * mm), PageBreak()])

    story.extend([
        Paragraph("10. Decisao para o agente curador", s["h1"]),
        Paragraph("A validacao confirma que o problema das saidas simples nao se resolve aumentando saturacao indiscriminadamente. O curador precisa avaliar cinco coisas ao mesmo tempo: integridade do molde, tema reconhecivel, escala dos herois, placa de personalizacao e distribuicao de cor/profundidade. Um resultado deve falhar quando qualquer uma dessas dimensoes estiver abaixo do minimo, mesmo que a media total pareca aceitavel.", s["body"]),
        Paragraph("Ordem de construcao recomendada", s["h2"]),
        Paragraph("1. Travar corte, dobra, cola, alca e sangria. 2. Definir persona e direcao vibrante/elegante. 3. Escolher grupo de personagens licenciados com principal e secundarios. 4. Montar fundo em camadas e apoio de piso. 5. Reservar placa do nome. 6. Escalar herois por painel. 7. Aplicar acabamento coerente. 8. Testar nome curto e longo. 9. Renderizar prova. 10. Reprovar automaticamente cortes, sobreposicoes, faces vazias e paleta inoperante.", s["body"]),
        Paragraph("Fontes publicas consultadas", s["h2"]),
        Paragraph(f'<link href="{analysis["queries"]["general"]["searchUrl"]}" color="#B83367">Google Imagens - consulta geral</link>', s["body"]),
        Paragraph(f'<link href="{analysis["queries"]["shopeeIndexed"]["searchUrl"]}" color="#B83367">Google Imagens - consulta restrita a Shopee</link>', s["body"]),
        Paragraph("A auditoria anterior do Mercado Livre, o dataset estruturado e os ativos licenciados do Drive continuam sendo fontes separadas. O Drive serve para padrao interno de acabamento e repertorio licenciado; o mercado serve para validar linguagem comercial; nenhum deles deve ser clonado.", s["body"]),
        callout("Resultado: base visual ampliada, fonte separada por nivel de confianca e regras prontas para teste automatico no curador.", s["callout"]),
    ])
    doc.build(story)


def main() -> None:
    for directory in (THUMB_DIR, CONTACT_DIR, CHART_DIR, PDF_DIR):
        directory.mkdir(parents=True, exist_ok=True)

    general = json.loads(GENERAL_PATH.read_text(encoding="utf-8"))
    shopee = json.loads(SHOPEE_INDEXED_PATH.read_text(encoding="utf-8"))
    ml_analysis = json.loads(ML_ANALYSIS_PATH.read_text(encoding="utf-8"))

    raw_records = []
    for source_key, payload in (("google-general", general), ("google-shopee-indexed", shopee)):
        for image in payload["images"]:
            raw_records.append({
                "sourceKey": source_key,
                "src": image["src"],
                "alt": image.get("alt") or "Imagem sem descricao",
                "sourceIndex": image.get("index"),
            })

    source_unique = []
    seen_urls = set()
    for record in raw_records:
        if record["src"] in seen_urls:
            continue
        seen_urls.add(record["src"])
        source_unique.append(record)

    downloaded = []
    errors = []
    for index, record in enumerate(source_unique, 1):
        path, status = download_image(record, index)
        if path is None:
            errors.append({"sourceKey": record["sourceKey"], "src": record["src"], "error": status})
            continue
        if status == "downloaded":
            time.sleep(0.025)
        record["localImage"] = str(path)
        record["contentHash"] = content_hash(path)
        record["visual"] = market.analyze_image(path)
        record["theme"] = market.classify(record["alt"], market.THEMES, "Outros")
        downloaded.append(record)

    unique_records = []
    duplicate_records = []
    seen_hashes = set()
    for record in downloaded:
        if record["contentHash"] in seen_hashes:
            duplicate_records.append(record)
            continue
        seen_hashes.add(record["contentHash"])
        unique_records.append(record)

    product_terms = count_terms(unique_records, PRODUCT_TERMS)
    commercial_terms = count_terms(unique_records, COMMERCIAL_TERMS)
    theme_counts = Counter(record["theme"] for record in unique_records)
    metric_summary = market.summarize_metrics(unique_records)
    palette = market.weighted_palette(unique_records, limit=8)
    vivid_palette = market.vivid_pixel_palette(unique_records, limit=8)

    analysis = {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "purpose": "validacao visual; resultados do Google nao sao dados de venda",
        "rawImages": len(raw_records),
        "sourceUniqueImages": len(source_unique),
        "downloadedImages": len(downloaded),
        "uniqueImages": len(unique_records),
        "duplicateImages": len(duplicate_records),
        "downloadErrors": errors,
        "sourceCounts": dict(Counter(record["sourceKey"] for record in unique_records)),
        "themeCounts": dict(theme_counts.most_common()),
        "productTermCounts": dict(product_terms.most_common()),
        "commercialTermCounts": dict(commercial_terms.most_common()),
        "marketPalette": palette,
        "vividMarketPalette": vivid_palette,
        "metricSummary": metric_summary,
        "mercadoLivreMetricSummary": ml_analysis["metricSummary"],
        "queries": {
            "general": {"query": general["query"], "searchUrl": general["searchUrl"], "count": general["count"]},
            "shopeeIndexed": {"query": shopee["query"], "searchUrl": shopee["searchUrl"], "count": shopee["count"]},
        },
        "shopeeAnonymous": {
            "status": "blocked-login-required",
            "url": "https://shopee.com.br/verify/traffic/error",
            "evidence": str(SOURCE_DIR / "shopee-anonymous.png"),
        },
        "records": unique_records,
    }
    ANALYSIS_PATH.write_text(json.dumps(analysis, ensure_ascii=False, indent=2), encoding="utf-8")

    contact_paths = make_contact_sheets(unique_records)
    chart_paths = {
        "comparison": make_comparison_chart(metric_summary, ml_analysis["metricSummary"], CHART_DIR / "google-vs-ml.png"),
        "products": make_term_chart(product_terms, "Formatos citados nos resultados", CHART_DIR / "product-terms.png"),
        "commercial": make_term_chart(commercial_terms, "Sinais comerciais citados", CHART_DIR / "commercial-terms.png"),
        "palette": market.make_palette_chart(palette, vivid_palette, CHART_DIR / "google-palette.png"),
    }
    build_pdf(analysis, contact_paths, chart_paths)
    print(json.dumps({
        "pdf": str(PDF_PATH),
        "analysis": str(ANALYSIS_PATH),
        "raw": len(raw_records),
        "downloaded": len(downloaded),
        "unique": len(unique_records),
        "duplicates": len(duplicate_records),
        "errors": len(errors),
        "contactSheets": len(contact_paths),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
