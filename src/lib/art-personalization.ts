import { isArtLayout, type ArtLayout } from "../../supabase/functions/_shared/art-layout";

export interface ArtPersonalization {
  name: string;
  age: string;
  phrase: string;
  font: string;
  scale: number;
  accent: string;
  finish: "limpo" | "camadas" | "ornamental";
}

export const PERSONALIZATION_FONTS: Record<string, string> = {
  divertida: "'Trebuchet MS', sans-serif",
  elegante: "Georgia, serif",
  negrito: "Arial, sans-serif",
  manuscrita: "'Segoe Print', 'Comic Sans MS', cursive",
  fantasia: "Georgia, serif",
  minimalista: "Arial, sans-serif",
  retro: "'Courier New', monospace",
};

const xml = (value: string) => value.replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);
const cleanText = (value: string) => value.normalize("NFC").replace(/[\u0000-\u001f\u007f]/g, " ").trim();
type Measure = (text: string, size: number) => number;

export function fitNameLines(name: string, width: number, height: number, desired: number, measure: Measure) {
  const text = cleanText(name);
  if (!text || text.length > 80) throw new Error("Use um nome de ate 80 caracteres.");
  const words = text.split(/\s+/);
  const candidates = [[text]];
  for (let i = 1; i < words.length; i++) candidates.push([words.slice(0, i).join(" "), words.slice(i).join(" ")]);
  const minimum = Math.max(10, height * 0.20);
  for (let size = desired; size >= minimum; size -= 0.5) {
    const fitting = candidates.filter((lines) => lines.length * size * 1.18 <= height
      && lines.every((line) => measure(line, size) <= width));
    if (fitting.length) {
      fitting.sort((a, b) => a.length - b.length || Math.max(...a.map((s) => measure(s, size))) - Math.max(...b.map((s) => measure(s, size))));
      return { lines: fitting[0], size };
    }
  }
  throw new Error("O nome nao cabe com leitura segura neste molde. Use um nome mais curto.");
}

export function renderPersonalization(layout: ArtLayout, value: ArtPersonalization, width: number, height: number) {
  if (!isArtLayout(layout)) throw new Error("Mapa de personalizacao invalido.");
  const name = cleanText(value.name);
  const age = cleanText(value.age);
  const ageLabel = /^\d+$/.test(age) ? `${age} ${Number(age) === 1 ? "ano" : "anos"}` : age;
  const phrase = cleanText(value.phrase);
  if (age.length > 25 || phrase.length > 80) throw new Error("Idade ou frase longa demais para a area segura.");
  const family = PERSONALIZATION_FONTS[value.font] ?? PERSONALIZATION_FONTS.divertida;
  const scale = Number.isFinite(value.scale) ? Math.max(0.7, Math.min(1.5, value.scale)) : 1;
  const accent = /^#[a-f0-9]{6}$/i.test(value.accent) ? value.accent : "#287B94";
  const ctx = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;
  const measure: Measure = (text, size) => {
    if (!ctx) return Array.from(text).length * size * 0.8;
    ctx.font = `700 ${size}px ${family}`;
    return ctx.measureText(text).width;
  };
  const labels = layout.labels.map((zone, index) => {
    const x = zone.x * width, y = zone.y * height, w = zone.w * width, h = zone.h * height;
    const stroke = Math.min(w, h) * 0.017;
    const padding = w * 0.08;
    const availableNameHeight = h * (phrase ? 0.47 : age ? 0.58 : 0.80);
    const fitted = fitNameLines(name, w - padding * 2, availableNameHeight, Math.min(w * 0.18, h * 0.29) * scale, measure);
    const lineHeight = fitted.size * 1.18;
    const firstBaseline = y + h * 0.10 + (availableNameHeight - fitted.lines.length * lineHeight) / 2 + fitted.size;
    const labelText = fitted.lines.map((line, i) => `<tspan x="${x + w / 2}" y="${firstBaseline + i * lineHeight}">${xml(line)}</tspan>`).join("");
    const extra = (text: string, fraction: number, desired: number) => {
      if (!text) return "";
      let size = desired;
      while (size > 9 && measure(text, size) > w - padding * 2) size -= 0.5;
      if (measure(text, size) > w - padding * 2) throw new Error("A frase nao cabe com leitura segura. Use uma frase mais curta.");
      return `<text x="${x + w / 2}" y="${y + h * fraction}" font-size="${size}">${xml(text)}</text>`;
    };
    return `<g id="personalizacao-${index + 1}" transform="rotate(${zone.rotation} ${zone.cx * width} ${zone.cy * height})">
      <rect x="${x + stroke}" y="${y + stroke}" width="${w - stroke * 2}" height="${h - stroke * 2}" rx="${h * 0.13}" fill="#FFFFFF" stroke="${accent}" stroke-width="${stroke}"/>
      ${value.finish === "ornamental" ? `<rect x="${x + stroke * 3}" y="${y + stroke * 3}" width="${w - stroke * 6}" height="${h - stroke * 6}" rx="${h * 0.10}" fill="none" stroke="${accent}" stroke-width="${stroke * 0.45}"/>` : ""}
      <g fill="#202028" font-family="${xml(family)}" font-weight="700" text-anchor="middle" letter-spacing="0">
        <text font-size="${fitted.size}">${labelText}</text>
        ${extra(ageLabel, phrase ? 0.73 : 0.84, h * 0.15)}
        ${extra(phrase, 0.90, h * 0.105)}
      </g>
    </g>`;
  }).join("\n");
  return `<g id="personalizacao-editavel" aria-label="${xml(name)}">${labels}</g>`;
}
