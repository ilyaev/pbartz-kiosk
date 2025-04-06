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
    // pos.z *= 1. + sin(iTime);


    vec4 transformedPosition = instanceMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * transformedPosition;

    vNormal = normal;// normalMatrix * (instanceMatrix * vec4(normal, 0.0)).xyz;
    vUv = uv;
    vHeight = height;
}