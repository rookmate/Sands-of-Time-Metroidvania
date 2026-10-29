import type { Options, Screen } from "./types";
import { eighth, scoreStep, type MusicScene } from "./score";

interface Voice {
  oscillator: OscillatorNode;
  envelope: GainNode;
  bus: "music" | "sfx";
  end: number;
}
export class Sound {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private effects: GainNode | null = null;
  private voices = new Set<Voice>();
  private scene: MusicScene = { theme: "palace", danger: "calm" };
  private screen: Screen = "title";
  private blocked = false;
  private nextNote = 0;
  private step = 0;
  private dangerClock = 0;
  private quietUntil = 0;
  private playing = false;
  private effectsOn = false;
  constructor(public options: Options) {}
  // Called only from a user gesture. Unsupported/denied audio leaves play usable.
  start() {
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = 0.19;
        const limiter = this.context.createDynamicsCompressor();
        limiter.threshold.value = -12;
        limiter.knee.value = 8;
        limiter.ratio.value = 12;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.18;
        this.master.connect(limiter);
        limiter.connect(this.context.destination);
        this.music = this.context.createGain();
        this.effects = this.context.createGain();
        this.music.gain.value = this.effects.gain.value = 0;
        this.music.connect(this.master);
        this.effects.connect(this.master);
      }
      if (this.context.state === "suspended")
        void this.context.resume().catch(() => {});
    } catch {
      /* No audio device or Web Audio support. */
    }
  }
  private fade(node: GainNode, value: number, seconds = 0.12) {
    const t = this.context!.currentTime;
    node.gain.cancelAndHoldAtTime(t);
    node.gain.linearRampToValueAtTime(value, t + seconds);
  }
  private release(bus: Voice["bus"]) {
    const t = this.context!.currentTime;
    for (const v of this.voices)
      if (v.bus === bus && v.end > t + 0.04) {
        v.envelope.gain.cancelAndHoldAtTime(t);
        v.envelope.gain.linearRampToValueAtTime(0, t + 0.035);
        v.oscillator.stop(t + 0.04);
        v.end = t + 0.04;
      }
  }
  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    gain = 0.3,
    endFrequency?: number,
    bus: Voice["bus"] = "sfx",
    at?: number,
  ) {
    const ctx = this.context;
    if (
      !ctx ||
      ctx.state !== "running" ||
      !this.master ||
      this.voices.size >= 40
    )
      return;
    const t = at ?? ctx.currentTime;
    const oscillator = ctx.createOscillator(),
      envelope = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, t);
    if (endFrequency)
      oscillator.frequency.exponentialRampToValueAtTime(
        endFrequency,
        t + duration,
      );
    envelope.gain.setValueAtTime(0, t);
    envelope.gain.linearRampToValueAtTime(
      gain,
      t + Math.min(0.025, duration / 4),
    );
    envelope.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    envelope.gain.linearRampToValueAtTime(0, t + duration + 0.01);
    oscillator.connect(envelope);
    envelope.connect(bus === "music" ? this.music! : this.effects!);
    const voice = { oscillator, envelope, bus, end: t + duration + 0.02 };
    this.voices.add(voice);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
      this.voices.delete(voice);
    };
    oscillator.start(t);
    oscillator.stop(voice.end);
  }
  // Sync also runs immediately on screen/settings changes, before another frame.
  sync(screen: Screen, blocked: boolean) {
    this.screen = screen;
    this.blocked = blocked;
    if (!this.context || !this.music || !this.effects) return;
    const musicOn =
      this.options.music &&
      !blocked &&
      (screen === "playing" || screen === "ending");
    const sfxOn =
      this.options.sfx &&
      !blocked &&
      ["playing", "story", "death"].includes(screen);
    if (musicOn !== this.playing) {
      this.fade(this.music, musicOn ? 1 : 0);
      this.release("music");
      this.nextNote = this.context.currentTime + 0.06;
      this.step = 0;
      this.scene = { ...this.scene, danger: "calm" };
      this.dangerClock = 0;
      this.playing = musicOn;
    }
    if (sfxOn !== this.effectsOn) {
      this.fade(this.effects, sfxOn ? 1 : 0, 0.04);
      if (!sfxOn) this.release("sfx");
      this.effectsOn = sfxOn;
    }
  }
  play(
    kind:
      | "jump"
      | "attack"
      | "impact"
      | "hit"
      | "sand"
      | "power"
      | "save"
      | "death"
      | "step",
  ) {
    if (!this.blocked && (kind === "power" || kind === "save")) {
      this.quietUntil = (this.context?.currentTime ?? 0) + 2.2;
      if (this.music) this.fade(this.music, 0.22, 0.08);
    }
    if (!this.options.sfx || !this.effectsOn) return;
    switch (kind) {
      case "jump":
        this.tone(180, 0.15, "sine", 0.13, 330);
        break;
      case "attack":
        this.tone(390, 0.12, "triangle", 0.25, 70);
        break;
      case "impact":
        this.tone(850, 0.065, "triangle", 0.23, 180);
        this.tone(165, 0.1, "sine", 0.3, 60);
        break;
      case "hit":
        this.tone(100, 0.17, "sawtooth", 0.25, 38);
        break;
      case "sand":
        [520, 780, 1040].forEach((f) => this.tone(f, 0.5, "sine", 0.12));
        break;
      case "power":
        [146.83, 220, 293.66, 440].forEach((f) =>
          this.tone(f, 1.4, "sine", 0.17, f * 1.04),
        );
        break;
      case "save":
        [293.66, 349.23, 440, 587.33].forEach((f) =>
          this.tone(f, 1.6, "sine", 0.1),
        );
        break;
      case "death":
        this.tone(170, 1.3, "triangle", 0.25, 40);
        break;
      case "step":
        this.tone(70, 0.05, "triangle", 0.07);
        break;
    }
  }
  update(dt: number, scene: MusicScene) {
    this.sync(this.screen, this.blocked);
    const ctx = this.context;
    if (!ctx || ctx.state !== "running" || !this.playing) return;
    // Encounter entry is immediate; leaving danger waits 2.5 seconds to avoid
    // music flicker while jumping across the edge of an enemy's range.
    if (scene.danger === "calm" && this.scene.danger !== "calm")
      this.dangerClock += dt;
    else this.dangerClock = 0;
    const danger =
      scene.danger === "calm" && this.dangerClock < 2.5
        ? this.scene.danger
        : scene.danger;
    const next = { ...scene, danger };
    if (next.theme !== this.scene.theme || next.era !== this.scene.era) {
      this.release("music");
      this.step = 0;
      this.nextNote = ctx.currentTime + 0.08;
      this.dangerClock = 0;
      next.danger = scene.danger;
    }
    this.scene = next;
    // Use the audio clock, never accelerated simulation time. After a stalled
    // frame, skip the gap instead of emitting a backlog of notes.
    if (this.nextNote < ctx.currentTime)
      this.nextNote = ctx.currentTime + 0.025;
    if (this.nextNote > ctx.currentTime + 0.1) return;
    this.fade(this.music!, ctx.currentTime < this.quietUntil ? 0.22 : 1, 0.2);
    for (const note of scoreStep(this.scene, this.step))
      this.tone(
        440 * 2 ** ((note.midi - 69) / 12),
        note.length,
        note.voice,
        note.gain,
        undefined,
        "music",
        this.nextNote,
      );
    this.nextNote += eighth(this.scene);
    this.step++;
  }
}
