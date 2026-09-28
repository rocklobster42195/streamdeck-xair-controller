// The README's GIF: XR-C on a Stream Deck + (drawn housing, the real plugin, the xair-client
// emulator with synthetic music, invented names). Plays nothing anywhere.
//   node tools/sd-sim/showcase.mjs        → docs/screenshots/xr-c.gif
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { deviceFrame } from "@rocklobster42195/streamdeck-kit";
import { XAirEmulator } from "xair-client/emulator";
import { startSim } from "./sim.mjs";

const require = createRequire(path.resolve("plugin/package.json"));
const sharp = require("sharp");
const GIFEncoder = createRequire(path.resolve("package.json"))("gif-encoder-2");
const OUT = path.resolve("docs/screenshots");
const TMP = path.resolve("sim-out/showcase");
fs.mkdirSync(OUT, { recursive: true });

// ---- signal: kick at 120 BPM, a slow swell, noise; peaks around -12 dBFS ----
let seed = 3;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const music = (t, o = 0, gain = 0) => 20 * Math.log10(Math.max(1e-4, 0.05 + 0.55 * Math.exp(-((t / 500 + o) % 1) * 9) + 0.25 * (0.5 + 0.5 * Math.sin(t / 1100 + o)) + 0.08 * rnd())) - 11 + gain;

/** A mixer with invented names; `quiet` lists meter positions that stay silent. */
function mixer(values, quiet = []) {
    return new XAirEmulator({
        model: "XR12",
        name: "XR12-HOME",
        values,
        meters: (bank, t) => Array.from({ length: bank === 1 ? 40 : 16 }, (_, i) => (quiet.includes(i) ? -128 : music(t, i * 0.37, i === 36 || i === 37 ? 4 : 0))),
    });
}

// ---- the Stream Deck + housing around the simulator's deck picture (kit: deviceFrame) ----
async function framed(deckPng) {
    const deck = await sharp(deckPng).metadata();
    const frame = deviceFrame({ screenWidth: deck.width, screenHeight: deck.height, knobs: 4 });
    return sharp(Buffer.from(frame.svg)).composite([{ input: deckPng, top: frame.screenY, left: frame.screenX }]).png().toBuffer();
}

async function scene(name, values, quiet, build, after) {
    const emu = mixer(values, quiet);
    const port = await emu.start();
    const sim = await startSim({ language: "en", globalSettings: { mixerHost: `127.0.0.1:${port}` } });
    const ctx = build(sim);
    await sim.sleep(3500);
    const result = after ? await after(sim, ctx, emu) : undefined;
    if (!result) {
        const png = await framed(fs.readFileSync(await sim.snapshot(TMP, name)));
        fs.writeFileSync(path.join(OUT, `${name}.png`), png);
        console.log("wrote", path.join(OUT, `${name}.png`));
    }
    await sim.stop();
    emu.stop();
}

const dial = (sim, s, column) => sim.add(s.send ? "send-dial" : "fader-dial", s, { column, controller: "Encoder" });
const key = (sim, a, s, column, row) => sim.add(a, s, { column, row });

// ---- the living room: the mixer as the home's audio desk ----
const living = {
    "/ch/01/config/name": ["Sonos"], "/ch/01/config/color": [4], "/config/chlink/1-2": [1],
    "/ch/03/config/name": ["TV"], "/ch/03/config/color": [6], "/config/chlink/3-4": [1],
    "/ch/05/config/name": ["Turntable"], "/ch/05/config/color": [3], "/config/chlink/5-6": [1],
    "/ch/07/config/name": ["Mic"], "/ch/07/config/color": [5], "/ch/07/mix/on": [0],
    "/ch/08/config/name": ["Guest"], "/ch/08/config/color": [2],
    "/bus/1/config/name": ["Kitchen"], "/fxsend/1/config/name": ["Reverb"],
    "/ch/07/mix/07/level": [0.45], "/ch/07/mix/07/tap": [4], "/ch/01/mix/01/level": [0.62], "/ch/01/mix/01/tap": [4],
    "/lr/mix/fader": [0.7], "/ch/01/mix/fader": [0.7], "/ch/03/mix/fader": [0.62],
    "/-snap/index": [1], "/-snap/01/name": ["Evening"], "/-snap/02/name": ["Party"], "/-snap/03/name": ["Movie"],
};
// ---- the README's eye-catcher: the living room, animated (meters, a fader move, a mute) ----
await scene("xr-c", living, [4, 5], (sim) => {
    dial(sim, { strip: "lr:1" }, 0);
    dial(sim, { strip: "ch:1", style: "classic" }, 1);
    dial(sim, { strip: "ch:3", style: "ring" }, 2);
    dial(sim, { strip: "ch:8" }, 3);
    return {
        tv: key(sim, "channel-key", { strip: "ch:3" }, 1, 0),
        keys: [key(sim, "channel-key", { strip: "ch:1" }, 0, 0), key(sim, "channel-key", { strip: "ch:5" }, 2, 0), key(sim, "channel-key", { strip: "ch:7" }, 3, 0), key(sim, "snapshot-key", { snapshot: "1" }, 0, 1), key(sim, "snapshot-key", { snapshot: "2" }, 1, 1), key(sim, "channel-key", { strip: "ch:1", look: "meter" }, 2, 1), key(sim, "channel-key", { strip: "lr:1", look: "meter" }, 3, 1)],
    };
}, async (sim, ctx, emu) => {
    const frames = [];
    const start = Date.now();
    let step = 0;
    while (Date.now() - start < 6500) {
        const t = Date.now() - start;
        // Someone rides the Guest fader up, then mutes the TV and unmutes it
        if (t > 1500 && t < 3500) emu.change("/ch/08/mix/fader", [0.2 + ((t - 1500) / 2000) * 0.55]);
        if (step === 0 && t > 3800) {
            step = 1;
            sim.press(ctx.tv);
        }
        if (step === 1 && t > 5600) {
            step = 2;
            sim.press(ctx.tv);
        }
        const file = await sim.snapshot(TMP, `gif-${String(frames.length).padStart(3, "0")}`);
        frames.push({ png: await framed(fs.readFileSync(file)), at: Date.now() - start });
    }
    const meta = await sharp(frames[0].png).metadata();
    const width = 760;
    const height = Math.round((meta.height * width) / meta.width);
    const enc = new GIFEncoder(width, height, "neuquant", true);
    enc.setRepeat(0);
    enc.setQuality(10);
    enc.start();
    for (let i = 0; i < frames.length; i++) {
        enc.setDelay(Math.max(40, (frames[i + 1]?.at ?? frames[i].at + 100) - frames[i].at));
        const { data } = await sharp(frames[i].png).resize(width, height).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        enc.addFrame(data);
    }
    enc.finish();
    fs.writeFileSync(path.join(OUT, "xr-c.gif"), enc.out.getData());
    console.log("wrote", path.join(OUT, "xr-c.gif"), `${frames.length} frames`);
    return true;
});
process.exit(0);
