// XR-C on deckbus against the xair-client emulator: offers the meters of a fake XR12 for the given
// time, so another plugin (MA-C's Panorama) or the kit's bus monitor can subscribe. Touches no real mixer.
//   node tools/sd-sim/bus.mjs [seconds]      (0 = until Ctrl+C)
import { XAirEmulator } from "xair-client/emulator";
import { startSim } from "./sim.mjs";

const seconds = Number(process.argv[2] ?? 30);

// Kick at 120 BPM with a slow swell, like the meters scenario
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const music = (t, offset = 0) => {
    const kick = Math.exp(-((t / 500 + offset) % 1) * 9);
    const swell = 0.5 - 0.5 * Math.cos(t / 1300 + offset);
    return 20 * Math.log10(Math.max(1e-4, (0.04 + 0.6 * kick + 0.08 * rnd()) * (0.15 + 0.85 * swell))) - 8;
};

const emu = new XAirEmulator({
    model: "XR12",
    name: "XR12-SIM-00-01",
    values: {
        "/ch/01/config/name": ["Vocals"],
        "/ch/03/config/name": ["Sonos"],
        "/config/chlink/3-4": [1],
    },
    meters: (bank, t) => Array.from({ length: bank === 1 ? 40 : 16 }, (_, i) => music(t, i * 0.013)),
});
const port = await emu.start();
const sim = await startSim({ language: "en", globalSettings: { mixerHost: `127.0.0.1:${port}` } });
sim.add("fader-dial", { strip: "ch:3" }, { column: 0, controller: "Encoder" });
console.log(`XR-C on deckbus with a fake XR12 on port ${port}`);

const stop = async () => {
    await sim.stop();
    await emu.stop();
    process.exit(0);
};
process.on("SIGINT", stop);
if (seconds > 0) setTimeout(stop, seconds * 1000);
