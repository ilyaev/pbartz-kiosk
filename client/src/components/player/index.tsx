import React from "react";
import { FFT } from "../../lib/fft";

interface Props {
  url: string;
  playback?: boolean;
  children?: React.ReactNode;
  frequencyBuckets?: number;
  bufferSize?: number;
  smoothingAlpha?: number;
  linearScale?: number;
  kickDecay?: number;
  kickThreshold?: number;
}

interface State {
  isPlaying: boolean;
  rms: number;
  zcr: number;
  bars: number[];
  kick: number;
}

export class AudioPlayer extends React.Component<Props, State> {
  numBuckets: number;
  fft: FFT = new FFT();
  analyser: AnalyserNode;
  bufferSize: number;
  buffer: Float32Array<ArrayBuffer>;
  audioContext: AudioContext;
  frequency: number[] = [] as number[];
  kickDecay: number = 0;
  deltaTime: number = 0;
  lastTime: number = performance.now();
  prevRms: number = 0;
  constructor(props: Props) {
    super(props);
    this.audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.bufferSize = props.bufferSize || 1024;

    this.analyser.fftSize = this.bufferSize; // Match fftSize to bufferSize (or use a larger power of 2)
    this.analyser.smoothingTimeConstant = 0.91; // No smoothing

    this.buffer = new Float32Array(this.bufferSize);

    this.numBuckets = props.frequencyBuckets || 7; // Number of buckets

    this.fft = new FFT(this.bufferSize);

    this.state = {
      isPlaying: false,
      rms: 0,
      zcr: 0,
      bars: [],
      kick: 0,
    };
  }

  loadData(): void {
    fetch(this.props.url)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => this.audioContext.decodeAudioData(arrayBuffer))
      .then((audioBuffer) => {
        const bufferSource = this.audioContext.createBufferSource();
        bufferSource.buffer = audioBuffer;
        bufferSource.connect(this.analyser);
        if (this.props.playback) {
          bufferSource.connect(this.audioContext.destination); // Connect to destination for playback
        }
        bufferSource.start(0);

        for (let k = 0; k < this.props.bufferSize! / 2; k++) {
          const fk =
            k * (this.audioContext.sampleRate / this.props.bufferSize!);
          this.frequency[k] = fk;
        }

        this.updateVisualization(); // Start the visualization loop
        this.setState({ isPlaying: true });
      })
      .catch((err) => console.error("Error loading audio file:", err));
  }

  normalizeWaveformShape() {
    if (!this.analyser || !this.buffer) {
      console.error("Analyser or buffer not initialized.");
      return;
    }

    // 1. Get the latest waveform data
    this.analyser.getFloatTimeDomainData(this.buffer);

    // 2. Find the maximum absolute value in the buffer
    let maxAbsValue = 0.0;
    for (let i = 0; i < this.buffer.length; i++) {
      const absValue = Math.abs(this.buffer[i]);
      if (absValue > maxAbsValue) {
        maxAbsValue = absValue;
      }
      // Alternative shorter syntax:
      // maxAbsValue = Math.max(maxAbsValue, Math.abs(this.buffer[i]));
    }

    // 3. Normalize if the buffer isn't essentially silent
    // Use a small epsilon to avoid division by zero or near-zero
    const epsilon = 1e-6;
    if (maxAbsValue > epsilon) {
      // Divide each sample by the max absolute value found in this buffer
      for (let i = 0; i < this.buffer.length; i++) {
        this.buffer[i] = this.buffer[i] / maxAbsValue;
      }
      // Now the peak value(s) in the buffer will be exactly 1.0 or -1.0
    } else {
      for (let i = 0; i < this.buffer.length; i++) {
        this.buffer[i] = 0.0;
      }
    }

    // Now this.buffer contains the waveform data normalized relative to its
    // own peak within this specific time slice, maintaining the [-1, 1] range.
    // Quiet sounds will be scaled up to fill the range, loud sounds scaled down.
    // The SHAPE relative to the buffer's peak is consistent.
    // console.log("Shape-Normalized buffer (first 10):", this.buffer.slice(0, 10));
  }

  updateVisualization() {
    this.deltaTime = performance.now() - this.lastTime;
    this.lastTime = performance.now();
    // this.analyser.getFloatTimeDomainData(this.buffer);
    this.normalizeWaveformShape();
    const rms = calculateRMS(this.buffer);
    const zcr = calculateZCR(this.buffer);
    const bars = calculateSpectorgram(
      this.numBuckets,
      this.fft,
      this.analyser,
      this.props.smoothingAlpha,
      this.props.linearScale
    );

    let kick = this.state.kick;

    if (
      this.prevRms > rms &&
      rms > (this.props.kickThreshold || 0.38) &&
      this.kickDecay === 0
    ) {
      this.kickDecay = (this.props.kickDecay || 0.1) * 1000;
      console.log("Kiuck!", rms, this.kickDecay);
      kick = 1;
    } else {
      kick = 0;
    }
    this.prevRms = rms;
    if (this.kickDecay > 0) {
      this.kickDecay = Math.max(0, this.kickDecay - this.deltaTime);
    }

    this.setState({ rms, zcr, bars, kick });

    requestAnimationFrame(this.updateVisualization.bind(this));
  }

  render() {
    const { rms, zcr, bars, kick } = this.state;
    return this.state.isPlaying ? (
      React.Children.map(this.props.children, (child) =>
        React.cloneElement(child as React.ReactElement, {
          rms,
          zcr,
          bars,
          kick,
        })
      )
    ) : (
      <div
        onClick={() => this.loadData()}
        style={{
          position: "absolute",
          width: "100%",
          height: "50%",
          backgroundColor: "black",
          opacity: 1,
          color: "white",
        }}
      >
        Click here to start audio visualization
      </div>
    );
  }
}

const sample = new Float32Array(512).fill(0);

const smoothValueFunction = (
  prevValue: number,
  newValue: number,
  alpha: number
) => {
  return alpha * prevValue + (1 - alpha) * newValue;
};

function calculateSpectorgram(
  numBuckets: number,
  fft: FFT,
  analyser: AnalyserNode,
  smoothingAlpha: number = 0.5,
  linearScale: number = 1
) {
  const dataArray = new Uint8Array(analyser.frequencyBinCount * 2);
  const inWaveData = new Float32Array(dataArray.length);
  const outSpectralData = new Float32Array(analyser.frequencyBinCount);

  analyser.getByteTimeDomainData(dataArray);

  const data = dataArray;

  for (let i = 0; i < dataArray.length; i++) {
    inWaveData[i] = (data[i] - 128) / 24;
  }

  fft.timeToFrequencyDomain(inWaveData, outSpectralData);

  ///
  const targetSize = numBuckets;
  const maxFreqIndex = analyser.frequencyBinCount;
  const logMaxFreqIndex = Math.log10(maxFreqIndex);
  const logMinFreqIndex = 0;

  const alpha = smoothingAlpha;
  const scale = linearScale; // Adjust this value between 0.0 and 1.0

  for (let x = 0; x < targetSize; x++) {
    // Linear interpolation between linear and log scaling
    const linearIndex = (x / (targetSize - 1)) * (maxFreqIndex - 1);
    const logScaledIndex =
      logMinFreqIndex +
      ((logMaxFreqIndex - logMinFreqIndex) * x) / (targetSize - 1);
    const logIndex = Math.pow(10, logScaledIndex);

    // Interpolating between linear and logarithmic scaling
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
      sample[x] = smoothValueFunction(
        sample[x],
        outSpectralData[index1],
        alpha
      );
    } else {
      const frac2 = scaledIndex - index1;
      const frac1 = 1.0 - frac2;
      sample[x] = smoothValueFunction(
        sample[x],
        frac1 * outSpectralData[index1] + frac2 * outSpectralData[index2],
        alpha
      );
    }
  }

  return sample.map((value) => value / 128) as number[];
}

function calculateRMS(data: Float32Array<ArrayBuffer>) {
  // return 0.1;

  let sumOfSquares = 0;
  for (const amplitude of data) {
    sumOfSquares += amplitude * amplitude;
  }
  // console.log("RMS", sumOfSquares, data.length);
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
