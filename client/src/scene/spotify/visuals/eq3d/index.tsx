import React from "react";
import * as THREE from "three";
import fragment from "./eq3d.fragment.glsl";
import vertex from "./eq3d.vertex.glsl";

const BAR_WIDTH = 5;
const BAR_COUNT = 7;
const BAR_HEIGHT = 40;

const DEBUG = false;

interface WaveProps {
  separation?: number;
  amountX?: number;
  amountY?: number;
  rms?: number;
  bars?: number[]; // Add bars to WaveProps
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
      this.material.uniforms.uRms.value = this.props.rms || 0; // Update rms uniform
    }
    if (prevProps.bars !== this.props.bars) {
      this.material.uniforms.uBars.value = this.props.bars || [
        0, 0, 0, 0, 0, 0, 0,
      ]; // Update bars uniform
    }
  }

  componentWillUnmount() {
    this.cleanup();
  }

  private init = () => {
    if (!this.containerRef.current) return;

    const {
      separation = 90,
      amountX = BAR_WIDTH * BAR_COUNT * 2,
      amountY = BAR_HEIGHT * 2,
      rms = 0,
      bars = [0, 0, 0, 0, 0, 0, 0],
    } = this.props; // Destructure bars with default value

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      1,
      10000
    );
    this.camera.position.z = 800;

    this.scene = new THREE.Scene();

    const numParticles = amountX * amountY;
    const positions = new Float32Array(numParticles * 3);
    const cells = new Float32Array(numParticles * 2); // Rename uvs to cells

    let i = 0,
      k = 0; // Add k for cells

    for (let ix = 0; ix < amountX; ix++) {
      for (let iy = 0; iy < amountY; iy++) {
        positions[i] = ix * separation - (amountX * separation) / 2;
        positions[i + 1] = 0;
        positions[i + 2] = iy * separation - (amountY * separation) / 2;

        cells[k] = ix; // Set cell x-coordinate
        cells[k + 1] = iy; // Set cell y-coordinate

        i += 3;
        k += 2; // Increment k for cells
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("cell", new THREE.BufferAttribute(cells, 2)); // Rename uv to cell

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uRms: { value: rms }, // Add rms uniform
        uBars: { value: bars }, // Add bars uniform
        grid: { value: new THREE.Vector2(amountX, amountY) },
      },
      vertexShader: vertex,
      fragmentShader: fragment,
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
    this.camera.position.y = 1200 + Math.cos(this.count / 30) * 300;
    this.camera.position.x = 300 + Math.sin(this.count / 40) * 200;
    this.camera.position.z = 800 + Math.sin(this.count / 25) * 200;
    this.camera.lookAt(this.scene.position);
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
        {DEBUG && (
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
        )}
      </>
    );
  }
}

export default Wave;
