import React from "react";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import Swarm from "./swarm";

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

  private swarm: Swarm = new Swarm();

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
    this.swarm.particles = [];
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

    this.geometry = new THREE.BufferGeometry();
    this.vertices = [];
    const colors = [];

    const sprite = new THREE.TextureLoader().load("disc.png");
    sprite.colorSpace = THREE.SRGBColorSpace;

    this.swarm = new Swarm();

    for (let i = 0; i < this.swarm.particles.length; i++) {
      const particle = this.swarm.particles[i];
      this.vertices.push(particle.x, particle.y, -1000);
      colors.push(...this.swarm.colorMap[particle.color]);
    }

    this.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(this.vertices, 3)
    );
    this.geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3)
    );

    this.material = new THREE.PointsMaterial({
      size: 15,
      sizeAttenuation: true,
      map: sprite,
      alphaTest: 0.5,
      transparent: true,
      vertexColors: true,
    });

    const particles = new THREE.Points(this.geometry, this.material);
    this.scene.add(particles);

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.mount.current!.appendChild(this.renderer.domElement);

    const renderPass = new RenderPass(this.scene, this.camera);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderPass);

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
    const delta = (Date.now() - this.lastTime) / 1000;
    this.lastTime = Date.now();
    // const time = this.lastTime * 0.00002;

    this.shift -= 30 * delta;

    this.swarm.allRules(delta);

    const positions = this.geometry.attributes.position.array;
    let index = 0;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = this.swarm.particles[index].x;
      positions[i + 1] = this.swarm.particles[index].y;
      index++;
    }

    this.geometry.attributes.position.needsUpdate = true;

    // this.camera.lookAt(this.scene.position);

    // const h = ((360 * (1.0 + time * 10)) % 360) / 360;
    if (this.material) {
      // this.material.color.setHSL(h, 0.5, 0.5);
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
