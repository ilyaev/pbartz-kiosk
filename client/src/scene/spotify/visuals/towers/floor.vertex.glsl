attribute float x;
attribute float y;
attribute float height;

varying float vX;
varying float vY;
varying float vHeight;
varying vec3 vNormal;
varying vec2 vUv;

uniform float iTime;


void main() {
    vX = x;
    vY = y;

    vec3 pos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.);

    vNormal = normal;// normalMatrix * (instanceMatrix * vec4(normal, 0.0)).xyz;
    vUv = uv;
    vHeight = height;
}