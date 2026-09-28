// Send dials, Mute Group and Snapshot keys against the xair-client emulator (invented names).
// Arms a snapshot key, then loads it with a second press. Writes to <outDir>/scenes/.
//   node tools/sd-sim/scenes.mjs [outDir]
import path from "node:path";
import { XAirEmulator } from "xair-client/emulator";
import { startSim } from "./sim.mjs";

const out = path.resolve(process.argv[2] ?? "sim-out", "scenes");
let seed = 5;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const music = (t, o = 0) => 20 * Math.log10(Math.max(1e-4, 0.05 + 0.55 * Math.exp(-((t / 500 + o) % 1) * 9) + 0.25 * (0.5 + 0.5 * Math.sin(t / 1100 + o)) + 0.08 * rnd())) - 11;

const emu = new XAirEmulator({
    model: "XR12",
    values: {
        "/ch/01/config/name": ["Vocals"], "/ch/01/config/color": [5],
        "/ch/02/config/name": ["Guitar"], "/ch/03/config/name": ["Keys"],
        "/bus/1/config/name": ["Monitor"], "/fxsend/1/config/name": ["Reverb"],
        "/ch/01/mix/01/level": [0.6], "/ch/01/mix/01/tap": [3], "/ch/01/mix/07/level": [0.45], "/ch/01/mix/07/tap": [4],
        "/ch/02/grp/mute": [0b01], "/ch/03/grp/mute": [0b01], "/config/mute/1": [1],
        "/-snap/index": [1], "/-snap/01/name": ["Evening"], "/-snap/02/name": ["Party"], "/-snap/03/name": ["Movie night"],
    },
    meters: (bank, t) => Array.from({ length: bank === 1 ? 40 : 16 }, (_, i) => music(t, i * 0.013)),
});
const port = await emu.start();
const sim = await startSim({ language: "de", globalSettings: { mixerHost: `127.0.0.1:${port}` } });

sim.add("send-dial", { strip: "ch:1", target: "bus:1" }, { column: 0, controller: "Encoder" });
sim.add("send-dial", { strip: "ch:1", target: "fx:1", style: "ring" }, { column: 1, controller: "Encoder" });
sim.add("mute-group-key", { group: "1" }, { column: 0, row: 0 });
sim.add("mute-group-key", { group: "2", title: "Band" }, { column: 1, row: 0 });
sim.add("snapshot-key", { snapshot: "1" }, { column: 0, row: 1 });
const party = sim.add("snapshot-key", { snapshot: "2" }, { column: 1, row: 1 });
sim.add("snapshot-key", { snapshot: "3" }, { column: 2, row: 1 });

await sim.sleep(3500);
sim.press(party);
await sim.sleep(250);
console.log("wrote", await sim.snapshot(out, "01-armed"));
sim.press(party);
await sim.sleep(500);
console.log(`snapshot loaded: /-snap/index = ${emu.values.get("/-snap/index")?.[0]}`);
console.log("wrote", await sim.snapshot(out, "02-loaded"));

await sim.stop();
emu.stop();
process.exit(0);
