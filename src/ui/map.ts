import type { Game } from "../game/Game";
import { ROOMS } from "../game/world";
import { hasRequirement } from "../game/progression";
export function mapMarkup(game: Game): string {
  const rooms = Object.values(ROOMS);
  const visible = new Set(game.visited);
  for (const id of game.visited)
    ROOMS[id].doors.forEach((door) => visible.add(door.to));
  const point = (id: string) => ({
    x: ROOMS[id].map.x * 130 + 60,
    y: (ROOMS[id].map.y - 1) * 105 + 55,
  });
  const drawn = new Set<string>();
  const edges = rooms
    .flatMap((room) =>
      room.doors.map((door) => {
        const pair = [room.id, door.to].sort().join("-");
        if (drawn.has(pair) || !visible.has(room.id) || !visible.has(door.to))
          return "";
        drawn.add(pair);
        const a = point(room.id),
          b = point(door.to),
          open = hasRequirement(door.requires, game.abilities, game.flags);
        return `<path d="M${a.x} ${a.y} L${b.x} ${b.y}" class="map-connection ${open ? "" : "sealed"}"/>`;
      }),
    )
    .join("");
  const nodes = rooms
    .map((room) => {
      if (!visible.has(room.id)) return "";
      const p = point(room.id),
        visited = game.visited.has(room.id),
        current = room.id === game.room.id;
      const ability = room.pickups.some(
        (pickup) =>
          ["rewind", "slow", "freeze", "dash"].includes(pickup.kind) &&
          !game.collected.has(pickup.id),
      );
      const target = room.id === game.quest.room;
      return `<g class="map-node ${visited ? "visited" : "unknown"} ${current ? "current" : ""}">
      ${current ? `<rect x="${p.x - 26}" y="${p.y - 21}" width="52" height="42" class="map-current-ring"/>` : ""}
      <rect x="${p.x - 21}" y="${p.y - 16}" width="42" height="32"/>
      <text x="${p.x}" y="${p.y + 5}" class="map-symbol">${current ? "◆" : !visited ? "?" : ability ? "✧" : room.fountain ? "◈" : "·"}</text>
      <text x="${p.x}" y="${p.y + 38}" class="map-label">${visited ? room.mapLabel : "Unexplored"}</text>
      ${target ? `<text x="${p.x + 33}" y="${p.y - 18}" class="map-target">✦</text>` : ""}
      <title>${visited ? room.name : "Unexplored room"}${current ? ", you are here" : ""}${target ? ", next objective" : ""}${visited && room.fountain ? ", save fountain" : ""}${visited && ability ? ", unclaimed ability" : ""}</title>
    </g>`;
    })
    .join("");
  return `<svg class="world-map" viewBox="0 0 920 430" role="img" aria-label="Palace map. ${game.visited.size} of ${rooms.length} rooms explored. You are in ${game.room.name}.">
    <defs><pattern id="map-grid" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M26 0H0V26" fill="none" stroke="#c6b888" stroke-opacity=".05"/></pattern></defs>
    <rect width="920" height="430" fill="url(#map-grid)"/>${edges}${nodes}</svg>`;
}
