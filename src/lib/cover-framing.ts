export function calculateVisibleCoverScale(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
  targetFill = 0.72,
  maxScale = 1.85,
): number {
  if (width <= 0 || height <= 0 || rgba.length < width * height * 4) return 1;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] <= 24) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) return 1;
  const visibleFill = Math.max((maxX - minX + 1) / width, (maxY - minY + 1) / height);
  if (visibleFill >= targetFill) return 1;
  return Math.round(Math.min(maxScale, targetFill / Math.max(0.01, visibleFill)) * 100) / 100;
}
