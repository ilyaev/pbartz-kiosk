// blackToRedShader.js
// Custom shader to replace black pixels with red
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
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float rms;
    uniform float iTime;
    uniform float allrms;
    uniform float kick;
    uniform float kickCount;
    uniform float rmsSpeed;
    uniform float bars[10];
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      if (color.r == 0.0 && color.g == 0.0 && color.b == 0.0) {
        vec3 col = vec3(0.);
        // vec3 baseColor = vec3(0.9, .3, .1);
        // vec2 center = vUv - vec2(0.5);
        // float r = length(center);
        // float theta = atan(center.y, center.x);
        // // vec2 uv = vec2(r, theta + sin(iTime * 2.0 + vUv.y * 4.0) * 3.14/2.);
        // vec2 uv = vUv;
        // float d = .01/pow(abs(uv.y - .5 - sin(uv.x * 10.0 + rmsSpeed*5.)*.1 + cos(uv.x * 10.0 - rmsSpeed)*.1 ), 1.2);
        // // d += .01/pow(abs(uv.x - .5 - sin(uv.y * 10.0 + rmsSpeed*5.)*.1 - sin(uv.y * 10.0 - rmsSpeed)*.1 ), 1.2);
        // col = baseColor * d;

        gl_FragColor = vec4(col, 1.);
      } else {
        gl_FragColor = color;
      }
    }
  `,
};
