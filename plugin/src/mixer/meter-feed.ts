// A strip's live meter for one key or dial: subscribes to the mixer's meter bank while wanted,
// follows reconnects (a new XAirMixer), and turns the raw values into what to draw (digital
// ballistics with peak hold and clip, VU needles).
import { MeterBallistics, VuBallistics, dbfsToVu } from "@rocklobster42195/streamdeck-kit";
import { meterIndices, type StripRef } from "xair-client";
import { mixerConnection } from "./connection";

/** At or above this a sample counts as clipping (dBFS). */
const CLIP_DB = -0.5;

export type MeterFrame = { levels: number[]; peaks: number[]; vus: number[]; clipped: boolean };

export class MeterFeed {
    private unsubscribe: (() => void) | undefined;
    private subscribedTo: unknown;
    private ref: StripRef | undefined;
    private measured: number[] = [];
    private meters: MeterBallistics[] = [];
    private needles: VuBallistics[] = [];
    /** Latched until reset(), like the clip LED on a console. */
    private clip = false;

    /** Stereo strips: aux, FX returns, main LR, and linked channel or bus pairs. */
    static isStereo(ref: StripRef): boolean {
        if (ref.kind === "aux" || ref.kind === "fxrtn" || ref.kind === "lr") return true;
        return (ref.kind === "ch" || ref.kind === "bus") && !!mixerConnection.strip(ref)?.linked;
    }

    /** Subscribe when `ref` has a meter and `wanted` (e.g. the display shows one), else unsubscribe. Safe to call often. */
    update(ref: StripRef | undefined, wanted: boolean): void {
        const mixer = mixerConnection.current;
        const ok = wanted && !!mixer && !!ref && mixerConnection.state === "online" && meterIndices(ref).length > 0;
        if (this.unsubscribe && ok && this.subscribedTo === mixer && sameRef(this.ref, ref)) return;
        this.stop();
        if (!ok || !mixer || !ref) return;
        this.ref = ref;
        this.subscribedTo = mixer;
        this.unsubscribe = mixer.subscribeMeters(1, (bank) => {
            this.measured = meterIndices(ref, MeterFeed.isStereo(ref)).map((i) => bank[i] ?? -128);
            if (this.measured.some((db) => db >= CLIP_DB)) this.clip = true;
        });
    }

    get active(): boolean {
        return !!this.unsubscribe;
    }

    stop(): void {
        this.unsubscribe?.();
        this.unsubscribe = undefined;
        this.measured = [];
    }

    /** Clear peak hold and the clip indicator (a long press on the key). */
    reset(): void {
        this.clip = false;
        this.meters = [];
    }

    /** What to draw now for `channels` channels (1 = mono, 2 = stereo). */
    frame(channels: number, now = Date.now()): MeterFrame {
        while (this.meters.length < channels) this.meters.push(new MeterBallistics());
        while (this.needles.length < channels) this.needles.push(new VuBallistics());
        const states = Array.from({ length: channels }, (_, i) => this.meters[i].update(this.measured[i] ?? -128, now));
        return {
            levels: states.map((s) => s.level),
            peaks: states.map((s) => s.peak),
            vus: Array.from({ length: channels }, (_, i) => this.needles[i].update(dbfsToVu(this.measured[i] ?? -128), now)),
            clipped: this.clip,
        };
    }
}

const sameRef = (a: StripRef | undefined, b: StripRef | undefined) => a?.kind === b?.kind && a?.n === b?.n;
