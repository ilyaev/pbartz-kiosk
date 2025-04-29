import { Component, createRef } from "react";
import { Props as WnampProps } from "@/components/mic/winamp";

export const CONFIG = {
  mode: "winamp",
  barsCount: 64,
  hanningWindow: false,
  linearScale: .91,
  smoothingAlpha: 0.5,
  bufferSize: 1024 * 4,
} as WnampProps;

type Props = {
  rms: number;
  bars: number[];
  freqLevel: {
    low: number;
    mid: number;
    high: number;
  };
};

type State = {
  rmsTrail: number[];
  lowTrails: number[];
  midTrails: number[];
  highTrails: number[];
};

class Visualizer extends Component<Props, State> {
  private rmsCanvasRef = createRef<HTMLCanvasElement>();
  private barsCanvasRef = createRef<HTMLCanvasElement>();
  private freqCanvasRef = createRef<HTMLCanvasElement>();

  constructor(props: Props) {
    super(props);
    this.state = {
      rmsTrail: [],
      lowTrails: [],
      midTrails: [],
      highTrails: [],
    };
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.rms !== undefined && this.props.rms !== prevProps.rms) {
      this.updateRmsTrail(this.props.rms);
      this.drawRmsCanvas();
    }

    if (this.props.bars !== prevProps.bars) {
      this.drawBarsCanvas();
    }

    if (this.props.freqLevel !== prevProps.freqLevel) {
      this.drawFreqCanvas();
    }
  }

  updateRmsTrail(rms: number) {
    this.setState((prevState) => {
      const newTrail = [...prevState.rmsTrail, rms];
      if (newTrail.length > 100) newTrail.shift(); // Limit trail length
      const lowTrail = [...prevState.lowTrails, this.props.freqLevel.low];
      const midTrail = [...prevState.midTrails, this.props.freqLevel.mid];
      const highTrail = [...prevState.highTrails, this.props.freqLevel.high];
      if (lowTrail.length > 100) lowTrail.shift();
      if (midTrail.length > 100) midTrail.shift();
      if (highTrail.length > 100) highTrail.shift();

      return {
        rmsTrail: newTrail,
        lowTrails: lowTrail,
        midTrails: midTrail,
        highTrails: highTrail,
      };
    });
  }

  drawRmsCanvas() {
    const canvas = this.rmsCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw scale lines and labels
        ctx.strokeStyle = "lightgray";
        ctx.lineWidth = 2;
        ctx.font = "10px Arial";
        ctx.fillStyle = "black";
        for (let i = 0; i <= 10; i++) {
          const y = (i / 10) * canvas.height;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();

          // Add labels to every second line
          if (i % 2 === 0) {
            ctx.fillText((1 - i / 10).toFixed(1), 5, y - 2);
          }
        }

        // Draw RMS trail
        ctx.beginPath();
        ctx.strokeStyle = "blue";
        this.state.rmsTrail.forEach((value, index) => {
          const x = (index / 100) * canvas.width;
          const y = canvas.height - value * canvas.height;
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
    }
  }

  drawBarsCanvas() {
    const canvas = this.barsCanvasRef.current;
    if (canvas && this.props.bars) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw scale lines and labels
        ctx.strokeStyle = "lightgray";
        ctx.lineWidth = 2;
        ctx.font = "10px Arial";
        ctx.fillStyle = "black";
        for (let i = 0; i <= 10; i++) {
          const y = (i / 10) * canvas.height;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();

          // Add labels to every second line
          if (i % 2 === 0) {
            ctx.fillText((1 - i / 10).toFixed(1), 5, y - 2);
          }
        }

        const barWidth = canvas.width / this.props.bars.length;
        this.props.bars.forEach((value, index) => {
          const x = index * barWidth;
          const y = canvas.height - value * canvas.height;
          ctx.fillStyle = "green";
          ctx.fillRect(x, y, barWidth, canvas.height - y);
        });
      }
    }
  }

  drawFreqCanvas() {
    const canvas = this.freqCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 2;
        // Draw scale lines
        ctx.strokeStyle = "lightgray";
        for (let i = 0; i <= 10; i++) {
          const y = (i / 10) * canvas.height;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
          if (i % 2 === 0) {
            ctx.fillText((1 - i / 10).toFixed(1), 5, y - 2);
          }
        }

        ctx.beginPath();
        ctx.strokeStyle = "blue";
        this.state.lowTrails.forEach((value, index) => {
          const x = (index / 100) * canvas.width;
          const y = canvas.height - (value / 255) * canvas.height;
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = "green";
        this.state.midTrails.forEach((value, index) => {
          const x = (index / 100) * canvas.width;
          const y = canvas.height - (value / 255) * canvas.height;
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = "red";
        this.state.highTrails.forEach((value, index) => {
          const x = (index / 100) * canvas.width;
          const y = canvas.height - (value / 255) * canvas.height;
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
    }
  }

  render() {
    return (
      <div style={{ display: "flex" }}>
        <div>
          RMS Trail
          <canvas
            ref={this.rmsCanvasRef}
            width={480} // Double width
            height={300} // Double height
            style={{ border: "1px solid black", margin: "10px" }} // Adjust margin
          />
          Frequency Levels
          <canvas
            ref={this.freqCanvasRef}
            width={480} // Double width
            height={300} // Double height
            style={{ border: "1px solid black", margin: "10px" }} // Adjust margin
          />
        </div>
        <div>
          Frequency Bars
          <canvas
            ref={this.barsCanvasRef}
            width={480} // Double width
            height={300} // Double height
            style={{ border: "1px solid black", margin: "10px" }} // Adjust margin
          />
          Parameters
          <div
            style={{
              border: "1px solid black",
              padding: "20px", // Adjust padding
              margin: "10px", // Adjust margin
              backgroundColor: "#f0f0f0",
              width: "480px", // Double width
              height: "300px", // Double height
            }}
          >
            <div>Buffer Size: {CONFIG.bufferSize}</div>
            <div>Linear Scale: {CONFIG.linearScale}</div>
            <div>Smoothing Alpha: {CONFIG.smoothingAlpha}</div>
            <div>Frequency Bars: {CONFIG.barsCount}</div>
          </div>
        </div>
      </div>
    );
  }
}

export default Visualizer;
