# Changelog

All notable changes to XR-C (X-Air Controller) are documented here.

## [Unreleased]

### Added
- The Fader and Send dials draw with the kit's level strip (shared with SA-C); they look exactly as before.
- **One Panorama per row** (from the kit): the Fader and Send dials' Panorama section chooses the effect for the whole row of dials, also over other plugins' dials, with a checkbox per dial. Replaces the Background list ("Like the neighbour" …).
- **Short settings panels with a settings window** on the Fader and Send dials (as in HA-C and MA-C, from the kit): the panel keeps the channel and the look; name line, background and dial controls are in the window behind "More settings …", with a menu. The mixer connection is one line while connected; "Change" opens the window at it.
- Tested on a real XR12 (firmware 1.18): names, colours, meters per channel (also stereo pairs and Main LR), fader changes.
- The fader shows its **travel** as its own bar (-∞ = 0 %, 0 dB = 75 % with a tick, +10 dB = 100 %) on the Fader dial and the Channel key's meter look, instead of a marker on the meter's dBFS scale.
- Main LR comes first in the channel list (and in the levels offered on deckbus). A linked stereo pair is listed once.
- Fader and Send dials and the Channel key's meter look: the name line can be white (as before), in the channel's colour, or a coloured strip like the scribble strip (inverted colours: dark with a coloured frame).
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
