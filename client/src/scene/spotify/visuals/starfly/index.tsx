import React from "react";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
// import { GlitchPass } from "three/examples/jsm/postprocessing/GlitchPass";
// import { DotScreenPass } from "three/examples/jsm/postprocessing/DotScreenPass";
// import { FilmPass } from "three/examples/jsm/postprocessing/FilmPass";

interface Props {
  a?: number;
  rms?: number;
  zcr?: number;
  bars?: number[];
  tempo?: number;
}

interface State {
  mouseX: number;
  mouseY: number;
}
class ParticleBillboards extends React.Component<Props, State> {
  private mount: React.RefObject<HTMLDivElement>;
  private camera!: THREE.PerspectiveCamera;
  private scene!: THREE.Scene;
  private renderer?: THREE.WebGLRenderer;
  private material!: THREE.PointsMaterial;
  private animationId: number | null = null;
  private lastTime: number = Date.now();
  private geometry!: THREE.BufferGeometry;
  private vertices: number[] = [];
  private shift: number = 0;
  private composer!: EffectComposer;

  constructor(props: Props) {
    super(props);
    this.mount = React.createRef();
    this.state = {
      mouseX: 0,
      mouseY: 0,
    };
  }

  componentDidMount() {
    this.init();
    document.body.style.touchAction = "none";
    window.addEventListener("resize", this.onWindowResize);
  }

  componentWillUnmount() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    window.removeEventListener("resize", this.onWindowResize);

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss(); //Crucial for WebGL
    }

    if (this.scene) {
      this.scene.traverse((object) => {
        const obj = object as THREE.Mesh | THREE.Points;
        if (!(obj instanceof THREE.Mesh) && !(obj instanceof THREE.Points))
          return;

        if (obj.geometry) {
          obj.geometry.dispose();
        }

        if (obj.material) {
          if (Array.isArray(obj.material)) {
            for (const material of obj.material) {
              this.cleanMaterial(material);
            }
          } else {
            this.cleanMaterial(obj.material);
          }
        }
      });
      this.scene = null as unknown as THREE.Scene;
    }

    if (this.mount.current) {
      while (this.mount.current.firstChild) {
        this.mount.current.removeChild(this.mount.current.firstChild);
      }
    }

    this.camera = null!;
  }

  cleanMaterial = (material: THREE.Material) => {
    material.dispose();
    for (const key of Object.keys(material)) {
      const value = material[key as keyof THREE.Material];
      if (value && typeof value === "object" && "minFilter" in value) {
        (value as THREE.Texture).dispose();
      }
    }
  };

  init = () => {
    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      2,
      2000
    );
    this.camera.position.z = 0;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000000, 0.001);

    this.geometry = new THREE.BufferGeometry();
    this.vertices = [];

    const sprite = new THREE.TextureLoader().load("disc.png");
    sprite.colorSpace = THREE.SRGBColorSpace;

    for (let i = 0; i < 10000; i++) {
      const x = 2000 * Math.random() - 1000;
      const y = 2000 * Math.random() - 1000;
      const z = 2000 * Math.random() - 1000;

      this.vertices.push(x, y, z);
    }

    this.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(this.vertices, 3)
    );

    this.material = new THREE.PointsMaterial({
      size: 15,
      sizeAttenuation: true,
      map: sprite,
      alphaTest: 0.5,
      transparent: true,
    });
    this.material.color.setHSL(1.0, 0.3, 0.7, THREE.SRGBColorSpace);

    const particles = new THREE.Points(this.geometry, this.material);
    this.scene.add(particles);

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.mount.current!.appendChild(this.renderer.domElement);

    const renderPass = new RenderPass(this.scene, this.camera);
    // const glitchPass = new GlitchPass();
    // const dotScreenPass = new DotScreenPass(undefined, 1.5, 0.6);
    // const filmPPass = new FilmPass(0.35, 0.025, 648, false);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderPass);
    // this.composer.addPass(glitchPass);
    // this.composer.addPass(filmPPass);
    // this.composer.addPass(dotScreenPass);

    this.animationId = requestAnimationFrame(this.animate);
  };

  onWindowResize = () => {
    if (!this.renderer) return;

    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  };

  animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    this.renderThree();
  };

  renderThree = () => {
    const speed = 0.1; // + Math.sin(this.lastTime * 0.001) * 2;

    const delta = (Date.now() - this.lastTime) / 1000;
    this.lastTime = Date.now();
    const time = this.lastTime * 0.00002;

    this.shift -= 30 * delta;

    const positions = this.geometry.attributes.position.array;

    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 2] += speed * 100 * delta;
      // positions[i] += Math.sin((this.shift + positions[i + 2]) * 0.01) * 0.2;
      // positions[i + 1] +=
      //   Math.cos((this.shift + positions[i + 2]) * 0.01) * 0.2;
      const z = positions[i + 2];

      const cZ = this.camera.position.z;

      if (cZ < z) {
        positions[i + 2] = z - 2000;
        positions[i] = 2000 * Math.random() - 1000;
        positions[i + 1] = 2000 * Math.random() - 1000;
      }
    }

    // this.camera.rotateZ((3.14 / 6) * delta);

    this.geometry.attributes.position.needsUpdate = true;

    // this.camera.lookAt(this.scene.position);

    const h = ((360 * (1.0 + time * 10)) % 360) / 360;
    if (this.material) {
      this.material.color.setHSL(h, 0.5, 0.5);
    }

    this.material.size = 35;

    if (this.composer) {
      this.composer.render();
    }
  };

  render() {
    return <div ref={this.mount} style={{ width: "100%", height: "100vh" }} />;
  }
}

export default ParticleBillboards;
