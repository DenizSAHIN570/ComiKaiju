export function applyColorCorrection(ctx: CanvasRenderingContext2D): void {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    // Basic auto-contrast
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const avg = (r + g + b) / 3;
    const factor = 1.1;
    data[i] = Math.max(0, Math.min(255, avg + (r - avg) * factor));
    data[i + 1] = Math.max(0, Math.min(255, avg + (g - avg) * factor));
    data[i + 2] = Math.max(0, Math.min(255, avg + (b - avg) * factor));
  }
  ctx.putImageData(imageData, 0, 0);
}
