import type { Ability, Options, Room, SaveData } from "./types";
import { ORDER } from "./progression";
import { ROOMS } from "./world";
const KEY = "sands-of-time:journey:v1";
const SETTINGS = "sands-of-time:options:v1";
export const defaultOptions: Options = {
  music: true,
  sfx: true,
  shake: true,
  assist: false,
};
const stringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((x) => typeof x === "string");
export function parseSave(
  raw: string | null,
  rooms: Record<string, Room> = ROOMS,
): SaveData | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (
      data?.version !== 1 ||
      typeof data.room !== "string" ||
      !Object.hasOwn(rooms, data.room) ||
      !data.checkpoint ||
      !Number.isFinite(data.checkpoint.x) ||
      !Number.isFinite(data.checkpoint.y) ||
      !stringArray(data.abilities) ||
      !data.abilities.every((a: string) => ORDER.includes(a as Ability)) ||
      !stringArray(data.flags) ||
      !data.flags.every((f: string) =>
        ["water", "guardian", "victory"].includes(f),
      ) ||
      !stringArray(data.collected) ||
      !stringArray(data.visited) ||
      !data.visited.every((r: string) => Object.hasOwn(rooms, r)) ||
      !Number.isFinite(data.maxHealth) ||
      data.maxHealth < 6 ||
      data.maxHealth > 12 ||
      !Number.isFinite(data.playTime) ||
      data.playTime < 0 ||
      !Number.isFinite(data.deaths) ||
      data.deaths < 0
    )
      return null;
    const room = rooms[data.room];
    if (
      data.checkpoint.x < 0 ||
      data.checkpoint.x > room.width - 32 ||
      data.checkpoint.y < 0 ||
      data.checkpoint.y > room.height
    )
      return null;
    return data as SaveData;
  } catch {
    return null;
  }
}
export function loadSave() {
  try {
    return parseSave(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}
export function writeSave(data: SaveData): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
export function loadOptions(): Options {
  try {
    const data = JSON.parse(localStorage.getItem(SETTINGS) ?? "{}");
    return Object.fromEntries(
      Object.entries(defaultOptions).map(([key, fallback]) => [
        key,
        typeof data[key] === "boolean" ? data[key] : fallback,
      ]),
    ) as unknown as Options;
  } catch {
    return { ...defaultOptions };
  }
}
export function writeOptions(options: Options) {
  try {
    localStorage.setItem(SETTINGS, JSON.stringify(options));
  } catch {
    /* Settings remain usable for this session. */
  }
}
