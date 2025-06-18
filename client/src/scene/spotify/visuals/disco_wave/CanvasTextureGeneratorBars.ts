import * as THREE from "three";
import { SimplexNoise } from "three/examples/jsm/math/SimplexNoise.js";

class CanvasTextureGenerator {
  private canvasSize: number = 256;
  private backgroundColor: string = "rgb(0, 0, 0)";
  private feedbackOpacity: number = 0.999;
  private feedbackBlurRadius: number = 2.1;
  private isFirstCanvasDraw: boolean = true;
  private speed: number = 2;

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
    this.feedbackScaleFactor = 1 + Math.random() * 0.02 - 0.01; //this.feedbackScaleFactorBase - 0.013 * this.kick;

    // const iTime = performance.now() / 1000;

    if (this.isFirstCanvasDraw) {
      this.textureCtx.fillStyle = this.backgroundColor;
      this.textureCtx.fillRect(0, 0, this.canvasSize, this.canvasSize);
      this.isFirstCanvasDraw = false;
    } else {
      this.tempFeedbackCtx.save();

      this.tempFeedbackCtx.clearRect(0, 0, this.canvasSize, this.canvasSize);

      this.tempFeedbackCtx.translate(0, -this.speed);

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

    const barCount = 7;
    const barWidth = this.canvasSize / barCount;
    const barBottom = this.canvasSize;
    this.textureCtx.filter = `blur(${this.feedbackBlurRadius}px)`;

    for (let i = 0; i < barCount; i++) {
      const intensity = this.bars[i] ?? 0;
      const width = barWidth;
      const height = width * 0.8;
      const x = i * barWidth + barWidth * 0.1;
      const y = barBottom - height;

      const red = Math.round(255 * (intensity * 8));
      this.textureCtx.save();
      this.textureCtx.translate(x + width / 2, y + height / 2);
      // this.textureCtx.rotate(Math.sin(iTime) * Math.PI * 2); // 45 degrees
      this.textureCtx.fillStyle = `rgb(${red},0,0)`;
      this.textureCtx.fillRect(-width / 2, -height / 2, width, height);
      this.textureCtx.restore();
      // this.textureCtx.beginPath();
      // this.textureCtx.arc(
      //   x + width / 2,
      //   y + height / 2,
      //   Math.min(width, height) / 2,
      //   0,
      //   2 * Math.PI
      // );
      // this.textureCtx.fill();
    }
    this.textureCtx.filter = "none";
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
