const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';

function ensureAttribute(svgTag: string, attribute: string, value: string) {
  const matcher = new RegExp(`\\s${attribute.replace(":", "\\:")}\\s*=`, "i");
  return matcher.test(svgTag)
    ? svgTag
    : svgTag.replace(/>$/, ` ${attribute}="${value}">`);
}

/**
 * Normaliza a entrega como um documento SVG autônomo. Rejeita páginas HTML
 * para impedir que um preview seja baixado no lugar do arquivo importável.
 */
export function normalizarDocumentoSvg(source: string) {
  const clean = source.replace(/^\uFEFF/, "").trim();
  if (/<!doctype\s+html|<html\b|<body\b/i.test(clean)) {
    throw new Error("O conteúdo recebido é HTML, não SVG.");
  }

  const withoutDeclaration = clean.replace(/^<\?xml[\s\S]*?\?>\s*/i, "");
  const start = withoutDeclaration.search(/<svg\b/i);
  const end = withoutDeclaration.toLowerCase().lastIndexOf("</svg>");
  if (start !== 0 || end < 0) {
    throw new Error("Documento SVG inválido.");
  }

  let svg = withoutDeclaration.slice(0, end + 6);
  const tagEnd = svg.indexOf(">");
  if (tagEnd < 0) throw new Error("Documento SVG inválido.");

  let rootTag = svg.slice(0, tagEnd + 1);
  rootTag = ensureAttribute(rootTag, "xmlns", "http://www.w3.org/2000/svg");
  rootTag = ensureAttribute(rootTag, "version", "1.1");
  if (/\bxlink:href\s*=/i.test(svg)) {
    rootTag = ensureAttribute(rootTag, "xmlns:xlink", "http://www.w3.org/1999/xlink");
  }
  svg = rootTag + svg.slice(tagEnd + 1);

  return `${XML_DECLARATION}\n${svg}`;
}

const safeFileName = (value: string) =>
  value
    .split("")
    .map((character) => character.charCodeAt(0) < 32 ? "-" : character)
    .join("")
    .replace(/[<>:"/\\|?*]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export function baixarArquivoSvg(filename: string, source: string) {
  const svg = normalizarDocumentoSvg(source);
  const baseName = safeFileName(filename.replace(/\.svg$/i, "")) || "arte";
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${baseName}.svg`;
  anchor.type = "image/svg+xml";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
