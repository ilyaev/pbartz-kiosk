import React from "react";
import * as THREE from "three";
import { Vec2 } from "@/lib/vectors";

interface WaveProps {
  separation?: number;
  amountX?: number;
  amountY?: number;
  rms?: number;
  bars?: number[];
}

interface WaveState {
  a?: number;
  fps: number;
  ms?: number;
  zcr?: number;
  bars?: number[];
}

class Wave extends React.Component<WaveProps, WaveState> {
  private containerRef: React.RefObject<HTMLDivElement>;
  private animationId: number | null;
  private camera!: THREE.PerspectiveCamera;
  private scene!: THREE.Scene;
  private renderer!: THREE.WebGLRenderer;
  private particles!: THREE.Points;
  private count: number;

  private material!: THREE.ShaderMaterial;
  private lastFrameTime: number;
  private frameCount: number;
  private fpsInterval: number;

  constructor(props: WaveProps) {
    super(props);
    this.containerRef = React.createRef();
    this.animationId = null;
    this.count = 0;

    this.state = { fps: 0 };
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.fpsInterval = 1000;
  }

  componentDidMount() {
    this.init();
    this.animate();
    this.lastFrameTime = performance.now();
  }

  componentDidUpdate(prevProps: WaveProps) {
    if (
      prevProps.separation !== this.props.separation ||
      prevProps.amountX !== this.props.amountX ||
      prevProps.amountY !== this.props.amountY
    ) {
      this.cleanup();
      this.init();
      this.animate();
    }
    if (prevProps.rms !== this.props.rms) {
      this.material.uniforms.uRms.value = this.props.rms || 1;
    }
    if (prevProps.bars !== this.props.bars) {
      this.material.uniforms.uBars.value = this.props.bars || [
        1, 1, 1, 1, 1, 1, 1,
      ];
    }
  }

  componentWillUnmount() {
    this.cleanup();
  }

  private init = () => {
    if (!this.containerRef.current) return;

    const {
      separation = 90,
      amountX = 50,
      amountY = 50,
      rms = 1,
      bars = [1, 1, 1, 1, 1, 1, 1],
    } = this.props;

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      1,
      10000
    );
    this.camera.position.z = 1000;

    this.scene = new THREE.Scene();

    const numParticles = amountX * amountY;
    const positions = new Float32Array(numParticles * 3);
    const scales = new Float32Array(numParticles);
    const colors = new Float32Array(numParticles * 3);
    const cells = new Float32Array(numParticles * 2);

    let i = 0,
      j = 0,
      k = 0;

    for (let ix = 0; ix < amountX; ix++) {
      for (let iy = 0; iy < amountY; iy++) {
        positions[i] = ix * separation - (amountX * separation) / 2;
        positions[i + 1] = 0;
        positions[i + 2] = iy * separation - (amountY * separation) / 2;
        scales[j] = 1;

        colors[i] = 1;
        colors[i + 1] = 1;
        colors[i + 2] = 1;

        cells[k] = ix;
        cells[k + 1] = iy;

        i += 3;
        j++;
        k += 2;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("scale", new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("cell", new THREE.BufferAttribute(cells, 2));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uRms: { value: rms },
        uBars: { value: bars },
      },
      vertexShader: `
          attribute float scale;
          attribute vec3 color;
          attribute vec2 cell;
          varying vec3 vColor;
          varying vec2 vCell;
          uniform float uRms;
          uniform float uBars[7];
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = scale * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
            vColor = color;
            vCell = cell;
          }
        `,
      fragmentShader: `
          varying vec3 vColor;
          varying vec2 vCell;
          void main() {
            if (length(gl_PointCoord - vec2(0.5, 0.5)) > 0.475) discard;
            gl_FragColor = vec4(vColor, 1.0);
          }
        `,
    });

    this.particles = new THREE.Points(geometry, this.material);
    this.scene.add(this.particles);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.containerRef.current.appendChild(this.renderer.domElement);

    this.containerRef.current.style.touchAction = "none";
    this.containerRef.current.addEventListener(
      "pointermove",
      this.onPointerMove
    );
    window.addEventListener("resize", this.onWindowResize);
  };

  private onWindowResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private onPointerMove = (event: PointerEvent) => {
    if (event.isPrimary === false) return;
  };

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    this.renderScene();
    this.calculateFPS();
  };

  private calculateFPS = () => {
    const now = performance.now();
    this.frameCount++;
    const elapsed = now - this.lastFrameTime;

    if (elapsed >= this.fpsInterval) {
      const fps = (this.frameCount / elapsed) * 1000;
      this.setState({ fps: Math.round(fps) });
      this.frameCount = 0;
      this.lastFrameTime = now;
    }
  };

  private renderScene = () => {
    const { amountX = 50, amountY = 50 } = this.props;

    // console.log(this.props.bars);

    this.camera.position.y = 900;
    this.camera.position.x = 500 + Math.sin(this.count / 10) * 200;
    this.camera.lookAt(this.scene.position);

    const positions = this.particles.geometry.attributes.position
      .array as Float32Array;
    const scales = this.particles.geometry.attributes.scale
      .array as Float32Array;
    const colors = this.particles.geometry.attributes.color
      .array as Float32Array;

    let i = 0,
      j = 0;

    const center = new Vec2(amountX / 2, amountY / 2).add(
      new Vec2(Math.sin(this.count / 10) * 0, Math.cos(this.count / 10) * 10)
    );

    const rms = this.props.rms || 0;

    for (let ix = 0; ix < amountX; ix++) {
      for (let iy = 0; iy < amountY; iy++) {
        positions[i + 1] = 50;
        scales[j] = 150;
        const distance = new Vec2(ix, iy).distanceTo(center);
        const e = 0.2 / Math.pow(distance / 30, 1.1);

        colors[i] = 0.9 * Math.min(e, 2);
        colors[i + 1] = 0.3 * e;
        colors[i + 2] = 0.1 * e;

        positions[i + 1] += colors[i] * 80;

        scales[j] *= colors[i];
        i += 3;
        j++;
      }
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.geometry.attributes.scale.needsUpdate = true;
    this.particles.geometry.attributes.color.needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
    this.count = Date.now() * 0.01;
  };

  private cleanup = () => {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener("resize", this.onWindowResize);
    if (this.containerRef.current) {
      this.containerRef.current.removeEventListener(
        "pointermove",
        this.onPointerMove
      );
      this.containerRef.current.innerHTML = "";
    }
    this.renderer.dispose();
    this.material.dispose();
    this.particles.geometry.dispose();
  };

  render() {
    return (
      <>
        <div ref={this.containerRef} style={{ position: "relative" }}></div>
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            color: "white",
            padding: "5px",
            fontSize: "2em",
            fontWeight: "bold",
            zIndex: 1000,
          }}
        >
          FPS: {this.state.fps}
        </div>
      </>
    );
  }
}

export default Wave;
