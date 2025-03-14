varying float vX;
varying float vY;
varying vec2 vUv;
varying float vHeight;
varying vec3 vNormal;
uniform vec2 grid;
uniform float iTime;
uniform float bars[7];
uniform float rms;
varying vec3 vColor;

void main() {

    vec3 faceColor = vColor;
    float sum = faceColor.r + faceColor.g + faceColor.b;

    if (sum == 0.) {
        discard;
    }

    vec3 color = faceColor;

    gl_FragColor = vec4(color, 1.);

//    gl_FragColor.b /= 1. - vHeight/(2.2 + bars[6] * 4.); // blue flashing
    gl_FragColor.r *= 1.2;
}