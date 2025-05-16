import { CustomAudioAnalyzer } from "@/lib/audio";
import { Component } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Props as WnampProps } from "@/components/mic/winamp";
import CanvasTextureGenerator from "./CanvasTextureGenerator";
import NoiseShader from "./noise3d.glsl";
import CameraFlyBy from "./CameraFlyBy";

export const CONFIG = {
  mode: "winamp",
  barsCount: 7,
  hanningWindow: false,
  linearScale: 0.99,
  smoothingAlpha: 0.8,
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

  componentDidMount() {
    this.aa.kickThreshold = 0.4;
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
    // this.camera.rotateX(Math.PI / 12);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    if (this.mount) this.mount.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0, 0);
    // this.controls.enabled = true;
    // this.controls.autoRotate = true;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x606060);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
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

      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        `
        #include <common>
        ${NoiseShader} // <-- Your function definition here
        uniform float time;     // <-- Declare your uniform
        `
      );

      shader.vertexShader =
        `
        uniform float uGridSize;
        uniform float uSpacing;
        uniform sampler2D cover1;
        uniform sampler2D cover2;
        uniform sampler2D canvas;
        uniform float iTime;
        uniform float rms;
        uniform float allrms;
        uniform float kick;
        uniform float kickCount;
        varying vec3 vInstancePosition;
        varying vec2 vGridUV;
        uniform float bars[7];
      ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `
        #include <begin_vertex>

        float instanceId = float(gl_InstanceID);
        float ix = mod(instanceId, uGridSize);
        float iz = floor(instanceId / uGridSize);

        float offsetX = (ix - uGridSize / 2.0 + 0.5) * (uSpacing + kick *.02);
        float offsetZ = (iz - uGridSize / 2.0 + 0.5) * (uSpacing + kick *.02);

        vec2 gridUV = vec2(ix / (uGridSize - 1.0), iz / (uGridSize - 1.0));
        vec3 texColor = texture2D(cover1, gridUV).rgb;
        vec3 texColor2 = texture2D(cover2, gridUV).rgb;
        vec3 texCanvas = texture2D(canvas, gridUV).rgb;

        float kickDirection = 1.;

        // basic vertical offset
        float offsetY1 = - texColor.b * 3.0;
        float offsetY2 = - texColor2.b * 3.0;
        float offsetY = 0.;

        float noiseMaxHeight = 6.5;

        if (mod(kickCount, 2.0) == 0.0) {
          kickDirection = -1.;
          offsetY = mix(offsetY1, offsetY2, kick);
        } else {
          kickDirection = 1.;
          offsetY = mix(offsetY2, offsetY1, kick);
        }

        // displacement
        offsetY -= texCanvas.r * (20. - (sin(iTime)*.5 + .5)*15.);
        offsetY += noise3d(vec3(gridUV*5. + allrms*.2, allrms*.1)) * noiseMaxHeight;

        // scale instances
        float scale = (2. + (sin(iTime)*.5 + .5)*2.) * texCanvas.r;
        transformed *= scale;

        // translate instances
        vec3 instanceOffset = vec3(offsetX, offsetY, offsetZ);
        transformed += instanceOffset;

        vInstancePosition = instanceOffset;
        vGridUV = gridUV;
        `
      );
      shader.fragmentShader =
        `
        uniform float uGridSize;
        uniform float uSpacing;
        uniform sampler2D cover1;
        uniform sampler2D cover2;
        uniform float iTime;
        uniform float kick;
        uniform float kickCount;
        varying vec3 vInstancePosition;
        varying vec2 vGridUV;
      ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        "vec4 diffuseColor = vec4( diffuse, opacity );",
        `
        vec3 texColor = texture2D(cover1, vGridUV).rgb * 1.5;
        vec3 texColor2 = texture2D(cover2, vGridUV).rgb * 1.5;
        vec3 color = vec3(0.);
        if (mod(kickCount, 2.0) == 0.0) {
          color = mix(texColor, texColor2, kick);
        } else {
          color = mix(texColor2, texColor, kick);
        }
        vec4 diffuseColor = vec4(color, opacity);
        `
      );
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

  animate = () => {
    this.aa.setRms(this.props.rms);
    this.animationId = requestAnimationFrame(this.animate);

    this.canvasTextureGenerator.nextFrame();

    const now = performance.now();
    const iTime = now / 1000.0;

    // Camera fly-by logic
    if (this.camera && this.cameraFlyBy) {
      // this.cameraFlyBy.update(this.camera, iTime);
      this.cameraFlyBy.radius =
        35 + 10 * this.canvasTextureGenerator.noise.noise(iTime * 0.2, 11);
      this.cameraFlyBy.updateHeight(
        this.camera,
        iTime,
        this.canvasTextureGenerator.noise.noise(iTime * 0.2, 10) * 0.5 + 0.5
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

    // this.camera!.position.set(30 - Math.abs(Math.sin(iTime) * 30), 30, 0);
    // this.camera!.lookAt(0, 0, 0);

    // this.controls?.update();
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
        />
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
