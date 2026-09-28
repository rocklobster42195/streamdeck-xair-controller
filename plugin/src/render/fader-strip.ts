// The Fader dial's touch-strip segment (200×100): "Digital" (LED bars lying, scale, fader marker)
// or "Classic" (analog VU meters). Mono strips get one bar or meter, stereo strips two.
import { METER_TICKS, escapeXml, meterBar, meterScaleMarks, mdi, scalePosition, stripImage, text, textWidth, vuMeter } from "@rocklobster42195/streamdeck-kit";
import { formatDb } from "xair-client";
import { mdiLanDisconnect, mdiTuneVertical, mdiVolumeOff } from "@mdi/js";

export type MeterStyle = "digital" | "classic";

export type FaderView = {
    name: string;
    /** Scribble strip colour (CSS). */
    color: string;
    faderDb: number;
    muted: boolean;
    /** Levels and peaks in dBFS, one per channel (mono: 1, stereo: 2). */
    levels: number[];
    peaks: number[];
    /** Needle positions in VU (classic style), one per channel. */
    vus: number[];
    style: MeterStyle;
};

const MUTED = "#ff5a5a";

export function renderFaderStrip(v: FaderView): string {
    return v.style === "classic" ? classic(v) : digital(v);
}

function digital(v: FaderView): string {
    const w = 184;
    const bx = 8;
    const fm = bx + scalePosition(v.faderDb) * w;
    const marker = v.muted ? "#5a5a60" : v.color;
    const parts = [
        text(8, 18, v.name, { size: 14, weight: "bold", maxWidth: 110 }),
        v.muted
            ? `${mdi(mdiVolumeOff, 192 - textWidth("MUTE", 12, { bold: true }) - 22, 4, 18, MUTED)}${text(192, 18, "MUTE", { size: 12, weight: "bold", color: MUTED, anchor: "end" })}`
            : text(192, 18, formatDb(v.faderDb), { size: 13, weight: "bold", color: v.color, anchor: "end" }),
        ...meterBar({ x: bx, y: 32, length: w, thickness: 22, levels: v.levels, peaks: v.peaks, segments: 36, off: v.muted ? "#1a1c20" : undefined }),
        `<path d="M ${(fm - 5).toFixed(1)} 62 L ${(fm + 5).toFixed(1)} 62 L ${fm.toFixed(1)} 68 Z" fill="${marker}"/>`,
        ...meterScaleMarks(bx, 71, w, METER_TICKS),
    ];
    // A muted channel's meter may still move (it can be metered before the mute); dim it
    if (v.muted) parts.push(`<rect x="${bx}" y="32" width="${w}" height="22" fill="#000" opacity="0.45"/>`);
    return stripImage(parts);
}

function classic(v: FaderView): string {
    const parts: string[] = [];
    if (v.vus.length === 1) parts.push(...vuMeter({ x: 40, y: 4, width: 120, height: 82, vu: v.vus[0], label: "MONO", id: "vm" }));
    else {
        parts.push(...vuMeter({ x: 4, y: 6, width: 94, height: 80, vu: v.vus[0], label: "LEFT", id: "vl" }));
        parts.push(...vuMeter({ x: 102, y: 6, width: 94, height: 80, vu: v.vus[1], label: "RIGHT", id: "vr" }));
    }
    const caption = `${escapeXml(v.name.toUpperCase())} · ${v.muted ? "MUTE" : formatDb(v.faderDb)}`;
    parts.push(`<text x="100" y="97" font-family="Arial,sans-serif" font-size="9" fill="${v.muted ? MUTED : "#bfa76a"}" text-anchor="middle" letter-spacing="1.5">${caption}</text>`);
    return stripImage(parts, "#141210");
}

/** Not ready: no mixer set up, mixer offline, or no channel chosen. */
export function renderFaderMessage(kind: "setup" | "offline" | "choose", label: string, hint: string): string {
    const icon = kind === "offline" ? mdiLanDisconnect : mdiTuneVertical;
    const color = kind === "offline" ? MUTED : "#8a8a90";
    return stripImage([mdi(icon, 16, 34, 32, color), text(60, 46, label, { size: 14, weight: "bold", maxWidth: 132 }), text(60, 64, hint, { size: 11, color: "#a4a4aa", maxWidth: 132 })]);
}
