/** Inline SVG icons for Mapbox DOM markers (Lucide-compatible paths). */
const SVG_ATTRS =
  'xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"';

export const TOLL_MARKER_ICON = `<svg ${SVG_ATTRS}><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 0 1 0 4H8"/><path d="M12 18V6"/></svg>`;

export const PARKING_MARKER_ICON = `<svg ${SVG_ATTRS}><circle cx="12" cy="12" r="10"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/></svg>`;

export function escapeMapPopupText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
