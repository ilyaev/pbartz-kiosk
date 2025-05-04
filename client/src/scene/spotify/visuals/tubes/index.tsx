import { Component } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { Props as WnampProps } from "@/components/mic/winamp";

export const CONFIG = {
  mode: "winamp",
  barsCount: 64,
  hanningWindow: false,
  linearScale: 0.91,
  smoothingAlpha: 0.51,
  bufferSize: 1024 * 1,
} as WnampProps;

interface Props {
  rms?: number;
  bars?: number[];
}

class TubesTape extends Component<Props> {
  mount: HTMLDivElement | null = null;
  iTime: number = 0;
  scene?: THREE.Scene;
  camera?: THREE.PerspectiveCamera;
  renderer?: THREE.WebGLRenderer;
  composer?: EffectComposer;
  dummy: THREE.Object3D<THREE.Object3DEventMap> = new THREE.Object3D();
  mesh?: THREE.InstancedMesh<
    THREE.CylinderGeometry,
    THREE.MeshStandardMaterial,
    THREE.InstancedMeshEventMap
  >;
  controls?: OrbitControls;
  heightArray?: Float32Array<ArrayBuffer>;
  geometry: THREE.CylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 8, 8);
  material?: THREE.MeshStandardMaterial;
  grid: THREE.Vector2 = new THREE.Vector2(64, 1);
  start: number = Date.now() / 1000;
  animationId?: number;
  spotlight: THREE.SpotLight = new THREE.SpotLight(0xffffff, 500);

  componentDidMount() {
    this.iTime = Date.now() / 1000 - this.start;
    this.initThree();
  }

  // componentDidUpdate(prevProps: Props) {

  // }

  componentWillUnmount(): void {
    if (this.mount && this.renderer) {
      this.mount.removeChild(this.renderer.domElement);
    }
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.renderer!.dispose();
    this.material!.dispose();
    this.geometry.dispose();
    window.removeEventListener("resize", this.onResize.bind(this));
  }

  initThree() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 1;
    this.camera.position.y = -80 - Math.sin(this.iTime) * 20;
    // this.camera.rotation.y = -Math.PI / 2;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    // this.renderer.setClearColor(0x000000, 1);
    this.mount!.appendChild(this.renderer.domElement);

    // Orbit Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;

    // Custom Shader Material
    this.material = new THREE.MeshStandardMaterial({
      color: 0xffd700, // Gold color
      roughness: 0.2,
      metalness: 0.8,

      // emissive: 0xffaa00,
      // emissiveIntensity: 0.01,
    });

    // Instanced Mesh
    const count = this.grid.x * this.grid.y;
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, count);
    this.mesh.castShadow = true;

    const xArray = new Float32Array(count);
    const yArray = new Float32Array(count);
    this.heightArray = new Float32Array(count);

    let i = 0;
    for (let x = 0; x < this.grid.x; x++) {
      for (let y = 0; y < this.grid.y; y++) {
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        xArray[i] = x;
        yArray[i] = y;
        i++;
      }
    }

    this.geometry.setAttribute(
      "x",
      new THREE.InstancedBufferAttribute(xArray, 1)
    );
    this.geometry.setAttribute(
      "y",
      new THREE.InstancedBufferAttribute(yArray, 1)
    );
    this.geometry.setAttribute(
      "height",
      new THREE.InstancedBufferAttribute(this.heightArray, 1)
    );

    this.mesh.position.x = this.grid.x - 1;
    this.mesh.position.y = this.grid.y - 1;

    this.mesh.receiveShadow = true;

    this.scene.add(this.mesh);

    // Spotlight
    this.spotlight.position.set(0, -45, 10);
    this.spotlight.angle = Math.PI;
    this.spotlight.penumbra = 0.1;
    this.spotlight.decay = 1.6;
    this.spotlight.distance = 250;
    this.spotlight.castShadow = true;

    this.spotlight.shadow.mapSize.width = 1024;
    this.spotlight.shadow.mapSize.height = 1024;
    this.spotlight.shadow.camera.near = 5;
    this.spotlight.shadow.camera.far = 30;
    this.spotlight.shadow.focus = 1;
    // spotLight.shadow.mapSize.width = 1024; // Shadow map quality
    // spotLight.shadow.mapSize.height = 1024;
    // spotLight.shadow.camera.near = 5; // Adjust near/far planes for the light's shadow camera
    // spotLight.shadow.camera.far = 30;
    // spotLight.shadow.focus = 1;

    this.scene.add(this.spotlight);

    // Additional Spotlight
    const topSpotlight = new THREE.SpotLight(0xffffff, 3000);
    topSpotlight.position.set(0, -20, 80);
    topSpotlight.angle = Math.PI;
    topSpotlight.penumbra = 0.2;
    topSpotlight.decay = 1.5;
    topSpotlight.distance = 300;
    topSpotlight.castShadow = true;

    topSpotlight.shadow.mapSize.width = 1024;
    topSpotlight.shadow.mapSize.height = 1024;
    topSpotlight.shadow.camera.near = 1;
    topSpotlight.shadow.camera.far = 200;

    this.scene.add(topSpotlight);

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(400, 200);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.8,
      metalness: 0.2,
    });

    floorMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uMyUniform = { value: 0.5 };
      shader.vertexShader = "varying vec2 vUv;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <uv_vertex>", // Find the standard UV vertex chunk
        `
        #include <uv_vertex> // Include the original calculations
        vUv = uv; // Assign the (potentially transformed) uv attribute
        `
      );

      shader.fragmentShader =
        "varying vec2 vUv;\nuniform float uMyUniform;\n" +
        shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `
        #include <color_fragment>
        vec2 uv = vUv;
        diffuseColor.rgb = vec3(.1);
        uv = fract(uv*vec2(30., 15.)) - .5;
        float d = length(uv);
        diffuseColor += (1. - smoothstep(.0, .1, d))*.1;
        diffuseColor += (1. - smoothstep(.4, .6, abs(uv.x)+.5))*.1;
        diffuseColor += (1. - smoothstep(.4, .6, abs(uv.y)+.5))*.1;
        `
      );
    };

    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = 0;
    floor.position.y = 0;
    floor.position.z = -15;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Back Wall
    const wallGeometry = new THREE.PlaneGeometry(400, 200);
    // const wallMaterial = new THREE.MeshStandardMaterial({
    //   color: 0x404040,
    //   roughness: 0.8,
    //   metalness: 0.2,
    // });
    const backWall = new THREE.Mesh(wallGeometry, floorMaterial);
    backWall.rotation.x = Math.PI / 2;
    backWall.position.z = 0;
    backWall.position.y = 10;
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    // EffectComposer and Bloom Pass
    const renderPass = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.9, // strength
      0.9, // radius
      0.65 // threshold
    );

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderPass);
    this.composer.addPass(bloomPass);

    // TV Scanline Shader
    const scanlineShader = {
      uniforms: {
        tDiffuse: { value: null },
        time: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float time;
        varying vec2 vUv;

        void main() {
          vec4 color = texture2D(tDiffuse, vUv);

          // vec2 curvedUV = vUv * 2.0 - 1.0; // Transform UV to range [-1, 1]
          // curvedUV.x *= 1.0 + pow(abs(curvedUV.y), 2.0) * 0.1; // Apply horizontal curve
          // curvedUV.y *= 1.0 + pow(abs(curvedUV.x), 2.0) * 0.1; // Apply vertical curve
          // curvedUV = curvedUV * 0.5 + 0.5; // Transform back to range [0, 1]
          // color = texture2D(tDiffuse, curvedUV); // Sample texture with curved UV

          float scanline = sin(vUv.y * 1800.0 + time * 2.0) * 0.01;
          color.rgb -= scanline;
          gl_FragColor = color;
        }
      `,
    };

    const scanlinePass = new ShaderPass(scanlineShader);
    //
    this.composer.addPass(scanlinePass);

    // Update composer size on resize
    window.addEventListener("resize", () => {
      this.composer!.setSize(window.innerWidth, window.innerHeight);
    });

    this.animate();

    window.addEventListener("resize", this.onResize.bind(this));
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer!.setSize(width, height);
    this.camera!.aspect = width / height;
    this.camera!.updateProjectionMatrix();
  }

  buildBlockMatrix(i: number, x: number, y: number) {
    const offset = 0;

    const height = this.props.bars![this.grid.x - 1 - i] * 48;

    this.mesh!.getMatrixAt(i, this.dummy.matrix);

    // const fraction = 0.3;
    // height = Math.round(height / fraction) * fraction;

    this.dummy.position.set(offset - x * 2, offset - y * 2, 5);

    // this.dummy.rotation.z = Math.sin(x + y + this.iTime * 0) * 0.5;
    this.dummy.rotation.x = Math.PI / 2;

    this.dummy.scale.set(1, height, 1);

    // this.dummy.rotation.x =
    //   Math.PI / 2 + Math.sin(x / 35 + this.iTime + this.props.rms!) * Math.PI;

    this.dummy.updateMatrix();
    this.mesh!.setMatrixAt(i, this.dummy.matrix);
    this.heightArray![i] = height;
  }

  animate() {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    if (!this.mesh) return;

    this.iTime = Date.now() / 1000 - this.start;

    let i = 0;
    for (let x = 0; x < this.grid.x; x++) {
      for (let y = 0; y < this.grid.y; y++) {
        this.buildBlockMatrix(i, x, y);
        i++;
      }
    }

    this.geometry.attributes.height.needsUpdate = true;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.controls!.update();

    this.camera!.rotation.z =
      (Math.sin(this.iTime * 1 + this.props.rms! * 1.2) * Math.PI) / 32;

    this.camera!.position.y =
      -70 + Math.cos(this.iTime + this.props.rms! * 5) * 3;

    this.spotlight.color.setHSL(
      (this.props.rms! / 2) * 200.1,
      (this.props.rms! / 2) * 100.1,
      (this.props.rms! / 2) * 100.1
    );

    const scanlinePass = this.composer!.passes.find(
      (pass) => pass instanceof ShaderPass && pass.uniforms.time !== undefined
    ) as ShaderPass;

    if (scanlinePass) {
      scanlinePass.uniforms.time.value = this.iTime;
    }

    this.composer!.render();
  }

  render() {
    return <div ref={(ref) => (this.mount = ref)} />;
  }
}

export default TubesTape;
