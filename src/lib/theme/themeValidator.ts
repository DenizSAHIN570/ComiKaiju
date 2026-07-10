import { PALETTE_KEYS, FONT_STACKS, type Theme } from "./themeSchema";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Enforces the typed-only invariant: a theme is a fixed set of 6-digit hex
 * colors plus a font from the allowlist. This is what keeps arbitrary strings
 * out of CSS custom properties.
 */
class ThemeValidator {
  validate(theme: unknown): ValidationResult {
    const errors: string[] = [];
    if (typeof theme !== "object" || theme === null) {
      return { valid: false, errors: ["Theme must be an object"] };
    }
    const t = theme as Record<string, unknown>;

    if (typeof t.id !== "string" || !t.id) errors.push("Missing id");
    if (typeof t.name !== "string" || t.name.trim().length === 0)
      errors.push("Name is required");
    else if (t.name.length > 60)
      errors.push("Name must be 60 characters or fewer");
    if (typeof t.builtIn !== "boolean") errors.push("builtIn must be a boolean");
    if (typeof t.font !== "string" || !(t.font in FONT_STACKS))
      errors.push(`Invalid font: ${String(t.font)}`);

    for (const mode of ["light", "dark"] as const) {
      const p = t[mode];
      if (typeof p !== "object" || p === null) {
        errors.push(`Missing ${mode} palette`);
        continue;
      }
      for (const key of PALETTE_KEYS) {
        const v = (p as Record<string, unknown>)[key];
        if (typeof v !== "string" || !HEX.test(v)) {
          errors.push(
            `${mode}.${key} must be a 6-digit hex color (got ${String(v)})`,
          );
        }
      }
    }
    return { valid: errors.length === 0, errors };
  }

  validateOrThrow(theme: unknown): Theme {
    const r = this.validate(theme);
    if (!r.valid) throw new Error(`Invalid theme: ${r.errors.join("; ")}`);
    return theme as Theme;
  }
}

export const themeValidator = new ThemeValidator();
