import type { StripColor } from "xair-client";

/** XR-C's own colour (Persian Green, house palette), used where a channel has no scribble colour. */
export const ACCENT = "#00ACA8";

/** Scribble strip colours as they read well on the black strip; inverted ones (8–15) look the same here. */
const SCRIBBLE: Record<StripColor["name"], string> = {
    off: ACCENT,
    red: "#ff5a5a",
    green: "#4cd964",
    yellow: "#f5d142",
    blue: "#4d8dff",
    magenta: "#e25bd8",
    cyan: "#35d0e0",
    white: "#e8e8e8",
};

export function scribbleColor(color: StripColor): string {
    return SCRIBBLE[color.name];
}
