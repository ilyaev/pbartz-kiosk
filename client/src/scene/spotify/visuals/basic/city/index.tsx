import { Component } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import fragmentShader from "./city.fragment.glsl";
import vertexShader from "./city.vertex.glsl";

interface Props {
  rms?: number;
  bars?: number[];
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
  grid: THREE.Vector2 = new THREE.Vector2(10, 10);
  start: number = Date.now() / 1000;
  animationId?: number;

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
    this.camera.position.z = 8;
    this.camera.position.y = -12.1;
    this.camera.rotation.y = -Math.PI / 2;

    // Renderer
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(width, height);
    this.mount!.appendChild(this.renderer.domElement);

    // Orbit Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;

    // Custom Shader Material
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        iTime: { value: this.iTime },
        grid: { value: new THREE.Vector2(this.grid.x, this.grid.y) },
        rms: { value: this.props.rms || 0 },
        bars: { value: this.props.bars || [0, 0, 0, 0, 0, 0, 0] },
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

    const height =
      3 + Math.sin(x + Math.cos(y + this.iTime * 1) + this.iTime * 1) * 2;
    this.mesh!.getMatrixAt(i, this.dummy.matrix);

    // const fraction = 0.3;
    // height = Math.round(height / fraction) * fraction;

    this.dummy.position.set(
      offset - x * 2,
      offset - y * 2,
      offset + height / 2
    );

    this.dummy.rotation.z = Math.sin(x + y + this.iTime * 0) * 0.5;

    this.dummy.scale.set(1, 1, height);

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

    this.material!.uniforms.iTime.value = this.iTime;
    this.geometry.attributes.height.needsUpdate = true;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.controls!.update();
    this.renderer!.render(this.scene!, this.camera!);
  }

  render() {
    return <div ref={(ref) => (this.mount = ref)} />;
  }
}

export default CubeGrid;
