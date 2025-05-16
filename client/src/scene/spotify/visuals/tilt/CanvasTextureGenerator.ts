import * as THREE from "three";
import { SimplexNoise } from "three/examples/jsm/math/SimplexNoise.js";

class CanvasTextureGenerator {
  private canvasSize: number = 256;
  private circleRadius: number = 30;
  private backgroundColor: string = "rgb(0, 0, 0)";
  private feedbackOpacity: number = 0.99;
  private feedbackScaleFactorBase: number = 1.05;
  private feedbackBlurRadius: number = 1.1;
  private feedbackRotationIncrement: number = 0;
  private currentFeedbackRotationAngle: number = 0;
  private isFirstCanvasDraw: boolean = true;
  private pulseRadius: number;
  private pulseDirection: number = -1;
  private pulseSpeed: number = 0.3;
  private maxPulseRadius: number;
  private minPulseRadius: number;
  private circleX: number;
  private circleY: number;

  private textureCanvas: HTMLCanvasElement;
  private textureCtx: CanvasRenderingContext2D;
  private tempFeedbackCanvas: HTMLCanvasElement;
  private tempFeedbackCtx: CanvasRenderingContext2D;
  private canvasTexture: THREE.CanvasTexture;
  public noise = new SimplexNoise();

  public rms: number = 0;
  public kick: number = 0;
  public kickCount: number = 0;
  public bars: number[] = [] as number[];
  public allRms: number = 0;
  public feedbackScaleFactor: number = 0;

  constructor() {
    this.circleX = this.canvasSize / 2;
    this.circleY = this.canvasSize / 2;
    this.pulseRadius = this.circleRadius;
    this.maxPulseRadius = this.circleRadius + 10;
    this.minPulseRadius = this.circleRadius - 2;

    this.textureCanvas = document.createElement("canvas");
    this.textureCanvas.width = this.canvasSize;
    this.textureCanvas.height = this.canvasSize;
    this.textureCtx = this.textureCanvas.getContext("2d")!;

    this.tempFeedbackCanvas = document.createElement("canvas");
    this.tempFeedbackCanvas.width = this.canvasSize;
    this.tempFeedbackCanvas.height = this.canvasSize;
    this.tempFeedbackCtx = this.tempFeedbackCanvas.getContext("2d")!;
    this.tempFeedbackCtx.imageSmoothingEnabled = true;

    this.canvasTexture = new THREE.CanvasTexture(this.textureCanvas);
  }

  public updateCanvasTexture(): void {
    this.feedbackOpacity = 0.99 + 0.2 * this.kick;
    this.feedbackScaleFactor = this.feedbackScaleFactorBase - 0.013 * this.kick;
    this.currentFeedbackRotationAngle =
      Math.sin(Math.PI * 2 * this.kick) * 0.01;

    const iTime = performance.now() / 1000;
    if (this.isFirstCanvasDraw) {
      this.textureCtx.fillStyle = this.backgroundColor;
      this.textureCtx.fillRect(0, 0, this.canvasSize, this.canvasSize);
      this.isFirstCanvasDraw = false;
    } else {
      this.tempFeedbackCtx.save();

      this.tempFeedbackCtx.clearRect(0, 0, this.canvasSize, this.canvasSize);

      if (this.currentFeedbackRotationAngle !== 0) {
        this.tempFeedbackCtx.translate(
          this.canvasSize / 2,
          this.canvasSize / 2
        );

        this.currentFeedbackRotationAngle += this.feedbackRotationIncrement;
        this.tempFeedbackCtx.rotate(this.currentFeedbackRotationAngle);

        this.tempFeedbackCtx.translate(
          -this.canvasSize / 2,
          -this.canvasSize / 2
        );
      }

      // this.tempFeedbackCtx.translate(
      //   Math.random() * 6 - 3,
      //   Math.random() * 6 - 3
      // );

      this.tempFeedbackCtx.drawImage(this.textureCanvas, 0, 0);
      this.tempFeedbackCtx.restore();

      if (this.feedbackBlurRadius > 0) {
        this.tempFeedbackCtx.filter = `blur(${this.feedbackBlurRadius}px)`;
        this.tempFeedbackCtx.drawImage(this.tempFeedbackCanvas, 0, 0);
        this.tempFeedbackCtx.filter = "none";
      }

      this.textureCtx.fillStyle = this.backgroundColor;
      this.textureCtx.fillRect(0, 0, this.canvasSize, this.canvasSize);

      const scaledWidth = this.canvasSize * this.feedbackScaleFactor;
      const scaledHeight = this.canvasSize * this.feedbackScaleFactor;
      const destX = (this.canvasSize - scaledWidth) / 2;
      const destY = (this.canvasSize - scaledHeight) / 2;

      this.textureCtx.globalAlpha = this.feedbackOpacity;
      this.textureCtx.drawImage(
        this.tempFeedbackCanvas,
        0,
        0,
        this.canvasSize,
        this.canvasSize,
        destX,
        destY,
        scaledWidth,
        scaledHeight
      );
      this.textureCtx.globalAlpha = 1.0;
    }

    this.pulseRadius +=
      this.pulseDirection * this.pulseSpeed * Math.sin(iTime * 2);

    if (
      this.pulseRadius >= this.maxPulseRadius ||
      this.pulseRadius <= this.minPulseRadius
    ) {
      this.pulseDirection *= -1;
    }

    // const posX = this.noise.noise(this.allRms * (0.005 + 5 * this.kick), 0);
    // const posY = this.noise.noise(this.allRms * (0.005 + 5 * this.kick), 1);
    const posX = this.noise.noise(iTime * (0.3 + 15 * this.kick), 0);
    const posY = this.noise.noise(iTime * (0.3 + 15 * this.kick), 1);

    const rRadius =
      this.noise.noise(iTime * 0.4, 2) * 0.5 + 0.5 + this.kick * 0.2;
    this.pulseRadius = rRadius * this.circleRadius;

    // this.circleX = this.canvasSize / 2 + Math.sin(iTime * 2) * 80;
    // this.circleY = this.canvasSize / 2; // + Math.cos(iTime * 2) * 30;

    this.circleX = this.canvasSize / 2 + (posX * this.canvasSize) / 2;
    this.circleY = this.canvasSize / 2 + (posY * this.canvasSize) / 2;

    this.textureCtx.beginPath();
    this.textureCtx.arc(
      this.circleX,
      this.circleY,
      this.pulseRadius,
      0,
      Math.PI * 2
    );
    // this.textureCtx.fillStyle = "darkred";
    this.textureCtx.fillStyle = `rgb(${Math.abs(
      (this.noise.noise(iTime * 1, 3) * 0.5 + 0.5 + this.rms * 0.5) * 255
    )}, 0, 0)`;
    this.textureCtx.filter = `blur(${10 + 5 * this.kick}px)`;
    // this.textureCtx.filter = "drop-shadow(5px 5px 10px rgba(0, 0, 0, 0.5))";
    // this.textureCtx.filter = "invert(100%)";
    this.textureCtx.fill();
    this.textureCtx.filter = "none";

    this.textureCtx.strokeStyle = "darkred";
    this.textureCtx.lineWidth = 1.5 + this.kick * 3;
    this.textureCtx.stroke();
    this.textureCtx.closePath();
  }

  public nextFrame(): void {
    this.updateCanvasTexture();
    this.canvasTexture.needsUpdate = true;
  }

  public getTexture(): THREE.CanvasTexture {
    return this.canvasTexture;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.textureCanvas;
  }
}

export default CanvasTextureGenerator;
