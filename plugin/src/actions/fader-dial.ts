import streamDeck, {
    action,
    type DialAction,
    type DialDownEvent,
    type DialRotateEvent,
    type DidReceiveSettingsEvent,
    SingletonAction,
    type TouchTapEvent,
    type WillAppearEvent,
    type WillDisappearEvent,
} from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/utils";
import { frames, MeterBallistics, VuBallistics, dbfsToVu } from "@rocklobster42195/streamdeck-kit";
import { meterIndices, parseStripId, type StripRef } from "xair-client";
import { mixerConnection } from "../mixer/connection";
import { scribbleColor } from "../render/colors";
import { renderFaderMessage, renderFaderStrip, showsMeter, type FaderStyle } from "../render/fader-strip";

type FaderSettings = {
    /** The strip, e.g. "ch:3" (see xair-client stripId). */
    strip?: string;
    style?: FaderStyle;
    /** dB per dial tick. */
    step?: number;
} & JsonObject;

type Instance = {
    action: DialAction<FaderSettings>;
    settings: FaderSettings;
    /** Latest measured levels (dBFS) per channel of the strip. */
    measured: number[];
    meters: MeterBallistics[];
    needles: VuBallistics[];
    unsubscribe?: () => void;
    /** The mixer the meter subscription belongs to (a reconnect creates a new one). */
    subscribedTo?: unknown;
    lastImage?: string;
};

/** Lowest level a rotation starts from when the fader is at -∞ (turning up from silence). */
const FLOOR_DB = -60;

/**
 * A mixer strip on a dial. Rotate: level (dB per tick) · Push: mute · Touch: 0 dB (hold: -∞).
 * Shows the strip's meter while visible; the mixer is asked for meters only then.
 */
@action({ UUID: "de.boriskemper.xair-controller.fader-dial" })
export class FaderDial extends SingletonAction<FaderSettings> {
    private readonly instances = new Map<string, Instance>();

    constructor() {
        super();
        mixerConnection.onChange(() => {
            for (const id of this.instances.keys()) {
                this.subscribe(id);
                this.render(id);
            }
        });
    }

    override onWillAppear(ev: WillAppearEvent<FaderSettings>): void {
        if (!ev.action.isDial()) return;
        this.instances.set(ev.action.id, { action: ev.action, settings: ev.payload.settings, measured: [], meters: [], needles: [] });
        this.subscribe(ev.action.id);
        this.render(ev.action.id);
    }

    override onWillDisappear(ev: WillDisappearEvent<FaderSettings>): void {
        const inst = this.instances.get(ev.action.id);
        inst?.unsubscribe?.();
        frames.stop(`fader-${ev.action.id}`);
        this.instances.delete(ev.action.id);
    }

    override onDidReceiveSettings(ev: DidReceiveSettingsEvent<FaderSettings>): void {
        const inst = this.instances.get(ev.action.id);
        if (!inst) return;
        if (inst.settings.strip !== ev.payload.settings.strip || inst.settings.style !== ev.payload.settings.style) {
            inst.unsubscribe?.();
            inst.unsubscribe = undefined;
        }
        inst.settings = ev.payload.settings;
        this.subscribe(ev.action.id);
        this.render(ev.action.id);
    }

    override async onDialRotate(ev: DialRotateEvent<FaderSettings>): Promise<void> {
        const target = this.target(ev.action.id);
        if (!target) return;
        const { ref, strips, settings } = target;
        const step = Math.max(0.5, Math.min(6, settings.step ?? 1));
        const now = strips.strip(ref).db;
        const from = now <= -89 && ev.payload.ticks > 0 ? FLOOR_DB - step : now;
        strips.setDb(ref, Math.min(10, from + ev.payload.ticks * step));
    }

    override async onDialDown(ev: DialDownEvent<FaderSettings>): Promise<void> {
        const target = this.target(ev.action.id);
        if (!target) return;
        target.strips.setMuted(target.ref, !target.strips.strip(target.ref).muted);
    }

    override async onTouchTap(ev: TouchTapEvent<FaderSettings>): Promise<void> {
        const target = this.target(ev.action.id);
        if (!target) return;
        target.strips.setDb(target.ref, ev.payload.hold ? -90 : 0);
    }

    private target(id: string) {
        const inst = this.instances.get(id);
        const ref = parseStripId(inst?.settings.strip);
        const strips = mixerConnection.strips;
        if (!inst || !ref || !strips || mixerConnection.state !== "online") return undefined;
        return { ref, strips, settings: inst.settings };
    }

    /** Meters while the dial is visible, the mixer online and a strip with a meter chosen. */
    private subscribe(id: string): void {
        const inst = this.instances.get(id);
        if (!inst) return;
        const mixer = mixerConnection.current;
        const ref = parseStripId(inst.settings.strip);
        // Ring and pie show no meter; DCAs have none
        const wanted = !!mixer && !!ref && mixerConnection.state === "online" && meterIndices(ref).length > 0 && showsMeter(inst.settings.style ?? "digital");
        if (inst.unsubscribe && wanted && inst.subscribedTo === mixer) return;
        inst.unsubscribe?.();
        inst.unsubscribe = undefined;
        inst.measured = [];
        if (!wanted || !mixer || !ref) return;
        inst.subscribedTo = mixer;
        inst.unsubscribe = mixer.subscribeMeters(1, (bank) => {
            const indices = meterIndices(ref, isStereo(ref));
            inst.measured = indices.map((i) => bank[i] ?? -128);
        });
        // Redraw at the shared frame rate while subscribed
        frames.run(`fader-${id}`, () => {
            if (this.instances.get(id) !== inst || !inst.unsubscribe) return false;
            this.render(id);
            return true;
        });
    }

    private render(id: string): void {
        const inst = this.instances.get(id);
        if (!inst) return;
        const image = this.image(inst);
        if (image === inst.lastImage) return;
        inst.lastImage = image;
        void inst.action.setFeedback({ "full-canvas": image }).catch((e) => streamDeck.logger.warn("[fader] setFeedback failed", e));
    }

    private image(inst: Instance): string {
        const t = (k: string) => streamDeck.i18n.t(k);
        if (mixerConnection.state === "unconfigured") return renderFaderMessage("setup", t("key.setup"), t("key.setup_hint"));
        if (mixerConnection.state !== "online") return renderFaderMessage("offline", t("key.offline"), t("key.offline_hint"));
        const ref = parseStripId(inst.settings.strip);
        const strip = ref && mixerConnection.strip(ref);
        if (!ref || !strip) return renderFaderMessage("choose", t("key.choose"), t("key.choose_hint"));

        const channels = isStereo(ref) ? 2 : 1;
        const now = Date.now();
        while (inst.meters.length < channels) inst.meters.push(new MeterBallistics());
        while (inst.needles.length < channels) inst.needles.push(new VuBallistics());
        const states = Array.from({ length: channels }, (_, i) => inst.meters[i].update(inst.measured[i] ?? -128, now));
        return renderFaderStrip({
            name: strip.name || defaultName(ref),
            color: scribbleColor(strip.color),
            faderDb: strip.db,
            fader: strip.fader,
            muted: strip.muted,
            levels: states.map((s) => s.level),
            peaks: states.map((s) => s.peak),
            vus: Array.from({ length: channels }, (_, i) => inst.needles[i].update(dbfsToVu(inst.measured[i] ?? -128), now)),
            style: inst.settings.style ?? "digital",
        });
    }
}

/** Stereo strips: aux, FX returns, main LR, and linked channel or bus pairs. */
function isStereo(ref: StripRef): boolean {
    if (ref.kind === "aux" || ref.kind === "fxrtn" || ref.kind === "lr") return true;
    return (ref.kind === "ch" || ref.kind === "bus") && !!mixerConnection.strip(ref)?.linked;
}

function defaultName(ref: StripRef): string {
    const n = String(ref.n);
    return { ch: `Ch ${n}`, aux: "Aux", fxrtn: `FX ${n}`, bus: `Bus ${n}`, fxsend: `FX Send ${n}`, lr: "Main LR", dca: `DCA ${n}` }[ref.kind];
}
