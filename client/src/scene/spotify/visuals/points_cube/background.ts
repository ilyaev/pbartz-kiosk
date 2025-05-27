import * as THREE from "three";
import backgroundShader from "./background.glsl";

export default {
  uniforms: {
    tDiffuse: { value: null },
    rms: { value: 0.0 },
    iTime: { value: 0.0 },
    allrms: { value: 0.0 },
    kick: { value: 0.0 },
    kickCount: { value: 0.0 },
    bars: { value: [] },
    rmsSpeed: { value: 0.0 },
    cover: { value: THREE.Texture },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: backgroundShader,
};
