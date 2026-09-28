import streamDeck, { action, type DidReceiveSettingsEvent, type KeyAction, type KeyDownEvent, type KeyUpEvent, SingletonAction, type WillAppearEvent, type WillDisappearEvent } from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/utils";
import { frames } from "@rocklobster42195/streamdeck-kit";
import { muteReason, parseStripId } from "xair-client";
import { mixerConnection } from "../mixer/connection";
import { MeterFeed } from "../mixer/meter-feed";
import { renderChannelKey, renderChannelMessage, type ChannelLook } from "../render/channel-key";
import { stripName } from "../render/strip-name";

type ChannelSettings = {
    strip?: string;
    look?: ChannelLook;
    /** Scribble look: a thin meter along the bottom. */
    thinMeter?: boolean;
    /** Show the fader in dB (default on). */
    showDb?: boolean;
} & JsonObject;

type Instance = { action: KeyAction<ChannelSettings>; settings: ChannelSettings; feed: MeterFeed; downAt?: number; lastImage?: string };

/** A press this long resets peak hold and the clip indicator instead of muting. */
const HOLD_MS = 600;

/**
 * One strip on a key. Press: mute · Hold: reset peak and clip. Looks like the scribble strip, or
 * shows the strip's meter (LED bars, mono or stereo).
 */
@action({ UUID: "de.boriskemper.xair-controller.channel-key" })
export class ChannelKey extends SingletonAction<ChannelSettings> {
    private readonly instances = new Map<string, Instance>();

    constructor() {
        super();
        mixerConnection.onChange(() => {
            for (const id of this.instances.keys()) this.refresh(id);
        });
    }

    override onWillAppear(ev: WillAppearEvent<ChannelSettings>): void {
        if (!ev.action.isKey()) return;
        this.instances.set(ev.action.id, { action: ev.action, settings: ev.payload.settings, feed: new MeterFeed() });
        this.refresh(ev.action.id);
    }

    override onWillDisappear(ev: WillDisappearEvent<ChannelSettings>): void {
        this.instances.get(ev.action.id)?.feed.stop();
        frames.stop(`channel-${ev.action.id}`);
        this.instances.delete(ev.action.id);
    }

    override onDidReceiveSettings(ev: DidReceiveSettingsEvent<ChannelSettings>): void {
        const inst = this.instances.get(ev.action.id);
        if (!inst) return;
        inst.settings = ev.payload.settings;
        this.refresh(ev.action.id);
    }

    override onKeyDown(ev: KeyDownEvent<ChannelSettings>): void {
        const inst = this.instances.get(ev.action.id);
        if (inst) inst.downAt = Date.now();
    }

    override onKeyUp(ev: KeyUpEvent<ChannelSettings>): void {
        const inst = this.instances.get(ev.action.id);
        if (!inst) return;
        const held = Date.now() - (inst.downAt ?? Date.now());
        inst.downAt = undefined;
        if (held >= HOLD_MS) {
            inst.feed.reset();
            this.render(ev.action.id);
            return;
        }
        const ref = parseStripId(inst.settings.strip);
        const strips = mixerConnection.strips;
        if (!ref || !strips || mixerConnection.state !== "online") {
            void ev.action.showAlert();
            return;
        }
        strips.setMuted(ref, !strips.strip(ref).muted);
    }

    private refresh(id: string): void {
        const inst = this.instances.get(id);
        if (!inst) return;
        const look = inst.settings.look ?? "scribble";
        inst.feed.update(parseStripId(inst.settings.strip), look === "meter" || !!inst.settings.thinMeter);
        if (inst.feed.active) {
            frames.run(`channel-${id}`, () => {
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
        void inst.action.setImage(image).catch((e) => streamDeck.logger.warn("[channel] setImage failed", e));
    }

    private image(inst: Instance): string {
        const t = (k: string) => streamDeck.i18n.t(k);
        if (mixerConnection.state === "unconfigured") return renderChannelMessage("setup", t("key.setup"));
        if (mixerConnection.state !== "online") return renderChannelMessage("offline", t("key.offline"));
        const ref = parseStripId(inst.settings.strip);
        const strip = ref && mixerConnection.strip(ref);
        const mixer = mixerConnection.current;
        if (!ref || !strip || !mixer) return renderChannelMessage("choose", t("key.choose"));
        const meter = inst.feed.active ? inst.feed.frame(MeterFeed.isStereo(ref) ? 2 : 1) : undefined;
        return renderChannelKey({
            name: stripName(ref, strip.name),
            color: strip.color,
            faderDb: strip.db,
            muted: muteReason(mixer, ref),
            look: inst.settings.look ?? "scribble",
            levels: meter?.levels,
            peaks: meter?.peaks,
            clipped: meter?.clipped,
            showDb: inst.settings.showDb !== false,
        });
    }
}
