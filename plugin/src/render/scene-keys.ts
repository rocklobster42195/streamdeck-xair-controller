// Mute Group and Snapshot keys (144×144).
import { mdi, wrap } from "@rocklobster42195/streamdeck-kit";
import { mdiCameraOutline, mdiVolumeOff } from "@mdi/js";
import { ACCENT } from "./colors";

const SIZE = 144;
const RED = "#E30018";
const ARM = "#FFDD00"; // School Bus Yellow
const font = `font-family="Segoe UI, Arial, sans-serif"`;
const esc = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

/** "MG 2" (or a custom name), red when active, the members in small type. */
export function renderMuteGroupKey(v: { title: string; active: boolean; members: string[]; noMembers: string }): string {
    const bg = v.active ? RED : "#101010";
    const parts = [`<rect width="${SIZE}" height="${SIZE}" rx="14" fill="${bg}"/>`];
    if (!v.active) parts.push(`<rect x="4" y="4" width="${SIZE - 8}" height="${SIZE - 8}" rx="12" fill="none" stroke="${RED}" stroke-width="3" opacity="0.6"/>`);
    parts.push(mdi(mdiVolumeOff, 52, 12, 40, v.active ? "#FFFFFF" : "#ff8a8a"));
    parts.push(`<text x="${SIZE / 2}" y="84" ${font} font-size="26" font-weight="700" fill="#FFFFFF" text-anchor="middle">${esc(wrap(v.title, SIZE - 16, 26, 1)[0] ?? "")}</text>`);
    const members = v.members.length ? v.members.join(", ") : v.noMembers;
    wrap(members, SIZE - 20, 13, 2).forEach((line, i) => parts.push(`<text x="${SIZE / 2}" y="${108 + i * 16}" ${font} font-size="13" fill="#FFFFFF" opacity="0.8" text-anchor="middle">${esc(line)}</text>`));
    return uri(parts);
}

/** Number and name; the current snapshot gets an accent frame; while armed the key pulses yellow. */
export function renderSnapshotKey(v: { n: number; name: string; current: boolean; armed: number | undefined }): string {
    const parts = [`<rect width="${SIZE}" height="${SIZE}" rx="14" fill="#101010"/>`];
    if (v.armed !== undefined) parts.push(`<rect width="${SIZE}" height="${SIZE}" rx="14" fill="${ARM}" opacity="${(0.25 + 0.45 * v.armed).toFixed(2)}"/>`);
    if (v.current) parts.push(`<rect x="3" y="3" width="${SIZE - 6}" height="${SIZE - 6}" rx="12" fill="none" stroke="${ACCENT}" stroke-width="5"/>`);
    parts.push(mdi(mdiCameraOutline, 14, 14, 26, v.current ? ACCENT : "#8a8a90"));
    parts.push(`<text x="${SIZE - 14}" y="36" ${font} font-size="22" font-weight="700" fill="${v.current ? ACCENT : "#c8c8cc"}" text-anchor="end">${v.n}</text>`);
    const lines = wrap(v.name || "—", SIZE - 20, 22, 3);
    lines.forEach((line, i) => parts.push(`<text x="${SIZE / 2}" y="${(lines.length > 2 ? 72 : 84) + i * 26}" ${font} font-size="22" font-weight="700" fill="#FFFFFF" text-anchor="middle">${esc(line)}</text>`));
    return uri(parts);
}

function uri(parts: string[]): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">${parts.join("")}</svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
