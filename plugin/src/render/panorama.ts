// XR-C's Panorama: effect backgrounds behind the dials, shared over deckbus with the dials of other
// plugins next to them (grill 2026-10-01 in the kit's notes: the plugin with the leftmost dial
// runs the effect, the others draw the slices they get). One effect per row of dials, agreed with
// the other plugins (grill 2026-10-02, the kit's panorama/rows.ts): the dials register with
// panoramaRows, the PI's Panorama section chooses the effect and the dials taking part.
import { PanoramaEngine, PanoramaRows, SharedPanorama } from "@rocklobster42195/streamdeck-kit";
import { xacActions, xacBus } from "../bus/xac-bus";

/** The plugin's one Panorama; shares with other plugins once the bus runs (local until then). */
export const panorama = new SharedPanorama(new PanoramaEngine({ defaultColor: "#6cc4ff" }), xacActions);
panorama.connect(xacBus);

/** One effect per row of dials (XR-C's, MA-C's, HA-C's …). */
export const panoramaRows = new PanoramaRows(panorama, { name: "XR-C", actions: xacActions });
panoramaRows.connect(xacBus);
