varying float vX;
varying float vY;
varying vec2 vUv;
varying float vHeight;
varying vec3 vNormal;
uniform vec2 grid;
uniform float iTime;
uniform float bars[7];
uniform float rms;

void main() {
    vec3 baseColor = vec3(.9, .3, .1);

    vec2 uv = vUv - .5;

    // float a = (atan(uv.y, uv.x)  + 3.14) / 6.28;
    // float r = length(uv);

    float circle = step(abs(length(uv) - (.05 + rms*.3)), .005 * .5);

    circle = (.01 - (1. - smoothstep(.01, .2, rms))*0.009)/pow(abs(length(uv) - (.04 + rms*.11)), .8);

    float opacity = 1.;

    gl_FragColor = vec4(baseColor*.0 + baseColor * circle, opacity);

    // vec2 uv = fract(vUv * 100.);

}