import { action } from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/utils";
import { parseSendTarget, parseStripId, type SendTarget } from "xair-client";
import { mixerConnection } from "../mixer/connection";
import { dialColor } from "../render/colors";
import { showsMeter, type FaderStyle } from "../render/fader-strip";
import { stripName } from "../render/strip-name";
import { stepDb } from "./fader-dial";
import { MixerDial, type DialContent, type DialInstance } from "./mixer-dial";

type SendSettings = {
    /** The channel, e.g. "ch:1". */
    strip?: string;
    /** The target, e.g. "bus:2" or "fx:1". */
    target?: string;
    style?: FaderStyle;
    step?: number;
    /** Level (dB) to restore when the send is switched back on (X-Air has no send switch). */
    lastOnDb?: number;
} & JsonObject;

/**
 * A channel's send to a bus or FX on a dial, headed "Vocals → Monitor". Rotate: send level ·
 * Push: send off (-∞) or back on · Touch: 0 dB (hold: -∞). The meter is the channel's; the
 * marker is the send level. The tap (PRE/POST…) is shown, not switched.
 */
@action({ UUID: "de.boriskemper.xair-controller.send-dial" })
export class SendDial extends MixerDial<SendSettings> {
    constructor() {
        super("send");
    }

    protected override meterOf(s: SendSettings) {
        return { ref: parseStripId(s.strip), wanted: showsMeter(s.style ?? "digital") };
    }

    protected override content(inst: DialInstance<SendSettings>): DialContent {
        const { ref, target } = this.parts(inst.settings);
        const strip = ref && mixerConnection.strip(ref);
        const sends = mixerConnection.sends;
        if (!ref || !target || !strip || !sends) return { choose: true };
        const send = sends.send(ref, target);
        const to = send.targetName || (target.kind === "bus" ? `Bus ${target.n}` : `FX ${target.n}`);
        return {
            view: {
                name: `${stripName(ref, strip.name)} → ${to}`,
                color: dialColor(strip.color),
                faderDb: send.db,
                fader: send.level,
                muted: false,
                caption: send.tap,
                style: inst.settings.style ?? "digital",
            },
        };
    }

    protected override rotate(inst: DialInstance<SendSettings>, ticks: number): void {
        const { ref, target } = this.parts(inst.settings);
        const sends = mixerConnection.sends;
        if (ref && target && sends) sends.setDb(ref, target, stepDb(sends.send(ref, target).db, ticks, inst.settings.step));
    }

    protected override push(inst: DialInstance<SendSettings>): void {
        const { ref, target } = this.parts(inst.settings);
        const sends = mixerConnection.sends;
        if (!ref || !target || !sends) return;
        const db = sends.send(ref, target).db;
        if (db > -89) {
            // Off: remember the level for switching back on
            inst.settings = { ...inst.settings, lastOnDb: db };
            void inst.action.setSettings(inst.settings);
            sends.setDb(ref, target, -90);
        } else sends.setDb(ref, target, inst.settings.lastOnDb ?? 0);
    }

    protected override touch(inst: DialInstance<SendSettings>, hold: boolean): void {
        const { ref, target } = this.parts(inst.settings);
        if (ref && target) mixerConnection.sends?.setDb(ref, target, hold ? -90 : 0);
    }

    private parts(s: SendSettings): { ref: ReturnType<typeof parseStripId>; target: SendTarget | undefined } {
        const ref = parseStripId(s.strip);
        return { ref: ref?.kind === "ch" ? ref : undefined, target: parseSendTarget(s.target) };
    }
}
