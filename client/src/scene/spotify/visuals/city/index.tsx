import { Component } from "react";
import * as THREE from "three";
import fragmentShader from "./city.fragment.glsl";
import vertexShader from "./city.vertex.glsl";
import vertexFloorShader from "./floor.vertex.glsl";
import fragmentFloorShader from "./floor.fragment.glsl";
import vertexBackShader from "./back.vertex.glsl";
import fragmentBackShader from "./backspline.fragment.glsl";
import { Vec2 } from "@/lib/vectors";

const GRID_SIZE = new THREE.Vector2(10, 10);
// const GRAVITY = 100.8;

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
  heightArray?: Float32Array<ArrayBuffer>;
  heightAcceleration: number[] = [];
  geometry: THREE.BoxGeometry = new THREE.BoxGeometry(1, 1, 1);
  material?: THREE.ShaderMaterial;
  grid: THREE.Vector2 = GRID_SIZE;
  start: number = Date.now();
  animationId?: number;
  delta: number = 0;
  lastTime: number = 0;
  floorMaterial!: THREE.ShaderMaterial;
  panelMaterial!: THREE.ShaderMaterial;

  componentDidMount() {
    this.lastTime = Date.now();
    this.iTime = (this.lastTime - this.start) / 1000;
    this.initThree();
  }

  componentDidUpdate() {
    this.material!.uniforms.rms.value = this.props.rms || 0; // Update rms uniform
    this.material!.uniforms.bars.value = this.props.bars || [
      0, 0, 0, 0, 0, 0, 0,
    ];
    this.floorMaterial!.uniforms.rms.value = this.props.rms || 0; // Update rms uniform
    this.floorMaterial!.uniforms.bars.value = this.props.bars || [
      0, 0, 0, 0, 0, 0, 0,
    ];
    this.panelMaterial!.uniforms.rms.value = this.props.rms || 0; // Update rms uniform
    this.panelMaterial!.uniforms.bars.value = this.props.bars || [
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
    this.panelMaterial!.dispose();
    window.removeEventListener("resize", this.onResize.bind(this));
  }

  initThree() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene
    this.scene = new THREE.Scene();
    // this.scene.fog = new THREE.FogExp2(0x000000, 0.03);

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 8;
    this.camera.position.y = -12.1;
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
    });
    this.renderer.setSize(width, height);
    this.mount!.appendChild(this.renderer.domElement);

    const bars = this.props.bars!.length
      ? this.props.bars
      : [0, 0, 0, 0, 0, 0, 0];

    // Custom Shader Material
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        iTime: { value: this.iTime },
        grid: { value: new THREE.Vector2(this.grid.x, this.grid.y) },
        rms: { value: this.props.rms || 0 },
        bars: { value: bars },
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
        this.heightArray[i] = 1;
        this.heightAcceleration[i] = 0; // 10 + Math.cos(x + y / 2) * 5;
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

    this.mesh.position.x = this.grid.x;
    this.mesh.position.y = this.grid.y;

    this.scene.add(this.mesh);

    // Floor Geometry and Material
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    this.floorMaterial = this.material = new THREE.ShaderMaterial({
      vertexShader: vertexFloorShader,
      fragmentShader: fragmentFloorShader,
      uniforms: {
        iTime: { value: this.iTime },
        grid: { value: new THREE.Vector2(this.grid.x, this.grid.y) },
        rms: { value: this.props.rms || 0 },
        bars: { value: bars },
      },
      // side: THREE.DoubleSide,
    });
    const floor = new THREE.Mesh(floorGeometry, this.floorMaterial);
    floor.position.z = 0;
    this.scene!.add(floor);

    // Backdrop Geometry and Material
    const panelGeometry = new THREE.PlaneGeometry(100, 100);
    this.panelMaterial = new THREE.ShaderMaterial({
      vertexShader: vertexBackShader,
      fragmentShader: fragmentBackShader,
      uniforms: {
        iTime: { value: this.iTime },
        grid: { value: new THREE.Vector2(this.grid.x, this.grid.y) },
        rms: { value: this.props.rms || 0 },
        bars: { value: bars },
      },
    });
    const panel = new THREE.Mesh(panelGeometry, this.panelMaterial);
    panel.rotateX(Math.PI / 2);
    panel.position.y = 10;
    panel.position.z = 2;
    // this.scene!.add(panel);

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
    const bass = Math.max(0, this.props.bars![6]) || 0;
    // const alto = Math.abs(this.props.bars![0]) || 0;
    this.mesh!.getMatrixAt(i, this.dummy.matrix);

    const d =
      new Vec2(x, y).distanceTo(
        new Vec2(
          this.grid.x / 2 - Math.sin(this.iTime) * 0,
          this.grid.y / 2 - Math.cos(this.iTime) * 0
        )
      ) / this.grid.x;

    const bar = Math.floor(d * 7);

    const height =
      1 +
      2 * (1 - d) * Math.max(rms * .2, this.props.bars![bar]) * (bar === 0 ? 10 : 15) +
      bass * 15;

    this.dummy.position.set(
      offset - x * 2,
      offset - y * 2,
      offset + height / 2
    );

    const centerX = this.grid.x / 2;
    const centerY = this.grid.y / 2;
    const angle = Math.atan2(y - centerY, x - centerX);
    this.dummy.rotation.z = angle; // + (alto * 0.5 - 0.25);

    this.dummy.scale.set(1, 1, height);

    this.dummy.updateMatrix();
    this.mesh!.setMatrixAt(i, this.dummy.matrix);
    this.heightArray![i] = height;
  }

  animate() {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    // const rms = this.props.rms || 0;
    const bass = Math.max(0, this.props.bars![6]) || 0;
    const alto = Math.abs(this.props.bars![0]) || 0;
    if (!this.mesh) return;
    const now = Date.now();
    this.iTime = (now - this.start) / 1000;
    this.delta = (now - this.lastTime) / 1000;
    this.lastTime = now;

    let i = 0;
    for (let x = 0; x < this.grid.x; x++) {
      for (let y = 0; y < this.grid.y; y++) {
        this.buildBlockMatrix(i, x, y);
        i++;
      }
    }

    this.mesh!.translateX(-this.grid.x);
    this.mesh!.translateY(-this.grid.y);
    this.mesh!.rotateZ(
      (this.delta * Math.PI) /
        (8 - 100 / this.props.tempo - Math.min(0.8, alto) * 18)
    );
    this.mesh!.translateX(this.grid.x);
    this.mesh!.translateY(this.grid.y);

    this.material!.uniforms.iTime.value = this.iTime;
    this.geometry.attributes.height.needsUpdate = true;
    this.mesh.instanceMatrix.needsUpdate = true;

    this.camera!.rotation.z =
      (Math.sin(this.iTime) * Math.PI) / ((16 / bass) * 0.8);

    this.panelMaterial!.uniforms.iTime.value = this.iTime;

    this.renderer!.render(this.scene!, this.camera!);
  }

  render() {
    return <div ref={(ref) => (this.mount = ref)} />;
  }
}

export default CubeGrid;
