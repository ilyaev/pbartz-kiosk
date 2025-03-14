import React from "react";
import * as THREE from "three";

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
    this.camera.position.z = 1000;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000000, 0.001);

    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];

    const sprite = new THREE.TextureLoader().load("disc.png");
    sprite.colorSpace = THREE.SRGBColorSpace;

    for (let i = 0; i < 10000; i++) {
      const x = 2000 * Math.random() - 1000;
      const y = 2000 * Math.random() - 1000;
      const z = 2000 * Math.random() - 1000;

      vertices.push(x, y, z);
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );

    this.material = new THREE.PointsMaterial({
      size: 15,
      sizeAttenuation: true,
      map: sprite,
      alphaTest: 0.5,
      transparent: true,
    });
    this.material.color.setHSL(1.0, 0.3, 0.7, THREE.SRGBColorSpace);

    const particles = new THREE.Points(geometry, this.material);
    this.scene.add(particles);

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.mount.current!.appendChild(this.renderer.domElement);

    this.animationId = requestAnimationFrame(this.animate);
  };

  onWindowResize = () => {
    if (!this.renderer) return;

    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    this.renderThree();
  };

  renderThree = () => {
    const time = Date.now() * 0.00002;

    const speed = 10 * Math.pow(this.props.tempo! / 100, 1.5);

    const range = 1000; // + 150 * this.props.rms;

    const bass = this.props.bars![6];
    const b1 = this.props.bars![1];
    const b2 = this.props.bars![2];
    const b3 = this.props.bars![3];
    // const b4 = this.props.bars![4];
    // const b5 = this.props.bars![5];

    const rms = this.props.rms!;

    // const abass = Math.max(0, bass);

    // console.log(abass, bass);

    const pos = {
      x: Math.sin(time * speed * 2) * range + 5 * b1,
      y: Math.cos((time * speed) / 3) * range - 5 * b2,
      z: Math.cos((time * speed) / 4) * range + 50 * bass + 5 * rms + 5 * b3,
    };

    this.camera.position.set(pos.x, pos.y, pos.z);

    this.camera.lookAt(this.scene.position);

    const h = ((360 * (1.0 + time * 10)) % 360) / 360;
    if (this.material) {
      this.material.color.setHSL(h, 0.5, 0.5);
    }

    this.material.size = 5 + Math.abs(b1) * 120 + rms * 30;

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  render() {
    return <div ref={this.mount} style={{ width: "100%", height: "100vh" }} />;
  }
}

export default ParticleBillboards;
