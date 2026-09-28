// XR-C's part of the kit's PI bridge: connection status, the strip list for <pi-select>, and the
// mixer search for the connection card.
import { piBridge, type PiPushMessage } from "@rocklobster42195/streamdeck-kit/bridge";
import { discover, stripId, stripRefs } from "xair-client";
import { mixerConnection } from "../mixer/connection";
import type { ConnectionStatus, PiPush, StripKindLabel } from "./protocol";

export function initPiBridge(): void {
    piBridge.init();
    piBridge.handle("reconnect", () => mixerConnection.reconnect());
    piBridge.handle("discover", async (msg) => {
        const mixers = await discover({ timeoutMs: 1500 }).catch(() => []);
        await piBridge.reply(json({ event: "discover-result", requestId: msg.requestId as number, mixers }));
    });
    piBridge.registerOptions("strips", () => {
        const strips = mixerConnection.strips;
        const mixer = mixerConnection.current;
        if (!strips || !mixer) return [];
        return stripRefs(mixer.model).map((ref) => {
            const s = strips.strip(ref);
            const kind: StripKindLabel = ref.kind;
            return { value: stripId(ref), label: s.name || defaultLabel(kind, ref.n), sub: `${kindLabel(kind)}${ref.kind === "aux" || ref.kind === "lr" ? "" : ` ${ref.n}`}${s.linked ? " · stereo" : ""}` };
        });
    });
    piBridge.addPusher(() => [json({ event: "status", status: status() })]);
    mixerConnection.onChange(() => piBridge.schedulePush());
}

function status(): ConnectionStatus {
    const info = mixerConnection.current?.info;
    return { state: mixerConnection.state, host: mixerConnection.current?.transport.host, name: info?.name, model: info?.model, firmware: info?.firmware };
}

const KIND_LABELS: Record<StripKindLabel, string> = { ch: "Channel", aux: "Aux in", fxrtn: "FX return", bus: "Bus", fxsend: "FX send", lr: "Main LR", dca: "DCA" };

function kindLabel(kind: StripKindLabel): string {
    return KIND_LABELS[kind];
}

function defaultLabel(kind: StripKindLabel, n: number): string {
    return kind === "aux" || kind === "lr" ? KIND_LABELS[kind] : `${KIND_LABELS[kind]} ${n}`;
}

function json(msg: PiPush): PiPushMessage {
    return msg as unknown as PiPushMessage;
}
