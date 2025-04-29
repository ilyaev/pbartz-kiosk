attribute vec2 cell;
varying vec3 vColor;
uniform float uRms;
uniform float uBars[7];
uniform vec2 grid;

vec3 baseColor = vec3(.9, .3, .1);

void main() {
    float iTime = 1.;
    vec2 cells = grid;
    vec3 pos = position;

    // vec2 cUv = cell / cells;
    vec2 id = cell - cells / 2.;

    float bar = floor((abs(id.x) / cells.x) * 14.);
    float barValue = uBars[int(bar)];

    float lid = length(id);
    float middle = step(lid, grid.y * uRms);
    // float d = length(cUv - vec2(.5));
    float barOn = (1. - step(barValue * grid.y, abs(id.y)));
    float bass = step(lid, 90. * abs(uBars[5])) * 5.;

    pos.y += length(id + vec2(sin(iTime) * 4.)) * abs(uBars[5]) * uRms * 1. * middle * 10.;
    pos.y += bass + bass * uRms*2.;

    vColor += baseColor * (barOn + .1);
    vColor += (2.2 + uRms * 5.) / pow(abs(id.y + barValue*grid.y), .9 + .1 * (7. - bar)) * baseColor;

    float scale = 150. + bass * 2.;
    scale *= min(1. - abs(.2 / pow(vColor.r, .9)), 1.); //fall off


    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    gl_PointSize = scale / 8.;
}