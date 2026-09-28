# XR-C — X-Air Controller for Stream Deck

Faders, mutes and meters of **Behringer X-Air** mixers (XR12, XR16, XR18) and the **Midas MR18** on your Elgato Stream Deck.

> **Status: in development.** Not released yet.

This is an unofficial community plugin. It is not affiliated with or endorsed by Behringer, Midas, Music Tribe or Elgato. "X-Air" is a trademark of Music Tribe.

## Actions

| Action | What it does | Where |
|---|---|---|
| **Channel** | A channel on a key. Press to mute, hold to reset peak and clip. It looks like the console's scribble strip: the channel colour, the name and the fader in dB. Muted, it turns red with a crossed speaker; muted through a mute group or DCA, it gets a red frame. Optionally it shows a thin meter at the bottom, or the full meter as LED bars (mono or stereo) with a clip indicator. | Key |
| **Mute Group** | Switches a mute group (1–4). Red while active, with its channels in small type; a title of your own can replace "MG n". | Key |
| **Snapshot** | Loads a snapshot and shows its number and name; the snapshot loaded last is framed. By default the first press arms the key (it pulses yellow for 2 s) and the second loads; "immediately" and "hold" can be chosen. | Key |
| **Fader** | A channel on a dial. Rotate to set the level (step per tick adjustable), push to mute, tap for 0 dB, hold for -∞. The display shows the channel's name and scribble colour and the fader in dB. With **Digital** (LED bars) or **Classic** (analog VU meters) it also shows the live meter; stereo channels and linked pairs get two. **Ring** and **Pie** show only the fader. | Dial (SD+) |
| **Send** | A channel's send to a bus or FX on a dial, headed "Vocals → Monitor". Rotate to set the send level, push to switch the send off (-∞) and back on, tap for 0 dB. It shows the channel's meter with the send level as the marker, and the send's tap (PRE, POST…). The same four looks as the Fader. | Dial (SD+) |

## Setup

1. Put the mixer and the computer running Stream Deck on the same network.
2. Place a Fader on a dial and open its settings. Under **Mixer**, press **Search** and pick your mixer, or type its IP address. Over a VPN, a search can't reach the mixer, so enter the address.
3. Choose a channel.

The plugin talks OSC directly to the mixer (UDP port 10024). It reads names, colours, faders, mutes and meters, and changes only what you operate.

## Requirements

- Elgato Stream Deck app **7.1** or later (Windows 10+ or macOS 12+)
- A Behringer X-Air XR12, XR16, XR18 or a Midas MR18

## Development

```bash
npm install
npm run build          # plugin and settings panel
npm run check          # build, tests, lint, manifest validation
npm run sim:meters     # Fader dials against the xair-client emulator → sim-out/meters/
npm run sim:keys       # Channel keys in every look and mute state → sim-out/keys/
npm run sim:scenes     # Send dials, Mute Group and Snapshot keys → sim-out/scenes/
npm run pi:preview     # settings panel in a browser with invented data → http://localhost:5299/fader-dial.html
npm run icons          # regenerate icons
```

Built on [`xair-client`](https://github.com/rocklobster42195/xair-client) and [`@rocklobster42195/streamdeck-kit`](https://github.com/rocklobster42195/streamdeck-kit). Both are linked from local checkouts until they are published on npm.
