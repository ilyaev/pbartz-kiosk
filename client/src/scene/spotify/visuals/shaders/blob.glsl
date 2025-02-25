varying vec3 vUv;
uniform vec2 u_resolution;
uniform float u_radius;
uniform float iTime;
uniform float bars[7]; // Define bars as uniform array of 7 floats

void main() {
    vec2 uv = vUv.xy;
    uv.x *= u_resolution.x / u_resolution.y;

    float dd = length(uv) / .1;
    float a = atan(uv.y, uv.x);

    int sector = int(floor((a + 3.1415) / 6.2831 * 7.0));
    int prevSector = sector == 0 ? 6 : sector - 1;
    int nextSector = sector == 6 ? 0 : sector + 1;
    float prevSectorAngle = float(prevSector) / 7.0 * 6.2831 - 3.1415;
    float nextSectorAngle = float(nextSector) / 7.0 * 6.2831 - 3.1415;

    float mixValue = (a - prevSectorAngle) / (nextSectorAngle - prevSectorAngle);
    float r = 4.;
    float d = abs(dd - r) < 0.1 ? 1.0 : 0.0;

    float barValue = bars[sector] + 1.;

    vec3 col = vec3(0.9, sin(float(sector)/10. + iTime), .2) * d;
    // vec3 col = vec3(0.);

    col += vec3(barValue/2., cos(float(sector))*u_radius, u_radius) * (1. - step(barValue, length(uv)));


    // col += vec3(0.2, 0.2, 0.5) * d;

    gl_FragColor = vec4(col, 1.);
}