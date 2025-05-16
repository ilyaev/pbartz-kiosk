import { Component } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { RectAreaLightHelper } from "three/examples/jsm/helpers/RectAreaLightHelper.js";
import { Vec3 } from "@/lib/vectors";
import { Props as WnampProps } from "@/components/mic/winamp";
import React from "react";

export const CONFIG = {
  mode: "winamp",
  barsCount: 7,
  bufferSize: 1024 * 2,
  // hanningWindow: false,
  linearScale: 0.91,
  smoothingAlpha: 0.66,
} as WnampProps;

interface Props {
  rms?: number;
  bars?: number[];
}

class CubeGrid extends Component<Props> {
  private containerRef: React.RefObject<HTMLDivElement>;
  mount: HTMLDivElement | null = null;
  iTime: number = 0;
  scene: THREE.Scene = new THREE.Scene();
  camera?: THREE.PerspectiveCamera;
  renderer?: THREE.WebGLRenderer;
  dummy: THREE.Object3D<THREE.Object3DEventMap> = new THREE.Object3D();
  mesh?: THREE.InstancedMesh<
    THREE.BoxGeometry,
    THREE.MeshStandardMaterial,
    THREE.InstancedMeshEventMap
  >;
  controls?: OrbitControls;
  heightArray?: Float32Array<ArrayBuffer>;
  geometry: THREE.BoxGeometry = new THREE.BoxGeometry(1, 1, 1);
  material?: THREE.MeshStandardMaterial;
  grid: THREE.Vector2 = new THREE.Vector2(30, 30);
  start: number = Date.now() / 1000;
  animationId?: number;
  lights: THREE.RectAreaLight[] = [];

  constructor(props: Props) {
    super(props);
    this.containerRef = React.createRef();
    this.animationId = undefined;
  }

  componentDidMount() {
    this.iTime = Date.now() / 1000 - this.start;
    this.initThree();
  }

  componentDidUpdate() {
    this.lights.forEach((light, index) => {
      light.intensity = 1 + this.props.rms! * 3; //this.props.bars ? this.props.bars[index] * 3 : 0;
      // light.height = 10;
      // light.color.setHSL(Math.sin(this.iTime)*.5 + .5,,1);
      // light.color.setRGB(.9 * this.props.rms!, .3+this.props.bars![6], .1)
    });
  }

  componentWillUnmount(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.containerRef.current) {
      this.containerRef.current.innerHTML = "";
    }
    this.renderer!.dispose();
    this.material!.dispose();
    this.geometry.dispose();
    this.mesh!.dispose();
    window.removeEventListener("resize", this.onResize.bind(this));
  }

  createLights() {
    RectAreaLightUniformsLib.init();
    this.lights.forEach((light) => light.dispose());
    this.lights = [];
    // for (let i = 0; i < 7; i++) {
      const light = new THREE.RectAreaLight(0xffffff, 5, 20, 20);
      light.position.set(5, 10, 2);
      light.rotateX(Math.PI / 2);
      light.rotateY(Math.PI);
      this.scene.add(light);
      this.lights.push(light);
      this.scene.add(new RectAreaLightHelper(light));
    // }
  }

  createFloor() {
    const geoFloor = new THREE.BoxGeometry(2000, 0.1, 2000);
    const matStdFloor = new THREE.MeshStandardMaterial({
      color: 0xbcbcbc,
      roughness: 0.1,
      metalness: 0.5, // Reflection
      envMap: this.scene.environment, // Use environment map for reflection
    });

    const mshStdFloor = new THREE.Mesh(geoFloor, matStdFloor);
    mshStdFloor.position.set(0, -1, 0); // Adjusted position
    this.scene.add(mshStdFloor);

    // Create walls
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xbcbcbc,
      roughness: 0.1,
      metalness: 0.5,
      envMap: this.scene.environment,
      // emissive: 0xffffff,
      // emissiveIntensity: 0.01,
    });

    // Left Wall
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 20, 80),
      wallMaterial
    );
    leftWall.position.set(-20, 5, 0); // Adjusted position
    this.scene.add(leftWall);

    // Right Wall
    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 20, 80),
      wallMaterial
    );
    rightWall.position.set(20, 5, 0); // Adjusted position
    this.scene.add(rightWall);

    // Back Wall
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(80, 20, 0.1),
      wallMaterial
    );
    backWall.position.set(0, 5, -20); // Adjusted position
    this.scene.add(backWall);

    // Front Wall
    const frontWall = new THREE.Mesh(
      new THREE.BoxGeometry(80, 20, 0.1),
      wallMaterial
    );
    frontWall.position.set(0, 5, 20); // Adjusted position
    this.scene.add(frontWall);

    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.BoxGeometry(80, 0.1, 80),
      wallMaterial
    );
    ceiling.position.set(0, 20, 0); // Adjusted position
    this.scene.add(ceiling);
  }

  initThree() {
    if (!this.containerRef.current) return;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.set(0, 5, -15);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    // this.mount!.appendChild(this.renderer.domElement);

    this.containerRef.current.appendChild(this.renderer.domElement);
    this.containerRef.current.style.touchAction = "none";

    // Orbit Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 3;
    this.controls.enabled = false;

    this.createLights();
    this.createFloor();

    // Custom Shader Material
    this.material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.9,
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
    const height = 0.1;
    const cubeSize = 1;
    const spacing = 1.2;

    const shift = 0;

    this.dummy.position.set(
      x * spacing - (this.grid.x * spacing) / 2 + spacing / 2,
      cubeSize / 2 + 0.0 * y + shift,
      y * spacing - (this.grid.y * spacing) / 2 + spacing / 2
    );

    const freq = 0.7;
    const timeScale = 0.2; // + Math.sin(x / 3) + Math.sin(y / 3);

    let dx = x;
    let dy = y;

    dx += this.grid.x / 2 + Math.sin(this.iTime) * 10;
    dy += this.grid.y / 2 + Math.cos(this.iTime) * 10;

    const rotationAngleZ =
      (Math.sin(this.iTime * timeScale + dx * freq) * Math.PI) / 8 +
      (Math.cos(this.iTime * timeScale - dx * freq) * Math.PI) / 18 +
      (Math.cos(this.iTime * timeScale + dy * freq) * Math.PI) / 8 +
      (Math.sin(this.iTime * timeScale - dy * freq) * Math.PI) / 8;

    // this.dummy.rotation.z = -rotationAngleZ * 0.2;

    this.dummy.position.y = rotationAngleZ * 0.5 + 0.3 * this.props.rms!;

    for (let i = 0; i < 7; i++) {
      const center = new Vec3(
        (this.grid.x / 8) * (i + 1),
        this.grid.y / 2 + Math.sin(this.iTime*0. + i * 2) * 5,
        0
      );

      let force = (this.props.bars![i] || 0) * 30;
      force = (force * 2) / 4;

      const uv = new Vec3(x, y, force);

      const distance = center.sub(uv).length();

      const yShift = 70 / Math.pow(distance, .91);

      this.dummy.position.y += yShift * 0.1 + .05;
    }
    this.dummy.position.y -= 1;
    // this.dummy.rotation.x = -distance * 0.03;

    this.dummy.scale.set(cubeSize, this.dummy.position.y, cubeSize);
    this.dummy.position.y = 0;
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

    this.camera!.position.y = 5 + (Math.sin(this.iTime) * 3 + 1.5);

    this.controls!.update();

    this.renderer!.render(this.scene!, this.camera!);
  }

  render() {
    return (
      <>
        <div ref={this.containerRef} style={{ position: "relative" }} />
      </>
    );
  }
}

export default CubeGrid;
