export class CustomAudioAnalyzer {
  rms: number = 0;
  kick: number = 0;
  kickThreshold: number = 0.5;
  kickDecay: number = 200; // ms
  kickLag: number = 0;
  onKick?: () => void;
  private lastKickTime: number = 0;
  deltaTime: number = 0;
  lastTimeStamp: number = 0;
  kickCount: number = 0;
  allRms: number = 0;
  allLow: number = 0;
  allMid: number = 0;
  allHigh: number = 0;
  sampleRate: number = 60;

  levels: {
    low: number[];
    mid: number[];
    high: number[];
  } = {
    low: [],
    mid: [],
    high: [],
  };

  averageLevels: {
    low: number;
    mid: number;
    high: number;
  } = {
    low: 0,
    mid: 0,
    high: 0,
  };

  constructor(kickThreshold?: number, kickDecay?: number, onKick?: () => void) {
    if (kickThreshold !== undefined) this.kickThreshold = kickThreshold;
    if (kickDecay !== undefined) this.kickDecay = kickDecay;
    if (onKick) this.onKick = onKick;
    this.deltaTime = 0;
    this.lastTimeStamp = Date.now();
  }

  setFrequncyLevels(low: number, mid: number, high: number) {
    this.allLow += low / 128 / this.sampleRate;
    this.allMid += mid / 128 / this.sampleRate;
    this.allHigh += high / 128 / this.sampleRate;
  }

  setRms(rms: number) {
    this.deltaTime = Date.now() - this.lastTimeStamp;
    this.lastTimeStamp = Date.now();
    this.allRms += (rms * 10) / this.sampleRate;

    this.rms = rms;
    const now = Date.now();

    if (this.kick > 0 && this.kickLag > 0) {
      this.kick -= this.deltaTime / this.kickLag;
      if (this.kick < 0) this.kick = 0;
    }

    if (rms >= this.kickThreshold && now - this.lastKickTime > this.kickDecay) {
      this.kick = 1;
      this.kickCount++;
      this.lastKickTime = now;
      if (this.onKick) this.onKick();
    }
  }
}
