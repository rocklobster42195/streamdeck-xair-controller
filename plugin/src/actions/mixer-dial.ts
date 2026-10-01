// Base for XR-C dials: instances, the not-ready states, a strip meter while one is shown, a
// deduplicated redraw at the shared frame rate, and the Panorama effect behind the dial (shared
// with neighbouring dials, also of other plugins). Subclasses say what to show and how to react.
import streamDeck, {
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
import type { StripRef } from "xair-client";
import { mixerConnection } from "../mixer/connection";
import { onNeighboursChange, panorama, resolveBackgrounds } from "../render/panorama";
import { MeterFeed, type MeterFrame } from "../mixer/meter-feed";
import { renderFaderMessage, renderFaderStrip, type FaderView } from "../render/fader-strip";

export type DialInstance<S extends JsonObject> = {
    action: DialAction<S>;
    settings: S;
    feed: MeterFeed;
    lastImage?: string;
    /** Where the dial sits (for the Panorama). */
    device: string;
    column: number;
    /** The effect behind it, if any (resolved from its "background" setting). */
    effect?: string;
};

/** Every XR-C dial (fader and send) with a way to redraw it: the Panorama looks at all of them. */
const allDials = new Map<string, { inst: DialInstance<JsonObject>; redraw: () => void }>();

/** Work out every dial's effect (autos follow their neighbours) and join or leave the Panorama. */
function arrangeBackgrounds(): void {
    const spots = [...allDials].map(([context, d]) => ({ context, device: d.inst.device, column: d.inst.column, background: typeof d.inst.settings.background === "string" ? d.inst.settings.background : undefined }));
    const effects = resolveBackgrounds(spots);
    for (const [context, d] of allDials) {
        const effect = effects.get(context);
        if (effect === d.inst.effect) continue;
        d.inst.effect = effect;
        if (effect) panorama.join(context, d.inst.device, d.inst.column, effect, {}, d.redraw);
        else panorama.leave(context);
        d.redraw();
    }
}
onNeighboursChange(arrangeBackgrounds);

/** What to draw: a strip view, or a message (setup/offline are handled by the base). */
export type DialContent = { view: Omit<FaderView, "levels" | "peaks" | "vus"> } | { choose: true };

export abstract class MixerDial<S extends JsonObject> extends SingletonAction<S> {
    protected readonly instances = new Map<string, DialInstance<S>>();

    constructor(private readonly key: string) {
        super();
        mixerConnection.onChange(() => {
            for (const id of this.instances.keys()) this.refresh(id);
        });
    }

    /** The strip whose meter to show, and whether the display shows one. */
    protected abstract meterOf(settings: S): { ref: StripRef | undefined; wanted: boolean };
    /** What the dial shows while the mixer is online. */
    protected abstract content(inst: DialInstance<S>): DialContent;
    protected abstract rotate(inst: DialInstance<S>, ticks: number): void;
    protected abstract push(inst: DialInstance<S>): void;
    protected abstract touch(inst: DialInstance<S>, hold: boolean): void;

    override onWillAppear(ev: WillAppearEvent<S>): void {
        if (!ev.action.isDial()) return;
        const id = ev.action.id;
        const inst: DialInstance<S> = { action: ev.action, settings: ev.payload.settings, feed: new MeterFeed(), device: ev.action.device.id, column: ev.action.coordinates?.column ?? 0 };
        this.instances.set(id, inst);
        allDials.set(id, { inst: inst as unknown as DialInstance<JsonObject>, redraw: () => this.render(id) });
        arrangeBackgrounds();
        this.refresh(id);
    }

    override onWillDisappear(ev: WillDisappearEvent<S>): void {
        this.instances.get(ev.action.id)?.feed.stop();
        frames.stop(`${this.key}-${ev.action.id}`);
        this.instances.delete(ev.action.id);
        allDials.delete(ev.action.id);
        panorama.leave(ev.action.id);
        arrangeBackgrounds();
    }

    override onDidReceiveSettings(ev: DidReceiveSettingsEvent<S>): void {
        const inst = this.instances.get(ev.action.id);
        if (!inst) return;
        inst.settings = ev.payload.settings;
        arrangeBackgrounds();
        this.refresh(ev.action.id);
    }

    override onDialRotate(ev: DialRotateEvent<S>): void {
        const inst = this.ready(ev.action.id);
        if (inst) this.rotate(inst, ev.payload.ticks);
    }

    override onDialDown(ev: DialDownEvent<S>): void {
        const inst = this.ready(ev.action.id);
        if (inst) this.push(inst);
    }

    override onTouchTap(ev: TouchTapEvent<S>): void {
        const inst = this.ready(ev.action.id);
        if (inst) this.touch(inst, ev.payload.hold);
    }

    /** The instance, if the mixer is online (controls do nothing otherwise). */
    private ready(id: string): DialInstance<S> | undefined {
        return mixerConnection.state === "online" ? this.instances.get(id) : undefined;
    }

    protected refresh(id: string): void {
        const inst = this.instances.get(id);
        if (!inst) return;
        const { ref, wanted } = this.meterOf(inst.settings);
        inst.feed.update(ref, wanted);
        if (inst.feed.active) {
            frames.run(`${this.key}-${id}`, () => {
                if (this.instances.get(id) !== inst || !inst.feed.active) return false;
                this.render(id);
                return true;
            });
        }
        this.render(id);
    }

    protected render(id: string): void {
        const inst = this.instances.get(id);
        if (!inst) return;
        const image = this.image(inst);
        if (image === inst.lastImage) return;
        inst.lastImage = image;
        void inst.action.setFeedback({ "full-canvas": image }).catch((e) => streamDeck.logger.warn(`[${this.key}] setFeedback failed`, e));
    }

    private image(inst: DialInstance<S>): string {
        const t = (k: string) => streamDeck.i18n.t(k);
        if (mixerConnection.state === "unconfigured") return renderFaderMessage("setup", t("key.setup"), t("key.setup_hint"));
        if (mixerConnection.state !== "online") return renderFaderMessage("offline", t("key.offline"), t("key.offline_hint"));
        const c = this.content(inst);
        if ("choose" in c) return renderFaderMessage("choose", t("key.choose"), t("key.choose_hint"));
        const { ref } = this.meterOf(inst.settings);
        const meter: MeterFrame = inst.feed.frame(ref && MeterFeed.isStereo(ref) ? 2 : 1);
        // The Panorama's slice behind the dial (from XR-C's engine, or the plugin that leads the group)
        const background = inst.effect && panorama.isActive(inst.action.id) ? panorama.renderSlice(inst.action.id) : undefined;
        return renderFaderStrip({ ...c.view, levels: meter.levels, peaks: meter.peaks, vus: meter.vus, background });
    }
}
