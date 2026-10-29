import type { CampaignGame } from "../campaign/CampaignGame";
import { MAP_MARKERS, type MapMarker } from "../campaign/cartography";
import { campaignMap } from "./campaignMap";

// Native controls share these actions across pointer, keyboard and future pads.
export class ExplorerMap {
  private selected: string;
  private content: HTMLElement;
  constructor(
    panel: HTMLElement,
    private game: CampaignGame,
  ) {
    this.selected = game.room.id;
    this.content = panel.querySelector("[data-atlas]")!;
    this.render();
    panel.addEventListener("click", (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>(
        "button",
      );
      if (!button) return;
      if (button.dataset.mapRoom) this.select(button.dataset.mapRoom);
      else if (button.dataset.mapMarker) {
        const marker = button.dataset.mapMarker;
        if (marker === "remove" || Object.hasOwn(MAP_MARKERS, marker))
          this.mark(marker === "remove" ? null : (marker as MapMarker));
      }
    });
    panel.addEventListener("change", (event) => {
      const target = event.target;
      if (
        target instanceof HTMLSelectElement &&
        target.hasAttribute("data-map-index")
      )
        this.select(target.value);
    });
  }
  select(room: string) {
    this.selected = room;
    this.render();
    this.content
      .querySelector<HTMLSelectElement>("[data-map-index]")
      ?.focus({ preventScroll: true });
  }
  mark(marker: MapMarker | null) {
    this.game.setMapMarker(this.selected, marker);
    this.render();
    this.content
      .querySelector<HTMLButtonElement>(
        `[data-map-marker="${marker ?? "return"}"]`,
      )
      ?.focus({ preventScroll: true });
  }
  private render() {
    this.content.innerHTML = campaignMap(this.game, this.selected);
    this.selected = this.content.querySelector<HTMLElement>(
      "[data-selected-room]",
    )!.dataset.selectedRoom!;
  }
}
