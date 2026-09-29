// The Fader dial's touch-strip segment (200×100): "Digital" (LED bars lying, scale, fader marker),
// "Classic" (analog VU meters), or just the fader as a ring or a pie (no meter). Mono strips get one
// bar or meter, stereo strips two.
import { METER_TICKS, arc, escapeXml, meterBar, meterScaleMarks, mdi, pie, stripImage, text, textWidth, vuMeter } from "@rocklobster42195/streamdeck-kit";
import { formatDb } from "xair-client";
import { faderBarH } from "./fader-travel";
import { mdiLanDisconnect, mdiTuneVertical, mdiVolumeOff } from "@mdi/js";

export type FaderStyle = "digital" | "classic" | "ring" | "pie";

/** Styles that show a meter (and need the mixer's meter data). */
export function showsMeter(style: FaderStyle): boolean {
    return style === "digital" || style === "classic";
}

export type FaderView = {
    name: string;
    /** Scribble strip colour (CSS). */
    color: string;
    faderDb: number;
    /** Fader position 0..1 (what the physical fader shows). */
    fader: number;
    /** Small note after the dB value, e.g. a send's tap ("PRE"). */
    caption?: string;
    muted: boolean;
    /** Levels and peaks in dBFS, one per channel (mono: 1, stereo: 2). */
    levels: number[];
    peaks: number[];
    /** Needle positions in VU (classic style), one per channel. */
    vus: number[];
    style: FaderStyle;
};

const MUTED = "#ff5a5a";

export function renderFaderStrip(v: FaderView): string {
    if (v.style === "classic") return classic(v);
    if (v.style === "ring" || v.style === "pie") return gauge(v);
    return digital(v);
}

/** Ring or pie with the fader position, name and dB next to it (like MA-C's Volume dial). */
function gauge(v: FaderView): string {
    const color = v.muted ? "#5a5a60" : v.color;
    const parts = v.style === "pie" ? pie(50, 50, 38, v.muted ? 0 : v.fader, color) : arc(50, 50, 34, v.fader, color);
    if (v.muted) parts.push(mdi(mdiVolumeOff, 34, 34, 32, MUTED));
    // A send's name "Vocals → Reverb" goes on two lines; the tap (PRE/POST) small under the dB
    const [source, target] = v.name.split(" → ");
    const top = target ? 34 : 44;
    parts.push(text(100, top, source, { size: 14, weight: "bold", maxWidth: 94 }));
    if (target) parts.push(text(100, 51, `→ ${target}`, { size: 12, color: "#a4a4aa", maxWidth: 94 }));
    const y = target ? 71 : 64;
    parts.push(v.muted ? text(100, y, "MUTE", { size: 13, weight: "bold", color: MUTED }) : text(100, y, formatDb(v.faderDb), { size: 14, weight: "bold", color: v.color, maxWidth: 94 }));
    if (v.caption && !v.muted) parts.push(text(100, y + 15, v.caption, { size: 10, color: "#8a8a90" }));
    return stripImage(parts);
}

function digital(v: FaderView): string {
    const w = 184;
    const bx = 8;
    const marker = v.muted ? "#5a5a60" : v.color;
    // The name gets what the dB label leaves free
    const right = v.muted ? textWidth("MUTE", 12, { bold: true }) + 22 : textWidth(formatDb(v.faderDb), 13, { bold: true });
    const parts = [
        text(8, 18, v.name, { size: 14, weight: "bold", maxWidth: Math.max(60, 184 - right - 10) }),
        v.muted
            ? `${mdi(mdiVolumeOff, 192 - textWidth("MUTE", 12, { bold: true }) - 22, 4, 18, MUTED)}${text(192, 18, "MUTE", { size: 12, weight: "bold", color: MUTED, anchor: "end" })}`
            : text(192, 18, formatDb(v.faderDb), { size: 13, weight: "bold", color: v.color, anchor: "end" }),
        ...meterBar({ x: bx, y: 30, length: w, thickness: 22, levels: v.levels, peaks: v.peaks, segments: 36, off: v.muted ? "#1a1c20" : undefined }),
        ...meterScaleMarks(bx, 57, w, METER_TICKS),
        // The fader by its travel (-∞ = 0 %, +10 dB = 100 %), not on the meter's dBFS scale
        faderBarH(bx, 86, w, v.fader, marker),
    ];
    // A send's tap (PRE/POST) small at the bottom right, under the scale
    if (v.caption && !v.muted) parts.push(text(192, 81, v.caption, { size: 9, color: "#8a8a90", anchor: "end" }));
    // A muted channel's meter may still move (it can be metered before the mute); dim it
    if (v.muted) parts.push(`<rect x="${bx}" y="30" width="${w}" height="22" fill="#000" opacity="0.45"/>`);
    return stripImage(parts);
}

function classic(v: FaderView): string {
    const parts: string[] = [];
    if (v.vus.length === 1) parts.push(...vuMeter({ x: 40, y: 4, width: 120, height: 82, vu: v.vus[0], label: "MONO", id: "vm" }));
    else {
        parts.push(...vuMeter({ x: 4, y: 6, width: 94, height: 80, vu: v.vus[0], label: "LEFT", id: "vl" }));
        parts.push(...vuMeter({ x: 102, y: 6, width: 94, height: 80, vu: v.vus[1], label: "RIGHT", id: "vr" }));
    }
    const caption = `${escapeXml(v.name.toUpperCase())} · ${v.muted ? "MUTE" : escapeXml(dbLabel(v))}`;
    parts.push(`<text x="100" y="97" font-family="Arial,sans-serif" font-size="9" fill="${v.muted ? MUTED : "#bfa76a"}" text-anchor="middle" letter-spacing="1.5">${caption}</text>`);
    return stripImage(parts, "#141210");
}

const dbLabel = (v: FaderView) => (v.caption ? `${formatDb(v.faderDb)} ${v.caption}` : formatDb(v.faderDb));

/** Not ready: no mixer set up, mixer offline, or no channel chosen. */
export function renderFaderMessage(kind: "setup" | "offline" | "choose", label: string, hint: string): string {
    const icon = kind === "offline" ? mdiLanDisconnect : mdiTuneVertical;
    const color = kind === "offline" ? MUTED : "#8a8a90";
    return stripImage([mdi(icon, 16, 34, 32, color), text(60, 46, label, { size: 14, weight: "bold", maxWidth: 132 }), text(60, 64, hint, { size: 11, color: "#a4a4aa", maxWidth: 132 })]);
}
