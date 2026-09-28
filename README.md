# XR-C — X-Air Controller for Stream Deck

Faders, mutes and meters of **Behringer X-Air** mixers (XR12, XR16, XR18) and the **Midas MR18** on your Elgato Stream Deck.

> **Status: in development.** Not released yet.

This is an unofficial community plugin. It is not affiliated with or endorsed by Behringer, Midas, Music Tribe or Elgato. "X-Air" is a trademark of Music Tribe.

## Actions

| Action | What it does | Where |
|---|---|---|
| **Fader** | A channel on a dial. Rotate to set the level (step per tick adjustable), push to mute, tap for 0 dB, hold for -∞. The display shows the channel's name and scribble colour, the fader in dB and a live meter, as LED bars ("Digital") or analog VU meters ("Classic"). Stereo channels and linked pairs show two meters. | Dial (SD+) |

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
npm run icons          # regenerate icons
```

Built on [`xair-client`](https://github.com/rocklobster42195/xair-client) and [`@rocklobster42195/streamdeck-kit`](https://github.com/rocklobster42195/streamdeck-kit). Both are linked from local checkouts until they are published on npm.
