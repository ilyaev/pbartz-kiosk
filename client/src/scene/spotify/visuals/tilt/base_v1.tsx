import { Component } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

interface MaterialWithShaderUniforms extends THREE.Material {
  userData: {
    shader?: {
      uniforms?: {
        uRandomTex?: { value: THREE.Texture };
        iTime?: { value: number };
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
  fps: number = 0;
  state = { fps: 0 };

  componentDidMount() {
    this.initThree();
    window.addEventListener("resize", this.onWindowResize);
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
    this.camera.position.set(-28, 18, 28);
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
    this.controls.autoRotate = true;

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
      data[i] = Math.floor(Math.random() * 256); // R
      data[i + 1] = Math.floor(Math.random() * 256); // G
      data[i + 2] = Math.floor(Math.random() * 256); // B
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

    // Optionally load an external texture but do not use it
    this.loadedTexture = undefined;
    const loader = new THREE.TextureLoader();
    loader.load(
      // "http://localhost:8080/files/images/example256x256.png",
      "http://localhost:8080/resize_image/file/cover/2QtJA4gbwe1AcanB2p21aP_0_anim.png",
      (texture) => {
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        this.loadedTexture = texture;
        // Not used in material, just loaded and stored
      }
    );

    // Geometry
    const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    // const geometry = new THREE.SphereGeometry(cubeSize, 8, 8);

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
      shader.uniforms.uRandomTex = { value: this.randomTexture };
      shader.uniforms.iTime = { value: 0 };
      shader.vertexShader =
        `
        uniform float uGridSize;
        uniform float uSpacing;
        uniform sampler2D uRandomTex;
        uniform float iTime;
        varying vec3 vInstancePosition;
        varying vec2 vGridUV;
      ` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `
        #include <begin_vertex>
        float instanceId = float(gl_InstanceID);
        float ix = mod(instanceId, uGridSize);
        float iz = floor(instanceId / uGridSize);
        float offsetX = (ix - uGridSize / 2.0 + 0.5) * uSpacing;
        float offsetZ = (iz - uGridSize / 2.0 + 0.5) * uSpacing;
        vec2 gridUV = vec2(ix / (uGridSize - 1.0), iz / (uGridSize - 1.0));
        vec3 texColor = texture2D(uRandomTex, gridUV).rgb;

        // basic vertical offset
        float offsetY = - texColor.b * 3.0;

        float rippleDist = abs(length(vec2(ix - uGridSize / 2.0, iz - uGridSize / 2.0)) - 100.);

        float globalWave = sin(ix/35. + iTime)*1. + sin(iz/30. - iTime)*1.;
        float middleWave = rippleDist * (0.1 + sin(iTime * 2.0 + iz/20.) * 0.03);
        float rippleWave = sin(rippleDist * .15 - iTime * 2.0) * exp(-rippleDist * 0.02);

        // additonal dynamical offsets
        offsetY += globalWave;
        offsetY += rippleWave * 2.2;
        offsetY -= middleWave;

        // scale instances
        float scale = max(0.2, 1. - .05/pow(texColor.b, 1.9));
        transformed *= mix(scale, 1., sin(iTime*2.)*.5 + 0.5); // scale

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
        uniform sampler2D uRandomTex;
        varying vec3 vInstancePosition;
        varying vec2 vGridUV;
      ` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "vec4 diffuseColor = vec4( diffuse, opacity );",
        `
        vec3 texColor = texture2D(uRandomTex, vGridUV).rgb * 1.5;
        vec4 diffuseColor = vec4(texColor, opacity);
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
    this.scene.add(this.instancedMesh);

    // Axes Helper
    this.scene.add(new THREE.AxesHelper(5));

    // After 3 seconds, swap uRandomTex to loadedTexture if available
    setTimeout(() => {
      if (
        this.loadedTexture &&
        this.instancedMesh &&
        this.instancedMesh.material
      ) {
        const mat = this.instancedMesh.material as MaterialWithShaderUniforms;
        const shaderUniforms = mat.userData?.shader?.uniforms;
        if (shaderUniforms && shaderUniforms.uRandomTex) {
          shaderUniforms.uRandomTex.value = this.loadedTexture;
        }
      }
    }, 100);

    this.animate();
  }

  animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    this.controls?.update();
    if (this.instancedMesh && this.instancedMesh.material) {
      const mat = this.instancedMesh.material as MaterialWithShaderUniforms;
      const shaderUniforms = mat.userData?.shader?.uniforms;
      if (shaderUniforms && shaderUniforms.iTime) {
        shaderUniforms.iTime.value = performance.now() / 1000.0;
      }
    }
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
    // FPS calculation
    this.frames++;
    const now = performance.now();
    if (now - this.lastFrameTime >= 1000) {
      this.fps = this.frames;
      this.frames = 0;
      this.lastFrameTime = now;
      this.setState({ fps: this.fps });
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
          FPS: {this.state.fps}
        </div>
      </>
    );
  }
}

export default BubblesGrid;
