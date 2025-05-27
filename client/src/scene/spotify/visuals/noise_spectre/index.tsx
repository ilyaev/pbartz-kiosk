import { Component } from "react";
import * as THREE from "three";
import shaderCircles from "./bars.glsl";
import generalVertex from "./general_vs.glsl";
import { Props as WnampProps } from "@/components/mic/winamp";

export const CONFIG = {
  mode: "winamp",
  barsCount: 1024,
  hanningWindow: false,
  linearScale: 0.95,
  smoothingAlpha: 0.91,
  bufferSize: 1024 * 4,
} as WnampProps;

const SHOW_FPS = false;

interface Props {
  rms?: number;
  zcr?: number;
  bars?: number[];
  fps?: number;
  volume?: number;
}

class ScreenViz extends Component<Props> {
  mount: HTMLDivElement | null = null;
  scene: THREE.Scene | null = null;

  static now: number = Date.now();

  camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
    75,
    1,
    0.1,
    1000
  );
  renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer();
  geometry: THREE.PlaneGeometry = new THREE.PlaneGeometry(5, 5);
  material: THREE.ShaderMaterial = new THREE.ShaderMaterial({});
  plane: THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.ShaderMaterial,
    THREE.Object3DEventMap
  > = new THREE.Mesh(this.geometry, this.material);
  cube: THREE.Mesh<
    THREE.BoxGeometry,
    THREE.ShaderMaterial,
    THREE.Object3DEventMap
  > = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.material);
  spectreTexture: THREE.DataTexture = new THREE.DataTexture();

  componentDidMount() {
    this.initThreeJS();
  }

  componentWillUnmount(): void {
    if (this.renderer.domElement) {
      this.mount!.removeChild(this.renderer.domElement);
    }
  }

  componentDidUpdate(): void {
    const value = this.props.rms!;
    this.plane.material.uniforms.u_radius.value = value * 0.5;
    this.plane.material.uniforms.iTime.value =
      (Date.now() - ScreenViz.now) / 1000;
    this.plane.material.uniforms.bars.value =
      this.props.bars!.map((bv) => {
        return bv;
      }) || new Array(32).fill(0); // Update bars uniform
    this.updateSpectreTexture();
    this.renderer.render(this.scene!, this.camera);
  }

  initThreeJS() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(this.mount!.clientWidth, this.mount!.clientHeight);
    this.renderer.domElement.style.position = "absolute";

    this.mount!.appendChild(this.renderer.domElement);
    this.generateSpectreTexture();
    this.geometry = new THREE.PlaneGeometry(5, 5);
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        u_resolution: {
          value: new THREE.Vector2(
            this.mount!.clientWidth,
            this.mount!.clientHeight
          ),
        },
        u_radius: { value: 0 },
        iTime: { value: 0 },
        spectre: { value: this.spectreTexture },
        bars: { value: new Array(7).fill(0) }, // Add bars uniform array
        u_noise_scale: { value: 0.7 },
        u_noise_strength: { value: 1 },
        u_noise_offset: { value: 0 },
      },
      vertexShader: generalVertex,
      fragmentShader: shaderCircles,
      side: THREE.DoubleSide,
    });
    this.plane = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.plane);

    this.camera.position.z = 3;
    this.renderer.setClearColor(0x000000, 0);
  }

  updateSpectreTexture() {
    const data = this.spectreTexture.image.data as any; // This is a Uint8Array
    // Example: Change all pixels to new random colors
    let index = 0;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = this.props.bars![index] * 512;
      data[i + 1] = 0;
      data[i + 2] = 0;
      index += 1;
    }

    this.spectreTexture.needsUpdate = true;
  }

  generateSpectreTexture() {
    // --- Texture Generation ---
    const textureWidth = 1024;
    const textureHeight = 1; // 1D texture

    // Data array for the texture.
    // Each pixel has 3 components (R, G, B) for RGBFormat.
    // Or 4 components (R, G, B, A) for RGBAFormat.
    // We'll use RGB here.
    const dataSize = textureWidth * textureHeight * 4; // 3 components (R,G,B)
    const data = new Uint8Array(dataSize);

    for (let i = 0; i < dataSize; i += 4) {
      // Random R, G, B values (0-255)
      data[i] = Math.floor(Math.random() * 256); // Red
      data[i + 1] = Math.floor(Math.random() * 256); // Green
      data[i + 2] = Math.floor(Math.random() * 256); // Blue
      data[i + 3] = 255;
    }

    // Create the DataTexture
    const randomTexture = new THREE.DataTexture(
      data,
      textureWidth,
      textureHeight,
      THREE.RGBAFormat, // Format of the data
      THREE.UnsignedByteType // Type of the data elements
    );

    randomTexture.needsUpdate = true;
    randomTexture.generateMipmaps = false;
    randomTexture.minFilter = THREE.NearestFilter;
    randomTexture.magFilter = THREE.NearestFilter;
    randomTexture.wrapS = THREE.ClampToEdgeWrapping;
    randomTexture.wrapT = THREE.ClampToEdgeWrapping;
    // --- End Texture Generation ---
    this.spectreTexture = randomTexture;
  }

  render() {
    return (
      <>
        <div
          ref={(ref) => (this.mount = ref)}
          style={{
            width: "100%",
            height: "100%",
            position: "absolute",
            backgroundColor: "black",
            bottom: 0,
            right: 0,
          }}
        />
        {SHOW_FPS ? (
          <div
            style={{
              position: "absolute",
              top: "15%",
              left: 0,
              color: "white",
              zIndex: 100000,
              padding: "10px",
            }}
          >
            FPS: {parseInt(this.props.fps + "" || "0")} - {this.props.volume}
          </div>
        ) : undefined}
      </>
    );
  }
}

export default ScreenViz;
