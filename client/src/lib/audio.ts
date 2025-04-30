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
    return;
    this.levels.low.push(low);
    this.levels.mid.push(mid);
    this.levels.high.push(high);

    if (this.levels.low.length > 10) this.levels.low.shift();
    if (this.levels.mid.length > 10) this.levels.mid.shift();
    if (this.levels.high.length > 10) this.levels.high.shift();

    this.averageLevels.low =
      this.levels.low.reduce((a, b) => a + b, 0) / this.levels.low.length;
    this.averageLevels.mid =
      this.levels.mid.reduce((a, b) => a + b, 0) / this.levels.mid.length;
    this.averageLevels.high =
      this.levels.high.reduce((a, b) => a + b, 0) / this.levels.high.length;

    if (this.levels.low.length < 10) {
      return;
    }

    this.deltaTime = Date.now() - this.lastTimeStamp;
    this.lastTimeStamp = Date.now();

    this.rms = high;
    const now = Date.now();

    if (this.kick > 0 && this.kickLag > 0) {
      this.kick -= this.deltaTime / this.kickLag;
      if (this.kick < 0) this.kick = 0;
    }

    if (
      high > 0.02 &&
      high > this.averageLevels.high * 1.3 &&
      Math.abs(high - this.averageLevels.high) > 2 &&
      now - this.lastKickTime > this.kickDecay
    ) {
      console.log("Kick!", high, this.averageLevels.high);
      this.kick = 1;
      this.lastKickTime = now;
      if (this.onKick) {
        this.onKick();
      }
    }

    // if (high > 0.02 && high > this.averageLevels.high * 1.2) {
    //   console.log("Kick!", high, this.averageLevels.high);
    // }
  }

  setRms(rms: number) {
    this.deltaTime = Date.now() - this.lastTimeStamp;
    this.lastTimeStamp = Date.now();

    this.rms = rms;
    const now = Date.now();

    if (this.kick > 0 && this.kickLag > 0) {
      this.kick -= this.deltaTime / this.kickLag;
      if (this.kick < 0) this.kick = 0;
    }

    if (rms >= this.kickThreshold && now - this.lastKickTime > this.kickDecay) {
      this.kick = 1;
      this.lastKickTime = now;
      if (this.onKick) this.onKick();
    }
  }
}
