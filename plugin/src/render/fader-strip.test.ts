import { describe, expect, it } from "vitest";
import { stripColor } from "xair-client";
import { ACCENT, scribbleColor } from "./colors";
import { renderFaderStrip, type FaderView } from "./fader-strip";

const svg = (dataUri: string) => Buffer.from(dataUri.split(",")[1], "base64").toString("utf8");
const view = (over: Partial<FaderView> = {}): FaderView => ({ name: "Vocals", color: "#e25bd8", faderDb: -3.5, muted: false, levels: [-20], peaks: [-9], vus: [-2], style: "digital", ...over });

describe("fader strip", () => {
    it("draws one bar for mono and two for stereo (36 segments each)", () => {
        const count = (s: string) => (s.match(/<rect x="[\d.]+" y="[\d.]+" width="4\.\d" height/g) ?? []).length;
        const mono = svg(renderFaderStrip(view()));
        const stereo = svg(renderFaderStrip(view({ levels: [-20, -18], peaks: [-9, -8] })));
        expect(count(stereo)).toBe(2 * count(mono));
    });

    it("shows the fader in dB in the scribble colour, or MUTE", () => {
        expect(svg(renderFaderStrip(view()))).toContain('fill="#e25bd8"');
        expect(svg(renderFaderStrip(view()))).toContain("-3.5 dB");
        expect(svg(renderFaderStrip(view({ muted: true })))).toContain("MUTE");
    });

    it("draws one VU meter for mono and two for stereo in the classic style", () => {
        const faces = (s: string) => (s.match(/-face"/g) ?? []).length;
        expect(faces(svg(renderFaderStrip(view({ style: "classic" }))))).toBe(1);
        expect(faces(svg(renderFaderStrip(view({ style: "classic", vus: [-2, 0] }))))).toBe(2);
    });
});

describe("scribble colours", () => {
    it("uses XR-C's colour for 'off' and the same colour for inverted ones", () => {
        expect(scribbleColor(stripColor(0))).toBe(ACCENT);
        expect(scribbleColor(stripColor(3))).toBe(scribbleColor(stripColor(11)));
    });
});
