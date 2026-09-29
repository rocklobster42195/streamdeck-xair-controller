import { action } from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/utils";
import { parseStripId } from "xair-client";
import { mixerConnection } from "../mixer/connection";
import { dialColor } from "../render/colors";
import { showsMeter, type FaderHeader, type FaderStyle } from "../render/fader-strip";
import { stripName } from "../render/strip-name";
import { MixerDial, type DialContent, type DialInstance } from "./mixer-dial";

type FaderSettings = {
    /** The strip, e.g. "ch:3" (see xair-client stripId). */
    strip?: string;
    style?: FaderStyle;
    /** The name line: plain (default), in the scribble colour, or as a coloured strip. */
    header?: FaderHeader;
    /** dB per dial tick. */
    step?: number;
} & JsonObject;

/** Lowest level a rotation starts from when a fader is at -∞ (turning up from silence). */
export const FLOOR_DB = -60;

/** Next level for `ticks` dial steps of `step` dB from `db` (from -∞ it starts at FLOOR_DB). */
export function stepDb(db: number, ticks: number, step: number | undefined): number {
    const s = Math.max(0.5, Math.min(6, step ?? 1));
    const from = db <= -89 && ticks > 0 ? FLOOR_DB - s : db;
    return Math.min(10, from + ticks * s);
}

/**
 * A mixer strip on a dial. Rotate: level (dB per tick) · Push: mute · Touch: 0 dB (hold: -∞).
 * Digital and Classic show the strip's meter; the mixer is asked for meters only while one shows.
 */
@action({ UUID: "de.boriskemper.xair-controller.fader-dial" })
export class FaderDial extends MixerDial<FaderSettings> {
    constructor() {
        super("fader");
    }

    protected override meterOf(s: FaderSettings) {
        return { ref: parseStripId(s.strip), wanted: showsMeter(s.style ?? "digital") };
    }

    protected override content(inst: DialInstance<FaderSettings>): DialContent {
        const ref = parseStripId(inst.settings.strip);
        const strip = ref && mixerConnection.strip(ref);
        if (!ref || !strip) return { choose: true };
        return { view: { name: stripName(ref, strip.name), color: dialColor(strip.color), faderDb: strip.db, fader: strip.fader, muted: strip.muted, style: inst.settings.style ?? "digital", header: inst.settings.header, inverted: strip.color.inverted } };
    }

    protected override rotate(inst: DialInstance<FaderSettings>, ticks: number): void {
        const ref = parseStripId(inst.settings.strip);
        const strips = mixerConnection.strips;
        if (ref && strips) strips.setDb(ref, stepDb(strips.strip(ref).db, ticks, inst.settings.step));
    }

    protected override push(inst: DialInstance<FaderSettings>): void {
        const ref = parseStripId(inst.settings.strip);
        const strips = mixerConnection.strips;
        if (ref && strips) strips.setMuted(ref, !strips.strip(ref).muted);
    }

    protected override touch(inst: DialInstance<FaderSettings>, hold: boolean): void {
        const ref = parseStripId(inst.settings.strip);
        if (ref) mixerConnection.strips?.setDb(ref, hold ? -90 : 0);
    }
}
