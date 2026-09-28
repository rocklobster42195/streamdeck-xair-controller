import { action, type WillDisappearEvent } from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/utils";
import { frames } from "@rocklobster42195/streamdeck-kit";
import { mixerConnection } from "../mixer/connection";
import { renderSnapshotKey } from "../render/scene-keys";
import { MixerKey, type KeyInstance } from "./mixer-key";

type SnapshotSettings = {
    /** Snapshot 1–64. */
    snapshot?: number | string;
    /** "arm" (default): a press arms, a second press within 2 s loads · "immediate" · "hold": a long press loads. */
    mode?: "arm" | "immediate" | "hold";
} & JsonObject;

const ARM_MS = 2000;

/**
 * Loads a snapshot (the whole mix changes, so by default it asks for a second press). Shows the
 * number and the mixer's name for it; the snapshot loaded last is highlighted.
 */
@action({ UUID: "de.boriskemper.xair-controller.snapshot-key" })
export class SnapshotKey extends MixerKey<SnapshotSettings> {
    private readonly armedAt = new Map<string, number>();

    override onWillDisappear(ev: WillDisappearEvent<SnapshotSettings>): void {
        this.disarm(ev.action.id);
        super.onWillDisappear(ev);
    }

    protected override image(inst: KeyInstance<SnapshotSettings>): string | undefined {
        const scenes = mixerConnection.scenes;
        if (!scenes) return undefined;
        const n = Number(inst.settings.snapshot ?? 1);
        const at = this.armedAt.get(inst.id);
        // Pulses twice a second while armed
        const armed = at === undefined ? undefined : 0.5 + 0.5 * Math.cos(((Date.now() - at) / 500) * Math.PI * 2);
        return renderSnapshotKey({ n, name: scenes.snapshotName(n), current: scenes.currentSnapshot() === n, armed });
    }

    protected override pressed(inst: KeyInstance<SnapshotSettings>, hold: boolean): void {
        const mode = inst.settings.mode ?? "arm";
        const n = Number(inst.settings.snapshot ?? 1);
        if (mode === "immediate" || (mode === "hold" && hold) || (mode === "arm" && this.armedAt.has(inst.id))) {
            this.disarm(inst.id);
            mixerConnection.scenes?.loadSnapshot(n);
            void inst.action.showOk();
            return;
        }
        if (mode === "arm") this.arm(inst.id);
    }

    private arm(id: string): void {
        const at = Date.now();
        this.armedAt.set(id, at);
        frames.run(`snapshot-${id}`, () => {
            if (this.armedAt.get(id) !== at) return false;
            if (Date.now() - at > ARM_MS) {
                this.armedAt.delete(id);
                this.render(id);
                return false;
            }
            this.render(id);
            return true;
        });
    }

    private disarm(id: string): void {
        this.armedAt.delete(id);
        frames.stop(`snapshot-${id}`);
        this.render(id);
    }
}
