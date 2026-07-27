import { useState, type ImgHTMLAttributes } from "react";
import { thumbUrl } from "@/lib/thumb";

type ThumbProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | null | undefined;
  /** Largura/altura máxima da miniatura em px (caixa quadrada, resize=contain). */
  size?: number;
};

/**
 * <img> que carrega a miniatura leve do Storage e cai no arquivo original
 * quando a transformação falha (alguns papéis da biblioteca excedem o limite
 * de tamanho/resolução do redimensionador da Supabase).
 */
export function Thumb({ src, size = 320, ...rest }: ThumbProps) {
  const [failed, setFailed] = useState(false);
  if (!src) return null;
  return (
    <img
      loading="lazy"
      decoding="async"
      {...rest}
      src={failed ? src : thumbUrl(src, size)}
      onError={() => setFailed(true)}
    />
  );
}
