import type { StripRef } from "xair-client";

/** Main LR first (it's what most people reach for), then everything in the mixer's order. */
export function mainFirst(refs: StripRef[]): StripRef[] {
    return [...refs.filter((r) => r.kind === "lr"), ...refs.filter((r) => r.kind !== "lr")];
}
