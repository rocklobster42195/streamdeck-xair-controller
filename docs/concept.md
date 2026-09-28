# X-Air Controller (XAC): Concept

Status: agreed 2026-09-27, nothing built yet. Decisions and their reasons are in [`notes/2026-09-27-xair-controller-grill.md`](../notes/2026-09-27-xair-controller-grill.md).

## What it is

A Stream Deck plugin for **Behringer X-Air** digital mixers (XR12, XR16, XR18, Midas MR18). It talks OSC directly to the mixer over UDP. It is built for home use first, with the mixer as the central audio desk rather than a stage, and is meant for the Elgato Marketplace, free, as an unofficial community plugin.

What sets it apart:
- **The mixer's own look:** names and colors come live from the scribble strips.
- **Real meters:** on keys and in the dial display, with peak hold and a clip indicator.
- **MAC-quality settings:** connection card with discovery, grouped strip picker, live key preview. All of it comes from the shared kit.

X32/M32 support may come later; the client is designed so it can be added.

## Identity

| | |
|---|---|
| Display name | **X-Air Controller**, public short name **XR-C** (internally XAC; pattern <system>-C, decided 2026-09-27) |
| UUID | `de.boriskemper.xair-controller` (the old internal prototype, never public) |
| Repository | `rocklobster42195/streamdeck-xair-controller`, private until release |
| Folder | `C:\dev\xair-controller` (fresh start, without the old prototype's history) |
| Logo | the Rocklobster lobster on **Persian Green `#00ACA8`** from the house palette (a variant with fader knobs is worth trying). Logo colors come from the house palette; Sage `#87AE73` is the company color. |
| Legal | "X-Air" is a Behringer trademark: disclaimer (not affiliated with Behringer or Music Tribe), no Behringer logos |

## Terms

A **strip** is anything with a fader and a mute: input channel, aux/USB input, FX return, bus, FX send, Main LR, DCA.

## Actions in v1

| Action | Device | Behaviour |
|---|---|---|
| **Fader** | Dial | Level of any strip in dB, with a meter in the display. Push mutes. |
| **Send** | Dial | Send level from a channel to a bus or FX. Push switches the send on or off. |
| **Mute** | Key | Mutes any strip; looks like the strip's scribble strip. |
| **Meter** | Key | Live level of one strip with peak hold and a clip indicator. |
| **Mute Group** | Key | Mute group 1–4. |
| **Snapshot** | Key | Loads a snapshot by index and shows its name. |

Later, in this order: meter bridge (across keys or the whole Stream Deck + strip), solo, macro key, channel-strip dial and bus-mix dial, pan/gain/FX parameters, tap tempo, X32/M32, USB recorder (the user: "USB ist gerade nicht wichtig").

### Fader dial

The meter and the fader position share **one dB scale**, like on a console. There is no ring like MAC's.

```
┌──────────────────────────────┐
│ ▌Main LR              -4.5 dB│  name + channel color, fader value
│ L ████████████▒▒░░      ▼    │  meter bars, ▼ = fader position
│ R ██████████▒▒░░        │    │  peak-hold tick, clip = red edge
│  -∞  -30  -18  -6  0  +10    │  dB scale
└──────────────────────────────┘
```

- Rotate: 0.5 dB per tick, larger steps when turning fast, a short catch at 0 dB.
- Push: mute. The display turns grey and the meter keeps running, dimmed.
- Touch: jump to 0 dB, or back to the last remembered value (to confirm on hardware).
- Mono strips get one thicker bar instead of L/R. The meter is on by default and in stereo for Main LR.

### Send dial

Each dial is set to one channel → target (bus 1–6 or FX 1–4, depending on the model). The display works like the Fader's, headed "Vocals → Bus 2" or "→ Reverb" with the mixer's names. The meter shows the channel level and the marker shows the send level. Rotate and touch work as on the Fader; push switches the send on or off. The send's pre/post tap is shown but not switched.

### Meter

- A vertical bar, two (L/R) for stereo strips. Green below −18 dB, yellow below −6 dB, red above.
- Peak hold for about 1.5 s, and a clip indicator that stays until the key is pressed. A press resets both.
- Name and color come from the scribble strip, with the dB value as a number if wanted.
- Pre- or post-fader, post by default.
- Also available as a thin bar on the Mute key, optional.
- Performance: at most ~15 fps for all keys together, through the shared frame ticker. Nothing is redrawn while the signal is static. `/meters` is subscribed only while a meter is visible.

### Key looks

- **Mute:** In its normal state the key looks like the scribble strip: channel color as the background, the name large, the fader value small.
  - Muted: red background as on the console, a crossed speaker icon, the name still readable.
  - Muted only through a mute group or a DCA: a red frame instead of the fill.
- **Mute Group:** "MG n" or a custom name, red when active, the member channels in small type.
- **Snapshot:** number and mixer name. By default a press arms the key (it pulses yellow for 2 s) and a second press loads. "Immediate" and "long press" can be chosen instead. The last loaded snapshot is highlighted.

### Colors

The mixer sends a color **index 0–15**, not hex: 0 off, 1–7 red, green, yellow, blue, magenta, cyan and white, then 8–15 the same colors inverted. XAC maps the index onto the house palette (`C:\dev\komuh\docs\cd-farben.md`) in `xairColorToHex(index)`. The client only delivers the index.

| X-Air | Palette | Hex |
|---|---|---|
| 1 red | Düsseldorf Rot | `#E30018` |
| 2 green | Vida Loca | `#59A028` |
| 3 yellow | School Bus Yellow | `#FFDD00` |
| 4 blue | Düsseldorf Blau | `#009FDF` |
| 5 magenta | Cerise | `#E14190` |
| 6 cyan | Persian Green | `#00ACA8` |
| 7 white | White | `#FFFFFF` |
| 0 off | Grey, dimmed | `#A5A5A5` at ~35 % |

- **Normal colors:** the key is filled with the color, and the text is black or white depending on contrast.
- **Inverted colors:** the key stays dark, and the frame and name take the color.
- A muted red channel also gets the mute icon and hatching, so color is never the only signal.

## Kit bus "deckbus"

XAC is the first partner for MAC on the bus; SC stays out for now. The design is in the MQC concept ("Kit bus") and in `C:\dev\streamdeck-kit\notes\2026-09-28-kit-bus-grill.md`.
- **Meters:**
  - XAC offers all channels in its bus state (`streams`, with live mixer names). MAC's Panorama dial picks one as its "Audio source".
  - XAC asks the mixer for a channel's meters only while a subscriber exists, and subscribers subscribe only while a consumer is visible.
  - About 20 messages per second, dB per side with one decimal.
- **Ducking:**
  - MAC's Announcement key lowers a channel through XAC as a **lease**: XAC restores it on its own on `unduck`, when the maximum time runs out, or when MAC leaves the bus.
  - XAC restores exactly the previous fader. If someone moved the fader by hand meanwhile, the hand wins.
  - With several duckers, the deepest one wins.
  - XAC allows it only for plugins ticked in its connection settings. Nobody is ticked by default.

## Mixer connection

- **One mixer for the whole plugin**, stored in the global settings and set up through a connection card (as in MAC). The card lists mixers found by the `/xinfo` broadcast ("Name [XR12] – IP"), and an IP can also be entered by hand. Several mixers come later.
- The mixer counts as **online** if a packet arrived within the last ~5 s. Otherwise every key shows the offline look, and the plugin reconnects on its own.
- The plugin uses **one** `/xremote` slot. The mixer pushes updates to only a few clients (about 4). The README says so, and the connection card shows a hint when the mixer answers `/xinfo` but pushes no updates.
- **Strip picker:** a grouped list with the live mixer names and color dots: channels, aux/USB in, FX returns, buses, FX sends, Main LR, DCA. Stereo-linked pairs appear as one entry.
- **Label and color:** taken live from the mixer by default, so renaming a channel on the mixer changes the key. Both can be overridden, and a custom MDI icon can be set.
- Direct OSC only, with no Home Assistant path. The HA integration (`C:\ha-dev\ha-behringer-xair`) stays independent.

## The client: `xair-client`

Its own public repository `rocklobster42195/xair-client`, published on npm as `xair-client` with Trusted Publishing, the same way as `music-assistant-client`. It is written in TypeScript for Node 20 or later and has **no runtime dependencies**.

1. **Transport:** one UDP socket, its own OSC codec (including blobs for the meters), and a throttled sender where only the latest value counts.
2. **Generic layer:**
   - `get(path)`, `set(path, value)` and `on(path, cb)` for any OSC path, plus a value cache
   - `/xremote` renewed every ~8 s
   - a heartbeat and an online event
   - a rate-limited initial sync
   - a meter subscription manager with reference counting
3. **Typed layer:**
   - a model registry from `/xinfo` (XR12/16/18, MR18)
   - `mixer.strips` with name, color index, fader, mute, link and sends
   - mute groups and snapshots
   - `dbToFader` and `faderToDb` following the exact X-Air fader law

Extras:
- `discover()` by broadcast.
- `xair-client/emulator`: a small fake mixer on localhost with a selectable model and synthetic meters. It serves the tests, the simulator and the Marketplace screenshots.
- `npx xair-client dump <ip>`: prints all values, read-only.
- `docs/osc-reference.md`: the single place for X-Air OSC knowledge. The HA integration's `xair_api_referenz.md` links to it.

Prior art (used only as a reference for OSC addresses): `mixr-js`, `@mxfriend/libmxair`, `@mxfriend/mx-emulator`.

## Shared code

XAC is built on the kit `@rocklobster42195/streamdeck-kit` and the dev kit `@rocklobster42195/streamdeck-dev-kit`; see the MQC concept (`C:\dev\mqtt-controller\docs\concept.md`, "Shared code"). XAC needs these parts of the kit in particular:
- the gauge family (dB scale, bars, peak hold)
- `pi-select` with groups and color dots
- `pi-override`
- the new color picker with "auto"
- the connection card with a discovery slot and a hint line
- dial acceleration and catch points
- press gestures (arm then confirm)

## Testing

- The **emulator** and **simulator** are the default for all development.
- **Real XR12** (the user's test device):
  - **Reading without asking is fine:** `/xinfo`, names, values, meters.
  - **Writing only with the user's OK:** never raise a fader above its previous level, and restore everything afterwards.
  - **Never save snapshots or touch 48V.**

## Conventions

As in MAC: English and German UI (one locale file per language), English code comments, small focused files, logic separate from rendering, one settings component per file, README for end users first, CHANGELOG kept current, unofficial-plugin disclaimer, no Behringer or Elgato logos.

## Order of work

- **M0, client base** (can start any time; it does not depend on the kit): transport, codec, discovery, `dump` CLI. Then one read-only dump of the XR12, **with the user's OK**, to settle the open OSC questions.
- **M1, `xair-client` 0.1 on npm:** typed layer, emulator, tests.
- **M2, plugin v0.1 beta:** starts after the **MAC go-live** and the kit carve-out. Whether XAC or MQC comes first is still open (decided 2026-09-27). Contents: Fader dial with meter, Mute, Meter key, connection card, simulator scenarios. Update 2026-09-28 (kit bus grill): **XAC comes first, before MQC and before the bus.** The order is:

1. `xair-client`
2. XAC minimal on the kit (Fader dial with meter, Mute, Meter key); the kit gets `scale`, `bar` and `peak` for it
3. the bus core in the kit
4. the bus in XAC and MAC (offering meters)
5. ducking

The user is keen to see the meters.
- **M3, v1.0 for the Marketplace:** Send dial, Mute Group, Snapshot, EN/DE, screenshots, README.

## Facts from the XR12 dump (2026-09-27, read-only)

Details are in the notes, the raw data is in `docs/fixtures/` (gitignored), the script is `tools/xair-dump.mjs`.

- **Mixer:** `XR12`, firmware 1.18.
- **Channels:** the OSC address space has `/ch/01`–`/ch/16` even on the XR12, so the strip count comes from the model registry, not from probing.
- **Sends:** `/ch/xx/mix/NN/level|tap|grpon`, where NN 01–06 are the buses and 07–10 are FX sends 1–4. The HA reference's `/ch/xx/send/yy/…` is wrong.
- **Not available on X-Air:** `/config/icon`, pan on FX sends.
- **Links:** `/config/chlink/1-2`…`15-16` and `/config/buslink/1-2`…`5-6`.
- **Snapshots:** `/-snap/index` is the last loaded snapshot, `/-snap/name` its name, and `/-snap/01..64/name` the names of all 64 slots.
- **Mute groups:** `/config/mute/1..4` is their state. Membership is the bitmask `/ch/NN/grp/mute`, and DCA membership is `/ch/NN/grp/dca`.
- **Meters:** a request `/meters ,s "/meters/N"` works for banks 0–9. The reply is a blob with an int32 count followed by int16 values, both little-endian; dB = value / 256. Bank 1 holds 40 values: all strips plus LR and monitor. The mixer sends **one frame every 50 ms for exactly 10 s**, then stops, so the client renews the request before that.

## Open points

- The meaning of meter banks 0 and 2–9, and the value order inside bank 1: check with a known signal (read-only).
- What `insrc` 18 means, and the effective mute through a DCA.
- The exact `/xremote` client limit.
- The Fader dial's touch behaviour: confirm on hardware.
