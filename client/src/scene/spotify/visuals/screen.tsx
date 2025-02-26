import { Component } from "react";
import * as THREE from "three";
import shaderCircles from "./shaders/eq3d.glsl";
import generalVertex from "./shaders/general_vs.glsl";

interface Props {
  rms?: number;
  zcr?: number;
  bars?: number[];
}

class ScreenViz extends Component<Props> {
  mount: HTMLDivElement | null = null;
  scene: THREE.Scene | null = null;

  static now: number = Date.now();

  camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
    75,
    1,
    0.1,
    1000
  );
  renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer();
  geometry: THREE.PlaneGeometry = new THREE.PlaneGeometry(5, 5);
  material: THREE.ShaderMaterial = new THREE.ShaderMaterial({});
  plane: THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.ShaderMaterial,
    THREE.Object3DEventMap
  > = new THREE.Mesh(this.geometry, this.material);
  cube: THREE.Mesh<
    THREE.BoxGeometry,
    THREE.ShaderMaterial,
    THREE.Object3DEventMap
  > = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.material);

  componentDidMount() {
    this.initThreeJS();
  }

  componentWillUnmount(): void {
    if (this.renderer.domElement) {
      this.mount!.removeChild(this.renderer.domElement);
    }
  }

  componentDidUpdate(): void {
    const value = this.props.rms!;
    // const value = this.props.bars![0];
    // this.plane.rotateY(0.01);
    this.cube.rotateY(0.01);
    this.cube.rotateX(0.02);
    this.cube.scale.set(value * 3, value * 3, value * 3);
    this.plane.material.uniforms.u_radius.value = value * 0.5;
    this.plane.material.uniforms.iTime.value =
      (Date.now() - ScreenViz.now) / 1000;
    this.plane.material.uniforms.bars.value =
      this.props.bars || new Array(7).fill(0); // Update bars uniform
    this.renderer.render(this.scene!, this.camera);
  }

  initThreeJS() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(this.mount!.clientWidth, this.mount!.clientHeight);
    this.renderer.domElement.style.position = "absolute";

    this.mount!.appendChild(this.renderer.domElement);

    this.geometry = new THREE.PlaneGeometry(5, 5);
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        u_resolution: {
          value: new THREE.Vector2(
            this.mount!.clientWidth,
            this.mount!.clientHeight
          ),
        },
        u_radius: { value: 0 },
        iTime: { value: 0 },
        bars: { value: new Array(7).fill(0) }, // Add bars uniform array
      },
      vertexShader: generalVertex,
      fragmentShader: shaderCircles,
      side: THREE.DoubleSide,
    });
    this.plane = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.plane);

    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    // const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    this.cube = new THREE.Mesh(cubeGeometry, this.material);
    // this.scene.add(this.cube);

    this.camera.position.z = 3;
    this.renderer.setClearColor(0x000000, 0);
  }

  render() {
    return (
      <div
        ref={(ref) => (this.mount = ref)}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          backgroundColor: "black",
          bottom: 0,
          right: 0,
        }}
      />
    );
  }
}

export default ScreenViz;
