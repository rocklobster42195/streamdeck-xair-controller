// The Channel key (144×144), in two looks:
//  - "scribble": like the console's scribble strip — the channel colour as the background (the text
//    black or white for contrast), the name large, the fader small. Inverted colours keep the key
//    dark with frame and name in the colour. Muted: red background with a crossed speaker (a red
//    channel also gets hatching); muted by a mute group or DCA: a red frame instead.
//  - "meter": vertical LED bars (mono or stereo) with the fader marker, a clip indicator and the dB.
import { meterBar, mdi, wrap } from "@rocklobster42195/streamdeck-kit";
import { formatDb, type MuteReason, type StripColor } from "xair-client";
import { mdiLanDisconnect, mdiTuneVertical, mdiVolumeOff } from "@mdi/js";
import { scribbleColor, textOn } from "./colors";
import { faderBarV } from "./fader-travel";

export type ChannelLook = "scribble" | "meter";

export type ChannelKeyView = {
    name: string;
    color: StripColor;
    faderDb: number;
    /** Fader travel 0..1 (-∞ … +10 dB). */
    fader: number;
    muted?: MuteReason;
    look: ChannelLook;
    /** Meter (both looks: the meter look always, the scribble look as a thin bar when given). */
    levels?: number[];
    peaks?: number[];
    clipped?: boolean;
    showDb?: boolean;
};

const SIZE = 144;
const MUTE_RED = "#E30018";
const font = `font-family="Segoe UI, Arial, sans-serif"`;

export function renderChannelKey(v: ChannelKeyView): string {
    return svgUri(v.look === "meter" ? meterLook(v) : scribbleLook(v));
}

function scribbleLook(v: ChannelKeyView): string[] {
    const color = scribbleColor(v.color);
    const self = v.muted === "self";
    const inverted = v.color.inverted || v.color.name === "off";
    const bg = self ? MUTE_RED : inverted ? "#101010" : color;
    const ink = self ? "#FFFFFF" : inverted ? (v.color.name === "off" ? "#8a8a90" : color) : textOn(color);
    const parts = [`<rect width="${SIZE}" height="${SIZE}" rx="14" fill="${bg}"/>`];
    if (inverted && !self) parts.push(`<rect x="4" y="4" width="${SIZE - 8}" height="${SIZE - 8}" rx="12" fill="none" stroke="${ink}" stroke-width="4" opacity="${v.color.name === "off" ? 0.35 : 1}"/>`);
    if (self && v.color.name === "red") parts.push(hatching());
    if (self) parts.push(icon(mdiVolumeOff, 50, 12, 44, "#FFFFFF"));
    const lines = wrap(v.name, SIZE - 20, 26, 2);
    const top = self ? 84 : lines.length > 1 ? 58 : 72;
    lines.forEach((line, i) => parts.push(`<text x="${SIZE / 2}" y="${top + i * 28}" ${font} font-size="26" font-weight="700" fill="${ink}" text-anchor="middle">${esc(line)}</text>`));
    if (!self && v.showDb !== false) parts.push(`<text x="${SIZE / 2}" y="${SIZE - 18}" ${font} font-size="17" fill="${ink}" opacity="0.8" text-anchor="middle">${esc(formatDb(v.faderDb))}</text>`);
    if (v.levels?.length) {
        // Optional thin meter along the bottom edge
        parts.push(`<rect x="10" y="${SIZE - 12}" width="${SIZE - 20}" height="6" rx="3" fill="#000" opacity="0.45"/>`);
        parts.push(...meterBar({ x: 12, y: SIZE - 11, length: SIZE - 24, thickness: 4, levels: [Math.max(...v.levels)], segments: 24, gap: 1, off: "none" }));
    }
    if (v.muted === "group" || v.muted === "dca") parts.push(`<rect x="3" y="3" width="${SIZE - 6}" height="${SIZE - 6}" rx="12" fill="none" stroke="${MUTE_RED}" stroke-width="6"/>`, badge(v.muted === "group" ? "MG" : "DCA"));
    return parts;
}

function meterLook(v: ChannelKeyView): string[] {
    const color = v.color.name === "off" ? "#d0d0d4" : scribbleColor(v.color);
    const levels = v.levels?.length ? v.levels : [-128];
    const width = levels.length === 1 ? 44 : 56;
    const h = 84;
    const top = 30;
    const bx = SIZE / 2 - width / 2 - 6;
    const muted = !!v.muted;
    const parts = [
        `<rect width="${SIZE}" height="${SIZE}" rx="14" fill="#101010"/>`,
        `<text x="${SIZE / 2}" y="22" ${font} font-size="17" font-weight="700" fill="#FFFFFF" text-anchor="middle">${esc(wrap(v.name, SIZE - 16, 17, 1)[0] ?? "")}</text>`,
        ...meterBar({ x: bx, y: top, length: h, thickness: width, levels, peaks: v.peaks, segments: 18, gap: 1.5, orientation: "vertical" }),
    ];
    // The fader by its travel beside the meter (-∞ at the bottom, +10 dB at the top)
    parts.push(faderBarV(bx + width + 9, top, h, v.fader, muted ? "#5a5a60" : color));
    if (v.clipped) parts.push(`<rect x="${bx}" y="${top - 5}" width="${width}" height="4" rx="2" fill="${MUTE_RED}"/>`);
    if (muted) {
        parts.push(`<rect x="${bx}" y="${top}" width="${width}" height="${h}" fill="#000" opacity="0.45"/>`);
        parts.push(`<rect x="3" y="3" width="${SIZE - 6}" height="${SIZE - 6}" rx="12" fill="none" stroke="${MUTE_RED}" stroke-width="${v.muted === "self" ? 6 : 4}"/>`);
        parts.push(`<text x="${SIZE / 2}" y="${SIZE - 10}" ${font} font-size="15" font-weight="700" fill="${MUTE_RED}" text-anchor="middle">${v.muted === "self" ? "MUTE" : v.muted === "group" ? "MG" : "DCA"}</text>`);
    } else if (v.showDb !== false) {
        parts.push(`<text x="${SIZE / 2}" y="${SIZE - 10}" ${font} font-size="15" font-weight="700" fill="${color}" text-anchor="middle">${esc(formatDb(v.faderDb))}</text>`);
    }
    return parts;
}

/** Not ready: no mixer, mixer offline, no channel chosen. */
export function renderChannelMessage(kind: "setup" | "offline" | "choose", label: string): string {
    const color = kind === "offline" ? MUTE_RED : "#8a8a90";
    return svgUri([
        `<rect width="${SIZE}" height="${SIZE}" rx="14" fill="#101010"/>`,
        icon(kind === "offline" ? mdiLanDisconnect : mdiTuneVertical, 44, 22, 56, color),
        ...wrap(label, SIZE - 16, 16, 2).map((l, i) => `<text x="${SIZE / 2}" y="${104 + i * 19}" ${font} font-size="16" fill="#c8c8cc" text-anchor="middle">${esc(l)}</text>`),
    ]);
}

function hatching(): string {
    const lines: string[] = [];
    for (let x = -SIZE; x < SIZE; x += 14) lines.push(`<line x1="${x}" y1="${SIZE}" x2="${x + SIZE}" y2="0" stroke="#000" stroke-width="4" opacity="0.18"/>`);
    return `<defs><clipPath id="key"><rect width="${SIZE}" height="${SIZE}" rx="14"/></clipPath></defs><g clip-path="url(#key)">${lines.join("")}</g>`;
}

function badge(label: string): string {
    return `<rect x="${SIZE - 50}" y="10" width="40" height="22" rx="6" fill="${MUTE_RED}"/><text x="${SIZE - 30}" y="26" ${font} font-size="13" font-weight="700" fill="#FFFFFF" text-anchor="middle">${label}</text>`;
}

const icon = (path: string, x: number, y: number, size: number, fill: string) => mdi(path, x, y, size, fill);
const esc = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

function svgUri(parts: string[]): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">${parts.join("")}</svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
