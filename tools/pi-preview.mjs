// Preview the property inspectors in a normal browser, without Stream Deck.
// Serves plugin/*.sdPlugin/ui and fakes both the Stream Deck socket and the plugin's messages.
//
//   node tools/pi-preview.mjs   → http://localhost:5299/fader-dial.html?scenario=online&lang=de
//   scenarios: online · setup · offline        lang: en · de        ?click=<css selector>
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(path.resolve("plugin/package.json"));
const { WebSocketServer } = require("ws");

const HTTP_PORT = Number(process.env.PORT ?? 5299);
const WS_PORT = HTTP_PORT + 1;
const UUID = "de.boriskemper.xair-controller";
const UI = path.resolve(`plugin/${UUID}.sdPlugin/ui`);

// Invented mixer and channel names (screenshots go public)
const strips = [
    { value: "ch:1", label: "Vocals", sub: "Channel 1" },
    { value: "ch:2", label: "Guitar", sub: "Channel 2" },
    { value: "ch:3", label: "Sonos", sub: "Channel 3 · stereo" },
    { value: "ch:5", label: "Keys", sub: "Channel 5 · stereo" },
    { value: "aux:1", label: "Aux in", sub: "Aux in" },
    { value: "fxrtn:1", label: "Reverb", sub: "FX return 1" },
    { value: "bus:1", label: "Monitor", sub: "Bus 1" },
    { value: "lr:1", label: "Main LR", sub: "Main LR" },
];
const mixer = { ip: "192.168.1.50", name: "XR12-DEMO-01", model: "XR12", firmware: "1.18" };

const scenarios = {
    online: { global: { mixerHost: mixer.ip }, status: { state: "online", host: mixer.ip, name: mixer.name, model: mixer.model, firmware: mixer.firmware } },
    setup: { global: {}, status: { state: "unconfigured" } },
    offline: { global: { mixerHost: mixer.ip }, status: { state: "offline", host: mixer.ip } },
};

const wss = new WebSocketServer({ port: WS_PORT });
wss.on("connection", (ws) => {
    let scenario = scenarios.online;
    const reply = (msg) => ws.send(JSON.stringify(msg));
    const toPi = (payload) => reply({ event: "sendToPropertyInspector", payload });
    ws.on("message", (raw) => {
        const msg = JSON.parse(String(raw));
        if (msg.uuid) scenario = scenarios[msg.uuid.split(":")[1]] ?? scenarios.online;
        switch (msg.event) {
            case "getGlobalSettings":
                reply({ event: "didReceiveGlobalSettings", payload: { settings: scenario.global } });
                break;
            case "setGlobalSettings":
                scenario = { ...scenario, global: msg.payload };
                break;
            case "sendToPlugin": {
                const p = msg.payload ?? {};
                if (p.event === "pi-ready") toPi({ event: "status", status: scenario.status });
                else if (p.event === "options") toPi({ event: "options-result", requestId: p.requestId, source: p.source, items: scenario.status.state === "online" && p.source === "strips" ? strips : [] });
                else if (p.event === "discover") setTimeout(() => toPi({ event: "discover-result", requestId: p.requestId, mixers: [mixer] }), 600);
                break;
            }
        }
    });
});

const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" };

http.createServer((req, res) => {
    const u = new URL(req.url, `http://localhost:${HTTP_PORT}`);
    const file = path.join(UI, decodeURIComponent(u.pathname === "/" ? "/fader-dial.html" : u.pathname));
    if (!file.startsWith(UI) || !fs.existsSync(file)) {
        res.writeHead(404).end("not found");
        return;
    }
    let body = fs.readFileSync(file);
    if (file.endsWith(".html")) {
        const scenario = u.searchParams.get("scenario") ?? "online";
        const lang = u.searchParams.get("lang") ?? "de";
        const settings = JSON.parse(u.searchParams.get("settings") ?? '{"strip":"ch:1","style":"digital"}');
        const info = { application: { language: lang, platform: "windows", version: "7.6" }, plugin: { uuid: UUID, version: "0.1.0" } };
        const actionInfo = { action: `${UUID}.fader-dial`, context: "ctx", device: "dev", payload: { settings } };
        const boot = `<script>window.addEventListener("load",()=>connectElgatoStreamDeckSocket(${WS_PORT},"pi:${scenario}","registerPropertyInspector",${JSON.stringify(JSON.stringify(info))},${JSON.stringify(JSON.stringify(actionInfo))}));</script><style>body{width:360px}</style>`;
        body = Buffer.from(String(body).replace("</body>", `${boot}</body>`));
    }
    res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" }).end(body);
}).listen(HTTP_PORT, () => console.log(`PI preview: http://localhost:${HTTP_PORT}/fader-dial.html?scenario=online&lang=de`));
