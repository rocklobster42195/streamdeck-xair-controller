// Base for XR-C keys without a meter: instances, the not-ready states, press vs. hold, and a
// deduplicated redraw on every mixer change.
import streamDeck, { type DidReceiveSettingsEvent, type KeyAction, type KeyDownEvent, type KeyUpEvent, SingletonAction, type WillAppearEvent, type WillDisappearEvent } from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/utils";
import { mixerConnection } from "../mixer/connection";
import { renderChannelMessage } from "../render/channel-key";

export type KeyInstance<S extends JsonObject> = { id: string; action: KeyAction<S>; settings: S; downAt?: number; lastImage?: string };

/** A press this long counts as "hold". */
export const HOLD_MS = 600;

export abstract class MixerKey<S extends JsonObject> extends SingletonAction<S> {
    protected readonly instances = new Map<string, KeyInstance<S>>();

    constructor() {
        super();
        mixerConnection.onChange(() => {
            for (const id of this.instances.keys()) this.render(id);
        });
    }

    /** The key image while the mixer is online, or undefined for "choose in the settings". */
    protected abstract image(inst: KeyInstance<S>): string | undefined;
    /** A press released before HOLD_MS (`hold` false) or after it (`hold` true). */
    protected abstract pressed(inst: KeyInstance<S>, hold: boolean): void;

    override onWillAppear(ev: WillAppearEvent<S>): void {
        if (!ev.action.isKey()) return;
        this.instances.set(ev.action.id, { id: ev.action.id, action: ev.action, settings: ev.payload.settings });
        this.render(ev.action.id);
    }

    override onWillDisappear(ev: WillDisappearEvent<S>): void {
        this.instances.delete(ev.action.id);
    }

    override onDidReceiveSettings(ev: DidReceiveSettingsEvent<S>): void {
        const inst = this.instances.get(ev.action.id);
        if (!inst) return;
        inst.settings = ev.payload.settings;
        this.render(ev.action.id);
    }

    override onKeyDown(ev: KeyDownEvent<S>): void {
        const inst = this.instances.get(ev.action.id);
        if (inst) inst.downAt = Date.now();
    }

    override onKeyUp(ev: KeyUpEvent<S>): void {
        const inst = this.instances.get(ev.action.id);
        if (!inst) return;
        const hold = Date.now() - (inst.downAt ?? Date.now()) >= HOLD_MS;
        inst.downAt = undefined;
        if (mixerConnection.state !== "online") {
            void ev.action.showAlert();
            return;
        }
        this.pressed(inst, hold);
    }

    protected render(id: string): void {
        const inst = this.instances.get(id);
        if (!inst) return;
        const t = (k: string) => streamDeck.i18n.t(k);
        const image =
            mixerConnection.state === "unconfigured"
                ? renderChannelMessage("setup", t("key.setup"))
                : mixerConnection.state !== "online"
                  ? renderChannelMessage("offline", t("key.offline"))
                  : (this.image(inst) ?? renderChannelMessage("choose", t("key.choose")));
        if (image === inst.lastImage) return;
        inst.lastImage = image;
        void inst.action.setImage(image).catch((e) => streamDeck.logger.warn("[key] setImage failed", e));
    }
}
