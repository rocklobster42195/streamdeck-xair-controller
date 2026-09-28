import streamDeck, { action } from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/utils";
import { mixerConnection } from "../mixer/connection";
import { renderMuteGroupKey } from "../render/scene-keys";
import { stripName } from "../render/strip-name";
import { MixerKey, type KeyInstance } from "./mixer-key";

type MuteGroupSettings = {
    /** Mute group 1–4. */
    group?: number | string;
    /** Shown instead of "MG n" (X-Air mute groups have no names). */
    title?: string;
} & JsonObject;

/** Mute group 1–4. Press: switch it. Red while active; the member channels in small type. */
@action({ UUID: "de.boriskemper.xair-controller.mute-group-key" })
export class MuteGroupKey extends MixerKey<MuteGroupSettings> {
    protected override image(inst: KeyInstance<MuteGroupSettings>): string | undefined {
        const scenes = mixerConnection.scenes;
        const group = Number(inst.settings.group ?? 1);
        if (!scenes) return undefined;
        const all = scenes.muteGroupMembers(group);
        // A linked stereo pair is one channel on the console: list only its first half
        const shown = all.filter((c) => !(c % 2 === 0 && all.includes(c - 1) && mixerConnection.strip({ kind: "ch", n: c - 1 })?.linked));
        const members = shown.map((c) => stripName({ kind: "ch", n: c }, mixerConnection.strip({ kind: "ch", n: c })?.name ?? ""));
        return renderMuteGroupKey({ title: inst.settings.title?.trim() || `MG ${group}`, active: scenes.muteGroupActive(group), members, noMembers: streamDeck.i18n.t("key.no_members") });
    }

    protected override pressed(inst: KeyInstance<MuteGroupSettings>): void {
        const scenes = mixerConnection.scenes;
        const group = Number(inst.settings.group ?? 1);
        scenes?.setMuteGroup(group, !scenes.muteGroupActive(group));
    }
}
