import { describe, expect, it } from "vitest";
import { stripColor } from "xair-client";
import { renderChannelKey, type ChannelKeyView } from "./channel-key";

const svg = (uri: string) => Buffer.from(uri.split(",")[1], "base64").toString("utf8");
const view = (over: Partial<ChannelKeyView> = {}): ChannelKeyView => ({ name: "Vocals", color: stripColor(5), faderDb: -3.5, look: "scribble", ...over });

describe("channel key", () => {
    it("fills with the scribble colour and picks a readable text colour", () => {
        expect(svg(renderChannelKey(view()))).toContain('fill="#E14190"');
        const yellow = svg(renderChannelKey(view({ color: stripColor(3) })));
        expect(yellow).toContain('fill="#FFDD00"');
        expect(yellow).toContain('fill="#000000"');
    });

    it("keeps inverted colours dark with a coloured frame", () => {
        const s = svg(renderChannelKey(view({ color: stripColor(12) })));
        expect(s).toContain('fill="#101010"');
        expect(s).toContain('stroke="#009FDF"');
    });

    it("muted: red fill with the icon; a red channel also gets hatching; groups get a frame", () => {
        expect(svg(renderChannelKey(view({ muted: "self" })))).toContain('fill="#E30018"');
        expect(svg(renderChannelKey(view({ muted: "self", color: stripColor(1) })))).toContain("clipPath");
        const group = svg(renderChannelKey(view({ muted: "group" })));
        expect(group).toContain('stroke="#E30018"');
        expect(group).toContain(">MG<");
    });

    it("meter look: bars, a clip line and MUTE when muted", () => {
        const s = svg(renderChannelKey(view({ look: "meter", levels: [-10, -12], peaks: [-6, -8], clipped: true, muted: "self" })));
        expect(s).toContain(">MUTE<");
        expect((s.match(/height="3\.\d"/g) ?? []).length).toBeGreaterThan(30);
    });
});
