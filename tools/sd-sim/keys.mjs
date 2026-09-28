// Channel keys against the xair-client emulator (invented names, synthetic music): every look and
// mute state, then a press (mute) and a hold (reset). Writes to <outDir>/keys/. No real mixer.
//   node tools/sd-sim/keys.mjs [outDir]
import path from "node:path";
import { XAirEmulator } from "xair-client/emulator";
import { startSim } from "./sim.mjs";

const out = path.resolve(process.argv[2] ?? "sim-out", "keys");
let seed = 11;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const music = (t, o = 0) => 20 * Math.log10(Math.max(1e-4, 0.05 + 0.55 * Math.exp(-((t / 500 + o) % 1) * 9) + 0.25 * (0.5 + 0.5 * Math.sin(t / 1100 + o)) + 0.08 * rnd())) - 11;

const emu = new XAirEmulator({
    model: "XR12",
    values: {
        "/ch/01/config/name": ["Vocals"], "/ch/01/config/color": [5],
        "/ch/02/config/name": ["Guitar"], "/ch/02/config/color": [1], "/ch/02/mix/on": [0],
        "/ch/03/config/name": ["Sonos"], "/ch/03/config/color": [3], "/config/chlink/3-4": [1],
        "/ch/05/config/name": ["Keys"], "/ch/05/config/color": [12],
        "/ch/06/config/name": ["Drums"], "/ch/06/config/color": [2], "/ch/06/grp/mute": [1], "/config/mute/1": [1],
        "/ch/07/config/name": ["Talkback"], "/ch/07/config/color": [0],
        "/ch/01/mix/fader": [0.6625],
    },
    // Loud enough on channel 3 to hit the clip indicator now and then
    meters: (bank, t) => Array.from({ length: bank === 1 ? 40 : 16 }, (_, i) => music(t, i * 0.013) + (i === 2 || i === 3 ? 12.5 : 0)),
});
const port = await emu.start();
const sim = await startSim({ language: "de", globalSettings: { mixerHost: `127.0.0.1:${port}` } });
const key = (settings, column, row) => sim.add("channel-key", settings, { column, row });

const vocals = key({ strip: "ch:1" }, 0, 0);
key({ strip: "ch:2" }, 1, 0); // red channel, muted: hatching
key({ strip: "ch:3", thinMeter: true }, 2, 0);
key({ strip: "ch:5" }, 3, 0); // inverted blue
key({ strip: "ch:6" }, 0, 1); // muted by mute group 1
key({ strip: "ch:7" }, 1, 1); // colour off
const sonosMeter = key({ strip: "ch:3", look: "meter" }, 2, 1); // stereo, clips
key({ strip: "ch:1", look: "meter" }, 3, 1); // mono

await sim.sleep(4000);
console.log("wrote", await sim.snapshot(out, "01-looks"));

// Press Vocals (mute), hold the Sonos meter key (reset clip)
sim.press(vocals);
await sim.sleep(400);
console.log(`vocals muted on the mixer: ${emu.values.get("/ch/01/mix/on")?.[0] === 0}`);
console.log("wrote", await sim.snapshot(out, "02-vocals-muted"));
void sonosMeter;

await sim.stop();
emu.stop();
process.exit(0);
