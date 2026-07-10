/**
 * Keyboard Shortcuts Service
 * Handles global keyboard shortcuts for the reader.
 *
 * Note: with Shift held, `event.key` is the shifted glyph ("F", "!", …), so we
 * match on `event.code` ("KeyF", "Digit1") which is layout/modifier stable.
 *
 * Shortcuts:
 *   Ctrl+Shift+F      -> toggle custom filter editor  ("filter-editor-toggle")
 *   Ctrl+Shift+1..7   -> apply premade filter 1..7     ("apply-filter")
 *   Ctrl+Shift+0      -> clear filter                  ("apply-filter", none)
 */
import { premadeFilters } from "../../types/filterConfig.js";

function handleKeydown(event: KeyboardEvent): void {
  // Ignore while typing in an input
  if (
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement
  ) {
    return;
  }

  if (!event.ctrlKey || !event.shiftKey) return;

  if (event.code === "KeyF") {
    event.preventDefault();
    window.dispatchEvent(new CustomEvent("filter-editor-toggle"));
    return;
  }

  if (event.code === "Digit0") {
    event.preventDefault();
    window.dispatchEvent(
      new CustomEvent("apply-filter", { detail: { filterId: "none" } }),
    );
    return;
  }

  const digitMatch = event.code.match(/^Digit([1-7])$/);
  if (digitMatch) {
    event.preventDefault();
    const filter = premadeFilters[Number(digitMatch[1]) - 1];
    if (filter) {
      window.dispatchEvent(
        new CustomEvent("apply-filter", { detail: { filterId: filter.id } }),
      );
    }
  }
}

let registered = false;

export function registerShortcuts(): void {
  // Guard against double-registration (e.g. layout remount in dev/HMR)
  if (registered) return;
  registered = true;
  window.addEventListener("keydown", handleKeydown);
}

// Initialize shortcuts on mount
export function initShortcuts(): void {
  registerShortcuts();
}
