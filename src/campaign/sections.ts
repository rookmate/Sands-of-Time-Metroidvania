import type { Puzzle, Section } from "./types";

const gate = { x: 1540, y: 330, w: 38, h: 320 };
const crank = (label: string): Puzzle => ({
  kind: "crank",
  controls: [
    { x: 470, y: 650, label, target: 2, steps: 4 },
    { x: 850, y: 650, label: "Raise the mechanism", target: 1, steps: 3 },
  ],
});
const timed: Puzzle = {
  kind: "timed",
  lever: { x: 430, y: 650 },
  gate,
  seconds: 5,
};
const crate: Puzzle = {
  kind: "crate",
  crate: { x: 470, y: 602, w: 48, h: 48 },
  plate: { x: 960, y: 650 },
  gate,
};
const paired: Puzzle = {
  kind: "paired",
  prince: { x: 650, y: 650 },
  farah: { x: 1100, y: 650 },
  gate,
};

// The 40 milestones follow IGN's ten-part walkthrough. Room layouts and prose are
// authored for this 2D adaptation; the list is a coverage contract, not a quotation.
export const SECTIONS: Section[] = [
  {
    id: "siege",
    title: "Outside the Palace",
    part: "I",
    layout: "courtyard",
    theme: "palace",
    objective: "Cross the siege and enter the Maharajah’s palace.",
    story:
      "I rode ahead of my father’s army, certain that glory waited inside those walls. I had not yet learned what a victory could cost.",
  },
  {
    id: "treasury",
    title: "The Maharajah’s Treasure Vaults",
    part: "I",
    layout: "terraces",
    theme: "throne",
    item: "dagger",
    objective: "Climb to the Dagger, then leave the treasure vault.",
    story:
      "The Dagger turned in my hand. Falling stone rose again, and the moment gave me another chance. I took it as a prize.",
  },
  {
    id: "release",
    title: "You Have Unleashed the Sands of Time",
    part: "I",
    layout: "hall",
    theme: "corrupt",
    puzzle: { kind: "battle", waves: 1 },
    objective: "Survive the first transformed guards.",
    story:
      "In Azad, the Vizier urged me to open the Hourglass. I obeyed. The Sands poured through the court, and everything living began to change.",
  },
  {
    id: "glimpse",
    title: "Had I Really Seen Her?",
    part: "I",
    layout: "courtyard",
    theme: "palace",
    reward: "slow",
    objective: "Follow the woman through the ruined royal wing.",
    story:
      "The young woman had tried to warn me. Now she slipped through the falling palace, protected by a medallion. She knew what I had released.",
  },
  {
    id: "passage",
    title: "A Secret Passage",
    part: "II",
    layout: "hall",
    theme: "water",
    puzzle: crank("Turn the axle platform"),
    objective: "Align and raise the palace defense mechanism.",
    story:
      "A surviving guard guided me through the ancient machinery. Together we woke the defenses, hoping they would hold back the creatures.",
  },
  {
    id: "defenses",
    title: "The Palace’s Defense System",
    part: "II",
    layout: "hall",
    theme: "palace",
    puzzle: timed,
    objective: "Open the timed gate and cross the trap corridor.",
    story:
      "The defenses did not know friend from foe. The doors began to fall, and the blades swept through the passage I had to cross.",
  },
  {
    id: "trapped-yard",
    title: "A Booby-Trapped Courtyard",
    part: "II",
    layout: "courtyard",
    theme: "garden",
    objective: "Cross the courtyard terraces and reach the reception hall.",
    story:
      "Beyond the courtyard I heard fighting. The woman stood alone among the creatures. One of them wore my father’s crown.",
  },
  {
    id: "sand-king",
    arrival: "following",
    title: "Death of a Sand King",
    part: "II",
    layout: "hall",
    theme: "corrupt",
    puzzle: { kind: "battle", waves: 1, boss: "king" },
    reward: "freeze",
    companion: "following",
    objective: "Defeat the transformed King Shahraman.",
    story:
      "My father fell by my hand. Farah lowered her bow. She asked me to help return the Sands to the Hourglass, and this time I listened.",
  },
  {
    id: "way-in",
    title: "I’ll Try to Find a Way In",
    part: "II",
    layout: "hall",
    theme: "garden",
    puzzle: paired,
    objective: "Ask Farah to hold her switch while you open the gate.",
    story:
      "She could pass where I could not. I could reach ledges beyond her grasp. For the first time, we had to trust one another.",
  },
  {
    id: "early-tower",
    title: "Climbing the Tower",
    part: "III",
    layout: "tower",
    theme: "tower",
    objective: "Climb the terraces to the tower’s upper passage.",
    story:
      "The Hourglass had been carried toward the distant Tower of Dawn. Every roof and stair brought us a little closer.",
  },
  {
    id: "warehouse",
    title: "The Warehouse",
    part: "III",
    layout: "hall",
    theme: "palace",
    puzzle: crate,
    objective:
      "Hold {interact} and move to drag the crate onto the pressure plate.",
    story:
      "We shifted the palace stores to hold the gate. Farah watched the crack beyond it, already planning another way through.",
  },
  {
    id: "zoo",
    title: "The Sultan’s Zoo",
    part: "III",
    layout: "hall",
    theme: "garden",
    puzzle: paired,
    objective: "Work with Farah to open the animal enclosure.",
    story:
      "The cages were broken, but their occupants had not escaped the Sands. Above us, wings stirred in the dark.",
  },
  {
    id: "aviary",
    title: "Atop a Bird Cage",
    part: "III",
    layout: "swing",
    theme: "garden",
    objective: "Swing between the bars and ropes to cross the aviary.",
    story:
      "I climbed the great cage while Farah found the release below. The birds circled as if the palace itself were their prison.",
  },
  {
    id: "cliffs",
    title: "Cliffs and Waterfall",
    part: "III",
    layout: "swing",
    theme: "water",
    objective: "Cross the cliff ropes and fend off the sand birds.",
    story:
      "Water still ran beneath the cliffs. Its sound was almost ordinary, and for a moment we could imagine a world beyond the curse.",
  },
  {
    id: "baths-main",
    title: "The Baths",
    part: "IV",
    layout: "hall",
    theme: "water",
    objective: "Find the steam chambers beyond the Baths rotunda.",
    story:
      "The rotunda held a drowned stair and a barred grate. Farah pointed out the steam chambers. The waterkeepers must have left another way through.",
  },
  {
    id: "bathworks",
    title: "There’s Something Glowing up There",
    part: "IV",
    layout: "hall",
    theme: "water",
    objective:
      "Open the reservoir intake, then drain the Baths at the sluice wheel.",
    story:
      "The water fell away, exposing a route above the baths. A blade glimmered beyond the broken masonry.",
  },
  {
    id: "upper-baths",
    title: "Above the Baths",
    part: "IV",
    layout: "library",
    theme: "palace",
    item: "sword",
    reward: "dash",
    objective: "Climb to the stronger sword and break through the sealed wall.",
    story:
      "The new sword could break walls that had stopped us before. What looked like a dead end became a passage beneath the palace.",
  },
  {
    id: "daybreak",
    title: "Daybreak",
    part: "IV",
    layout: "hall",
    theme: "throne",
    puzzle: {
      kind: "wall",
      wall: { x: 1540, y: 330, w: 45, h: 320 },
      sword: 2,
    },
    objective: "Strike the cracked wall with your upgraded sword.",
    story:
      "Dawn found us far from safety. We followed the buried passage toward the soldiers’ quarters, hearing movement beyond the stone.",
  },
  {
    id: "mess-hall",
    title: "A Soldiers’ Mess Hall",
    part: "IV",
    layout: "hall",
    theme: "palace",
    puzzle: { kind: "battle", waves: 2 },
    objective: "Clear the mess hall and protect Farah.",
    story:
      "These guards had once shared meals beneath the Sultan’s roof. Now they rose again and again until we reclaimed their sand.",
  },
  {
    id: "drawbridge",
    title: "The Drawbridge",
    part: "V",
    layout: "drawbridge",
    theme: "tower",
    puzzle: { ...paired, farah: { x: 1370, y: 650 } },
    objective: "Coordinate the bridge controls with Farah.",
    story:
      "Farah held the far control as the bridge turned into place. Each of us had to move before the other could follow.",
  },
  {
    id: "broken-bridge",
    arrival: "separated",
    title: "A Broken Bridge",
    part: "V",
    layout: "bridge",
    theme: "corrupt",
    companion: "separated",
    objective: "Cross the collapsing spans with jump and Time Dash.",
    story:
      "The bridge gave way between us. Farah called that she would find the baths. I watched the last stones fall, then looked for a way down.",
  },
  {
    id: "meet-baths",
    title: "I’ll Meet You at the Baths",
    part: "V",
    layout: "swing",
    theme: "palace",
    objective: "Traverse the exposed beams and swinging bars.",
    story:
      "I crossed what remained of the palace’s frame. Every creak beneath my feet made Farah’s distant voice seem farther away.",
  },
  {
    id: "falls-descent",
    title: "Waterfall",
    part: "V",
    layout: "descent",
    theme: "water",
    objective: "Descend the ledges beside the waterfall.",
    story:
      "The way to the baths led downward, through wet stone and falling water. I could only hope Farah had found an easier path.",
  },
  {
    id: "ladder-cavern",
    title: "A Cavern of Ladders",
    part: "VI",
    layout: "ladder",
    theme: "water",
    objective:
      "Catch each ladder and hold jump to climb. Move sideways to dismount.",
    story:
      "Ladders climbed out of the underground dark. Their builders had left no sign of where the next shaft would lead.",
  },
  {
    id: "reservoir",
    title: "An Underground Reservoir",
    part: "VI",
    layout: "ferry",
    theme: "water",
    objective: "Slow the ferry and ride the rising lift across the reservoir.",
    story:
      "The cistern machinery still moved. I borrowed a little time from the Dagger and crossed the waterworks one platform at a time.",
  },
  {
    id: "well",
    title: "Out of the Well",
    part: "VI",
    layout: "tower",
    theme: "water",
    objective: "Climb out through the well’s broken terraces.",
    story:
      "At last I saw daylight above the shaft. Somewhere beyond it was the palace, and somewhere in the palace was Farah.",
  },
  {
    id: "harem",
    arrival: "following",
    title: "The Sultan’s Harem",
    part: "VI",
    layout: "hall",
    theme: "palace",
    companion: "following",
    puzzle: paired,
    objective: "Reunite with Farah and open the screened passage.",
    story:
      "She was alive. Neither of us said how afraid we had been. We returned to the work of opening a way forward.",
  },
  {
    id: "reunion",
    title: "What Did You Call Me?",
    part: "VI",
    layout: "terraces",
    theme: "garden",
    objective: "Cross the terraces toward the Hall of Learning.",
    story:
      "Farah laughed at something I said. The sound surprised us both. For a little while, we spoke as if this were an ordinary journey.",
  },
  {
    id: "learning",
    title: "The Hall of Learning",
    part: "VII",
    layout: "library",
    theme: "palace",
    puzzle: {
      kind: "mirror",
      controls: [
        { x: 400, y: 650 },
        { x: 740, y: 650 },
        { x: 1250, y: 650 },
      ],
      mirrors: [
        { x: 500, y: 420 },
        { x: 500, y: 600 },
        { x: 1250, y: 600 },
      ],
      target: { x: 1100, y: 330 },
      movable: 2,
    },
    objective:
      "Rotate the mirrors. Hold down + {interact} and move to slide the last mirror beneath the receiver.",
    story:
      "A thread of sunlight unlocked the library. We guided it between mirrors, and the great machinery answered with a slow turning of stone.",
  },
  {
    id: "orrery",
    title: "Observatory",
    part: "VII",
    layout: "library",
    theme: "tower",
    puzzle: crank("Rotate the planetary orbits"),
    objective: "Align the planetary controls and climb the revealed platforms.",
    story:
      "The planets turned above us. Farah opened the stair, and I crossed the suspended paths toward the outer walls.",
  },
  {
    id: "learning-yard",
    title: "Hall of Learning Courtyards",
    part: "VII",
    layout: "swing",
    theme: "garden",
    objective: "Cross the courtyard ropes to reach the ramparts.",
    story:
      "The Tower of Dawn stood close enough to touch, or so it seemed. There were still walls, gaps, and creatures between us and its gate.",
  },
  {
    id: "ramparts",
    arrival: "separated",
    title: "On the Ramparts",
    part: "VII",
    layout: "hall",
    theme: "corrupt",
    puzzle: timed,
    companion: "separated",
    objective: "Race the gate and reach the broken rampart.",
    story:
      "Farah slipped beneath the gate. I took the ledge outside. The masonry broke under my weight, and the palace swallowed me again.",
  },
  {
    id: "prison",
    title: "A Prisoner Seeking an Escape",
    part: "VIII",
    layout: "prison",
    theme: "corrupt",
    puzzle: {
      kind: "columns",
      levers: [
        { x: 380, y: 650 },
        { x: 570, y: 650 },
      ],
      seconds: 10,
    },
    objective:
      "Pull both levers, then climb the retracting columns before they sink.",
    story:
      "I woke among cells and instruments I did not wish to name. The exit lay above a machine that would not wait for me.",
  },
  {
    id: "tower-lift",
    arrival: "following",
    title: "At Last We’re Here!",
    part: "VIII",
    layout: "elevator",
    theme: "tower",
    companion: "following",
    puzzle: { kind: "battle", waves: 3, elevator: true },
    objective: "Ride the elevator and defend Farah through every wave.",
    story:
      "We entered the Tower together. The floor began to rise, and the creatures came from every side. We had to keep one another alive.",
  },
  {
    id: "hourglass",
    title: "The Hourglass",
    part: "VIII",
    layout: "library",
    theme: "throne",
    companion: "gone",
    objective: "Reach the Hourglass with Farah.",
    story:
      "Farah told me how to return the Sands. I hesitated. The Vizier struck before I could trust her, and we fell into the dark beneath the tower.",
  },
  {
    id: "tomb",
    title: "The Tomb",
    part: "IX",
    layout: "hall",
    theme: "water",
    item: "sword",
    puzzle: {
      kind: "illusion",
      doors: [
        { x: 440, y: 650 },
        { x: 740, y: 650 },
        { x: 1040, y: 650 },
      ],
      sequence: [1, 0, 2],
    },
    objective:
      "Follow the water echoes through the illusion doors, then recover a sword.",
    story:
      "I woke alone. Farah had taken the Dagger and left her medallion. I found another sword, but time would no longer turn at my command.",
  },
  {
    id: "pursuit",
    title: "Farah, Come Back!",
    part: "IX",
    layout: "courtyard",
    theme: "palace",
    puzzle: {
      kind: "wall",
      wall: { x: 1540, y: 330, w: 45, h: 320 },
      sword: 3,
    },
    objective: "Break through and pursue Farah without time powers.",
    story:
      "I saw her making for the Tower. She had gone to finish what I had been afraid to do. I called after her and began the climb.",
  },
  {
    id: "dawn-climb",
    title: "Climbing the Tower of Dawn",
    part: "IX",
    layout: "swing",
    theme: "tower",
    objective: "Climb the exposed bars and ropes without the Dagger.",
    story:
      "No rewind waited beneath a missed handhold. I climbed with only the sword, the stone, and the hope that I was not too late.",
  },
  {
    id: "sunset",
    title: "The Setting Sun",
    part: "IX",
    layout: "terraces",
    theme: "throne",
    puzzle: { kind: "battle", waves: 2, recovery: { x: 1650, y: 650 } },
    companion: "dead",
    objective:
      "Reach Farah, recover the Dagger, and reclaim the final chamber.",
    story:
      "I caught the blade as she fell. Farah let go to save me. With the last creatures defeated, I drove the Dagger into the Hourglass and sent the Sands back to the beginning.",
  },
  {
    id: "honor",
    title: "Honor and Glory",
    part: "X",
    layout: "hall",
    theme: "throne",
    companion: "restored",
    puzzle: { kind: "vizier" },
    objective: "Defeat three doubles, then confront the exhausted Vizier.",
    story:
      "Before the invasion, I found Farah and told her the story. The Vizier came to silence us. When he fell, I returned the Dagger. Only I remembered what we had shared.",
  },
];

export const SECTION_BY_ID = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));
export const CAMPAIGN_START = { room: "siege", x: 190, y: 594 };
