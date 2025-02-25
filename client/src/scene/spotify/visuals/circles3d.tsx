import React from "react";

interface Props {
  rms?: number;
  zcr?: number;
  bars?: number[];
}

export class Circles3DViz extends React.Component<Props> {
  private canvasRef = React.createRef<HTMLCanvasElement>();
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;

  componentDidMount() {
    this.initWebGL();
  }

  componentDidUpdate() {
    this.drawBars();
  }

  initWebGL() {
    const canvas = this.canvasRef.current;
    if (canvas) {
      this.gl = canvas.getContext("webgl");
      if (!this.gl) {
        console.error("WebGL not supported");
        return;
      }

      const vertexShaderSource = `
        attribute vec4 a_position;
        void main() {
          gl_Position = a_position;
        }
      `;

      const fragmentShaderSource = `
        precision mediump float;
        uniform float u_radius;
        uniform vec2 u_resolution;
        uniform float u_time;
        void main() {
          vec2 st = gl_FragCoord.xy / u_resolution;
          st -= 0.5 + sin(u_time) * (0.1);
          st.x *= u_resolution.x / u_resolution.y;

          float dist = distance(st, vec2(0.0));
          float d = (.1*u_radius)/pow(dist, 2.0);

          vec3 col = vec3(0.9, .3, .2) * d;
          gl_FragColor = vec4(col, col.b);
        }
      `;

      const vertexShader = this.createShader(
        this.gl.VERTEX_SHADER,
        vertexShaderSource
      );
      const fragmentShader = this.createShader(
        this.gl.FRAGMENT_SHADER,
        fragmentShaderSource
      );

      this.program = this.createProgram(vertexShader, fragmentShader);
      this.gl.useProgram(this.program);

      const positionBuffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
      const positions = [-1, -1, 1, -1, -1, 1, 1, 1];
      this.gl.bufferData(
        this.gl.ARRAY_BUFFER,
        new Float32Array(positions),
        this.gl.STATIC_DRAW
      );

      const positionLocation = this.gl.getAttribLocation(
        this.program as WebGLProgram,
        "a_position"
      );
      this.gl.enableVertexAttribArray(positionLocation);
      this.gl.vertexAttribPointer(
        positionLocation,
        2,
        this.gl.FLOAT,
        false,
        0,
        0
      );
    }
  }

  createShader(type: number, source: string) {
    const shader = this.gl?.createShader(type);
    if (!shader || !this.gl) return null;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error(this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  createProgram(
    vertexShader: WebGLShader | null,
    fragmentShader: WebGLShader | null
  ) {
    if (!this.gl || !vertexShader || !fragmentShader) return null;
    const program = this.gl.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error(this.gl.getProgramInfoLog(program));
      this.gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  drawBars() {
    if (!this.gl || !this.program || !this.props.rms) return;
    const radius = this.props.rms * 0.5; // Adjust the multiplier as needed
    const resolutionLocation = this.gl.getUniformLocation(
      this.program,
      "u_resolution"
    );
    const radiusLocation = this.gl.getUniformLocation(this.program, "u_radius");

    this.gl.uniform2f(
      resolutionLocation,
      this.gl.canvas.width,
      this.gl.canvas.height
    );
    this.gl.uniform1f(radiusLocation, radius);

    const timeLocation = this.gl.getUniformLocation(this.program, "u_time");
    this.gl.uniform1f(timeLocation, performance.now() / 1000);

    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  render() {
    if (!this.props.rms) {
      return null;
    }
    return (
      <canvas
        ref={this.canvasRef}
        style={{
          position: "absolute",
          width: "100%",
          //   height: "100%",
          //   border: "1px solid red",
          overflow: "hidden",
        }}
      />
    );
  }
}
