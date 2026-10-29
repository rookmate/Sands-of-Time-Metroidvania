import { PALACE_IDS, palaceControls } from "../campaign/palace";
import type { CampaignGame } from "../campaign/CampaignGame";
import { ellipse, line, star, type Context } from "./shapes";

export function drawPalace(c: Context, g: CampaignGame) {
  if (!PALACE_IDS.includes(g.room.id)) return;
  c.save();
  const id = g.room.id,
    s = g.journey.palace;
  c.font = "14px Georgia";
  c.fillStyle = "#eadcb5";
  c.fillText(g.room.region, 35, 110);
  if (g.room.region === "Hanging Gardens") {
    // The same split cypress marks court, root system and canopy.
    line(
      c,
      [
        [750, 700],
        [735, 440],
        [795, 260],
        [750, 130],
      ],
      "#786d48",
      24,
    );
    line(
      c,
      [
        [740, 440],
        [665, 320],
        [620, 190],
      ],
      "#786d48",
      14,
    );
    for (const [x, y] of [
      [620, 190],
      [750, 130],
      [795, 260],
    ]) {
      ellipse(c, x, y, 44, 105, "#35594d");
      ellipse(c, x - 12, y - 12, 23, 85, "#658265");
    }
    line(
      c,
      [
        [150, 700],
        [650, 700],
        [650, 560],
        [1000, 560],
        [1000, 390],
      ],
      s.irrigated ? "#87c7af" : "#7d775d",
      9,
    );
    if (s.irrigated)
      for (let x = 610; x < 790; x += 35)
        line(
          c,
          [
            [x, 650],
            [x + 12, 610],
            [x + 25, 632],
          ],
          "#8fb477",
          4,
        );
    c.fillStyle = "#eadcb5";
    c.fillText(
      s.irrigated
        ? "Irrigation flows to canopy, archives and cells"
        : "Dry irrigation pipe · fed by the Baths sluice",
      400,
      740,
    );
    if (id === "root-conduit")
      c.fillText(
        "Jump from the broken ledge, then Time Dash to the service pier",
        310,
        350,
      );
  }
  if (g.room.region === "Learning and Observatory") {
    if (id === "archive-stair") {
      for (let x = 520; x < 1190; x += 110)
        for (let y = 180; y < 400; y += 35) {
          c.fillStyle = "#948367";
          c.fillRect(x, y, 90, 5);
          for (let n = 0; n < 6; n++) {
            c.fillStyle = n % 2 ? "#9a8763" : "#596d65";
            c.fillRect(x + 4 + n * 13, y - 24, 9, 23);
          }
        }
      c.fillStyle = "#eadcb5";
      c.fillText(
        "Hall receiver below · shutters above · prison stair east",
        350,
        145,
      );
    } else {
      for (let n = 0; n < 4; n++) {
        c.strokeStyle = "#c5ae6970";
        c.lineWidth = 2;
        c.beginPath();
        c.ellipse(650, 160, 100 + n * 55, 35 + n * 20, -0.2, 0, Math.PI * 2);
        c.stroke();
      }
      star(c, 650, 160, 24, s.sky ? "#b4debf" : "#d7b779");
      line(
        c,
        [
          [100, 210],
          [650, 160],
          [1100, 230],
        ],
        s.sky ? "#f2dda8" : "#837a5c",
        s.sky ? 3 : 1,
      );
      c.fillStyle = "#eadcb5";
      c.fillText(
        s.sky
          ? "Lens pinned · roof arch stays open"
          : "Hall light → timed shutter → roof lens",
        430,
        80,
      );
    }
  }
  if (g.room.region === "Prison foundations") {
    for (let x = 100; x < 1280; x += 210) {
      for (let dx = 0; dx < 90; dx += 22)
        line(
          c,
          [
            [x + dx, 180],
            [x + dx, 340],
          ],
          "#5e7471",
          5,
        );
      line(
        c,
        [
          [x - 12, 175],
          [x + 110, 175],
        ],
        "#a28f68",
        7,
      );
    }
    if (id === "chain-shaft") {
      line(
        c,
        [
          [300, 0],
          [300, 350],
          [840, 350],
          [840, s.winch ? 390 : 590],
        ],
        "#bda77d",
        8,
      );
      c.fillStyle = "#6a7773";
      c.fillRect(810, s.winch ? 280 : 480, 65, 85);
      c.fillStyle = "#eadcb5";
      c.fillText(
        "Lower winch lifts the upper crossing · jump then Dash",
        330,
        125,
      );
    }
    c.fillStyle = "#eadcb5";
    c.fillText(
      s.prisonOpen
        ? "Locks released · upper cells and archive stair open"
        : "Warden's release opens the return routes",
      420,
      740,
    );
  }
  for (const v of palaceControls(g)) {
    c.fillStyle = "#626f65";
    c.fillRect(v.x - 12, v.y - 50, 24, 50);
    star(c, v.x, v.y - 62, 18, "#d9c088");
    c.textAlign = "center";
    c.fillStyle = "#efe2bd";
    c.font = "13px Georgia";
    c.fillText(
      id === "root-conduit"
        ? "Irrigation wheel"
        : id === "sky-bridge"
          ? "Roof lens"
          : id === "chain-shaft"
            ? "Lower winch"
            : "Prison release",
      v.x,
      v.y - 95,
    );
  }
  c.restore();
}
