/**
 * Reescreve URLs públicas do Storage para o endpoint de transformação de
 * imagem da Supabase, servindo miniaturas leves (WebP quando o navegador
 * aceita) em vez dos arquivos originais de 0,4–2MB da biblioteca.
 * URLs que não são do Storage passam intactas.
 */
const STORAGE_MARKER = "/storage/v1/object/public/";
const RENDER_MARKER = "/storage/v1/render/image/public/";

export function thumbUrl(url: string | null | undefined, width = 320): string | undefined {
  if (!url) return undefined;
  if (!url.includes(STORAGE_MARKER)) return url;
  const sep = url.includes("?") ? "&" : "?";
  // height + resize=contain: papéis são tiras altas (ex.: 1:8) — limitar só a
  // largura ainda deixaria milhares de pixels de altura. format=webp: o
  // endpoint não converte sozinho e PNG redimensionado continua pesado.
  return `${url.replace(STORAGE_MARKER, RENDER_MARKER)}${sep}width=${width}&height=${width}&resize=contain&quality=75&format=webp`;
}
