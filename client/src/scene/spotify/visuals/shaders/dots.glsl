varying vec3 vUv;
uniform vec2 u_resolution;
uniform float u_radius;
uniform float iTime;
uniform float bars[7]; // Define bars as uniform array of 7 floats

float n21(vec2 p) {
    return fract(sin(p.x*123.231 + p.y*4432.342)*33344.22);
}

void main() {
    vec2 uv = vUv.xy/8.;
    uv.x *= u_resolution.x / u_resolution.y;

    vec3 col = vec3(0.);

    float cells = 7.;


    // uv = fract(uv * vec2(5., 1.)) - .5;

    float a = atan(uv.x, uv.y) / 3.14 * 3.; + .5;// + iTime/8.;
    float l = length(uv);

    uv = vec2(a, l);

    float id = mod(floor(uv.x * cells), cells);
    uv.x = fract(uv.x * cells) - .5;

    uv.y *= cells;

    float d = length(uv - vec2(0.,.5 + abs(bars[int(id)]))) + .0;

    float n = n21(vec2(id) + 1.);// + floor(iTime*5.));

    float rad = abs(sin(id/3. + iTime) + .3)*.3;// * max(.3, fract(n*23421.22));
    vec3 rcol = vec3(n, fract(n*123.3), fract(n*5678.32));

    col += step(d, rad ) * rcol;


    gl_FragColor = vec4(col, 1.);
}

