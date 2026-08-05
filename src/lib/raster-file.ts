export type FormatoDivulgacao = "png" | "jpg";

const safeFileName = (value: string) =>
  value
    .split("")
    .map((character) => character.charCodeAt(0) < 32 ? "-" : character)
    .join("")
    .replace(/[<>:"/\\|?*]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export function nomeArquivoDivulgacao(filename: string, formato: FormatoDivulgacao) {
  const base = safeFileName(filename.replace(/\.(png|jpe?g)$/i, "")) || "divulgacao";
  return `${base}.${formato}`;
}

async function converterParaJpeg(source: string) {
  const image = new Image();
  if (/^https?:/i.test(source)) image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Não foi possível preparar a imagem JPG."));
    image.src = source;
  });

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a imagem JPG.");
  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.94);
}

export async function baixarFotoDivulgacao(
  filename: string,
  source: string,
  formato: FormatoDivulgacao,
) {
  const href = formato === "jpg" ? await converterParaJpeg(source) : source;
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = nomeArquivoDivulgacao(filename, formato);
  anchor.type = formato === "jpg" ? "image/jpeg" : "image/png";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
