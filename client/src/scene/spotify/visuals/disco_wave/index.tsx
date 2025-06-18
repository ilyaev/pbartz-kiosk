import { CustomAudioAnalyzer } from "@/lib/audio";
import { Component } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Props as WnampProps } from "@/components/mic/winamp";
import CanvasTextureGenerator from "./CanvasTextureGeneratorBars";
import NoiseShader from "./noise3d_func.glsl";
import MainShaders from "./shaders.glsl";
import CameraFlyBy from "./CameraFlyBy";
import { ShaderFile } from "@/lib/shader";

export const CONFIG = {
  mode: "winamp",
  barsCount: 7,
  hanningWindow: false,
  linearScale: 0.95,
  smoothingAlpha: 0.91,
  bufferSize: 1024 * 2,
} as WnampProps;

interface MaterialWithShaderUniforms extends THREE.Material {
  userData: {
    shader?: {
      uniforms?: {
        cover1?: { value: THREE.Texture };
        cover2?: { value: THREE.Texture };
        iTime?: { value: number };
        rms?: { value: number };
        kick?: { value: number };
        kickCount?: { value: number };
        bars?: { value: number[] };
        canvas?: { value: THREE.Texture };
        allrms?: { value: number };
        u_seed?: { value: number };
        u_period?: { value: number };
        u_harmonics?: { value: number };
        u_harmonic_spread?: { value: number };
        u_harmonic_gain?: { value: number };
        u_exponent?: { value: number };
        u_amplitude?: { value: number };
        u_offset?: { value: number };
        rmsSpeed?: { value: number };
      };
    };
  };
}

interface Props {
  rms: number;
  bars: number[];
  freqLevel: {
    low: number;
    mid: number;
    high: number;
    freqBins: Uint8Array;
  };
  tempo: number;
  covers: string[];
}

class BubblesGrid extends Component<Props> {
  mount: HTMLDivElement | null = null;
  renderer?: THREE.WebGLRenderer;
  camera?: THREE.PerspectiveCamera;
  scene?: THREE.Scene;
  controls?: OrbitControls;
  animationId?: number;
  instancedMesh?: THREE.InstancedMesh;
  randomTexture?: THREE.DataTexture;
  loadedTexture?: THREE.Texture;
  lastFrameTime: number = performance.now();
  frames: number = 0;
  state = {};
  private aa = new CustomAudioAnalyzer();
  loadedTexture2?: THREE.Texture;
  canvasTextureGenerator: CanvasTextureGenerator = new CanvasTextureGenerator();
  canvasRef: HTMLCanvasElement | null = null;
  cameraFlyBy?: CameraFlyBy;
  lastFpsUpdate: number = performance.now();
  fps: number = 0;
  shaderFile: ShaderFile = new ShaderFile(MainShaders, {
    noise3d: NoiseShader,
  });

  componentDidMount() {
    this.aa.kickThreshold = 0.5;
    this.aa.kickLag = 150;
    this.initThree();
    window.addEventListener("resize", this.onWindowResize);
    if (this.props.covers[0] && this.props.covers[1]) {
      this.loadTextures();
    }
  }

  componentDidUpdate(prevProps: Readonly<Props>): void {
    if (prevProps.covers[0] !== this.props.covers[0]) {
      this.loadTextures();
    }
  }

  loadTextures() {
    this.loadedTexture = undefined;
    const loader = new THREE.TextureLoader();
    loader.load(
      this.props.covers[0].replace(
        "files/",
        "http://localhost:8080/resize_image/file/"
      ),
      (texture) => {
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        this.loadedTexture = texture;
        loader.load(
          this.props.covers[1].replace(
            "files/",
            "http://localhost:8080/resize_image/file/"
          ),
          (texture) => {
            texture.minFilter = THREE.NearestFilter;
            texture.magFilter = THREE.NearestFilter;
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            this.loadedTexture2 = texture;
            if (
              this.loadedTexture &&
              this.loadedTexture2 &&
              this.instancedMesh &&
              this.instancedMesh.material
            ) {
              const mat = this.instancedMesh
                .material as MaterialWithShaderUniforms;
              const shaderUniforms = mat.userData?.shader?.uniforms;
              if (shaderUniforms && shaderUniforms.cover1) {
                shaderUniforms.cover1.value = this.loadedTexture;
              }
              if (shaderUniforms && shaderUniforms.cover2) {
                shaderUniforms.cover2.value = this.loadedTexture2;
              }
            }
          }
        );
      }
    );
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.onWindowResize);
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.renderer && this.mount) {
      this.mount.removeChild(this.renderer.domElement);
      this.renderer.dispose();
    }
    this.controls?.dispose();
    this.scene = undefined;
    this.camera = undefined;
    this.renderer = undefined;
    this.instancedMesh = undefined;
  }

  initThree() {
    const gridSize = 256;
    const spacing = 0.25;
    const cubeSize = 0.25;
    const instanceCount = gridSize * gridSize;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(-28, 30, 1);
    this.camera.lookAt(0, 0, 0);
    this.camera.fov = 15;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    if (this.mount) this.mount.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0, 0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x606060);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 3.8);
    directionalLight.position.set(1, 1, 0.5).normalize();
    this.scene.add(directionalLight);

    // Generate random texture
    const size = gridSize * gridSize * 4;
    const data = new Uint8Array(size);
    for (let i = 0; i < size; i += 4) {
      data[i] = 128; // R
      data[i + 1] = 128;
      data[i + 2] = 128; // G
      data[i + 3] = 255; // A
    }

    this.randomTexture = new THREE.DataTexture(
      data,
      gridSize,
      gridSize,
      THREE.RGBAFormat,
      THREE.UnsignedByteType
    );
    this.randomTexture.needsUpdate = true;
    this.randomTexture.generateMipmaps = false;
    this.randomTexture.minFilter = THREE.NearestFilter;
    this.randomTexture.magFilter = THREE.NearestFilter;
    this.randomTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.randomTexture.wrapT = THREE.ClampToEdgeWrapping;

    // Geometry
    const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

    // Material
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7,
      metalness: 0.1,
    });

    // Shader modification
    material.onBeforeCompile = (shader) => {
      // Store shader reference for later uniform updates
      material.userData.shader = shader;

      shader.uniforms.uGridSize = { value: parseFloat(gridSize + "") };
      shader.uniforms.uSpacing = { value: spacing };
      shader.uniforms.cover1 = { value: this.randomTexture };
      shader.uniforms.cover2 = { value: this.randomTexture };
      shader.uniforms.canvas = { value: this.randomTexture };
      shader.uniforms.iTime = { value: 0 };
      shader.uniforms.rms = { value: 0 };
      shader.uniforms.allrms = { value: 0 };
      shader.uniforms.kick = { value: 0 };
      shader.uniforms.kickCount = { value: 0 };
      shader.uniforms.bars = { value: this.props.bars };

      // NOISE
      shader.uniforms.u_seed = { value: 1.0 };
      shader.uniforms.u_period = { value: 1.5 };
      shader.uniforms.u_harmonics = { value: 2 };
      shader.uniforms.u_harmonic_spread = { value: 2.0 };
      shader.uniforms.u_harmonic_gain = { value: 0.7 };
      shader.uniforms.u_exponent = { value: 0.98 };
      shader.uniforms.u_amplitude = { value: 1 };
      shader.uniforms.u_offset = { value: 0.5 };

      shader.uniforms.rmsSpeed = { value: 0 };

      this.shaderFile.apply(shader);
    };

    // Instanced Mesh
    this.instancedMesh = new THREE.InstancedMesh(
      geometry,
      material,
      instanceCount
    );
    this.instancedMesh.rotateX(Math.PI);
    this.instancedMesh.rotateY(Math.PI / 2 + Math.PI);
    // this.instancedMesh.position.y = 3;
    this.scene.add(this.instancedMesh);

    this.cameraFlyBy = new CameraFlyBy();

    this.animate();
  }

  calculateFps(now: number) {
    // FPS calculation
    this.frames++;
    if (now - this.lastFpsUpdate > 500) {
      this.fps = (this.frames * 1000) / (now - this.lastFpsUpdate);
      this.lastFpsUpdate = now;
      this.frames = 0;
      // Update FPS overlay
      const fpsDiv = document.getElementById("fps-overlay");
      if (fpsDiv) {
        fpsDiv.textContent = `FPS: ${this.fps.toFixed(1)}`;
      }
    }
  }

  animate = () => {
    this.aa.sampleRate = 120;
    this.aa.setRms(this.props.rms);
    this.aa.setFrequncyLevels(
      this.props.freqLevel.low,
      this.props.freqLevel.mid,
      this.props.freqLevel.high
    );
    this.animationId = requestAnimationFrame(this.animate);

    this.canvasTextureGenerator.nextFrame();

    const now = performance.now();
    const iTime = now / 1000.0;

    this.calculateFps(now);

    // Camera fly-by logic
    if (this.camera && this.cameraFlyBy) {
      this.cameraFlyBy.radius =
        35 + 10 * this.canvasTextureGenerator.noise.noise(iTime * 0.2, 11);
      this.cameraFlyBy.updateHeight(
        this.camera,
        iTime,
        this.canvasTextureGenerator.noise.noise(iTime * 0.1, 10) * 0.5 + 0.5
      );
    }

    if (this.instancedMesh && this.instancedMesh.material) {
      const mat = this.instancedMesh.material as MaterialWithShaderUniforms;
      const shaderUniforms = mat.userData?.shader?.uniforms;
      if (shaderUniforms) {
        shaderUniforms.iTime!.value = iTime;
        shaderUniforms.rms!.value = this.props.rms;
        shaderUniforms.allrms!.value = this.aa.allRms;
        shaderUniforms.kick!.value = this.aa.kick;
        shaderUniforms.kickCount!.value = this.aa.kickCount;
        shaderUniforms.bars!.value = this.props.bars;
        shaderUniforms.canvas!.value = this.canvasTextureGenerator.getTexture();
        shaderUniforms.rmsSpeed!.value = this.aa.allRms * 10;
      }
    }

    this.canvasTextureGenerator.bars = this.props.bars;
    this.canvasTextureGenerator.rms = this.props.rms;
    this.canvasTextureGenerator.kick = this.aa.kick;
    this.canvasTextureGenerator.kickCount = this.aa.kickCount;
    this.canvasTextureGenerator.bars = this.props.bars;
    this.canvasTextureGenerator.allRms = this.aa.allRms;

    if (this.canvasRef) {
      const canvas = this.canvasTextureGenerator.getCanvas();
      const context = this.canvasRef.getContext("2d");
      if (context && canvas) {
        context.clearRect(0, 0, this.canvasRef.width, this.canvasRef.height);
        context.drawImage(
          canvas,
          0,
          0,
          this.canvasRef.width,
          this.canvasRef.height
        );
      }
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  onWindowResize = () => {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  render() {
    return (
      <>
        <div
          ref={(ref) => (this.mount = ref)}
          style={{ width: "100vw", height: "100vh" }}
        />
        <div
          id="fps-overlay"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            color: "#fff",
            background: "rgba(0,0,0,0.5)",
            padding: "4px 8px",
            fontFamily: "monospace",
            fontSize: "14px",
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          FPS: {this.fps.toFixed(1)}
        </div>
        {/* <canvas
          ref={(ref) => (this.canvasRef = ref)}
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            width: "256px",
            height: "256px",
            zIndex: 20,
            border: "1px solid #fff",
          }}
        /> */}
      </>
    );
  }
}

export default BubblesGrid;
