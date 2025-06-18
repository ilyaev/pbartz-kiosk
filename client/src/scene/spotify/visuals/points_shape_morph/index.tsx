import { CustomAudioAnalyzer } from "@/lib/audio";
import { Component } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Props as WnampProps } from "@/components/mic/winamp";
import NoiseShader from "./noise3d_func.glsl";
import MainShaders from "./shaders.glsl";
import { ShaderFile } from "@/lib/shader";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import BlackToRedShader from "./background";
import { ShaderTexture } from "@/lib/texture";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const DEBUG = false;

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
        txPositions: { value: THREE.Texture };
        txSpherePositions: { value: THREE.Texture };
        shapesMap: { value: THREE.Texture[] };
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
        cameraPos?: { value: THREE.Vector3 };
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
  originalCover: string;
  covers: string[];
}

class PointsShapeMorph extends Component<Props> {
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
  canvasRef: HTMLCanvasElement | null = null;
  lastFpsUpdate: number = performance.now();
  fps: number = 0;
  shaderFile: ShaderFile = new ShaderFile(MainShaders, {
    noise3d: NoiseShader,
  });
  composer?: EffectComposer;
  blackToRedPass?: ShaderPass;
  bloomPass?: UnrealBloomPass;
  loading: boolean = false;
  iTime: number = 0;

  componentDidMount() {
    this.aa.kickThreshold = 0.8;
    this.aa.kickLag = 150;
    this.initThree();
    window.addEventListener("resize", this.onWindowResize);
    if (this.props.originalCover) {
      this.loadTexturesAsync();
    }
  }

  componentDidUpdate(prevProps: Readonly<Props>): void {
    if (prevProps.originalCover !== this.props.originalCover) {
      this.loadTexturesAsync();
    }
  }

  async loadTexturesAsync() {
    if (this.loading) return;
    this.loading = true;
    this.loadedTexture = undefined;

    this.loadedTexture = await ShaderTexture.spotifyAlbumCover(
      this.props.originalCover
    );

    const rawCoverTexture = await ShaderTexture.spotifyAlbumCover(
      this.props.originalCover
    );

    const blakness = ShaderTexture.blackness(this.loadedTexture);

    this.loadedTexture = ShaderTexture.applyNoise(
      this.loadedTexture,
      1 - blakness - Math.random() * 0.3 - 0.1,
      0.3
    );

    if (this.instancedMesh && this.instancedMesh.material) {
      const mat = this.instancedMesh.material as MaterialWithShaderUniforms;
      const shaderUniforms = mat.userData?.shader?.uniforms;
      if (shaderUniforms && shaderUniforms.cover1) {
        shaderUniforms.cover1.value = this.loadedTexture;
      }
      if (this.blackToRedPass) {
        this.blackToRedPass.uniforms.cover.value = rawCoverTexture;
      }
    }

    this.loading = false;
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

    // Postprocessing composer
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera!);
    this.composer.addPass(renderPass);

    const blackToRedPass = new ShaderPass(BlackToRedShader);
    this.composer.addPass(blackToRedPass);
    this.blackToRedPass = blackToRedPass;

    // Bloom pass
    const bloomParams = {
      strength: 0.9,
      radius: 0.1,
      threshold: 0.8,
    };

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      bloomParams.strength,
      bloomParams.radius,
      bloomParams.threshold
    );
    // this.composer.addPass(bloomPass);
    this.bloomPass = bloomPass;

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0, 0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x606060);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 3.8);
    directionalLight.position.set(1, 1, 0.5).normalize();
    directionalLight.position.set(-28, 30, 1);
    this.scene.add(directionalLight);

    this.randomTexture = ShaderTexture.blank();

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
      shader.uniforms.txPositions = {
        value: ShaderTexture.positionsSpherePixels(256, 256),
      };
      shader.uniforms.txSpherePositions = {
        value: ShaderTexture.positionsSphereLines(8, 8),
      };
      shader.uniforms.shapesMap = {
        value: [
          ShaderTexture.positionsSpherePixels(256, 256),
          ShaderTexture.positionsSphereLines(8, 8),
          ShaderTexture.positionsCube(),
        ],
      };
      shader.uniforms.iTime = { value: 0 };
      shader.uniforms.rms = { value: 0 };
      shader.uniforms.allrms = { value: 0 };
      shader.uniforms.kick = { value: 0 };
      shader.uniforms.kickCount = { value: 0 };
      shader.uniforms.bars = { value: this.props.bars };
      shader.uniforms.cameraPos = { value: new THREE.Vector3() };

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

    this.animate();
  }

  calculateFps(now: number) {
    // FPS calculation
    this.frames++;
    if (now - this.lastFpsUpdate > 1000) {
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

  processAudioData = () => {
    this.aa.sampleRate = 220;
    this.aa.setRms(this.props.rms);
    this.aa.setFrequncyLevels(
      this.props.freqLevel.low,
      this.props.freqLevel.mid,
      this.props.freqLevel.high
    );
  };

  processShaderUniforms = () => {
    const now = performance.now();
    const iTime = now / 1000.0;
    this.iTime = iTime;

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
        shaderUniforms.rmsSpeed!.value = this.aa.allRms * 10;
        // shaderUniforms.u_harmonic_spread!.value = 0.7 + 5 * this.aa.kick;
        shaderUniforms.u_seed!.value = this.aa.kickCount;
        shaderUniforms.cameraPos!.value = this.camera!.position;
      }
    }

    if (this.blackToRedPass) {
      this.blackToRedPass.uniforms.rms.value = this.props.rms;
      this.blackToRedPass.uniforms.kick.value = this.aa.kick;
      this.blackToRedPass.uniforms.kickCount.value = this.aa.kickCount;
      this.blackToRedPass.uniforms.bars.value = this.props.bars;
      this.blackToRedPass.uniforms.allrms.value = this.aa.allRms;
      this.blackToRedPass.uniforms.rmsSpeed.value = this.aa.allRms * 10;
      this.blackToRedPass.uniforms.iTime.value = iTime;
    }
  };

  processDebug = () => {
    if (DEBUG && this.loadedTexture && this.canvasRef) {
      const image = this.loadedTexture.image;
      if (image && image.width && image.height) {
        const ctx = this.canvasRef.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, 256, 256);
          ctx.drawImage(image, 0, 0, 256, 256);
        }
      }
    }
  };

  processRender = () => {
    if (this.renderer && this.scene && this.camera) {
      if (this.composer) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    }
  };

  animate = () => {
    this.processAudioData();

    this.animationId = requestAnimationFrame(this.animate);

    this.calculateFps(performance.now());
    this.processShaderUniforms();

    this.processDebug();

    this.instancedMesh?.rotateX(0.001);
    this.instancedMesh?.rotateY(0.005);

    this.processRender();
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
        {/* {DEBUG && (
          <canvas
            ref={(ref) => (this.canvasRef = ref)}
            width={256}
            height={256}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: 11,
              pointerEvents: "none",
              border: "1px solid #333",
              background: "#111",
            }}
          />
        )} */}
        {DEBUG && (
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
        )}
      </>
    );
  }
}

export default PointsShapeMorph;
