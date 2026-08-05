import { downloadDataUrl, svgToPngDataUrl } from "./compose-kit";

const safeFileName = (value: string) =>
  value
    .split("")
    .map((character) => character.charCodeAt(0) < 32 ? "-" : character)
    .join("")
    .replace(/[<>:"/\\|?*]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export function proporcaoDoSvg(svg: string) {
  const match = svg.match(/\bviewBox\s*=\s*["']([^"']+)["']/i);
  const values = match?.[1].trim().split(/[\s,]+/).map(Number);
  if (values?.length === 4 && values.every(Number.isFinite) && values[2] > 0 && values[3] > 0) {
    return values[2] / values[3];
  }
  return 2526 / 1786;
}

export async function baixarMoldePng(filename: string, svg: string) {
  const png = await svgToPngDataUrl(svg, 2526);
  downloadDataUrl(`${safeFileName(filename) || "molde"}.png`, png);
}

export async function baixarMoldePdf(filename: string, svg: string) {
  const png = await svgToPngDataUrl(svg, 2526);
  const { default: jsPDF } = await import("jspdf");
  const ratio = proporcaoDoSvg(svg);
  const landscape = ratio >= 1;
  const pageWidth = landscape ? 297 : 210;
  const pageHeight = landscape ? 210 : 297;
  const margin = 8;
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2;
  let drawWidth = availableWidth;
  let drawHeight = drawWidth / ratio;
  if (drawHeight > availableHeight) {
    drawHeight = availableHeight;
    drawWidth = drawHeight * ratio;
  }

  const document = new jsPDF({
    orientation: landscape ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });
  document.addImage(
    png,
    "PNG",
    (pageWidth - drawWidth) / 2,
    (pageHeight - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
  document.save(`${safeFileName(filename) || "molde"}.pdf`);
}
