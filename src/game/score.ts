// Original score: "The sands remember". MIDI pitches, eighth-note grid.
// A falling A–F–E–D answer links the regional melodies. Empty bars are rests.
export type MusicTheme =
  | "palace"
  | "garden"
  | "baths"
  | "prison"
  | "observatory"
  | "depths"
  | "wing"
  | "echoes"
  | "crown"
  | "loss"
  | "finale";
export type MusicDanger =
  "calm" | "combat" | "king" | "rival" | "keeper" | "vizier";
export interface MusicScene {
  theme: MusicTheme;
  danger: MusicDanger;
  era?: "intact" | "ruined";
}
type Note = readonly [step: number, midi: number, length: number];
interface Arrangement {
  bpm: number;
  bass: number;
  voice: OscillatorType;
  melody: readonly Note[];
}
export const SCORE: Record<MusicTheme, Arrangement> = {
  palace: {
    bpm: 82,
    bass: 38,
    voice: "triangle",
    melody: [
      [0, 62, 2],
      [3, 69, 1],
      [6, 70, 2],
      [10, 69, 2],
      [16, 65, 3],
      [20, 64, 2],
      [24, 62, 4],
    ],
  },
  garden: {
    bpm: 94,
    bass: 41,
    voice: "triangle",
    melody: [
      [0, 65, 2],
      [4, 69, 1],
      [6, 72, 2],
      [11, 74, 2],
      [16, 72, 2],
      [19, 69, 1],
      [22, 65, 3],
      [26, 64, 2],
    ],
  },
  baths: {
    bpm: 72,
    bass: 38,
    voice: "sine",
    melody: [
      [0, 74, 3],
      [5, 69, 3],
      [12, 65, 3],
      [18, 64, 3],
      [24, 62, 5],
    ],
  },
  prison: {
    bpm: 88,
    bass: 38,
    voice: "triangle",
    melody: [
      [0, 50, 1],
      [3, 57, 1],
      [8, 58, 2],
      [14, 57, 1],
      [19, 53, 2],
      [24, 52, 2],
      [27, 50, 1],
    ],
  },
  observatory: {
    bpm: 76,
    bass: 46,
    voice: "sine",
    melody: [
      [0, 74, 2],
      [5, 81, 2],
      [10, 77, 2],
      [15, 76, 3],
      [22, 74, 2],
      [26, 69, 3],
    ],
  },
  depths: {
    bpm: 66,
    bass: 26,
    voice: "sine",
    melody: [
      [0, 50, 4],
      [7, 57, 3],
      [16, 53, 3],
      [22, 52, 4],
    ],
  },
  wing: {
    bpm: 78,
    bass: 38,
    voice: "triangle",
    melody: [
      [0, 62, 2],
      [4, 69, 2],
      [8, 72, 3],
      [14, 70, 2],
      [18, 69, 2],
      [22, 65, 2],
      [26, 64, 3],
    ],
  },
  echoes: {
    bpm: 78,
    bass: 38,
    voice: "sine",
    melody: [
      [0, 69, 2],
      [6, 69, 1],
      [12, 65, 2],
      [18, 65, 1],
      [24, 62, 3],
    ],
  },
  crown: {
    bpm: 82,
    bass: 38,
    voice: "triangle",
    melody: [
      [0, 62, 2],
      [3, 69, 1],
      [6, 70, 2],
      [12, 74, 3],
      [18, 72, 2],
      [22, 69, 2],
      [26, 65, 3],
    ],
  },
  loss: {
    bpm: 62,
    bass: 38,
    voice: "sine",
    melody: [
      [0, 69, 4],
      [10, 65, 4],
      [20, 64, 4],
    ],
  },
  finale: {
    bpm: 82,
    bass: 38,
    voice: "triangle",
    melody: [
      [0, 62, 3],
      [4, 69, 2],
      [8, 74, 3],
      [16, 72, 2],
      [20, 69, 2],
      [24, 66, 2],
      [28, 62, 3],
    ],
  },
};
export interface ScoreTone {
  midi: number;
  length: number; // seconds
  gain: number;
  voice: OscillatorType;
}
export function eighth(scene: MusicScene) {
  return 30 / SCORE[scene.theme].bpm;
}
// Four bars of 4/4. On the second phrase the first answer moves up an octave.
// Danger keeps the regional pulse and key, rather than stacking another loop.
export function scoreStep(scene: MusicScene, step: number): ScoreTone[] {
  const a = SCORE[scene.theme],
    unit = eighth(scene),
    tick = step % 32;
  const notes: ScoreTone[] = [];
  const ruined = scene.theme === "wing" && scene.era === "ruined";
  const threat = scene.danger !== "calm";
  const note = a.melody.find(([at]) => at === tick);
  if (note && !(ruined && tick === 8))
    notes.push({
      midi:
        note[1] +
        (ruined ? -12 : Math.floor(step / 32) % 2 && tick < 16 ? 12 : 0),
      length: Math.min(note[2] * unit, 1.7),
      gain: threat ? 0.055 : 0.085,
      voice: ruined ? "sine" : a.voice,
    });
  // A quiet open fifth, with a whole empty fourth bar around exploration.
  if (tick === 0 || tick === 16)
    for (const interval of [0, 7])
      notes.push({
        midi: a.bass + interval,
        length: Math.min(unit * 7, 2.5),
        gain: 0.065,
        voice: "sine",
      });
  if (
    (scene.theme === "baths" && tick === 10) ||
    (scene.theme === "observatory" && tick === 20)
  )
    notes.push({ midi: 86, length: 1.2, gain: 0.025, voice: "sine" });
  // Water and mechanisms have pitched room tone, on the music bus so the
  // effects switch remains about player/action feedback.
  if (
    !threat &&
    (scene.theme === "prison" || scene.theme === "depths") &&
    (tick === 6 || tick === 18)
  )
    notes.push({
      midi: scene.theme === "depths" ? 38 : 50,
      length: 0.18,
      gain: 0.03,
      voice: "triangle",
    });
  if (threat && tick % (scene.danger === "combat" ? 8 : 4) === 0) {
    const signatures: Record<
      Exclude<MusicDanger, "calm">,
      readonly number[]
    > = {
      combat: [38, 45, 38, 41],
      king: [38, 38, 39, 45],
      rival: [50, 57, 53, 52],
      keeper: [26, 33, 26, 38],
      vizier: [38, 39, 45, 46],
    };
    notes.push({
      midi: signatures[scene.danger as Exclude<MusicDanger, "calm">][
        Math.floor(tick / 4) % 4
      ],
      length: unit * 0.7,
      gain: 0.09,
      voice: "triangle",
    });
  }
  return notes;
}
