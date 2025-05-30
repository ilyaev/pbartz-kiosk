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
import { Noise3DTextureGenerator } from "./Noise3DTextureGenerator";
import Noise3DShader from "./noise3d_func.glsl";

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
        normalsMap: { value: THREE.Texture };
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
        noiseTexture?: { value: THREE.Texture };
        noiseTexture2?: { value: THREE.Texture };
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
  noiseTexture?: THREE.Texture;
  noiseTextureGenerator?: Noise3DTextureGenerator = new Noise3DTextureGenerator(
    Noise3DShader,
    {
      uniforms: {
        u_seed: { value: 1.0 },
        u_period: { value: 1.5 },
        u_harmonics: { value: 3 },
        u_harmonic_spread: { value: 2.0 },
        u_harmonic_gain: { value: 0.7 },
        u_exponent: { value: 0.98 },
        u_amplitude: { value: 1 },
        u_offset: { value: 0.5 },
        u_time: { value: Math.floor(performance.now() / 1000.0) * 0.1 },
      },
      monochrome: false,
    }
  );
  seconds: number = Math.floor(performance.now() / 1000.0);

  componentDidMount() {
    this.noiseTexture = this.noiseTextureGenerator?.generateTexture({
      u_time: { value: this.seconds * 0.1 },
    });
    this.aa.kickThreshold = 0.4;
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
        shaderUniforms.noiseTexture!.value = this.noiseTexture!;
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
      material.userData.shader = shader;

      const uniforms = {
        uGridSize: parseFloat(gridSize + ""),
        uSpacing: spacing,
        cover1: this.randomTexture,
        cover2: this.randomTexture,
        canvas: this.randomTexture,
        noiseTexture: this.noiseTexture || this.randomTexture,
        noiseTexture2: this.noiseTextureGenerator?.generateTexture({
          u_time: { value: this.seconds + 1 },
        }),
        txPositions: ShaderTexture.positionsSpherePixels(256, 256),
        txSpherePositions: ShaderTexture.positionsSphereLines(8, 8),
        shapesMap: [
          ShaderTexture.positionsSpherePixels(256, 256),
          ShaderTexture.positionsSphereLines(8, 8),
          ShaderTexture.positionsCube(),
          // ShaderTexture.positionsTorus(2.5, 2.2), // nice form
          // ShaderTexture.positionsTorus(2.5, 1.2), // hollow cube
          // ShaderTexture.positionsTorus(1.3, 0.7), // square torus
          // ShaderTexture.positionsTorus(1.3, 0.7),
          ShaderTexture.positionsTorusWireframe(0.7, 0.3, 8, 16),
        ],
        normalsMap: [] as THREE.Texture[],
        iTime: 0,
        rms: 0,
        allrms: 0,
        kick: 0,
        kickCount: 0,
        bars: this.props.bars,
        cameraPos: new THREE.Vector3(),

        rmsSpeed: 0,
      };

      uniforms.normalsMap = uniforms.shapesMap.map((shape) => {
        return ShaderTexture.generatePositionsNorlmalMap(shape);
      });

      // Assign each uniform to the shader
      Object.entries(uniforms).forEach(([key, val]) => {
        shader.uniforms[key] = { value: val };
      });

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

  processAudioData = () => {
    this.aa.sampleRate = this.fps || 60;
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
    const seconds = Math.floor(iTime);

    if (this.instancedMesh && this.instancedMesh.material) {
      const mat = this.instancedMesh.material as MaterialWithShaderUniforms;
      const shaderUniforms = mat.userData?.shader?.uniforms;
      if (shaderUniforms) {
        Object.assign(shaderUniforms, {
          iTime: { value: iTime },
          rms: { value: this.props.rms },
          allrms: { value: this.aa.allRms },
          kick: { value: this.aa.kick },
          kickCount: { value: this.aa.kickCount },
          bars: { value: this.props.bars },
          rmsSpeed: { value: this.aa.allRms * 10 },
          cameraPos: { value: this.camera!.position },
        });

        // if (seconds !== this.seconds) {
        //   this.noiseTexture = this.noiseTextureGenerator?.generateTexture({
        //     u_time: { value: this.seconds * 0.1 },
        //   });
        //   shaderUniforms.noiseTexture!.value = this.noiseTexture!;
        //   shaderUniforms.noiseTexture2!.value =
        //     this.noiseTextureGenerator?.generateTexture({
        //       u_time: { value: (this.seconds + 1) * 0.1 },
        //     }) || this.randomTexture!;
        // }
      }
    }

    if (this.blackToRedPass) {
      Object.assign(this.blackToRedPass.uniforms, {
        rms: { value: this.props.rms },
        kick: { value: this.aa.kick },
        kickCount: { value: this.aa.kickCount },
        bars: { value: this.props.bars },
        allrms: { value: this.aa.allRms },
        rmsSpeed: { value: this.aa.allRms * 10 },
        iTime: { value: iTime },
      });
    }

    this.seconds = seconds;
  };

  processDebug = () => {
    if (DEBUG && this.canvasRef) {
      const texture = this.noiseTexture;
      if (texture && this.canvasRef) {
        const ctx = this.canvasRef.getContext("2d");
        if (ctx && texture.image) {
          if (texture.image instanceof HTMLImageElement) {
            ctx.clearRect(0, 0, this.canvasRef.width, this.canvasRef.height);
            ctx.drawImage(
              texture.image,
              0,
              0,
              this.canvasRef.width,
              this.canvasRef.height
            );
          } else if (texture.image instanceof ImageData) {
            ctx.putImageData(texture.image, 0, 0);
          } else if (
            texture.image.data &&
            texture.image.width &&
            texture.image.height
          ) {
            // For DataTexture
            const imageData = ctx.createImageData(
              texture.image.width,
              texture.image.height
            );
            // Assume RGBA
            imageData.data.set(texture.image.data);
            ctx.putImageData(imageData, 0, 0);
          }
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

  processCamera = () => {
    if (this.instancedMesh) {
      const speed = this.aa.allRms * 10 + this.iTime * 0.1;
      this.instancedMesh.position.x = Math.sin(speed) * 15;
      this.instancedMesh.position.z = Math.cos(speed) * 5;
      this.instancedMesh.position.y = Math.sin(speed * 0.5) * 8 + 10;
      this.instancedMesh.rotateX(0.003);
      this.instancedMesh.rotateY(0.005);
    }
  };

  animate = () => {
    this.processAudioData();

    this.animationId = requestAnimationFrame(this.animate);

    this.calculateFps(performance.now());
    this.processShaderUniforms();

    this.processDebug();

    this.processCamera();

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
        {DEBUG && (
          <canvas
            ref={(ref) => (this.canvasRef = ref)}
            width={256}
            height={256}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: 8,
              pointerEvents: "none",
              border: "1px solid #333",
              background: "#111",
            }}
          />
        )}
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

export default BubblesGrid;
