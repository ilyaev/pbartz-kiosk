import React, { RefObject } from "react";
import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RectAreaLightHelper } from "three/addons/helpers/RectAreaLightHelper.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";

interface RectAreaLightSceneProps {
  a?: number;
}

interface RectAreaLightSceneState {
  a?: number;
}

class RectAreaLightScene extends React.Component<
  RectAreaLightSceneProps,
  RectAreaLightSceneState
> {
  private mount: RefObject<HTMLDivElement>;
  private stats: Stats | null;
  private meshKnot: THREE.Mesh | null;
  private renderer: THREE.WebGLRenderer | null;
  private scene: THREE.Scene | null;
  private camera: THREE.PerspectiveCamera | null;
  private controls: OrbitControls | null;
  private animationId: number | null;
  rectLight1: THREE.RectAreaLight;
  rectLight2: THREE.RectAreaLight;
  rectLight3: THREE.RectAreaLight;

  constructor(props: RectAreaLightSceneProps) {
    super(props);
    this.mount = React.createRef();
    this.stats = null;
    this.meshKnot = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.controls = null;
    this.animationId = null;
  }

  componentDidMount() {
    this.init();
    window.addEventListener("resize", this.onWindowResize);
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.onWindowResize);
    // Important: Clean up resources to prevent memory leaks
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss(); //Crucial for WebGL
      this.renderer.domElement = null;
      this.renderer = null;
    }
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }
    if (this.scene) {
      this.scene.traverse((object) => {
        if (!object.isMesh) return;

        object.geometry.dispose();

        if (object.material.isMaterial) {
          this.cleanMaterial(object.material);
        } else {
          // an array of materials
          for (const material of object.material) this.cleanMaterial(material);
        }
      });
      this.scene = null;
    }

    if (this.mount.current) {
      while (this.mount.current.firstChild) {
        this.mount.current.removeChild(this.mount.current.firstChild);
      }
    }

    if (this.stats) {
      this.stats.domElement.remove();
      this.stats = null;
    }
    this.camera = null;
    this.meshKnot = null;
  }

  cleanMaterial = (material: THREE.Material) => {
    //console.log("dispose material")
    material.dispose();
    // dispose textures
    for (const key of Object.keys(material)) {
      const value = (material as any)[key];
      if (value && typeof value === "object" && "minFilter" in value) {
        //console.log("dispose texture")
        (value as THREE.Texture).dispose();
      }
    }
  };

  init = () => {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.mount.current?.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );
    this.camera.position.set(0, 5, -15);

    this.scene = new THREE.Scene();

    RectAreaLightUniformsLib.init();

    this.rectLight1 = new THREE.RectAreaLight(0xff0000, 5, 4, 10);
    this.rectLight1.position.set(-5, 5, 5);
    this.scene.add(this.rectLight1);

    this.rectLight2 = new THREE.RectAreaLight(0x00ff00, 5, 4, 10);
    this.rectLight2.position.set(0, 5, 5);
    this.scene.add(this.rectLight2);

    this.rectLight3 = new THREE.RectAreaLight(0x0000ff, 5, 4, 10);
    this.rectLight3.position.set(5, 5, 5);
    this.scene.add(this.rectLight3);

    // this.scene.add(new RectAreaLightHelper(rectLight1));
    // this.scene.add(new RectAreaLightHelper(rectLight2));
    // this.scene.add(new RectAreaLightHelper(rectLight3));

    const geoFloor = new THREE.BoxGeometry(2000, 0.1, 2000);
    const matStdFloor = new THREE.MeshStandardMaterial({
      color: 0xbcbcbc,
      roughness: 0.1,
      metalness: 0,
    });
    const mshStdFloor = new THREE.Mesh(geoFloor, matStdFloor);
    mshStdFloor.position.set(0, 4, 0);
    this.scene.add(mshStdFloor);

    const geoKnot = new THREE.TorusKnotGeometry(1.5, 0.5, 200, 16);
    const matKnot = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0,
      metalness: 0,
    });
    this.meshKnot = new THREE.Mesh(geoKnot, matKnot);
    this.meshKnot.position.set(0, 5, 0);
    this.scene.add(this.meshKnot);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(this.meshKnot.position);
    this.controls.update();

    this.stats = new Stats();
    this.mount.current?.appendChild(this.stats.dom);

    this.animationId = requestAnimationFrame(this.animation); // Start the animation loop
  };

  onWindowResize = () => {
    if (this.renderer) {
      // Check if renderer exists
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    if (this.camera) {
      // Check if camera exists
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }
  };

  animation = (time: number) => {
    this.animationId = requestAnimationFrame(this.animation); // Request next frame

    // if (this.controls) {
    //   this.controls.update();
    // }
    if (this.meshKnot) {
      this.meshKnot.rotation.y = time / 1000;
    }

    if (this.renderer && this.scene && this.camera) {
      // Check for existence
      this.renderer.render(this.scene, this.camera);
    }

    if (this.stats) {
      this.stats.update();
    }
  };

  render() {
    return (
      <div
        ref={this.mount}
        style={{ width: "100%", height: "100vh" }} // Use 100vh for full viewport height
      />
    );
  }
}

export default RectAreaLightScene;
