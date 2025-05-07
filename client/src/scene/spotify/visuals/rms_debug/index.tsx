import { Component, createRef } from "react";
import { Props as WnampProps } from "@/components/mic/winamp";
import { CustomAudioAnalyzer } from "@/lib/audio";

export const CONFIG = {
  mode: "winamp",
  barsCount: 7,
  hanningWindow: false,
  linearScale: 0.99,
  smoothingAlpha: 0.8,
  bufferSize: 1024 * 2,
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
  private aa = new CustomAudioAnalyzer();
  private kickCanvasRef = createRef<HTMLCanvasElement>();
  kickColor: string | CanvasGradient | CanvasPattern = "rgb(255, 0, 0)";

  constructor(props: Props) {
    super(props);
    this.state = {
      rmsTrail: [],
      lowTrails: [],
      midTrails: [],
      highTrails: [],
    };

    this.aa.kickThreshold = 0.48;
    this.aa.kickLag = 100;
    this.aa.onKick = () => {
      console.log("Kick detected!", this.props.rms);
    };
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.rms !== undefined && this.props.rms !== prevProps.rms) {
      this.aa.setRms(this.props.rms);
      this.aa.setFrequncyLevels(
        this.props.freqLevel ? this.props.freqLevel.low : 0,
        this.props.freqLevel ? this.props.freqLevel.mid : 0,
        this.props.freqLevel ? this.props.freqLevel.high : 0
      );
      this.updateRmsTrail(this.props.rms);
      this.drawRmsCanvas();
      this.drawKickCanvas();
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

      const lowTrail = [
        ...prevState.lowTrails,
        this.props.freqLevel ? this.props.freqLevel.low : 0,
      ];
      const midTrail = [
        ...prevState.midTrails,
        this.props.freqLevel ? this.props.freqLevel.mid : 0,
      ];
      const highTrail = [
        ...prevState.highTrails,
        this.props.freqLevel ? this.props.freqLevel.high : 0,
      ];

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

  drawKickCanvas() {
    const canvas = this.kickCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "20px Arial";
        ctx.fillText("Kick: " + this.aa.kick.toFixed(2), 10, 30);
        ctx.beginPath();
        ctx.arc(
          canvas.width / 2,
          canvas.height / 2,
          this.props.rms * 20 + this.aa.kick * 25,
          0,
          2 * Math.PI
        );

        if (this.aa.kick === 1) {
          this.kickColor = `rgb(${Math.floor(
            Math.random() * 255
          )}, ${Math.floor(Math.random() * 255)}, ${Math.floor(
            Math.random() * 255
          )})`;
          ctx.fill();
        }
        ctx.strokeStyle = this.kickColor;
        ctx.fillStyle = this.kickColor;
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.stroke();
      }
    }
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
              padding: "20px",
              margin: "10px",
              backgroundColor: "#f0f0f0",
              width: "480px",
              height: "300px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center", // Center children horizontally
              justifyContent: "center", // Center children vertically
            }}
          >
            <div>Buffer Size: {CONFIG.bufferSize}</div>
            <div>Linear Scale: {CONFIG.linearScale}</div>
            <div>Smoothing Alpha: {CONFIG.smoothingAlpha}</div>
            <div>Frequency Bars: {CONFIG.barsCount}</div>
            <canvas
              ref={this.kickCanvasRef}
              width={440}
              height={100}
              style={{
                border: "1px solid black",
                margin: "10px auto",
                display: "block",
              }}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default Visualizer;
