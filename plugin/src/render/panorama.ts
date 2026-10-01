// XR-C's Panorama: effect backgrounds behind the dials, shared over deckbus with the dials of other
// plugins next to them (grill 2026-10-01 in the kit's notes: the plugin with the leftmost dial
// runs the effect, the others draw the slices they get). A dial's "background" setting: unset or
// "auto" takes the effect of the dial next to it (left first, then right; MA-C's, HA-C's or
// another XR-C dial's), "none" shows none, an effect id shows that effect.
import { PanoramaEngine, resolveBackgrounds, SharedPanorama, type BackgroundDial } from "@rocklobster42195/streamdeck-kit";
import { xacActions, xacBus } from "../bus/xac-bus";

/** The plugin's one Panorama; shares with other plugins once the bus runs (local until then). */
export const panorama = new SharedPanorama(new PanoramaEngine({ defaultColor: "#6cc4ff" }), xacActions);
panorama.connect(xacBus);

/** Called when other plugins' dials (and their effects) change, so "auto" dials can follow. */
export function onNeighboursChange(fn: () => void): () => void {
    return xacBus.onPeers(() => fn());
}

/** Every dial's effect from its "background" setting and its neighbours (the kit's rule, see resolveBackgrounds). */
export function resolveDialBackgrounds(dials: BackgroundDial[]): Map<string, string | undefined> {
    return resolveBackgrounds(dials, xacBus.peers());
}
