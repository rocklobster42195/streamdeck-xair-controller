import type { StripRef } from "xair-client";
import { mixerConnection } from "./connection";

/** Main LR first (it's what most people reach for), then everything in the mixer's order. */
export function mainFirst(refs: StripRef[]): StripRef[] {
    return [...refs.filter((r) => r.kind === "lr"), ...refs.filter((r) => r.kind !== "lr")];
}

/** The second half of a linked stereo pair (ch 6 of 5/6): on the console it is one channel with the first. */
export function isRightHalf(ref: StripRef): boolean {
    return (ref.kind === "ch" || ref.kind === "bus") && ref.n % 2 === 0 && !!mixerConnection.strip({ kind: ref.kind, n: ref.n - 1 })?.linked;
}
