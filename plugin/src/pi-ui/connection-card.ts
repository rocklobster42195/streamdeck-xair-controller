// <xac-connection-card> — the mixer connection, shared by all XR-C actions (global settings):
// status line, the mixer's address, and a search that lists the mixers on the network. In the short
// PI of an action with a settings window, "Change" opens the window at the card.
import { escapeHtml, isSettingsWindow, nextRequestId, openSettingsWindow, reloadPiSelects, sd, t } from "@rocklobster42195/streamdeck-kit/pi";
import type { ConnectionStatus, PiPush } from "../pi/protocol";
import type { XAirInfo } from "xair-client";

export class XacConnectionCard extends HTMLElement {
    private status: ConnectionStatus | undefined;
    private found: XAirInfo[] | undefined;
    private searching = false;
    private requestId = 0;
    private expanded = false;
    private offs: (() => void)[] = [];

    connectedCallback(): void {
        this.innerHTML = `
            <div class="pi-section-title">${escapeHtml(t("pi.mixer"))}</div>
            <div class="pi-card">
                <div class="pi-padded">
                    <div class="xac-conn-head">
                        <span class="pi-dot pi-dot-lg"></span>
                        <div class="pi-select-text"><span class="pi-strong xac-conn-title"></span><span class="pi-hint xac-conn-sub"></span></div>
                        <button type="button" class="pi-button pi-button-small xac-conn-toggle"></button>
                    </div>
                </div>
                <div class="xac-conn-body">
                    <pi-field setting="mixerHost" global label="pi.mixer_address" placeholder="pi.mixer_address_placeholder" hint="pi.mixer_address_hint"></pi-field>
                    <div class="xac-conn-actions">
                        <button type="button" class="pi-button xac-search">${escapeHtml(t("pi.search_mixers"))}</button>
                        <button type="button" class="pi-button pi-button-primary xac-connect">${escapeHtml(t("pi.connect"))}</button>
                    </div>
                    <div class="xac-found"></div>
                </div>
            </div>`;
        // The window's menu lists the card; "#connection" opens the window at it
        this.id = "connection";
        this.dataset.windowSection = "pi.mixer";
        this.querySelector(".xac-conn-toggle")!.addEventListener("click", () => {
            const hasWindow = !!document.querySelector("pi-more") && !isSettingsWindow();
            if (!this.expanded && hasWindow && openSettingsWindow("connection")) return;
            this.expanded = !this.expanded;
            this.render();
        });
        this.querySelector(".xac-search")!.addEventListener("click", () => this.search());
        this.querySelector(".xac-connect")!.addEventListener("click", () => {
            (document.activeElement as HTMLElement | null)?.blur();
            setTimeout(() => sd.sendToPlugin({ event: "reconnect" }), 50);
        });
        this.offs.push(
            sd.onMessage((msg: PiPush) => {
                if (msg?.event === "status") {
                    const wasOnline = this.status?.state === "online";
                    this.status = msg.status;
                    if (!wasOnline && msg.status.state === "online") reloadPiSelects();
                } else if (msg?.event === "discover-result" && msg.requestId === this.requestId) {
                    this.searching = false;
                    this.found = msg.mixers;
                } else return;
                this.render();
            }),
            sd.onGlobalSettings(() => this.render()),
        );
        this.render();
    }

    disconnectedCallback(): void {
        for (const off of this.offs) off();
    }

    private search(): void {
        this.searching = true;
        this.found = undefined;
        this.requestId = nextRequestId();
        sd.sendToPlugin({ event: "discover", requestId: this.requestId });
        this.render();
    }

    private render(): void {
        const s = this.status;
        const state = s?.state ?? "connecting";
        document.body.dataset.connection = state === "online" ? "up" : "down";
        const dot = this.querySelector<HTMLElement>(".pi-dot")!;
        dot.dataset.status = state === "online" ? "ok" : state === "offline" ? "error" : state === "connecting" ? "warn" : "";
        this.querySelector(".xac-conn-title")!.textContent = t(`pi.state_${state}`);
        this.querySelector(".xac-conn-sub")!.textContent = state === "online" ? [s?.model, s?.name, s?.host, s?.firmware && `fw ${s.firmware}`].filter(Boolean).join(" · ") : (s?.host ?? "");
        const toggle = this.querySelector<HTMLElement>(".xac-conn-toggle")!;
        toggle.hidden = state !== "online";
        toggle.textContent = this.expanded ? t("pi.done") : t("pi.change");
        this.querySelector<HTMLElement>(".xac-conn-body")!.hidden = state === "online" && !this.expanded;

        const found = this.querySelector<HTMLElement>(".xac-found")!;
        if (this.searching) found.innerHTML = `<div class="pi-hint pi-padded">${escapeHtml(t("pi.searching"))}</div>`;
        else if (!this.found) found.innerHTML = "";
        else if (!this.found.length) found.innerHTML = `<div class="pi-hint pi-padded">${escapeHtml(t("pi.no_mixer_found"))}</div>`;
        else {
            found.innerHTML = this.found
                .map((m) => `<button type="button" class="pi-option xac-mixer" data-ip="${escapeHtml(m.ip)}"><span class="pi-select-text"><span class="pi-label">${escapeHtml(m.name)} [${escapeHtml(m.model)}]</span><span class="pi-option-sub">${escapeHtml(m.ip)} · fw ${escapeHtml(m.firmware)}</span></span></button>`)
                .join("");
            found.querySelectorAll<HTMLElement>(".xac-mixer").forEach((b) => b.addEventListener("click", () => sd.setGlobalSetting("mixerHost", b.dataset.ip)));
        }
    }
}
