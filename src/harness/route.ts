export type RouteStep =
  | { kind: "walk"; x: number }
  | {
      kind: "jump";
      x: number | "ferry";
      floor: number | "lift";
      dashFrame?: number;
    }
  | { kind: "door"; room: string }
  | { kind: "rest" }
  | { kind: "sluice" }
  | { kind: "power"; power: "slow" | "rewind" | "freeze"; frames: number }
  | {
      kind: "wait";
      platform: number;
      axis: "x" | "y";
      min: number;
      max: number;
    }
  | { kind: "pickup"; id: string }
  | { kind: "fight"; boss: "guardian" | "vizier" };

const walk = (x: number): RouteStep => ({ kind: "walk", x });
const jump = (
  x: number | "ferry",
  floor: number | "lift",
  dashFrame?: number,
): RouteStep => ({
  kind: "jump",
  x,
  floor,
  dashFrame,
});
const door = (room: string): RouteStep => ({ kind: "door", room });
const pickup = (id: string): RouteStep => ({ kind: "pickup", id });
const rest: RouteStep = { kind: "rest" };

// The same input route runs in Vitest and the rendered development game.
// Floor assertions make a jump that lands on the wrong terrace fail immediately.
export function campaignRoute(explore: boolean): RouteStep[] {
  return [
    ...(explore
      ? [
          walk(455),
          jump(605, 535),
          walk(665),
          jump(860, 455),
          door("baths"),
          walk(360),
          jump(490, 530),
          walk(525),
          jump(720, 420),
          walk(755),
          jump(1000, 330),
          pickup("baths-heart"),
          walk(900),
          jump(710, 420),
          walk(675),
          jump(500, 530),
          walk(85),
          door("palace"),
          walk(665),
          jump(605, 535),
          walk(455),
        ]
      : []),
    walk(790),
    jump(1040, 650),
    walk(1805),
    door("gardens"),
    walk(290),
    jump(410, 530),
    walk(445),
    jump(655, 430),
    walk(730),
    jump(955, 350),
    pickup("memory-rewind"),
    walk(1390),
    walk(1235),
    rest,
    ...(explore
      ? [
          { kind: "power", power: "rewind", frames: 24 } as const,
          walk(1235),
          rest,
        ]
      : []),
    walk(1805),
    door("tower"),
    walk(190),
    jump(310, 1240),
    walk(395),
    jump(585, 1110),
    walk(690),
    jump(875, 980),
    walk(835),
    jump(670, 850),
    walk(555),
    jump(415, 720),
    walk(420),
    jump(600, 590),
    walk(700),
    jump(900, 460),
    walk(985),
    jump(1160, 330),
    door("observatory"),
    walk(310),
    jump(435, 530),
    walk(485),
    jump(750, 425),
    walk(750),
    pickup("memory-slow"),
    walk(1140),
    rest,
    walk(1405),
    door("cistern"),
    walk(285),
    rest,
    walk(430),
    { kind: "wait", platform: 3, axis: "x", min: 0, max: 550 },
    { kind: "power", power: "slow", frames: 1 },
    // The ferry moves while boarding. Its current position is resolved by the driver.
    jump("ferry", 620),
    jump(850, 710),
    walk(875),
    jump(1030, 575),
    { kind: "wait", platform: 5, axis: "y", min: 500, max: 570 },
    { kind: "power", power: "slow", frames: 1 },
    jump(1250, "lift"),
    { kind: "wait", platform: 5, axis: "y", min: 0, max: 470 },
    walk(1280),
    jump(1580, 430),
    walk(1580),
    pickup("memory-freeze"),
    walk(1795),
    door("water-gardens"),
    ...(explore
      ? [{ kind: "power", power: "freeze", frames: 1 } as const]
      : []),
    walk(400),
    jump(525, 525),
    walk(570),
    jump(795, 425),
    ...(explore
      ? [
          door("archive"),
          walk(310),
          jump(435, 520),
          walk(485),
          jump(700, 400),
          walk(745),
          jump(1020, 300),
          walk(1040),
          pickup("archive-heart"),
          walk(85),
          door("water-gardens"),
        ]
      : []),
    walk(870),
    jump(1120, 525),
    { kind: "sluice" },
    walk(1280),
    walk(1355),
    rest,
    walk(1595),
    door("upper"),
    walk(320),
    jump(455, 520),
    walk(530),
    jump(740, 400),
    walk(850),
    jump(1080, 300),
    walk(1100),
    pickup("memory-dash"),
    walk(1510),
    rest,
    ...(explore
      ? [
          walk(1080),
          jump(740, 650, 30),
          walk(695),
          door("palace"),
          walk(455),
          jump(605, 535),
          walk(665),
          jump(860, 455),
          jump(1180, 525, 30),
          walk(1230),
          jump(1510, 495),
          pickup("palace-heart"),
          walk(1120),
          jump(790, 650, 30),
          walk(65),
          door("upper"),
          walk(780),
          jump(1080, 650),
        ]
      : []),
    walk(1795),
    door("corrupted"),
    walk(255),
    rest,
    walk(350),
    jump(505, 520),
    jump(1015, 500, 30),
    walk(1180),
    { kind: "fight", boss: "guardian" },
    walk(1795),
    door("bridge"),
    walk(290),
    jump(420, 520),
    jump(810, 570, 30),
    walk(960),
    jump(1470, 650, 47),
    walk(1585),
    rest,
    walk(1795),
    door("throne"),
    walk(900),
    { kind: "fight", boss: "vizier" },
  ];
}
