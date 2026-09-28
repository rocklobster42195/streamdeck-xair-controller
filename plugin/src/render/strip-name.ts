import type { StripRef } from "xair-client";

/** The strip's scribble name, or a default like "Ch 3" when the mixer has none. */
export function stripName(ref: StripRef, name: string): string {
    if (name) return name;
    const n = String(ref.n);
    return { ch: `Ch ${n}`, aux: "Aux", fxrtn: `FX ${n}`, bus: `Bus ${n}`, fxsend: `FX Send ${n}`, lr: "Main LR", dca: `DCA ${n}` }[ref.kind];
}
