// Scribble strip colours on the house palette (C:\dev\komuh\docs\cd-farben.md), as agreed in the
// concept ("Colors"). The mixer sends an index 0–15: 0 off, 1–7 colours, 8–15 the same inverted.
import type { StripColor } from "xair-client";

/** XR-C's own colour: Persian Green (the logo circle). */
export const ACCENT = "#00ACA8";

const PALETTE: Record<StripColor["name"], string> = {
    off: "#A5A5A5", // grey; shown dimmed
    red: "#E30018", // Düsseldorf Rot
    green: "#59A028", // Vida Loca
    yellow: "#FFDD00", // School Bus Yellow
    blue: "#009FDF", // Düsseldorf Blau
    magenta: "#E14190", // Cerise
    cyan: "#00ACA8", // Persian Green
    white: "#FFFFFF",
};

/** The palette colour of a scribble strip ("off" is grey). */
export function scribbleColor(color: StripColor): string {
    return PALETTE[color.name];
}

/** Black or white, whichever reads better on `hex`. */
export function textOn(hex: string): string {
    const n = parseInt(hex.slice(1), 16);
    const lin = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    const l = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
    return l > 0.4 ? "#000000" : "#FFFFFF";
}
