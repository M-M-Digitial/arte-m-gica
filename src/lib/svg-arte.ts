import { toast } from "sonner";
import { baixarArquivoSvg } from "./svg-file";

export interface SvgArteOptions {
  imagem: string;
  moldeSvg?: string | null;
  moldeSvgUrl?: string | null;
  nomeArquivo: string;
}

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

function readViewBox(moldSvg: string | null | undefined) {
  const match = moldSvg?.match(/\bviewBox\s*=\s*["']([^"']+)["']/i);
  const values = match?.[1].trim().split(/[\s,]+/).map(Number);
  if (values?.length === 4 && values.every(Number.isFinite) && values[2] > 0 && values[3] > 0) {
    return { minX: values[0], minY: values[1], width: values[2], height: values[3] };
  }
  return { minX: 0, minY: 0, width: 2526, height: 1786 };
}

const technicalSelector = "path,line,polyline,polygon,rect,circle,ellipse";

function fallbackGeometry(moldSvg: string) {
  return Array.from(moldSvg.matchAll(/<(?:path|line|polyline|polygon|rect|circle|ellipse)\b[^>]*?(?:\/>|>)/gi))
    .map(([markup]) => markup)
    .join("\n");
}

/** Extrai somente geometrias técnicas, sem importar scripts, imagens ou defs do molde. */
export function extrairGeometriaTecnica(moldSvg: string) {
  if (typeof DOMParser === "undefined") return fallbackGeometry(moldSvg);

  try {
    const document = new DOMParser().parseFromString(moldSvg, "image/svg+xml");
    const nodes = Array.from(document.querySelectorAll(technicalSelector))
      .filter((node) => !node.closest("defs,clipPath,mask,symbol"));
    if (nodes.length === 0) return fallbackGeometry(moldSvg);

    return nodes.map((node) => {
      const clone = node.cloneNode(true) as Element;
      for (const attribute of Array.from(clone.attributes)) {
        if (/^on/i.test(attribute.name) || /href/i.test(attribute.name)) {
          clone.removeAttribute(attribute.name);
        }
      }
      clone.removeAttribute("id");
      clone.removeAttribute("class");
      return clone.outerHTML;
    }).join("\n");
  } catch {
    return fallbackGeometry(moldSvg);
  }
}

/**
 * Monta o SVG final do arquivo da artesã.
 * A arte fica incorporada como PNG e o molde permanece como geometria vetorial,
 * sem dependências externas que quebrem ao abrir no Canva ou na impressão.
 */
export function montarSvgHibrido(opts: SvgArteOptions) {
  const { minX, minY, width, height } = readViewBox(opts.moldeSvg);
  const geometry = opts.moldeSvg ? extrairGeometriaTecnica(opts.moldeSvg) : "";
  const technicalLayer = geometry
    ? `<g id="molde-tecnico" fill="#111111" stroke="#111111" stroke-linejoin="round">${geometry}</g>`
    : "";
  const title = escapeXml(opts.nomeArquivo.replace(/[-_]+/g, " "));
  const image = escapeXml(opts.imagem);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}" preserveAspectRatio="none" role="img">
  <title>${title}</title>
  <metadata>MoldePronto · arte incorporada · linhas técnicas vetoriais</metadata>
  <g id="arte-gerada">
    <image href="${image}" xlink:href="${image}" x="${minX}" y="${minY}" width="${width}" height="${height}" preserveAspectRatio="none"/>
  </g>
  ${technicalLayer}
</svg>`;
}

async function asDataUri(value: string) {
  if (value.startsWith("data:")) return value;
  const response = await fetch(value);
  if (!response.ok) throw new Error("não consegui baixar a arte");
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// SVG híbrido — a arte é uma imagem incorporada e as linhas de corte/dobra
// continuam vetoriais para manter escala perfeita na impressão e edição no Canva.
export async function criarSvgDaArte(opts: SvgArteOptions): Promise<string> {
  const imagem = await asDataUri(opts.imagem);
  let moldeSvg = opts.moldeSvg ?? null;

  if (!moldeSvg && opts.moldeSvgUrl) {
    const url = opts.moldeSvgUrl;
    const response = await fetch(url);
    if (!response.ok) throw new Error("não consegui baixar o molde vetorial");
    moldeSvg = await response.text();
  }

  return montarSvgHibrido({ ...opts, imagem, moldeSvg });
}

export async function baixarSvgDaArte(opts: SvgArteOptions): Promise<void> {
  try {
    const svg = await criarSvgDaArte(opts);
    baixarArquivoSvg(opts.nomeArquivo, svg);
  } catch (error) {
    console.error("Erro ao montar SVG:", error);
    toast.error("Erro ao montar o SVG.");
  }
}
