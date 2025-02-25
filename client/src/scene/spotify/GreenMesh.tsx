import { Component } from "react";
import * as THREE from "three";

interface Props {
  volume: number;
}

interface State {
  volume: number;
  now: number;
  prevValue: number;
}

class GreenMesh extends Component<Props, State> {
  mount: HTMLDivElement | null = null;
  scene: THREE.Scene | null = null;

  static now: number = Date.now();

  state = {
    volume: 0,
    now: Date.now(),
    prevValue: 0,
  };

  componentDidMount() {
    this.initThreeJS();
  }

  static getDerivedStateFromProps(nextProps: Props, prevState: State) {
    return {
      volume: nextProps.volume,
      prevValue: prevState.volume,
      now: Date.now(),
    };
    // // console.log(Date.now() - prevState.now);
    // const now = Date.now();
    // const { volume } = nextProps;
    // if (volume !== prevState.volume) {
    //   return { volume, now };
    // }
    // return {
    //   volume: prevState.volume,
    //   now,
    // };
  }

  initThreeJS() {
    if (this.scene) return;
    this.scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(this.mount!.clientWidth, this.mount!.clientHeight);
    this.mount!.appendChild(renderer.domElement);

    const geometry = new THREE.PlaneGeometry(5, 5);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(geometry, material);
    this.scene.add(plane);

    camera.position.z = 3;

    const animate = () => {
      const volume = this.state.volume / screen.width;
      const prevValue = this.state.prevValue / screen.width;

      const value =
        prevValue + (volume - prevValue) * ((Date.now() - this.state.now) / 10);

      requestAnimationFrame(animate);

      // plane.rotation.z += 0.01 + 0.02 * value;
      plane.scale.set(value, value, 1);
      // plane.position.y = 0.5 - value;
      // plane.position.y = Math.sin(Date.now() * 0.001) * 0.5;
      // plane.translateX(value);
      // plane.position.x = -value;
      // plane.scale.set(value, 0.2, 1);
      // plane.translateX((-value * 0.1) / 2);
      renderer.render(this.scene!, camera);
    };

    animate();
  }

  render() {
    return (
      <div
        ref={(ref) => (this.mount = ref)}
        style={{
          width: "100%",
          height: "100%",
          opacity: 0.5,
          // opacity: this.props.volume / screen.width,
          position: "absolute",
          bottom: 0,
          right: 0,
        }}
      >
        <div style={{ position: "absolute" }}></div>
      </div>
    );
  }
}

export default GreenMesh;
