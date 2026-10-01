// XR-C's Panorama: effect backgrounds behind the dials, shared over deckbus with the dials of other
// plugins next to them (grill 2026-10-01 in the kit's notes: the plugin with the leftmost dial
// runs the effect, the others draw the slices they get). A dial's "background" setting: unset or
// "auto" takes the effect of the dial next to it (left first, then right; MA-C's, HA-C's or
// another XR-C dial's), "none" shows none, an effect id shows that effect.
import { neighbours, type BusAction } from "@rocklobster42195/streamdeck-kit/bus";
import { PanoramaEngine, SharedPanorama, listEffects } from "@rocklobster42195/streamdeck-kit";
import { xacActions, xacBus } from "../bus/xac-bus";

/** The plugin's one Panorama; shares with other plugins once the bus runs (local until then). */
export const panorama = new SharedPanorama(new PanoramaEngine({ defaultColor: "#6cc4ff" }), xacActions);
panorama.connect(xacBus);

/** Called when other plugins' dials (and their effects) change, so "auto" dials can follow. */
export function onNeighboursChange(fn: () => void): () => void {
    return xacBus.onPeers(() => fn());
}

export const BACKGROUND_AUTO = "auto";
export const BACKGROUND_NONE = "none";

/** Where an XR-C dial sits and what its "background" setting says. */
export type DialSpot = { context: string; device: string; column: number; background: string | undefined };

/**
 * The effect each XR-C dial shows (undefined: none). "Auto" dials take a neighbour's: other
 * plugins' dials from the bus, and XR-C's own dials once they have one (so a row of XR-C faders
 * next to an MA-C dial all join its Panorama).
 */
export function resolveBackgrounds(dials: DialSpot[]): Map<string, string | undefined> {
    const out = new Map<string, string | undefined>();
    for (const d of dials) {
        const bg = d.background?.trim();
        if (bg && bg !== BACKGROUND_AUTO) out.set(d.context, bg === BACKGROUND_NONE ? undefined : bg);
    }
    const peers = xacBus.peers();
    const auto = dials.filter((d) => !out.has(d.context)).sort((a, b) => a.column - b.column);
    // Spreads along a row: repeat while a dial picks up its neighbour's effect
    for (let changed = true; changed; ) {
        changed = false;
        for (const d of auto) {
            if (out.get(d.context) !== undefined) continue;
            const at: Pick<BusAction, "device" | "column" | "row" | "controller"> = { device: d.device, column: d.column, row: 0, controller: "Encoder" };
            const fromPeers = neighbours(peers, at).filter((n) => typeof n.action.effect === "string" && n.action.effect);
            const own = dials.filter((o) => o !== d && o.device === d.device && Math.abs(o.column - d.column) === 1 && out.get(o.context));
            const left = fromPeers.find((n) => n.side === "left")?.action.effect ?? own.find((o) => o.column < d.column && out.get(o.context));
            const right = fromPeers.find((n) => n.side === "right")?.action.effect ?? own.find((o) => o.column > d.column && out.get(o.context));
            const pick = (x: unknown) => (typeof x === "string" ? x : x ? out.get((x as DialSpot).context) : undefined);
            const effect = pick(left) ?? pick(right);
            if (effect) {
                out.set(d.context, effect);
                changed = true;
            }
        }
    }
    for (const d of auto) if (!out.has(d.context)) out.set(d.context, undefined);
    return out;
}

/** The choices for the PI: like the neighbour, none, then every effect. */
export function backgroundOptions(t: (key: string) => string): { value: string; label: string }[] {
    return [{ value: BACKGROUND_AUTO, label: t("pi.background_auto") }, { value: BACKGROUND_NONE, label: t("pi.background_none") }, ...listEffects().map((e) => ({ value: e.id, label: e.displayName }))];
}
