// XR-C on deckbus (see the kit's docs/deckbus-protocol.md): tells the other plugins whether the
// mixer is online, offers the meters of every strip as streams ("meters/ch:3", with the mixer's
// names), and sends them only while some peer subscribes — the mixer is asked for meters only then.
import streamDeck from "@elgato/streamdeck";
import { DeckBus } from "@rocklobster42195/streamdeck-kit/bus";
import { meterIndices, stripId, stripRefs, type StripRef } from "xair-client";
import { mixerConnection } from "../mixer/connection";
import { MeterFeed } from "../mixer/meter-feed";
import { stripName } from "../render/strip-name";

type Stream = { topic: string; label: string; stereo: boolean; ref: StripRef };

export const xacBus = new DeckBus({ id: "de.boriskemper.xair-controller", name: "XR-C", version: "0.1.0", caps: ["meters"] });

let streams: Stream[] = [];
let lastOffer = "";
let lastStatus = "";
/** Unsubscribe functions of the onSubscribers watchers, per offered topic. */
const watchers = new Map<string, () => void>();
/** Topics with at least one subscriber. */
const wanted = new Set<string>();
let stopMeters: (() => void) | undefined;
let meterMixer: unknown;

export async function startXacBus(): Promise<void> {
    if (!(await xacBus.start())) return;
    streamDeck.logger.info(`[deckbus] XR-C in slot ${xacBus.slot}`);
    mixerConnection.onChange(update);
    update();
}

/** Mixer state, names or links changed: refresh the status and the offered streams. */
function update(): void {
    const mixer = mixerConnection.current;
    const online = mixerConnection.state === "online";
    const status = { online, detail: online ? `${mixer?.info?.model ?? ""} ${mixer?.info?.name ?? ""}`.trim() : mixerConnection.state };
    if (JSON.stringify(status) !== lastStatus) {
        lastStatus = JSON.stringify(status);
        xacBus.setState("status", status);
    }

    streams =
        online && mixer
            ? stripRefs(mixer.model)
                  .filter((ref) => meterIndices(ref).length > 0 && !isRightHalf(ref))
                  .map((ref) => ({ topic: `meters/${stripId(ref)}`, label: stripName(ref, mixerConnection.strip(ref)?.name ?? ""), stereo: MeterFeed.isStereo(ref), ref }))
            : [];
    const offer = JSON.stringify(streams.map(({ topic, label, stereo }) => ({ topic, label, stereo })));
    if (offer !== lastOffer) {
        lastOffer = offer;
        xacBus.setState("streams", JSON.parse(offer));
    }

    // Watch the subscriber count of every offered topic
    for (const [topic, off] of watchers) {
        if (streams.some((s) => s.topic === topic)) continue;
        off();
        watchers.delete(topic);
        wanted.delete(topic);
    }
    for (const s of streams) {
        if (watchers.has(s.topic)) continue;
        watchers.set(
            s.topic,
            xacBus.onSubscribers(s.topic, (count) => {
                if (count > 0) wanted.add(s.topic);
                else wanted.delete(s.topic);
                serveMeters();
            }),
        );
    }
    serveMeters();
}

/** A linked stereo pair is one stream (on its first half, with both sides). */
function isRightHalf(ref: StripRef): boolean {
    return (ref.kind === "ch" || ref.kind === "bus") && ref.n % 2 === 0 && !!mixerConnection.strip({ kind: ref.kind, n: ref.n - 1 })?.linked;
}

/** Ask the mixer for meters while any offered topic has a subscriber (again after a reconnect). */
function serveMeters(): void {
    const mixer = mixerConnection.current;
    const need = wanted.size > 0 && !!mixer && mixerConnection.state === "online";
    if (need && stopMeters && meterMixer === mixer) return;
    stopMeters?.();
    stopMeters = undefined;
    if (!need || !mixer) return;
    meterMixer = mixer;
    stopMeters = mixer.subscribeMeters(1, (bank) => {
        for (const s of streams) {
            if (!wanted.has(s.topic)) continue;
            const [l, r] = meterIndices(s.ref, s.stereo).map((i) => Math.round((bank[i] ?? -128) * 10) / 10);
            xacBus.publish(s.topic, s.stereo ? { l, r: r ?? l } : { l });
        }
    });
}
