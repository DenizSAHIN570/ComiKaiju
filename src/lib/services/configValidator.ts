import type { FilterConfig } from "../../types/filterConfig.js";

/**
 * Validation result for filter configs
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Config Validator - Validates filter configs against schema
 * Ensures all parameters are numeric (no injection possible)
 */
export class ConfigValidator {
  /**
   * Validate a filter config against the schema
   */
  validate(config: FilterConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!config.id) {
      errors.push("Filter config must have an id");
    }

    if (!config.name) {
      errors.push("Filter config must have a name");
    }

    if (!config.type) {
      errors.push("Filter config must have a type");
    } else if (!this.isValidType(config.type)) {
      errors.push(`Invalid filter type: ${config.type}`);
    }

    // Validate parameters
    if (config.parameters) {
      for (const [key, param] of Object.entries(config.parameters)) {
        if (!param.name) {
          errors.push(`Parameter ${key} must have a name`);
        }

        if (!param.type) {
          errors.push(`Parameter ${key} must have a type`);
        } else if (param.type !== "number") {
          errors.push(
            `Parameter ${key} must be numeric type (no injection risk)`,
          );
        }

        // Validate ranges
        if (param.min !== undefined && param.max !== undefined) {
          if (param.min > param.max) {
            errors.push(
              `Parameter ${key}: min (${param.min}) cannot be greater than max (${param.max})`,
            );
          }
        }

        // Validate default is within range
        if (
          param.default !== undefined &&
          param.min !== undefined &&
          param.max !== undefined
        ) {
          if (param.default < param.min || param.default > param.max) {
            warnings.push(
              `Parameter ${key}: default (${param.default}) is outside range [${param.min}, ${param.max}]`,
            );
          }
        }
      }
    }

    // Validate canvas functions
    if (config.canvasFunctions) {
      for (const funcName of config.canvasFunctions) {
        if (!this.isValidFunctionName(funcName)) {
          warnings.push(`Unknown canvas function: ${funcName}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if all parameters are numeric (no injection possible)
   */
  checkForNumericOnly(config: FilterConfig): boolean {
    if (!config.parameters) {
      return true;
    }

    for (const param of Object.values(config.parameters)) {
      if (param.type !== "number") {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate parameter ranges
   */
  validateParameterRanges(config: FilterConfig): boolean {
    if (!config.parameters) {
      return true;
    }

    for (const param of Object.values(config.parameters)) {
      if (param.min !== undefined && param.max !== undefined) {
        if (param.min > param.max) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Check for potential injection vectors
   */
  checkForInjection(config: FilterConfig): boolean {
    // Since we only accept numeric parameters, there's no injection risk
    // This function exists for documentation and future-proofing
    return !this.checkForNumericOnly(config);
  }

  /**
   * Validate a filter config and throw if invalid
   */
  validateOrThrow(config: FilterConfig): void {
    const result = this.validate(config);
    if (!result.valid) {
      throw new Error(`Invalid filter config: ${result.errors.join(", ")}`);
    }
  }

  private isValidType(type: string): boolean {
    const validTypes = [
      "rgb",
      "gamma",
      "vibrance",
      "white-balance",
      "composite",
      "sepia",
      "daltonize",
    ];
    return validTypes.includes(type);
  }

  private isValidFunctionName(name: string): boolean {
    const validFunctions = [
      "applyRgbAdjustment",
      "applyGammaCorrection",
      "applyVibrance",
      "applyWhiteBalance",
      "applyContrast",
      "applySepia",
      "applyDaltonize",
    ];
    return validFunctions.includes(name);
  }
}

// Singleton instance
export const configValidator = new ConfigValidator();
