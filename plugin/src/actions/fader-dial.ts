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
import { frames } from "@rocklobster42195/streamdeck-kit";
import { parseStripId } from "xair-client";
import { mixerConnection } from "../mixer/connection";
import { MeterFeed } from "../mixer/meter-feed";
import { scribbleColor } from "../render/colors";
import { renderFaderMessage, renderFaderStrip, showsMeter, type FaderStyle } from "../render/fader-strip";
import { stripName } from "../render/strip-name";

type FaderSettings = {
    /** The strip, e.g. "ch:3" (see xair-client stripId). */
    strip?: string;
    style?: FaderStyle;
    /** dB per dial tick. */
    step?: number;
} & JsonObject;

type Instance = { action: DialAction<FaderSettings>; settings: FaderSettings; feed: MeterFeed; lastImage?: string };

/** Lowest level a rotation starts from when the fader is at -∞ (turning up from silence). */
const FLOOR_DB = -60;

/**
 * A mixer strip on a dial. Rotate: level (dB per tick) · Push: mute · Touch: 0 dB (hold: -∞).
 * Digital and Classic show the strip's meter; the mixer is asked for meters only while one shows.
 */
@action({ UUID: "de.boriskemper.xair-controller.fader-dial" })
export class FaderDial extends SingletonAction<FaderSettings> {
    private readonly instances = new Map<string, Instance>();

    constructor() {
        super();
        mixerConnection.onChange(() => {
            for (const id of this.instances.keys()) this.refresh(id);
        });
    }

    override onWillAppear(ev: WillAppearEvent<FaderSettings>): void {
        if (!ev.action.isDial()) return;
        this.instances.set(ev.action.id, { action: ev.action, settings: ev.payload.settings, feed: new MeterFeed() });
        this.refresh(ev.action.id);
    }

    override onWillDisappear(ev: WillDisappearEvent<FaderSettings>): void {
        this.instances.get(ev.action.id)?.feed.stop();
        frames.stop(`fader-${ev.action.id}`);
        this.instances.delete(ev.action.id);
    }

    override onDidReceiveSettings(ev: DidReceiveSettingsEvent<FaderSettings>): void {
        const inst = this.instances.get(ev.action.id);
        if (!inst) return;
        inst.settings = ev.payload.settings;
        this.refresh(ev.action.id);
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

    /** Settings, strip or connection changed: (un)subscribe the meter and redraw. */
    private refresh(id: string): void {
        const inst = this.instances.get(id);
        if (!inst) return;
        inst.feed.update(parseStripId(inst.settings.strip), showsMeter(inst.settings.style ?? "digital"));
        if (inst.feed.active) {
            // Redraw at the shared frame rate while the meter moves
            frames.run(`fader-${id}`, () => {
                if (this.instances.get(id) !== inst || !inst.feed.active) return false;
                this.render(id);
                return true;
            });
        }
        this.render(id);
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
        const meter = inst.feed.frame(MeterFeed.isStereo(ref) ? 2 : 1);
        return renderFaderStrip({
            name: stripName(ref, strip.name),
            color: dialColor(strip.color),
            faderDb: strip.db,
            fader: strip.fader,
            muted: strip.muted,
            levels: meter.levels,
            peaks: meter.peaks,
            vus: meter.vus,
            style: inst.settings.style ?? "digital",
        });
    }
}

/** On the black strip "off" reads as a plain light grey. */
function dialColor(color: Parameters<typeof scribbleColor>[0]): string {
    return color.name === "off" ? "#d0d0d4" : scribbleColor(color);
}

