// Read-only X-Air dump: only argument-less GET queries and /meters subscriptions. Never sends values.
import dgram from "node:dgram";
import fs from "node:fs";

const HOST = process.argv[2] ?? "192.168.7.20";
const OUT = process.argv[3] ?? "xair-dump.json";
const PORT = 10024;

const pad4 = (b) => Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4)]);
const oscStr = (s) => pad4(Buffer.concat([Buffer.from(s), Buffer.alloc(1)]));
function encode(address, strArg) {
    // GET = address + empty type tag ","; the only argument ever sent is a string for /meters
    return strArg === undefined
        ? Buffer.concat([oscStr(address), oscStr(",")])
        : Buffer.concat([oscStr(address), oscStr(",s"), oscStr(strArg)]);
}
function readStr(buf, off) {
    let end = buf.indexOf(0, off);
    const s = buf.toString("utf8", off, end);
    return [s, off + Math.ceil((end - off + 1) / 4) * 4];
}
function decode(buf) {
    let [address, off] = readStr(buf, 0);
    let tags;
    [tags, off] = readStr(buf, off);
    const args = [];
    for (const t of tags.slice(1)) {
        if (t === "i") { args.push(buf.readInt32BE(off)); off += 4; }
        else if (t === "f") { args.push(Number(buf.readFloatBE(off).toFixed(4))); off += 4; }
        else if (t === "s") { let s; [s, off] = readStr(buf, off); args.push(s); }
        else if (t === "b") { const n = buf.readInt32BE(off); args.push({ blob: buf.subarray(off + 4, off + 4 + n) }); off += 4 + Math.ceil(n / 4) * 4; }
        else args.push(`?${t}`);
    }
    return { address, tags, args };
}

const n2 = (i) => String(i).padStart(2, "0");
const paths = ["/xinfo", "/status"];
const strip = (p) => [`${p}/config/name`, `${p}/config/color`, `${p}/config/icon`, `${p}/mix/on`, `${p}/mix/fader`, `${p}/mix/pan`];
for (let c = 1; c <= 18; c++) {
    const p = `/ch/${n2(c)}`;
    paths.push(...strip(p), `${p}/config/insrc`, `${p}/mix/lr`, `${p}/grp/dca`, `${p}/grp/mute`, `${p}/send/01/level`);
    for (let m = 1; m <= 10; m++) paths.push(`${p}/mix/${n2(m)}/level`, `${p}/mix/${n2(m)}/tap`, `${p}/mix/${n2(m)}/grpon`);
    paths.push(`/headamp/${n2(c)}/gain`, `/headamp/${n2(c)}/phantom`);
}
paths.push(...strip("/rtn/aux"), ...strip("/lr"));
for (let i = 1; i <= 4; i++) paths.push(...strip(`/rtn/${i}`), ...strip(`/fxsend/${i}`), `/fx/${i}/type`, `/dca/${i}/on`, `/dca/${i}/fader`, `/dca/${i}/config/name`, `/dca/${i}/config/color`, `/config/mute/${i}`);
for (let i = 1; i <= 6; i++) paths.push(...strip(`/bus/${i}`));
for (const l of ["1-2", "3-4", "5-6", "7-8", "9-10", "11-12", "13-14", "15-16"]) paths.push(`/config/chlink/${l}`);
for (const l of ["1-2", "3-4", "5-6"]) paths.push(`/config/buslink/${l}`);
paths.push("/-snap/index", "/-snap/name", "/-stat/solosw/01", "/-stat/tape/state", "/-stat/tape/file", "/-stat/tape/etime", "/-stat/usbmounted", "/-prefs/name", "/config/solo/source");
for (let s = 1; s <= 64; s++) paths.push(`/-snap/${n2(s)}/name`);

const sock = dgram.createSocket("udp4");
const values = {};
const meters = {};
let meterReq = null;
sock.on("message", (buf) => {
    let m;
    try { m = decode(buf); } catch { return; }
    if (m.address.startsWith("/meters")) {
        const b = m.args[0]?.blob;
        if (!b) return;
        const count = b.readInt32LE(0);
        const vals = [];
        for (let i = 0; i < count && 4 + i * 2 + 1 < b.length; i++) vals.push(Number((b.readInt16LE(4 + i * 2) / 256).toFixed(1)));
        const e = (meters[m.address] ??= { requested: meterReq, bytes: b.length, count, frames: 0, sample: vals });
        e.frames++;
        return;
    }
    values[m.address] = m.tags === "," ? null : m.args.length === 1 ? m.args[0] : m.args;
});

const send = (addr, arg) => new Promise((r) => sock.send(encode(addr, arg), PORT, HOST, () => r()));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

sock.bind(0, async () => {
    for (const p of paths) { await send(p); await sleep(4); }
    await sleep(1500);
    for (let n = 0; n <= 16; n++) { meterReq = `/meters/${n}`; await send("/meters", meterReq); await sleep(700); }
    await sleep(300);
    const missing = paths.filter((p) => !(p in values));
    fs.writeFileSync(OUT, JSON.stringify({ host: HOST, at: new Date().toISOString(), values, meters, missing }, null, 1));
    console.log(`answered ${Object.keys(values).length}/${paths.length}, meter banks ${Object.keys(meters).length}, written ${OUT}`);
    sock.close();
});
