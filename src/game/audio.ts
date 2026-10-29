import type { Options } from "./types";
export class Sound {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicClock = 0;
  private noteIndex = 0;
  constructor(public options: Options) {}
  start() {
    this.context ??= new AudioContext();
    if (!this.master) {
      this.master = this.context.createGain();
      this.master.gain.value = 0.19;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === "suspended") void this.context.resume();
  }
  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    gain = 0.3,
    endFrequency?: number,
  ) {
    if (!this.context || !this.master) return;
    const t = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, t);
    if (endFrequency)
      oscillator.frequency.exponentialRampToValueAtTime(
        endFrequency,
        t + duration,
      );
    envelope.gain.setValueAtTime(0.001, t);
    envelope.gain.exponentialRampToValueAtTime(gain, t + 0.018);
    envelope.gain.exponentialRampToValueAtTime(0.001, t + duration);
    oscillator.connect(envelope);
    envelope.connect(this.master);
    oscillator.start(t);
    oscillator.stop(t + duration + 0.01);
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
    if (!this.options.sfx) return;
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
  update(dt: number, active: boolean) {
    if (!active || !this.options.music || !this.context) return;
    this.musicClock -= dt;
    if (this.musicClock > 0) return;
    this.musicClock = 0.55;
    const scale = [146.83, 164.81, 174.61, 220, 233.08, 293.66, 349.23, 329.63];
    const pattern = [0, 3, 5, 2, 4, 3, 1, 0, 5, 6, 4, 3, 7, 5, 3, 1];
    this.tone(
      scale[pattern[this.noteIndex % pattern.length]],
      1.5,
      "sine",
      0.09,
    );
    if (this.noteIndex % 8 === 0) this.tone(73.42, 5, "sine", 0.12);
    this.noteIndex++;
  }
}
