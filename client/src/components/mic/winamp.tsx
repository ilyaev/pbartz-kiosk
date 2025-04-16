import React from "react";
import { Component } from "react";
import { FFT } from "../../lib/fft";

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

export interface Props {
  mode?: string;
  children?: React.ReactNode;
  magnitude?: number;
  smoothingAlpha?: number;
  barsCount?: number;
  hanningWindow?: boolean;
  linearScale?: number;
  bufferSize?: number;
}

interface State {
  bars: number[];
  freqLevel: {
    low: number;
    mid: number;
    high: number;
    freqBins: Uint8Array;
  };
  rms: number;
  zcr: number;
  beatDetected: boolean;
  fps: number;
}

class Mic extends Component<Props, State> {
  private audioContext: AudioContext = new AudioContext();
  private animationFrameId: number | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private buffer: Uint8Array = new Uint8Array(0);
  private frequencyData: Float32Array = new Float32Array(2048).fill(0);
  private bufferSize: number = 0;
  private lastFrameTime: number = performance.now();
  private fps: number = 0;
  private fft: FFT = new FFT();
  private sample: Float32Array = new Float32Array(4096).fill(0);
  private floatBuffer: Float32Array<ArrayBuffer> = new Float32Array(1024);

  constructor(props: Props) {
    super(props);
    this.state = {
      bars: [],
      rms: 0,
      zcr: 0,
      fps: 0,
      freqLevel: {
        low: 0,
        mid: 0,
        high: 0,
        freqBins: new Uint8Array(4096),
      },
      beatDetected: false,
    };
  }

  componentDidMount() {
    this.audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    this.fft = new FFT(this.props.bufferSize || 1024);
    this.floatBuffer = new Float32Array(this.props.bufferSize || 1024);
    this.connectToAudioStream();
    this.startAnimation();
    console.log("Mic component mounted");
  }

  componentWillUnmount() {
    console.log("Mic component will unmount");
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.source?.disconnect();
      this.analyser?.disconnect();
    }
  }

  connectToAudioStream() {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        this.source = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();

        this.bufferSize = this.props.bufferSize || 1024;

        this.analyser.fftSize = this.bufferSize;
        this.analyser.smoothingTimeConstant = 0.85; //this.props.smoothingAlpha || 0.95;

        this.buffer = new Uint8Array(this.bufferSize);
        this.frequencyData = new Float32Array(this.analyser.frequencyBinCount);

        this.source.connect(this.analyser);
      })
      .catch((err) => {
        console.error("Error accessing audio stream:", err);
      });
  }

  startAnimation = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  animate = () => {
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.fps = 1000 / delta;
    this.lastFrameTime = now;

    if (this.analyser) {
      this.analyser.getByteTimeDomainData(this.buffer);
      this.analyser.getFloatTimeDomainData(this.floatBuffer);

      this.buffer = this.props.hanningWindow
        ? hanningWindow(this.buffer)
        : this.buffer;

      const bars = this.calculateFrequencyBars();
      const rms = calculateRMS(this.floatBuffer);
      const zcr = calculateZCR(this.floatBuffer);

      const freqLevel = this.calculateFrequencyLevels();

      this.setState({ bars, rms, zcr, fps: this.fps, freqLevel });
    }
    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  calculateFrequencyLevels() {
    const fd = new Uint8Array(this.analyser!.frequencyBinCount);
    this.analyser!.getByteFrequencyData(fd);

    const freqBins = this.analyser!.frequencyBinCount;

    const lowEnd = Math.floor(freqBins * 0.2); // Low frequencies (0-20%)
    const midStart = lowEnd;
    const midEnd = Math.floor(freqBins * 0.7); // Mid frequencies (20%-70%)
    const highStart = midEnd;

    const low = fd.slice(0, lowEnd).reduce((sum, val) => sum + val, 0) / lowEnd;
    const mid =
      fd.slice(midStart, midEnd).reduce((sum, val) => sum + val, 0) /
      (midEnd - midStart);
    const high =
      fd.slice(highStart).reduce((sum, val) => sum + val, 0) /
      (freqBins - highStart);

    return { low, mid, high, freqBins: fd };
  }

  calculateFrequencyBars(): number[] {
    const inWaveData = new Float32Array(this.buffer.length);

    for (let i = 0; i < this.buffer.length; i++) {
      inWaveData[i] = (this.buffer[i] - 128) / 24;
    }

    this.fft.timeToFrequencyDomain(inWaveData, this.frequencyData);

    const maxFreqIndex = this.bufferSize / 2;
    const logMaxFreqIndex = Math.log10(maxFreqIndex);
    const logMinFreqIndex = 0;
    const targetSize = this.props.barsCount || 7;

    const alpha = this.props.smoothingAlpha || 0.95;
    const scale = this.props.linearScale || 0.91;

    for (let x = 0; x < targetSize; x++) {
      const linearIndex = (x / (targetSize - 1)) * (maxFreqIndex - 1);
      const logScaledIndex =
        logMinFreqIndex +
        ((logMaxFreqIndex - logMinFreqIndex) * x) / (targetSize - 1);
      const logIndex = Math.pow(10, logScaledIndex);

      const scaledIndex = (1.0 - scale) * linearIndex + scale * logIndex;

      let index1 = Math.floor(scaledIndex);
      let index2 = Math.ceil(scaledIndex);

      if (index1 >= maxFreqIndex) {
        index1 = maxFreqIndex - 1;
      }
      if (index2 >= maxFreqIndex) {
        index2 = maxFreqIndex - 1;
      }

      if (index1 === index2) {
        this.sample[x] = smoothValueFunction(
          this.sample[x],
          this.frequencyData[index1],
          alpha
        );
      } else {
        const frac2 = scaledIndex - index1;
        const frac1 = 1.0 - frac2;
        this.sample[x] = smoothValueFunction(
          this.sample[x],
          frac1 * this.frequencyData[index1] +
            frac2 * this.frequencyData[index2],
          alpha
        );
      }
    }
    const res = [];
    for (let i = 0; i < targetSize; i++) {
      // res.push(Math.min(1, this.sample[i] / 16));
      res.push(this.sample[i] / 16);
    }
    return res;
  }

  render() {
    const { rms, zcr, bars, fps, freqLevel } = this.state;
    return React.Children.map(this.props.children, (child) =>
      React.cloneElement(child as React.ReactElement, {
        rms,
        zcr,
        bars,
        fps,
        freqLevel,
      })
    );
  }
}

function hanningWindow(data: Uint8Array<ArrayBuffer>) {
  const n = data.length;
  const windowedData = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const multiplier = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
    windowedData[i] = data[i] * multiplier;
  }
  return windowedData;
}

function calculateRMS(data: Float32Array<ArrayBuffer>) {
  let sumOfSquares = 0;
  for (const amplitude of data) {
    sumOfSquares += amplitude * amplitude;
  }
  return Math.sqrt(sumOfSquares / data.length);
}

function calculateZCR(data: Float32Array<ArrayBuffer>) {
  let zeroCrossings = 0;
  for (let i = 1; i < data.length; i++) {
    if (
      (data[i] >= 0 && data[i - 1] < 0) ||
      (data[i] < 0 && data[i - 1] >= 0)
    ) {
      zeroCrossings++;
    }
  }
  return zeroCrossings / (data.length - 1);
}

const smoothValueFunction = (
  prevValue: number,
  newValue: number,
  alpha: number
) => {
  return alpha * prevValue + (1 - alpha) * newValue;
};

export default Mic;
