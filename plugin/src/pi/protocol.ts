// XR-C's messages between the plugin and its property inspectors (shared by both sides). The kit
// handles "pi-ready", "options" and "options-result" itself.
import type { XAirInfo } from "xair-client";

export type StripKindLabel = "ch" | "aux" | "fxrtn" | "bus" | "fxsend" | "lr" | "dca";

export type ConnectionStatus = {
    state: "unconfigured" | "connecting" | "online" | "offline";
    host?: string;
    name?: string;
    model?: string;
    firmware?: string;
};

/** PI → plugin */
export type PiRequest = { event: "reconnect" } | { event: "discover"; requestId: number };

/** Plugin → PI */
export type PiPush = { event: "status"; status: ConnectionStatus } | { event: "discover-result"; requestId: number; mixers: XAirInfo[] };
