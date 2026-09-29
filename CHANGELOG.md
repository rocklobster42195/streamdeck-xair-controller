# Changelog

All notable changes to XR-C (X-Air Controller) are documented here.

## [Unreleased]

### Added
- **deckbus:** XR-C tells other plugins whether the mixer is online and offers the meters of every strip, with the mixer's names; they are sent only while another plugin shows them (e.g. MA-C's Panorama).
- **Send** dial: a channel's send to a bus or FX (level, off/on, 0 dB), with the channel's meter and the send's tap; the same looks as the Fader.
- **Mute Group** key: switches mute group 1–4, shows its channels; own title possible.
- **Snapshot** key: loads a snapshot (press twice by default, or immediately, or hold); shows number and name, frames the current one.
- **Channel** key:
  - mute on press;
  - looks like the scribble strip (house palette colours, inverted and off, red when muted, a frame when muted by a mute group or DCA);
  - optional thin meter, or the full meter with a clip indicator (hold to reset).
- **Fader** dial:
  - level, mute, 0 dB and -∞;
  - the channel's name and scribble colour;
  - a live meter, "Digital" (LED bars) or "Classic" (analog VU meters), mono or stereo;
  - or just the fader as a ring or a pie.
- Scribble colours follow the house palette.
- Mixer connection in the settings panel, with a search for mixers on the network.
