varying vec3 vUv;

void main() {
    vUv = position;
    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1);
    gl_Position = projectionMatrix * modelViewPosition;
}