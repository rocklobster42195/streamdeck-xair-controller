// The fader by its travel, like the physical fader: -∞ at 0 %, 0 dB at 75 %, +10 dB at 100 %
// (X-Air fader law). Not on the meter's dBFS scale: a fader at -8 dB is at 55 % of its way.
import { dbToFader } from "xair-client";

/** Where 0 dB sits on the travel (0..1). */
export const ZERO_DB = dbToFader(0);

/** A lying fader bar: track, fill up to `fader` (0..1), a tick at 0 dB. */
export function faderBarH(x: number, y: number, length: number, fader: number, color: string): string {
    const t = x + ZERO_DB * length;
    return (
        `<rect x="${x}" y="${y}" width="${length}" height="5" rx="2.5" fill="#2a2b30"/>` +
        `<rect x="${x}" y="${y}" width="${(length * Math.min(1, Math.max(0, fader))).toFixed(1)}" height="5" rx="2.5" fill="${color}"/>` +
        `<rect x="${(t - 0.75).toFixed(1)}" y="${y - 3}" width="1.5" height="11" fill="#a4a4aa"/>`
    );
}

/** A standing fader bar (bottom = -∞), for keys. */
export function faderBarV(x: number, y: number, length: number, fader: number, color: string): string {
    const fill = length * Math.min(1, Math.max(0, fader));
    const t = y + length - ZERO_DB * length;
    return (
        `<rect x="${x}" y="${y}" width="6" height="${length}" rx="3" fill="#2a2b30"/>` +
        `<rect x="${x}" y="${(y + length - fill).toFixed(1)}" width="6" height="${fill.toFixed(1)}" rx="3" fill="${color}"/>` +
        `<rect x="${x - 3}" y="${(t - 0.75).toFixed(1)}" width="12" height="1.5" fill="#a4a4aa"/>`
    );
}
