// The plugin's one mixer: global settings (the mixer's IP), the XAirMixer and its strips, and a
// change signal for keys, dials and the settings panel. Reconnects when the IP changes.
import streamDeck from "@elgato/streamdeck";
import { XAirMixer, XAirStrips, type Strip, type StripRef } from "xair-client";

export type GlobalSettings = {
    /** The mixer's IP address or host name, optionally with a port ("192.168.1.50", "127.0.0.1:10125"). */
    mixerHost?: string;
};

export type ConnectionState = "unconfigured" | "connecting" | "online" | "offline";

type Listener = () => void;

class MixerConnection {
    private mixer: XAirMixer | undefined;
    private stripsApi: XAirStrips | undefined;
    private host: string | undefined;
    private readonly listeners = new Set<Listener>();
    private notifyTimer: ReturnType<typeof setTimeout> | undefined;
    state: ConnectionState = "unconfigured";

    /** Call on every global settings change; (re)connects when the host changed. */
    configure(settings: GlobalSettings): void {
        const host = settings.mixerHost?.trim() || undefined;
        if (host === this.host) return;
        this.host = host;
        this.disconnect();
        if (!host) {
            this.setState("unconfigured");
            return;
        }
        void this.connect(host);
    }

    /** Try again now (the settings panel's "Connect" button). */
    reconnect(): void {
        const host = this.host;
        this.host = undefined;
        this.configure({ mixerHost: host });
    }

    get current(): XAirMixer | undefined {
        return this.mixer;
    }

    get strips(): XAirStrips | undefined {
        return this.stripsApi;
    }

    strip(ref: StripRef): Strip | undefined {
        return this.stripsApi?.strip(ref);
    }

    /** Called (coalesced) when state, names, faders or mutes change. */
    onChange(fn: Listener): () => void {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    private async connect(host: string): Promise<void> {
        this.setState("connecting");
        const [, name, port] = /^(.*?)(?::(\d+))?$/.exec(host) ?? [];
        const mixer = new XAirMixer({ host: name || host, port: port ? Number(port) : undefined });
        this.mixer = mixer;
        this.stripsApi = new XAirStrips(mixer);
        mixer.on("online", (online) => {
            if (this.mixer !== mixer) return;
            this.setState(online ? "online" : "offline");
            // Back online: read everything again (names or faders may have changed meanwhile)
            if (online) void mixer.sync(this.stripsApi!.addresses());
        });
        mixer.on("change", () => this.notify());
        mixer.on("error", (e) => streamDeck.logger.warn(`[mixer] ${e.message}`));
        try {
            const answered = await mixer.connect();
            if (this.mixer !== mixer) return;
            streamDeck.logger.info(`[mixer] ${host}: ${answered ? `${mixer.info?.model} "${mixer.info?.name}" fw ${mixer.info?.firmware}` : "no answer yet"}`);
            if (!answered) this.setState("offline");
        } catch (e) {
            streamDeck.logger.warn(`[mixer] connect to ${host} failed`, e);
            this.setState("offline");
        }
    }

    private disconnect(): void {
        this.mixer?.close();
        this.mixer = undefined;
        this.stripsApi = undefined;
    }

    private setState(state: ConnectionState): void {
        if (state === this.state) return;
        this.state = state;
        this.notify();
    }

    /** Pushed changes come in bursts (a sync answers hundreds of values); tell listeners once per frame. */
    private notify(): void {
        if (this.notifyTimer) return;
        this.notifyTimer = setTimeout(() => {
            this.notifyTimer = undefined;
            for (const fn of this.listeners) fn();
        }, 30);
    }
}

export const mixerConnection = new MixerConnection();
