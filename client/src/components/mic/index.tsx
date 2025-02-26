import React from "react";
import { Component } from "react";

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

interface Props {
  children?: React.ReactNode;
  magnitude?: number;
}

interface State {
  bars: number[];
  rms: number;
  zcr: number;
  beatDetected: boolean;
}

class Mic extends Component<Props, State> {
  private audioContext: AudioContext = new AudioContext();
  private animationFrameId: number | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private buffer: Float32Array<ArrayBuffer> = new Float32Array(0);
  private frequencyData: Float32Array<ArrayBuffer> = new Float32Array(0);
  private sampleRate: number = 0;
  private bufferSize: number = 0;

  constructor(props: Props) {
    super(props);
    this.state = {
      bars: [],
      rms: 0,
      zcr: 0,
      beatDetected: false,
    };
  }

  componentDidMount() {
    this.audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    this.connectToAudioStream();
    this.startAnimation();
  }

  componentWillUnmount() {
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

        this.sampleRate = this.audioContext.sampleRate;
        const windowSizeSeconds = 0.0; // 20ms, to have >= 1024 samples
        this.bufferSize = Math.round(this.sampleRate * windowSizeSeconds);

        if (this.bufferSize < 1024) {
          this.bufferSize = 1024;
        }
        if (this.bufferSize < 2048) {
          this.bufferSize = 2048;
        }

        this.analyser.fftSize = this.bufferSize; // Match fftSize to bufferSize (or use a larger power of 2)
        this.analyser.smoothingTimeConstant = 0.85; // No smoothing

        this.buffer = new Float32Array(this.bufferSize);
        this.frequencyData = new Float32Array(this.analyser.frequencyBinCount); // For getFloatFrequencyData

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
    if (this.analyser) {
      this.analyser.getFloatTimeDomainData(this.buffer);

      const windowedBuffer = hanningWindow(this.buffer);

      const bufferSource = this.audioContext.createBufferSource();
      const audioBuffer = this.audioContext.createBuffer(
        1,
        this.bufferSize,
        this.sampleRate
      );
      audioBuffer.getChannelData(0).set(windowedBuffer);
      bufferSource.buffer = audioBuffer;
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 0;
      bufferSource.connect(gainNode);
      gainNode.connect(this.analyser);
      bufferSource.start(0);

      const bars = this.calculateSpectorgram();
      const rms =
        calculateRMS(this.buffer) *
        (this.props.magnitude ? this.props.magnitude : 1);
      const zcr = calculateZCR(this.buffer);
      const beatDetected = zcr > 0.1; // Example threshold for beat detection
      this.setState({ bars: bars, rms, zcr, beatDetected });
    }
    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  calculateSpectorgram() {
    this.analyser!.getFloatFrequencyData(this.frequencyData); // Get data in dB

    const bars = [];

    const numBuckets = 7; // Number of buckets
    const bucketSize = Math.floor(this.frequencyData.length / numBuckets);

    for (let i = 0; i < numBuckets; i++) {
      const startIdx = i * bucketSize;
      const endIdx = startIdx + bucketSize;
      const bucketData = this.frequencyData.slice(startIdx, endIdx);
      const avgValue =
        bucketData.reduce((sum, value) => sum + value, 0) / bucketData.length;
      const normalizedValue = (avgValue + 100) / 100; // Normalize to [0, 1]
      bars.push(normalizedValue);
    }

    return bars;
  }

  render() {
    const { rms, zcr, bars } = this.state;
    return React.Children.map(this.props.children, (child) =>
      React.cloneElement(child as React.ReactElement, { rms, zcr, bars })
    );
  }
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

export default Mic;
