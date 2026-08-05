import { useState, type SyntheticEvent } from "react";
import { Thumb } from "@/components/Thumb";
import { calculateVisibleCoverScale } from "@/lib/cover-framing";

const scaleCache = new Map<string, number>();

interface ThemeCoverProps {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}

export function ThemeCover({ src, alt, size = 512, className = "" }: ThemeCoverProps) {
  const [scale, setScale] = useState(() => scaleCache.get(src) ?? 1);

  const frameVisiblePixels = (event: SyntheticEvent<HTMLImageElement>) => {
    if (scaleCache.has(src)) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(event.currentTarget, 0, 0, 64, 64);
      const nextScale = calculateVisibleCoverScale(context.getImageData(0, 0, 64, 64).data, 64, 64);
      scaleCache.set(src, nextScale);
      setScale(nextScale);
    } catch {
      scaleCache.set(src, 1);
    }
  };

  return (
    <Thumb
      src={src}
      size={size}
      alt={alt}
      crossOrigin="anonymous"
      onLoad={frameVisiblePixels}
      className={`absolute inset-0 h-full w-full object-contain p-4 drop-shadow-md transition-transform duration-200 ${className}`}
      style={{ transform: `scale(${scale})` }}
    />
  );
}
