import React from "react";

interface Props {
  rms?: number;
  zcr?: number;
  bars?: number[];
}

export class CirclesViz extends React.Component<Props> {
  private canvasRef = React.createRef<HTMLCanvasElement>();

  componentDidUpdate() {
    this.drawBars();
  }

  drawBars() {
    const canvas = this.canvasRef.current;
    if (canvas && this.props.bars && this.props.bars.length) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 0.8;
        this.props.bars.forEach((bar, index) => {
          if (bar > 0) {
            const hue = (1 - bar) * 240;
            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            const barWidth = canvas.width / 7;
            ctx.fillRect(
              index * barWidth,
              canvas.height - bar * canvas.height,
              barWidth - 5,
              bar * canvas.height
            );
          }
        });
        if (this.props.rms) {
          const radius = this.props.rms * 100; // Adjust the multiplier as needed
          const minDimension = Math.min(canvas.width, canvas.height);
          const adjustedRadius = (radius / 100) * minDimension;
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          ctx.beginPath();
          ctx.arc(centerX, centerY, adjustedRadius, 0, 2 * Math.PI);
          ctx.fillStyle = "rgba(255, 0, 0, 0.99)"; // Adjust color and transparency as needed
          ctx.fill();
        }
      }
    }
  }

  render() {
    if (!this.props.rms) {
      return null;
    }
    return (
      <canvas
        ref={this.canvasRef}
        style={{
          position: "absolute",
          //   zIndex: 200000,
          //   width: "100%",
          //   width: "30%",
          //   right: 0,
          //   height: "300px",
          //   top: "29.6%",
          width: "100%",
          //   height: "100%",
          border: "1px solid red",
          overflow: "hidden",
          //   border: "1px solid red",
        }}
      />
    );
  }
}
