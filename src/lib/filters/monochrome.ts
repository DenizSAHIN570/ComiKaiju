export function applyMonochrome(ctx: CanvasRenderingContext2D): void {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    data[i] = luma; // red
    data[i + 1] = luma; // green
    data[i + 2] = luma; // blue
  }
  ctx.putImageData(imageData, 0, 0);
}
