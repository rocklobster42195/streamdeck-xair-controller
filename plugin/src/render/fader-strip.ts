// The Fader and Send dials' touch-strip segment (200×100): the kit's level strip (renderLevelStrip,
// the same as in SA-C) in its four looks, "Digital", "Classic", "Ring" and "Pie", with XR-C's
// parts: the value in dB, the scribble strip's colour and name line, a send's name on two lines
// ("Vocals → Reverb") and its tap ("PRE"), and the fader by its travel under the meter.
import { levelStyleShowsMeter, renderLevelMessage, renderLevelStrip, type LevelHeader, type LevelStyle } from "@rocklobster42195/streamdeck-kit";
import { formatDb } from "xair-client";
import { faderBarH } from "./fader-travel";
import { mdiLanDisconnect, mdiTuneVertical } from "@mdi/js";

export type FaderStyle = LevelStyle;
export type FaderHeader = LevelHeader;

/** Styles that show a meter (and need the mixer's meter data). */
export function showsMeter(style: FaderStyle): boolean {
    return levelStyleShowsMeter(style);
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
    /** The name line: white name (default), name in the scribble colour, or a coloured strip like the console's scribble strip. */
    header?: FaderHeader;
    /** The Panorama effect's slice behind the dial (SVG fragment), if it shows one. */
    background?: string;
    /** Inverted scribble colour (dark strip, text and frame in the colour). */
    inverted?: boolean;
};

export function renderFaderStrip(v: FaderView): string {
    // A send's name "Vocals → Reverb": the target is its own line in the ring and pie looks
    const [source, target] = v.name.split(" → ");
    return renderLevelStrip({
        style: v.style,
        name: source,
        subName: target ? `→ ${target}` : undefined,
        valueText: formatDb(v.faderDb),
        position: v.fader,
        color: v.color,
        muted: v.muted,
        levels: v.levels,
        peaks: v.peaks,
        vus: v.vus,
        caption: v.caption,
        header: v.header,
        inverted: v.inverted,
        // The fader by its travel (-∞ = 0 %, +10 dB = 100 %), not on the meter's dBFS scale
        positionBar: faderBarH,
        background: v.background,
    });
}

/** Not ready: no mixer set up, mixer offline, or no channel chosen. */
export function renderFaderMessage(kind: "setup" | "offline" | "choose", label: string, hint: string): string {
    return renderLevelMessage(kind === "offline" ? mdiLanDisconnect : mdiTuneVertical, kind === "offline" ? "#ff5a5a" : "#8a8a90", label, hint);
}
