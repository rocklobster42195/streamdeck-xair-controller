// Entry of the property inspector bundle (ui/pi.js): the kit's components plus XR-C's connection card.
import { definePiComponents, initConditionalVisibility, sd, translateDom, type PiChoice, type PiChoiceOption } from "@rocklobster42195/streamdeck-kit/pi";
import { mdiCardText, mdiChartBar, mdiChartDonut, mdiCircleSlice3, mdiGauge } from "@mdi/js";
import { XacConnectionCard } from "./connection-card";

/** MDI paths for <pi-choice data-options='[{"icon":"…"}]'> tiles. */
const CHOICE_ICONS: Record<string, string> = { digital: mdiChartBar, classic: mdiGauge, ring: mdiChartDonut, pie: mdiCircleSlice3, scribble: mdiCardText };

sd.onReady(() => {
    translateDom();
    definePiComponents();
    customElements.define("xac-connection-card", XacConnectionCard);
    document.querySelectorAll<PiChoice & HTMLElement>("pi-choice[data-options]").forEach((el) => {
        const raw = JSON.parse(el.dataset.options ?? "[]") as PiChoiceOption[];
        el.options = raw.map((o) => ({ ...o, icon: o.icon ? CHOICE_ICONS[o.icon] : undefined }));
    });
    initConditionalVisibility();
    sd.sendToPlugin({ event: "pi-ready" });
    const version = document.querySelector<HTMLElement>("[data-plugin-version]");
    if (version) version.textContent = `XR-C ${sd.info?.plugin.version ?? ""}`.trim();
    document.querySelectorAll<HTMLAnchorElement>("a[href^='http']").forEach((a) =>
        a.addEventListener("click", (e) => {
            e.preventDefault();
            sd.openUrl(a.href);
        }),
    );
    document.body.hidden = false;
});
