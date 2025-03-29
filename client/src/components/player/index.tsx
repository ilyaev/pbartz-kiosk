import React from "react";
import { FFT } from "../../lib/fft";

interface Props {
  url: string;
  playback?: boolean;
  children?: React.ReactNode;
  frequencyBuckets?: number;
}

interface State {
  isPlaying: boolean;
  rms: number;
  zcr: number;
  bars: number[];
}

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioContext.createAnalyser();
const sampleRate = audioContext.sampleRate;
const windowSizeSeconds = 0.02; // 20ms, to have >= 1024 samples
let bufferSize = Math.round(sampleRate * windowSizeSeconds);

if (bufferSize < 1024) {
  bufferSize = 1024;
}
if (bufferSize < 2048) {
  bufferSize = 2048;
}

bufferSize = 1024;

analyser.fftSize = bufferSize; // Match fftSize to bufferSize (or use a larger power of 2)
analyser.smoothingTimeConstant = 0.91; // No smoothing

const buffer = new Float32Array(bufferSize);
const frequencyData = new Float32Array(analyser.frequencyBinCount); // For getFloatFrequencyData

export class AudioPlayer extends React.Component<Props, State> {
  numBuckets: number;
  bucketSize: number;
  fft: FFT = new FFT();
  constructor(props: Props) {
    super(props);

    this.numBuckets = props.frequencyBuckets || 7; // Number of buckets
    this.bucketSize = Math.floor(frequencyData!.length / this.numBuckets);

    this.state = {
      isPlaying: false,
      rms: 0,
      zcr: 0,
      bars: [],
    };
  }

  loadData(): void {
    fetch(this.props.url)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
      .then((audioBuffer) => {
        const bufferSource = audioContext.createBufferSource();
        bufferSource.buffer = audioBuffer;
        bufferSource.connect(analyser);
        if (this.props.playback) {
          bufferSource.connect(audioContext.destination); // Connect to destination for playback
        }
        bufferSource.start(0);

        this.updateVisualization(); // Start the visualization loop
        this.setState({ isPlaying: true });
      })
      .catch((err) => console.error("Error loading audio file:", err));
  }

  updateVisualization() {
    analyser.getFloatTimeDomainData(buffer);

    const windowedBuffer = hanningWindow(buffer);

    const bufferSource = audioContext.createBufferSource();
    const audioBuffer = audioContext.createBuffer(1, bufferSize, sampleRate);
    audioBuffer.getChannelData(0).set(windowedBuffer);
    bufferSource.buffer = audioBuffer;
    const gainNode = audioContext.createGain(); //Prevent audio feedback
    gainNode.gain.value = 0;
    bufferSource.connect(gainNode);
    gainNode.connect(analyser);
    bufferSource.start(0); // Important, or analyser won't have new data.

    const rms = calculateRMS(buffer);
    const zcr = calculateZCR(buffer);
    const bars = calculateSpectorgram(
      this.numBuckets,
      this.bucketSize,
      this.fft
    );
    // console.log(rms, zcr);
    this.setState({ rms, zcr, bars });

    requestAnimationFrame(this.updateVisualization.bind(this));
  }

  render() {
    const { rms, zcr, bars } = this.state;
    return this.state.isPlaying ? (
      React.Children.map(this.props.children, (child) =>
        React.cloneElement(child as React.ReactElement, { rms, zcr, bars })
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

const sample = new Float32Array(76).fill(0);
const samples = new Array<Float32Array>(100);
for (let i = 0; i < 100; i++) {
  samples[i] = new Float32Array(76).fill(0);
}

const smoothValue = 5;
let smoothIndex = 0;

const smoothValueFunction = (
  prevValue: number,
  newValue: number,
  alpha: number
) => {
  return alpha * prevValue + (1 - alpha) * newValue;
};

function calculateSpectorgram(
  numBuckets: number,
  bucketSize: number,
  fft: FFT
) {
  // return [0.1, 0.3, 0, 0.2, 0.25, 0.12, 0.2];

  const dataArray = new Uint8Array(1024);
  const inWaveData = new Float32Array(dataArray.length);
  const outSpectralData = new Float32Array(512);

  analyser.getByteTimeDomainData(dataArray);

  const data = hanningWindow(dataArray);

  for (let i = 0; i < dataArray.length; i++) {
    inWaveData[i] = (data[i] - 128) / 24;
  }

  fft.timeToFrequencyDomain(inWaveData, outSpectralData);

  ///
  const targetSize = numBuckets;
  const maxFreqIndex = 512;
  const logMaxFreqIndex = Math.log10(maxFreqIndex);
  const logMinFreqIndex = 0;

  const alpha = 0.95;

  // const sample = new Float32Array(targetSize);
  const scale = 0.91; // Adjust this value between 0.0 and 1.0
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
      // sample[x] = outSpectralData[index1]; // + sample[x];
    } else {
      const frac2 = scaledIndex - index1;
      const frac1 = 1.0 - frac2;
      sample[x] = smoothValueFunction(
        sample[x],
        frac1 * outSpectralData[index1] + frac2 * outSpectralData[index2],
        alpha
      );
      // sample[x] =
      //   // sample[x] +
      //   frac1 * outSpectralData[index1] + frac2 * outSpectralData[index2];
    }
  }

  return sample.map((value) => value / 20);

  samples[smoothIndex] = new Float32Array(sample);

  const averagedSample = new Float32Array(targetSize).fill(0);
  for (let i = 0; i < smoothValue; i++) {
    for (let j = 0; j < targetSize; j++) {
      averagedSample[j] += samples[i][j];
    }
  }

  smoothIndex = (smoothIndex + 1) % smoothValue;

  return averagedSample.map((value) => value / 20 / smoothValue);

  ///

  // console.log({ dataArray, outSpectralData });

  analyser.getFloatFrequencyData(frequencyData!); // Get data in dB
  // console.log(frequencyData.length, numBuckets, bucketSize);
  const bars = [];

  for (let i = 0; i < numBuckets; i++) {
    const startIdx = i * bucketSize;
    const endIdx = startIdx + bucketSize;
    // const bucketData = frequencyData!.slice(startIdx, endIdx);
    const bucketData = outSpectralData!.slice(startIdx, endIdx);
    const avgValue =
      bucketData.reduce((sum, value) => sum + value, 0) / bucketData.length;
    // const normalizedValue = (avgValue + 140) / 140; // Normalize to [0, 1]
    bars.push(avgValue / 10);
  }

  return bars;
}

function hanningWindow(data: Float32Array<ArrayBuffer>) {
  const n = data.length;
  const windowedData = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const multiplier = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
    windowedData[i] = data[i] * multiplier;
  }
  return windowedData;
}

function calculateRMS(data: Float32Array<ArrayBuffer>) {
  // return 0.1;
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
