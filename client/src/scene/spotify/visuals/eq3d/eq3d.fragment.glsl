varying vec3 vColor;
varying vec2 vCell;

void main() {
    if (length(gl_PointCoord - vec2(0.5, 0.5)) > 0.5) discard;
    gl_FragColor = vec4(vColor, 1.0);
}