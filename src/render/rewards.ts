import type { CampaignGame } from "../campaign/CampaignGame";
import { ATTUNEMENTS, rewardControls } from "../campaign/rewards";
import { star, type Context } from "./shapes";

export function drawRewards(c: Context, g: CampaignGame) {
  c.save();
  c.font = "16px Georgia";
  c.fillStyle = "#f0dfb6";
  if (g.room.id === "maintenance") {
    c.fillText("Time seals above the far bank ↑", 890, 460);
  }
  if (g.room.id === "sluice-reservoir") {
    c.fillText("Sand vessel →", 890, 490);
    c.font = "13px Georgia";
    c.fillText("Return with sword + Time Dash", 890, 510);
  }
  if (g.room.id === "echo-gallery") {
    c.fillText(
      "Choose one seal. Both are optional; the choice is permanent.",
      420,
      180,
    );
    for (const [id, seal] of Object.entries(ATTUNEMENTS)) {
      const chosen = g.journey.rewards.attunement;
      const active = chosen === id;
      star(c, seal.x, 265, 20, chosen && !active ? "#7e7659" : "#e9c778");
      c.textAlign = "center";
      c.font = "16px Georgia";
      c.fillText(seal.name + (active ? " · chosen" : ""), seal.x, 210);
      c.font = "13px Georgia";
      c.fillText(
        id === "patience" ? "Slow Time: 9 seconds" : "Sand Prison: 1 sand",
        seal.x,
        235,
      );
    }
  }
  if (g.room.id === "keeper-cistern") {
    c.fillText("Open shutter → high ledge → jump + Time Dash", 100, 400);
    c.fillText("Vessel: maximum sand 6 → 8", 940, 440);
  }
  for (const control of rewardControls(g)) {
    if (g.room.id !== "keeper-cistern") continue;
    c.fillStyle = "#455858";
    c.fillRect(control.x - 40, control.y - 90, 80, 90);
    c.fillStyle = "#f0dfb6";
    c.font = "14px Georgia";
    c.textAlign = "center";
    c.fillText("Keepers' names", control.x, control.y - 110);
    for (let n = 0; n < 5; n++)
      c.fillRect(control.x - 26, control.y - 72 + n * 12, 52 - n * 4, 2);
  }
  c.restore();
}
