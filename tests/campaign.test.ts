import { expect, it, vi } from "vitest";
import { Game } from "../src/game/Game";
import { START } from "../src/game/world";
import { ORDER } from "../src/game/progression";

it("finishes the continuous campaign using movement, combat, powers, and interactions", () => {
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal(
    "document",
    Object.assign(new EventTarget(), { hidden: false }),
  );
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  const g = new Game();
  g.options.music = false;
  g.options.sfx = false;
  g.enterRoom(START.room, undefined, START);
  g.setScreen("playing");
  let frames = 0;
  const step = () => {
    if (frames++ % 54 === 0) {
      g.input.release("attack");
      g.input.press("attack");
    }
    g.update(1 / 120);
    if (g.screen === "story") g.closeStory();
    if (g.screen === "death") throw new Error(`Died in ${g.room.id}`);
  };
  const aim = (x: number) => {
    const diff = x - g.player.x;
    g.input.release(diff > 0 ? "left" : "right");
    if (Math.abs(diff) > 7) g.input.press(diff > 0 ? "right" : "left");
    else {
      g.input.release("left");
      g.input.release("right");
    }
  };
  const walk = (x: number) => {
    g.input.clear();
    for (let i = 0; i < 1800; i++) {
      aim(x);
      step();
      if (Math.abs(g.player.x - x) < 9 && g.player.grounded) {
        g.input.clear();
        return;
      }
    }
    throw new Error(`Could not walk to ${x} in ${g.room.id}`);
  };
  const jump = (x: number, dashFrame = -1) => {
    g.input.clear();
    g.input.press("jump");
    for (let i = 0; i < 240; i++) {
      aim(x);
      if (i === dashFrame) g.input.press("dash");
      step();
      if (i > 12 && g.player.grounded) {
        g.input.clear();
        return;
      }
    }
    throw new Error(`Could not land jump to ${x} in ${g.room.id}`);
  };
  const use = () => {
    const interaction = g.interaction;
    if (!interaction)
      throw new Error(`No interaction in ${g.room.id} at ${g.player.x}`);
    interaction.action();
    if (g.screen === "story") g.closeStory();
  };
  const waitFor = (predicate: () => boolean) => {
    g.input.clear();
    for (let i = 0; i < 3000; i++) {
      if (predicate()) return;
      step();
    }
    throw new Error("Moving platform did not reach its boarding position");
  };
  const fight = () => {
    g.input.clear();
    for (let i = 0; i < 2400; i++) {
      const boss = g.boss;
      if (!boss) return;
      if (
        g.freezeTime < 0.1 &&
        g.player.sand >= 2 &&
        Math.abs(g.player.x - boss.x) < 130
      ) {
        g.input.release("freeze");
        g.input.press("freeze");
      }
      const target = boss.x - 55;
      aim(target);
      // A brief right input turns the Prince toward the boss after braking.
      if (Math.abs(g.player.x - target) < 9 && g.player.face < 0) {
        g.input.release("left");
        g.input.press("right");
      }
      step();
    }
    throw new Error("Boss fight exceeded forty seconds");
  };

  // Courtyard and the first memory.
  walk(790);
  jump(1040);
  walk(1805);
  use();
  walk(290);
  jump(410);
  walk(445);
  jump(655);
  walk(730);
  jump(955);
  walk(1390);
  walk(1235);
  use();
  walk(1805);
  use();
  expect(g.abilities.has("rewind")).toBe(true);

  // Tower ascent and Slow Time.
  walk(190);
  jump(310);
  walk(395);
  jump(585);
  walk(690);
  jump(875);
  walk(835);
  jump(670);
  walk(555);
  jump(415);
  walk(420);
  jump(600);
  walk(700);
  jump(900);
  walk(985);
  jump(1160);
  use();
  walk(310);
  jump(435);
  walk(485);
  jump(750);
  walk(1140);
  use();
  walk(1405);
  use();
  expect(g.room.id).toBe("cistern");

  // Board the moving ferry, ride the lift, and restore the sluice.
  walk(285);
  use();
  walk(430);
  waitFor(() => g.platforms[3].x < 550);
  g.input.press("slow");
  step();
  jump(g.platforms[3].x + 80);
  jump(850);
  walk(875);
  jump(1030);
  waitFor(() => g.platforms[5].y > 500 && g.platforms[5].y < 570);
  g.input.press("slow");
  step();
  jump(1250);
  waitFor(() => g.platforms[5].y < 470);
  walk(1280);
  jump(1580);
  walk(1795);
  use();
  walk(400);
  jump(525);
  walk(570);
  jump(795);
  walk(870);
  jump(1120);
  use();
  walk(1280);
  walk(1355);
  use();
  walk(1595);
  use();
  expect(g.flags.has("water")).toBe(true);

  // The last memory and the Guardian.
  walk(320);
  jump(455);
  walk(530);
  jump(740);
  walk(850);
  jump(1080);
  walk(1510);
  use();
  walk(1795);
  use();
  walk(255);
  use();
  walk(350);
  jump(505);
  jump(1015, 30);
  walk(1180);
  fight();
  walk(1795);
  use();
  expect(g.flags.has("guardian")).toBe(true);

  // Final approach and the Vizier, with no teleports or resource overrides.
  walk(290);
  jump(420);
  jump(810, 30);
  walk(960);
  jump(1470, 47);
  walk(1585);
  use();
  walk(1795);
  use();
  walk(900);
  fight();
  expect(g.screen).toBe("ending");
  expect([...g.abilities]).toEqual(ORDER);
  expect(g.flags.has("victory")).toBe(true);
  expect(g.saved?.flags).toContain("victory");
  expect(g.deaths).toBe(0);
  expect(g.player.health).toBeGreaterThan(0);
});
