import streamDeck from "@elgato/streamdeck";
import { setKitLogger } from "@rocklobster42195/streamdeck-kit";
import { ChannelKey } from "./actions/channel-key";
import { FaderDial } from "./actions/fader-dial";
import { mixerConnection, type GlobalSettings } from "./mixer/connection";
import { initPiBridge } from "./pi/handlers";

streamDeck.logger.setLevel("info");
// Kit problems (e.g. a failing render helper) go to the plugin log.
setKitLogger(streamDeck.logger);

streamDeck.actions.registerAction(new FaderDial());
streamDeck.actions.registerAction(new ChannelKey());

initPiBridge();
streamDeck.settings.onDidReceiveGlobalSettings<GlobalSettings>((ev) => mixerConnection.configure(ev.settings));

await streamDeck.connect();
mixerConnection.configure(await streamDeck.settings.getGlobalSettings<GlobalSettings>());
streamDeck.logger.info("XR-C started");
