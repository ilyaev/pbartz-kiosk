import React from "react";

interface Props {
  url: string;
  playback?: boolean;
  children?: React.ReactNode;
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

analyser.fftSize = bufferSize; // Match fftSize to bufferSize (or use a larger power of 2)
analyser.smoothingTimeConstant = 0.9; // No smoothing

const buffer = new Float32Array(bufferSize);
const frequencyData = new Float32Array(analyser.frequencyBinCount); // For getFloatFrequencyData
const numBuckets = 7; // Number of buckets
const bucketSize = Math.floor(frequencyData!.length / numBuckets);

export class AudioPlayer extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
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
    const bars = calculateSpectorgram();

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

function calculateSpectorgram() {
  // return [0.1, 0.3, 0, 0.2, 0.25, 0.12, 0.2];
  analyser.getFloatFrequencyData(frequencyData!); // Get data in dB

  const bars = [];

  for (let i = 0; i < numBuckets; i++) {
    const startIdx = i * bucketSize;
    const endIdx = startIdx + bucketSize;
    const bucketData = frequencyData!.slice(startIdx, endIdx);
    const avgValue =
      bucketData.reduce((sum, value) => sum + value, 0) / bucketData.length;
    const normalizedValue = (avgValue + 100) / 100; // Normalize to [0, 1]
    bars.push(normalizedValue);
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
