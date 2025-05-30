import * as THREE from "three";

export interface Noise3DTextureUniforms {
  u_seed: { value: number };
  u_period: { value: number };
  u_harmonics: { value: number };
  u_harmonic_spread: { value: number };
  u_harmonic_gain: { value: number };
  u_exponent: { value: number };
  u_amplitude: { value: number };
  u_offset: { value: number };
  u_time: { value: number };
}

export interface Noise3DTextureOptions {
  size?: number;
  uniforms?: Noise3DTextureUniforms;
  monochrome?: boolean;
}

export class Noise3DTextureGenerator {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private mesh!: THREE.Mesh;
  private material!: THREE.ShaderMaterial;
  private renderTarget!: THREE.WebGLRenderTarget;
  private size!: number;
  private options: Noise3DTextureOptions = {};
  private fragmentShader: string;

  constructor(fragmentShader: string, options: Noise3DTextureOptions = {}) {
    this.options = options;
    this.fragmentShader = fragmentShader;
    this.init();
  }

  regenerate(uniforms: { [key: string]: unknown } = {}) {
    this.dispose();
    this.init();
    for (const key in uniforms) {
      if (this.material.uniforms[key]) {
        this.material.uniforms[key].value = uniforms[key];
      }
    }
    this.material.uniformsNeedUpdate = true;
    return this.generateTexture();
  }

  private init() {
    this.size = this.options.size || 256;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    this.renderer.setSize(this.size, this.size);
    this.renderer.setClearColor(0x000000, 1);
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.material = new THREE.ShaderMaterial({
      fragmentShader: this.wrapFragmentShader(this.fragmentShader),
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      uniforms: {
        ...this.options.uniforms,
        u_monochrome: { value: this.options.monochrome ? true : false },
      },
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.mesh);
    this.renderTarget = new THREE.WebGLRenderTarget(this.size, this.size, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: false,
      stencilBuffer: false,
    });
  }

  private wrapFragmentShader(fragmentShader: string): string {
    // Wraps the user's fragment shader to output colorNoise to gl_FragColor
    return `
      varying vec2 vUv;
      uniform bool u_monochrome;
      uniform float u_time;
      ${fragmentShader}
      void main() {
        vec3 params = vec3(vUv, u_time);
        vec3 color = colorNoise(params, u_monochrome);
        gl_FragColor = vec4(color, 1.0);
      }
    `;
  }

  generateTexture(
    uniforms: Partial<Noise3DTextureUniforms> = {}
  ): THREE.Texture {
    // Update uniforms with new values
    for (const key in uniforms as Noise3DTextureUniforms) {
      if (this.material.uniforms[key]) {
        this.material.uniforms[key].value =
          uniforms[key as keyof Noise3DTextureUniforms]!.value;
      }
    }
    this.material.uniformsNeedUpdate = true;
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);

    const pixelBuffer = new Uint8Array(4 * this.size * this.size);
    this.renderer.readRenderTargetPixels(
      this.renderTarget,
      0,
      0,
      this.size,
      this.size,
      pixelBuffer
    );
    const dataTexture = new THREE.DataTexture(
      pixelBuffer,
      this.size,
      this.size,
      THREE.RGBAFormat,
      THREE.UnsignedByteType,
      THREE.UVMapping,
      THREE.RepeatWrapping,
      THREE.RepeatWrapping,
      THREE.LinearFilter,
      THREE.LinearFilter
    );
    dataTexture.needsUpdate = true;

    return dataTexture;
  }

  dispose() {
    this.material.dispose();
    this.mesh.geometry.dispose();
    this.renderTarget.dispose();
    this.renderer.dispose();
  }
}
