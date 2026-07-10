import type { FilterConfig } from "../../types/filterConfig.js";

/**
 * Filter Engine - Applies numeric-based filters to canvas contexts
 * All parameters are typed numbers, eliminating injection risk
 */
export class FilterEngine {
  /**
   * Read the current value of a numeric parameter.
   * Values live in the parameter descriptor's `default` field (updated by the
   * editor sliders); this is NOT the descriptor object itself.
   */
  private param(config: FilterConfig, key: string, fallback: number): number {
    const value = config.parameters?.[key]?.default;
    return typeof value === "number" && Number.isFinite(value)
      ? value
      : fallback;
  }

  /**
   * Apply a filter config to canvas context.
   *
   * Dispatch is an explicit allowlist (a switch), NOT dynamic `this[name]`
   * lookup — that could resolve arbitrary members from a stored config
   * (e.g. `constructor`, or `applyFilter` itself → infinite recursion).
   * Unknown function names are ignored (they are also flagged by configValidator).
   */
  applyFilter(ctx: CanvasRenderingContext2D, config: FilterConfig): void {
    if (!config.canvasFunctions || config.canvasFunctions.length === 0) {
      return;
    }

    // Apply each function in sequence
    for (const funcName of config.canvasFunctions) {
      switch (funcName) {
        case "applyRgbAdjustment":
          this.applyRgbAdjustment(ctx, config);
          break;
        case "applyGammaCorrection":
          this.applyGammaCorrection(ctx, config);
          break;
        case "applyVibrance":
          this.applyVibrance(ctx, config);
          break;
        case "applyWhiteBalance":
          this.applyWhiteBalance(ctx, config);
          break;
        case "applyContrast":
          this.applyContrast(ctx, config);
          break;
        case "applySepia":
          this.applySepia(ctx);
          break;
        case "applyDaltonize":
          this.applyDaltonize(ctx, config);
          break;
        default:
          // Unknown / disallowed function name — skip.
          break;
      }
    }
  }

  /**
   * Apply RGB channel adjustment
   */
  applyRgbAdjustment(
    ctx: CanvasRenderingContext2D,
    config: FilterConfig,
  ): void {
    const imageData = ctx.getImageData(
      0,
      0,
      ctx.canvas.width,
      ctx.canvas.height,
    );
    const data = imageData.data;

    // Scale each channel relative to full intensity (255) so the image is
    // tinted rather than flattened to a single flat colour.
    const rScale = this.param(config, "red", 255) / 255;
    const gScale = this.param(config, "green", 255) / 255;
    const bScale = this.param(config, "blue", 255) / 255;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = data[i] * rScale;
      data[i + 1] = data[i + 1] * gScale;
      data[i + 2] = data[i + 2] * bScale;
      // Alpha unchanged
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Apply gamma correction
   */
  applyGammaCorrection(
    ctx: CanvasRenderingContext2D,
    config: FilterConfig,
  ): void {
    const imageData = ctx.getImageData(
      0,
      0,
      ctx.canvas.width,
      ctx.canvas.height,
    );
    const data = imageData.data;

    const gamma = this.param(config, "gamma", 1.0);
    if (gamma <= 0) return;

    // Precompute the lookup table (256 entries) instead of pow() per pixel.
    const lut = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) {
      lut[v] = 255 * Math.pow(v / 255, gamma);
    }

    for (let i = 0; i < data.length; i += 4) {
      data[i] = lut[data[i]];
      data[i + 1] = lut[data[i + 1]];
      data[i + 2] = lut[data[i + 2]];
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Apply vibrance
   */
  applyVibrance(ctx: CanvasRenderingContext2D, config: FilterConfig): void {
    const imageData = ctx.getImageData(
      0,
      0,
      ctx.canvas.width,
      ctx.canvas.height,
    );
    const data = imageData.data;

    const vibrance = this.param(config, "vibrance", 0) / 100; // -100..100 -> -1..1
    const saturation = 1 + vibrance;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const gray = 0.299 * r + 0.587 * g + 0.114 * b;

      data[i] = gray + (r - gray) * saturation;
      data[i + 1] = gray + (g - gray) * saturation;
      data[i + 2] = gray + (b - gray) * saturation;
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Apply white balance
   */
  applyWhiteBalance(ctx: CanvasRenderingContext2D, config: FilterConfig): void {
    const imageData = ctx.getImageData(
      0,
      0,
      ctx.canvas.width,
      ctx.canvas.height,
    );
    const data = imageData.data;

    const temp = this.param(config, "temperature", 6500); // Kelvin
    const tint = this.param(config, "tint", 0); // -100..100 (green-magenta)

    // Convert temperature to RGB multipliers
    const rMult = 1 + (temp - 6500) / 50000;
    const gMult = 1 - (temp - 6500) / 75000;
    const bMult = 1 + (temp - 6500) / 25000;

    // Tint adjustment
    const gTint = 1 - tint / 10000;
    const bTint = 1 + tint / 10000;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = data[i] * rMult * gTint;
      data[i + 1] = data[i + 1] * gMult * bTint;
      data[i + 2] = data[i + 2] * bMult;
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Apply contrast around mid-grey (128). `contrast` is a percentage: 100 = no change.
   */
  applyContrast(ctx: CanvasRenderingContext2D, config: FilterConfig): void {
    const imageData = ctx.getImageData(
      0,
      0,
      ctx.canvas.width,
      ctx.canvas.height,
    );
    const data = imageData.data;
    const factor = this.param(config, "contrast", 100) / 100;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = (data[i] - 128) * factor + 128;
      data[i + 1] = (data[i + 1] - 128) * factor + 128;
      data[i + 2] = (data[i + 2] - 128) * factor + 128;
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Apply a fixed sepia colour matrix.
   */
  applySepia(ctx: CanvasRenderingContext2D): void {
    const imageData = ctx.getImageData(
      0,
      0,
      ctx.canvas.width,
      ctx.canvas.height,
    );
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      data[i] = r * 0.393 + g * 0.769 + b * 0.189;
      data[i + 1] = r * 0.349 + g * 0.686 + b * 0.168;
      data[i + 2] = r * 0.272 + g * 0.534 + b * 0.131;
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Daltonize (colour-blind assist). mode: 0 = Protanopia, 1 = Deuteranopia,
   * 2 = Tritanopia. Simulate the dichromacy, then push the error the reader
   * cannot see into channels they can. Approximate (Viénot 1999 matrices).
   */
  applyDaltonize(ctx: CanvasRenderingContext2D, config: FilterConfig): void {
    // Dichromacy simulation matrices, indexed by mode.
    const SIM: number[][][] = [
      [
        [0.567, 0.433, 0],
        [0.558, 0.442, 0],
        [0, 0.242, 0.758],
      ], // protanopia
      [
        [0.625, 0.375, 0],
        [0.7, 0.3, 0],
        [0, 0.3, 0.7],
      ], // deuteranopia
      [
        [0.95, 0.05, 0],
        [0, 0.433, 0.567],
        [0, 0.475, 0.525],
      ], // tritanopia
    ];
    const mode = Math.max(
      0,
      Math.min(2, Math.round(this.param(config, "mode", 1))),
    );
    const m = SIM[mode];

    const imageData = ctx.getImageData(
      0,
      0,
      ctx.canvas.width,
      ctx.canvas.height,
    );
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const sr = m[0][0] * r + m[0][1] * g + m[0][2] * b;
      const sg = m[1][0] * r + m[1][1] * g + m[1][2] * b;
      const sb = m[2][0] * r + m[2][1] * g + m[2][2] * b;

      const er = r - sr;
      const eg = g - sg;
      const eb = b - sb;

      // Redistribute the unseen error into channels the reader can perceive.
      data[i] = r;
      data[i + 1] = g + 0.7 * er + eg;
      data[i + 2] = b + 0.7 * er + eb;
    }

    ctx.putImageData(imageData, 0, 0);
  }
}
