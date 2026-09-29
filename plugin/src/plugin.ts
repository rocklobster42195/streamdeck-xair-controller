import streamDeck from "@elgato/streamdeck";
import { setKitLogger } from "@rocklobster42195/streamdeck-kit";
import { ChannelKey } from "./actions/channel-key";
import { FaderDial } from "./actions/fader-dial";
import { MuteGroupKey } from "./actions/mute-group-key";
import { SendDial } from "./actions/send-dial";
import { SnapshotKey } from "./actions/snapshot-key";
import { startXacBus, trackXacActions } from "./bus/xac-bus";
import { mixerConnection, type GlobalSettings } from "./mixer/connection";
import { initPiBridge } from "./pi/handlers";

streamDeck.logger.setLevel("info");
// Kit problems (e.g. a failing render helper) go to the plugin log.
setKitLogger(streamDeck.logger);

streamDeck.actions.registerAction(new FaderDial());
streamDeck.actions.registerAction(new ChannelKey());
streamDeck.actions.registerAction(new SendDial());
streamDeck.actions.registerAction(new MuteGroupKey());
streamDeck.actions.registerAction(new SnapshotKey());

initPiBridge();
trackXacActions();
streamDeck.settings.onDidReceiveGlobalSettings<GlobalSettings>((ev) => mixerConnection.configure(ev.settings));

await streamDeck.connect();
mixerConnection.configure(await streamDeck.settings.getGlobalSettings<GlobalSettings>());
streamDeck.logger.info("XR-C started");
// deckbus: offer the mixer's meters to other plugins (works without it if the bus can't start)
void startXacBus();
