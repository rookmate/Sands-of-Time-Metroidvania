import type { Game } from "../game/Game";
import { hasRequirement, ABILITIES } from "../game/progression";
import {
  PALETTES,
  buildBackdrop,
  drawPalm,
  drawPlatform,
  skyline,
} from "./scenery";
import {
  arch,
  ellipse,
  glow,
  line,
  polygon,
  star,
  type Context,
} from "./shapes";
import { CampaignGame } from "../campaign/CampaignGame";
import { CAMPAIGN_ROOMS } from "../campaign/world";
import { drawEnemy, drawPrince } from "./actors";
import {
  drawCampaignObjects,
  drawCampaignScenery,
  drawTraversal,
} from "./campaign";
export class Renderer {
  private context: Context;
  private backdrops = new Map<string, HTMLCanvasElement>();
  private terrain = new Map<string, HTMLCanvasElement>();
  private skylines = new Map<string, HTMLCanvasElement>();
  constructor(
    public canvas: HTMLCanvasElement,
    private readonly currentGame: () => Game,
  ) {
    this.context = canvas.getContext("2d", { alpha: false })!;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }
  private get game() {
    return this.currentGame();
  }
  private resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = 1280 * ratio;
    this.canvas.height = 720 * ratio;
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  draw() {
    if (this.game.orientationBlocked) return;
    const c = this.context,
      g = this.game,
      room = g.room,
      t = g.visualTime;
    const pal = PALETTES[room.theme];
    const sky = c.createLinearGradient(0, 0, 0, 720);
    pal.sky.forEach((color, i) => sky.addColorStop(i / 2, color));
    c.fillStyle = sky;
    c.fillRect(0, 0, 1280, 720);
    glow(c, 890, 145, 230, "#ffe8b22b");
    ellipse(c, 890, 145, 51, 51, "#f4d6a9");
    // A narrow cloud layer across the sun.
    c.fillStyle = pal.sky[0] + "30";
    c.fillRect(770, 135, 370, 3);
    c.fillRect(800, 149, 280, 5);
    if (!this.skylines.has(room.theme)) {
      const layer = document.createElement("canvas");
      layer.width = 2500;
      layer.height = 1000;
      const context = layer.getContext("2d")!;
      context.save();
      context.translate(0, -140);
      skyline(context, 2500, pal, 411, 0);
      context.restore();
      context.save();
      context.translate(0, 0);
      skyline(context, 2500, pal, 616, 1);
      context.restore();
      this.skylines.set(room.theme, layer);
      if (this.skylines.size > 3)
        this.skylines.delete(this.skylines.keys().next().value!);
    }
    c.drawImage(
      this.skylines.get(room.theme)!,
      -g.camera.x * 0.22 - 70,
      -g.camera.y * 0.09 + 10,
    );
    // Birds drift through the haze.
    for (let i = 0; i < 7; i++) {
      const x = ((i * 173 + t * 9) % 1500) - 100,
        y = 120 + Math.sin(i * 13) * 54;
      const flap = Math.sin(t * 3 + i) * 3;
      line(
        c,
        [
          [x - 6, y - flap],
          [x, y],
          [x + 6, y - flap],
        ],
        "#3d57565c",
        1.2,
      );
    }
    if (!this.backdrops.has(room.id)) {
      this.backdrops.set(room.id, buildBackdrop(room));
      if (this.backdrops.size > 4)
        this.backdrops.delete(this.backdrops.keys().next().value!);
    }
    c.save();
    const shakeX =
      g.options.shake && g.shake > 0 ? Math.sin(t * 110) * g.shake * 13 : 0;
    c.translate(-g.camera.x + shakeX, -g.camera.y);
    c.globalAlpha = 0.88;
    c.drawImage(this.backdrops.get(room.id)!, 0, 0);
    c.globalAlpha = 1;
    this.water(c);
    // Dim background palms and raised garden trees.
    if (room.theme === "garden" || room.theme === "palace") {
      drawPalm(c, 1150, 645, 1.35, pal.foliage + "aa");
      drawPalm(c, 1700, 650, 1.1, pal.foliage + "aa");
    }
    for (const door of room.doors) {
      if (g instanceof CampaignGame) {
        c.save();
        c.fillStyle = "#e4d1a4";
        c.font = "13px Georgia";
        c.textAlign = "center";
        c.fillText(
          room.id === "hourglass" && door.to === "tomb"
            ? "Point of no return · old palace closes"
            : CAMPAIGN_ROOMS[door.to].mapLabel,
          door.x,
          door.y - 125,
        );
        c.restore();
      }
      const open =
        g instanceof CampaignGame
          ? !g.doorBlock(door)
          : hasRequirement(door.requires, g.abilities, g.flags);
      arch(c, door.x - 34, door.y - 108, 68, 108, pal.light, "#bda776");
      arch(c, door.x - 27, door.y - 99, 54, 99, open ? "#243e40" : "#34454b");
      if (!open) {
        for (let y = door.y - 80; y < door.y; y += 18)
          line(
            c,
            [
              [door.x - 23, y],
              [door.x + 23, y - 10],
            ],
            "#bda77655",
            2,
          );
        star(c, door.x, door.y - 49, 11, "#d5b97f");
      } else {
        glow(c, door.x, door.y - 50, 42, "#74cec926");
        line(
          c,
          [
            [door.x - 7, door.y - 58],
            [door.x + 1, door.y - 51],
            [door.x - 7, door.y - 44],
          ],
          "#a6c6b5",
          2,
        );
      }
    }
    this.roomDetails(c);
    drawCampaignScenery(c, g);
    if (g.campaignProgress) {
      g.platforms.forEach((platform, index) =>
        drawPlatform(c, platform, pal, index * 71 + room.id.length),
      );
    } else {
      if (!this.terrain.has(room.id)) {
        const layer = document.createElement("canvas");
        layer.width = room.width;
        layer.height = room.height;
        const ctx = layer.getContext("2d")!;
        room.platforms.forEach((platform, index) => {
          if (platform.kind !== "moving")
            drawPlatform(ctx, platform, pal, index * 71 + room.id.length);
        });
        this.terrain.set(room.id, layer);
        if (this.terrain.size > 3) {
          const oldest = this.terrain.keys().next().value!;
          this.terrain.delete(oldest);
          this.backdrops.delete(oldest);
        }
      }
      c.drawImage(this.terrain.get(room.id)!, 0, 0);
      g.platforms.forEach((platform, index) => {
        if (platform.kind === "moving")
          drawPlatform(c, platform, pal, index * 71 + room.id.length);
      });
    }
    this.hazards(c);
    drawTraversal(c, g);
    drawCampaignObjects(c, g);
    if (room.fountain) this.fountain(c, room.fountain.x, room.fountain.y);
    for (const pickup of room.pickups) {
      if (g.collected.has(pickup.id)) continue;
      const available = hasRequirement(pickup.requires, g.abilities, g.flags);
      const bob = Math.sin(t * 2.5 + pickup.x) * 5;
      c.save();
      c.globalAlpha = available ? 1 : 0.3;
      const color =
        pickup.kind === "sand"
          ? "#eac582"
          : pickup.kind === "heart"
            ? "#e1a296"
            : pickup.kind === "vessel"
              ? "#eac582"
              : pickup.kind === "dagger"
                ? "#78e2d4"
                : pickup.kind === "sword"
                  ? "#e8e2cf"
                  : ABILITIES[pickup.kind].color;
      glow(
        c,
        pickup.x,
        pickup.y + bob,
        pickup.kind === "sand" ? 40 : 80,
        color + "36",
      );
      if (pickup.kind === "sand") {
        for (let i = 0; i < 12; i++) {
          const a = i * 2.4 + t * 0.5,
            radius = 5 + i * 1.2;
          ellipse(
            c,
            pickup.x + Math.cos(a) * radius,
            pickup.y + bob + Math.sin(a) * radius * 0.65,
            1.5,
            1.5,
            "#f5dda3",
          );
        }
      } else {
        c.save();
        c.translate(pickup.x, pickup.y + bob);
        c.rotate(Math.PI / 4);
        c.strokeStyle = color + "66";
        c.lineWidth = 1;
        c.strokeRect(-19, -19, 38, 38);
        c.restore();
        if (pickup.kind === "vessel") {
          polygon(
            c,
            [
              [pickup.x - 6, pickup.y + bob - 15],
              [pickup.x + 6, pickup.y + bob - 15],
              [pickup.x + 12, pickup.y + bob + 7],
              [pickup.x + 6, pickup.y + bob + 17],
              [pickup.x - 6, pickup.y + bob + 17],
              [pickup.x - 12, pickup.y + bob + 7],
            ],
            color,
          );
          line(
            c,
            [
              [pickup.x - 9, pickup.y + bob - 15],
              [pickup.x + 9, pickup.y + bob - 15],
            ],
            "#f0dfb6",
            3,
          );
        } else if (pickup.kind === "heart")
          polygon(
            c,
            [
              [pickup.x, pickup.y + bob - 12],
              [pickup.x + 9, pickup.y + bob],
              [pickup.x, pickup.y + bob + 14],
              [pickup.x - 9, pickup.y + bob],
            ],
            color,
          );
        else {
          star(c, pickup.x, pickup.y + bob, 16, color, t * 0.12);
          for (let i = 0; i < 8; i++) {
            const a = t + (i * Math.PI) / 4;
            ellipse(
              c,
              pickup.x + Math.cos(a) * 29,
              pickup.y + bob + Math.sin(a) * 29,
              1.5,
              1.5,
              color,
            );
          }
        }
      }
      c.restore();
    }
    for (const ghost of g.ghosts)
      drawPrince(c, { ...g.player, ...ghost }, t, true, g.hasDagger);
    g.enemies.forEach((enemy) =>
      drawEnemy(c, enemy, g.worldTime, g.freezeTime > 0),
    );
    // Contact shadow anchors the Prince to the stone.
    if (g.player.grounded)
      ellipse(c, g.player.x + 15, g.player.y + 56, 23, 4, "#142b2c44");
    if (g.player.dashTime > 0) {
      for (let i = 1; i < 6; i++)
        drawPrince(
          c,
          { ...g.player, x: g.player.x - g.player.face * i * 18 },
          t,
          true,
          g.hasDagger,
        );
    }
    if (g.player.invincible <= 0 || Math.sin(t * 35) > -0.3)
      drawPrince(c, g.player, t, false, g.hasDagger);
    for (const projectile of g.projectiles) {
      glow(c, projectile.x, projectile.y, 23, "#ffd68b45");
      ellipse(
        c,
        projectile.x,
        projectile.y,
        projectile.radius,
        projectile.radius * 0.55,
        "#f2cb85",
      );
      line(
        c,
        [
          [projectile.x, projectile.y],
          [projectile.x - Math.sign(projectile.vx) * 22, projectile.y],
        ],
        "#f2cb8560",
        2,
      );
    }
    for (const particle of g.particles) {
      c.globalAlpha = particle.life / particle.maxLife;
      c.fillStyle = particle.color;
      c.fillRect(particle.x, particle.y, particle.size, particle.size);
    }
    c.globalAlpha = 1;
    // Foreground palms frame the scene without hiding the playing field.
    if (room.theme === "palace" || room.theme === "garden")
      drawPalm(c, -45, room.height - 45, 2.5, "#1b3634");
    c.restore();
    this.atmosphere(c);
    if (
      g.rewinding ||
      g.freezeTime > 0 ||
      g.slowTime > 0 ||
      g.player.dashTime > 0
    ) {
      const color = g.rewinding
        ? "#46c8b5"
        : g.freezeTime > 0
          ? "#6ca6c9"
          : g.player.dashTime > 0
            ? "#9b83d9"
            : "#c3a351";
      c.fillStyle = color + "13";
      c.fillRect(0, 0, 1280, 720);
      c.strokeStyle = color + "77";
      c.lineWidth = 3;
      c.strokeRect(2, 2, 1276, 716);
    }
    const shade = c.createLinearGradient(0, 0, 0, 720);
    shade.addColorStop(0, "#1024268c");
    shade.addColorStop(0.17, "#10242600");
    shade.addColorStop(0.75, "#10242600");
    shade.addColorStop(1, "#0b202675");
    c.fillStyle = shade;
    c.fillRect(0, 0, 1280, 720);
  }
  private water(c: Context) {
    const g = this.game,
      y = g.room.height - 88;
    const gradient = c.createLinearGradient(0, y, 0, y + 140);
    gradient.addColorStop(0, "#4eaaa0");
    gradient.addColorStop(0.3, "#235d64");
    gradient.addColorStop(1, "#183b48");
    c.fillStyle = gradient;
    c.fillRect(0, y, g.room.width, 180);
    for (let i = 0; i < 50; i++) {
      const x = (i * 127 + Math.sin(g.visualTime + i) * 10) % g.room.width,
        wy = y + ((i * 17) % 85);
      line(
        c,
        [
          [x, wy],
          [x + 12 + (i % 27), wy],
        ],
        i % 3 === 0 ? "#b5d4b850" : "#3c8f8b66",
        1,
      );
    }
  }
  private fountain(c: Context, x: number, y: number) {
    const t = this.game.visualTime;
    glow(c, x, y - 40, 100, "#79ded329");
    ellipse(c, x, y - 4, 42, 10, "#314c4b");
    c.fillStyle = "#afae8c";
    c.fillRect(x - 33, y - 19, 66, 13);
    ellipse(c, x, y - 20, 35, 9, "#b6c3a0");
    ellipse(c, x, y - 22, 29, 6, "#56b3a7");
    c.fillStyle = "#aaa884";
    c.fillRect(x - 5, y - 54, 10, 33);
    ellipse(c, x, y - 56, 18, 6, "#bdc7a5");
    for (let i = -3; i <= 3; i++) {
      c.beginPath();
      c.moveTo(x, y - 59);
      c.quadraticCurveTo(x + i * 7, y - 100, x + i * 9, y - 25);
      c.strokeStyle = "#86e0cc80";
      c.lineWidth = 1.3;
      c.stroke();
      const f = (t * 0.7 + i * 0.17 + 2) % 1;
      ellipse(c, x + i * 9 * f, y - 66 + f * f * 40, 1.4, 2, "#d0f5d5");
    }
    star(c, x, y - 102, 7, "#b6e8ce", t * 0.2);
  }
  private hazards(c: Context) {
    const g = this.game;
    for (const h of g.room.hazards) {
      if (h.kind === "spikes")
        for (let x = h.x; x < h.x + h.w; x += 16)
          polygon(
            c,
            [
              [x, h.y + h.h],
              [x + 8, h.y],
              [x + 16, h.y + h.h],
            ],
            "#82958f",
            "#c0c5a7",
          );
      else if (h.kind === "blade") {
        const x = h.x + h.w / 2,
          y = h.y + h.h / 2;
        line(
          c,
          [
            [x, h.y - 150],
            [x, y],
          ],
          "#6d817a",
          2,
        );
        const active =
          Math.sin((g.worldTime * Math.PI * 2) / (h.period ?? 2)) > 0.3;
        c.save();
        c.translate(x, y);
        c.rotate(g.worldTime * 7);
        star(c, 0, 0, active ? 32 : 20, "#b6b9a5");
        ellipse(c, 0, 0, 10, 10, "#526c68");
        c.restore();
        if (active) glow(c, x, y, 35, "#df96762a");
      } else {
        const active =
          Math.sin((g.worldTime * Math.PI * 2) / (h.period ?? 2)) > 0.3;
        c.fillStyle = active ? "#d8b97f44" : "#d8b97f12";
        c.fillRect(h.x, h.y - 300, h.w, h.h + 300);
        for (let i = 0; i < 22; i++) {
          const x = h.x + ((i * 19) % h.w),
            y = h.y - 280 + ((g.worldTime * 180 + i * 17) % (h.h + 280));
          c.fillStyle = "#dfc28d";
          c.fillRect(x, y, 2, 3);
        }
      }
    }
  }
  private roomDetails(c: Context) {
    const g = this.game,
      room = g.room;
    for (let x = 465; x < room.width; x += 500) {
      const y = room.height > 1000 ? 360 : 315;
      line(
        c,
        [
          [x, y - 88],
          [x, y - 10],
        ],
        "#6d7461",
        1,
      );
      glow(c, x, y, 55 + Math.sin(g.visualTime * 3 + x) * 3, "#f6d09a2c");
      polygon(
        c,
        [
          [x - 8, y - 9],
          [x, y - 16],
          [x + 8, y - 9],
          [x + 6, y + 12],
          [x, y + 16],
          [x - 6, y + 12],
        ],
        "#8f815c",
        "#ccba87",
      );
      polygon(
        c,
        [
          [x - 5, y - 6],
          [x + 5, y - 6],
          [x + 4, y + 8],
          [x - 4, y + 8],
        ],
        "#e4c88e",
      );
      line(
        c,
        [
          [x, y - 9],
          [x, y + 12],
        ],
        "#80795c",
        1,
      );
    }
    if (room.event) {
      const e = room.event,
        active = g.flags.has(e.flag);
      c.save();
      c.translate(e.x, e.y - 35);
      c.rotate(active ? g.visualTime * 0.3 : 0);
      c.strokeStyle = active ? "#8ed9c0" : "#bea979";
      c.lineWidth = 5;
      c.beginPath();
      c.arc(0, 0, 25, 0, Math.PI * 2);
      c.stroke();
      for (let i = 0; i < 6; i++)
        line(
          c,
          [
            [0, 0],
            [
              Math.cos((i * Math.PI) / 3) * 25,
              Math.sin((i * Math.PI) / 3) * 25,
            ],
          ],
          c.strokeStyle as string,
          3,
        );
      c.restore();
    }
    // Channels run down the old stone when the sluice is restored.
    if (
      (g.flags.has("water") || room.theme === "water") &&
      room.id !== "throne"
    ) {
      for (let x = 410; x < room.width; x += 580) {
        const y = room.theme === "water" ? 110 : 330;
        const gradient = c.createLinearGradient(x, 0, x + 22, 0);
        gradient.addColorStop(0, "#74c9c200");
        gradient.addColorStop(0.4, "#83d6c54f");
        gradient.addColorStop(1, "#74c9c200");
        c.fillStyle = gradient;
        c.fillRect(x, y, 22, room.height - y);
        for (let j = 0; j < 10; j++) {
          const wy = y + ((g.visualTime * 140 + j * 63) % (room.height - y));
          line(
            c,
            [
              [x + 8, wy],
              [x + 8, wy + 17],
            ],
            "#a2e2cd44",
          );
        }
      }
    }
  }
  private atmosphere(c: Context) {
    const g = this.game;
    for (let i = 0; i < 55; i++) {
      const x = ((i * 97.37 + g.visualTime * (5 + (i % 7))) % 1320) - 20;
      const y = (i * 43.31 + Math.sin(g.visualTime * 0.4 + i) * 16) % 720;
      c.globalAlpha = 0.2 + Math.sin(g.visualTime + i) * 0.15;
      c.fillStyle = "#ffedc1";
      c.fillRect(x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
    }
    c.globalAlpha = 1;
  }
}
