export function applyVibrant(ctx: CanvasRenderingContext2D): void {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const data = imageData.data;
  const saturation = 1.5;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    data[i] = Math.max(0, Math.min(255, gray + (r - gray) * saturation));
    data[i + 1] = Math.max(0, Math.min(255, gray + (g - gray) * saturation));
    data[i + 2] = Math.max(0, Math.min(255, gray + (b - gray) * saturation));
  }
  ctx.putImageData(imageData, 0, 0);
}
