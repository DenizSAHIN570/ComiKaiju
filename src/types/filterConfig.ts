// Filter configuration schema - numeric parameters only, no raw CSS/SVG
// This eliminates injection risk entirely since all parameters are typed numbers

export interface FilterConfig {
  id: string;
  name: string;
  description?: string;
  type: string;

  // Named numeric parameters with typed values
  parameters: {
    [key: string]: FilterParameter;
  };

  // Canvas filter functions to apply (in order)
  canvasFunctions?: string[];
}

export interface FilterParameter {
  name: string;
  type: "number";
  min?: number;
  max?: number;
  default?: number;
  step?: number;
  unit?: string; // e.g., 'K', '%'
}

// Premade one-click filters (fixed effects, not user-editable).
export const premadeFilters: FilterConfig[] = [
  {
    id: "monochrome",
    name: "Monochrome",
    description: "Grayscale",
    type: "vibrance",
    parameters: {
      vibrance: { name: "Vibrance", type: "number", default: -100 },
    },
    canvasFunctions: ["applyVibrance"],
  },
  {
    id: "color-correction",
    name: "Color Correction",
    description: "Boost contrast and colour",
    type: "composite",
    parameters: {
      contrast: { name: "Contrast", type: "number", default: 110 },
      vibrance: { name: "Vibrance", type: "number", default: 15 },
    },
    canvasFunctions: ["applyContrast", "applyVibrance"],
  },
  {
    id: "vintage",
    name: "Vintage",
    description: "Sepia tone",
    type: "sepia",
    parameters: {},
    canvasFunctions: ["applySepia"],
  },
  {
    id: "vibrant",
    name: "Vibrant",
    description: "Enhanced saturation",
    type: "vibrance",
    parameters: {
      vibrance: { name: "Vibrance", type: "number", default: 50 },
    },
    canvasFunctions: ["applyVibrance"],
  },
  {
    id: "protanopia",
    name: "Protanopia (assist)",
    description: "Colour-blind assist — red-weak",
    type: "daltonize",
    parameters: { mode: { name: "Mode", type: "number", default: 0 } },
    canvasFunctions: ["applyDaltonize"],
  },
  {
    id: "deuteranopia",
    name: "Deuteranopia (assist)",
    description: "Colour-blind assist — green-weak",
    type: "daltonize",
    parameters: { mode: { name: "Mode", type: "number", default: 1 } },
    canvasFunctions: ["applyDaltonize"],
  },
  {
    id: "tritanopia",
    name: "Tritanopia (assist)",
    description: "Colour-blind assist — blue-weak",
    type: "daltonize",
    parameters: { mode: { name: "Mode", type: "number", default: 2 } },
    canvasFunctions: ["applyDaltonize"],
  },
];

// Parameter descriptors for the custom editor's four adjustment groups.
export const customFilterParameters: Record<string, FilterParameter> = {
  red: { name: "Red", type: "number", min: 0, max: 255, default: 255, step: 1 },
  green: {
    name: "Green",
    type: "number",
    min: 0,
    max: 255,
    default: 255,
    step: 1,
  },
  blue: {
    name: "Blue",
    type: "number",
    min: 0,
    max: 255,
    default: 255,
    step: 1,
  },
  gamma: {
    name: "Gamma",
    type: "number",
    min: 0.1,
    max: 5,
    default: 1,
    step: 0.1,
  },
  vibrance: {
    name: "Vibrance",
    type: "number",
    min: -100,
    max: 100,
    default: 0,
    step: 1,
    unit: "%",
  },
  temperature: {
    name: "Temperature",
    type: "number",
    min: 2000,
    max: 10000,
    default: 6500,
    step: 100,
    unit: "K",
  },
  tint: {
    name: "Tint",
    type: "number",
    min: -100,
    max: 100,
    default: 0,
    step: 1,
  },
};

// Applied in order to build a custom filter from the editor's four groups.
export const CUSTOM_FILTER_FUNCTIONS = [
  "applyRgbAdjustment",
  "applyGammaCorrection",
  "applyVibrance",
  "applyWhiteBalance",
];
