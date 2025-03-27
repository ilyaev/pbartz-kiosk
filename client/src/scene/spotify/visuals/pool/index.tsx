import { Component } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import fragmentShader from "./city.fragment.glsl";
import vertexShader from "./city.vertex.glsl";
import { Vec2 } from "@/lib/vectors";

export const CONFIG = {};

const G = -2;

interface Props {
  rms?: number;
  bars?: number[];
  tempo: number;
}

class CubeGrid extends Component<Props> {
  mount: HTMLDivElement | null = null;
  iTime: number = 0;
  scene?: THREE.Scene;
  camera?: THREE.PerspectiveCamera;
  renderer?: THREE.WebGLRenderer;
  dummy: THREE.Object3D<THREE.Object3DEventMap> = new THREE.Object3D();
  mesh?: THREE.InstancedMesh<
    THREE.BoxGeometry,
    THREE.ShaderMaterial,
    THREE.InstancedMeshEventMap
  >;
  controls?: OrbitControls;
  heightArray?: Float32Array<ArrayBuffer>;
  geometry: THREE.BoxGeometry = new THREE.BoxGeometry(1, 1, 1);
  material?: THREE.ShaderMaterial;
  grid: THREE.Vector2 = new THREE.Vector2(50, 50);
  start: number = Date.now() / 1000;
  animationId?: number;
  acceleration: number[] = [];
  delta: number = 0;
  lastTime: number = Date.now();
  center = new Vec2(this.grid.x / 2, this.grid.y / 2);

  componentDidMount() {
    this.iTime = Date.now() / 1000 - this.start;
    this.initThree();
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.rms !== this.props.rms) {
      this.material!.uniforms.rms.value = this.props.rms || 0; // Update rms uniform
    }
    this.material!.uniforms.bars.value = this.props.bars || [
      0, 0, 0, 0, 0, 0, 0,
    ];
  }

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
    // this.camera.position.z = 18;
    // this.camera.position.y = -12.1;
    // this.camera.rotation.y = -Math.PI / 2;

    // Renderer
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(width, height);
    this.mount!.appendChild(this.renderer.domElement);

    // Orbit Controls
    // this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    // this.controls.enableDamping = true;
    // this.controls.dampingFactor = 0.1;

    // Custom Shader Material
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        iTime: { value: this.iTime },
        grid: { value: new THREE.Vector2(this.grid.x, this.grid.y) },
        rms: { value: this.props.rms || 0 },
        bars: { value: this.props.bars || [0, 0, 0, 0, 0, 0, 0] },
        center: { value: new THREE.Vector2(this.grid.x / 2, this.grid.y / 2) },
      },
    });

    // Instanced Mesh
    const count = this.grid.x * this.grid.y;
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, count);

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
        this.acceleration[i] = 0;
        this.heightArray[i] = 0;
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

    this.scene.add(this.mesh);

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
    const rms = this.props.rms || 0;
    const alto = this.props.bars![0] || 0;

    // console.log(rms, alto);

    const d = new Vec2(x, y).distanceTo(this.center);
    const bar = Math.min(Math.floor((d / 10) * 6), 6);
    const barValue = Math.abs(this.props.bars![bar] || 0) / 2;
    const barValueRaw = this.props.bars![bar] || 0;

    let height = this.heightArray![i];

    const v = (G - 5 * barValue) * this.delta;

    if (height !== 0) {
      this.acceleration[i] += v;
    }

    height += this.acceleration[i]; // * Math.pow(rms + 0.1, 0.3);

    if (Math.abs(height) <= 0.1 || height <= barValue * 1) {
      if (height <= 0) {
        height = 0;
      }
      // if (Math.abs(this.acceleration[i]) > 0.9) this.acceleration[i] *= -1;

      if (barValueRaw > 0.0) {
        if (d < 8 * (rms + 0.3 + alto * 0.5)) {
          this.acceleration[i] =
            4.3 * Math.abs(this.props.bars![bar]) +
            Math.sin(x + this.iTime) * 0.01 +
            Math.sin(y + this.iTime) * 0.01 +
            Math.min(0.2, rms) * 3.5;
        }
      }
    }

    this.acceleration[i] *= 0.9;

    this.dummy.position.set(offset - x * 2, offset - y * 2, height / 1.2);

    // const aScale =
    //   Math.max(-0.5, Math.min(0.5, this.acceleration[i] * 4.9)) * -0.8;
    const scale = height > 1 ? 0.3 + Math.min(0.8, height * 0.2) : 0.2;
    this.dummy.scale.set(scale, scale, scale); // + height * aScale);

    // const centerX = this.grid.x / 2;
    // const centerY = this.grid.y / 2;
    const angle = Math.atan2(y - this.center.y, x - this.center.y);
    this.dummy.rotation.z = angle; // + (alto * 0.5 - 0.25);

    // this.dummy.rotation.x =
    //   ((Math.PI * 0.6) / (7 - bar)) * height * Math.sin(this.iTime) * 1;

    this.dummy.updateMatrix();
    this.mesh!.setMatrixAt(i, this.dummy.matrix);
    this.heightArray![i] = height;
  }

  animate() {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    // const rms = this.props.rms || 0;
    // const alto = this.props.bars![0] || 0;
    if (!this.mesh) return;

    this.iTime = Date.now() / 1000 - this.start;

    let i = 0;
    for (let x = 0; x < this.grid.x; x++) {
      for (let y = 0; y < this.grid.y; y++) {
        this.buildBlockMatrix(i, x, y);
        i++;
      }
    }

    this.center.x =
      this.grid.x / 2 + Math.sin(this.iTime * 0.5) * (this.props.tempo / 12);
    this.center.y =
      this.grid.y / 2 + Math.cos(this.iTime * 0.5) * (this.props.tempo / 12);

    this.camera!.rotation.x = Math.PI / 4;
    // this.camera!.rotation.x = Math.PI / 4;

    this.camera?.position.set(
      (this.center.x - this.grid.x / 2) * -1,
      (this.center.y - this.grid.y / 2) * -1 - 15,
      // -
      // Math.sin(this.iTime * 0.3) * 5,
      8 //+ Math.sin(this.iTime) * 1
    );

    // this.camera!.rotation.x = Math.PI / 2;

    // this.camera?.lookAt(
    //   (this.center.x - this.grid.x / 2) * -1,
    //   (this.center.y - this.grid.y / 2) * -1,
    //   0
    // );

    // this.camera!.position.x = this.center.x;
    // this.camera!.position.y = this.center.y;
    // this.camera!.rotation.y = Math.PI / 4;
    // this.camera!.lookAt(0, 0, 0);

    // this.camera?.rotateY(this.iTime);

    // this.camera!.rotation.z = Math.sin(this.iTime * 0.5) * 0.1;
    this.camera!.rotation.y = Math.cos(this.iTime * 0.5) * 0.2;
    // this.camera!.rotation.x += Math.sin(this.iTime * 0.5) * 0.02;

    this.material!.uniforms.iTime.value = this.iTime;
    this.geometry.attributes.height.needsUpdate = true;
    this.mesh.instanceMatrix.needsUpdate = true;

    this.material!.uniforms.center.value = this.center;

    // this.controls!.update();
    this.renderer!.render(this.scene!, this.camera!);
    const now = Date.now();
    this.iTime = (now - this.start) / 1000;
    this.delta = (now - this.lastTime) / 1000;
    this.lastTime = now;
  }

  render() {
    return <div ref={(ref) => (this.mount = ref)} />;
  }
}

export default CubeGrid;
