// Fader dials against the xair-client emulator (a fake XR12 on localhost, invented names, synthetic
// music on the meters). Writes deck snapshots to <outDir>/meters/. Touches no real mixer.
//   node tools/sd-sim/meters.mjs [outDir]
import path from "node:path";
import { XAirEmulator } from "xair-client/emulator";
import { startSim } from "./sim.mjs";

const out = path.resolve(process.argv[2] ?? "sim-out", "meters");

// Kick at 120 BPM, a slow swell, some noise; peaks around -12 dBFS (home levels)
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const music = (t, offset = 0) => {
    const kick = Math.exp(-((t / 500 + offset) % 1) * 9);
    const swell = 0.5 + 0.5 * Math.sin(t / 1100 + offset);
    return 20 * Math.log10(Math.max(1e-4, 0.05 + 0.55 * kick + 0.25 * swell + 0.08 * rnd())) - 11;
};

const emu = new XAirEmulator({
    model: "XR12",
    name: "XR12-SIM-00-01",
    values: {
        "/ch/01/config/name": ["Vocals"],
        "/ch/01/config/color": [5],
        "/ch/03/config/name": ["Sonos"],
        "/ch/03/config/color": [3],
        "/config/chlink/3-4": [1],
        "/ch/01/mix/fader": [0.6625], // -3.5 dB
        "/lr/mix/fader": [0.75],
    },
    // Bank 1: every strip gets music, the linked pair and main LR slightly apart per side
    meters: (bank, t) => Array.from({ length: bank === 1 ? 40 : 16 }, (_, i) => music(t, i * 0.013)),
});
const port = await emu.start();

const sim = await startSim({ language: "de", globalSettings: { mixerHost: `127.0.0.1:${port}` } });
const dial = (settings, column) => sim.add("fader-dial", settings, { column, controller: "Encoder" });

const sonos = dial({ strip: "ch:3" }, 0);
const vocals = dial({ strip: "ch:1" }, 1);
dial({ strip: "ch:3", style: "classic" }, 2);
dial({ strip: "ch:1", style: "classic" }, 3);

await sim.sleep(4000);
console.log("wrote", await sim.snapshot(out, "01-digital-classic"));

// Someone moves the Vocals fader on the desk, then mutes it
emu.change("/ch/01/mix/fader", [0.5]);
emu.change("/ch/01/mix/on", [0]);
await sim.sleep(1200);
console.log("wrote", await sim.snapshot(out, "02-desk-change-muted"));

// Operating the dials: turn Sonos down 3 steps (1 dB each), push Vocals to unmute, tap Sonos for 0 dB
sim.rotate(sonos, -3);
await sim.sleep(300);
const afterTurn = emu.values.get("/ch/03/mix/fader")?.[0];
sim.dialPress(vocals);
await sim.sleep(300);
const vocalsOn = emu.values.get("/ch/01/mix/on")?.[0];
sim.touch(sonos);
await sim.sleep(300);
const afterTap = emu.values.get("/ch/03/mix/fader")?.[0];
console.log(`turned: ${afterTurn?.toFixed(4)} (-3 dB ≈ 0.6750) · vocals on: ${vocalsOn} · after tap: ${afterTap?.toFixed(4)} (0 dB = ~0.75)`);

await sim.stop();
emu.stop();
process.exit(0);
