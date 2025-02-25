varying vec3 vUv;
uniform vec2 u_resolution;
uniform float u_radius;
uniform float iTime;
uniform float bars[7]; // Define bars as uniform array of 7 floats

void main() {
    vec2 uv = vUv.xy;
    uv.x *= u_resolution.x / u_resolution.y;
    uv.x -= 1.8;
    uv.y -= 1.0;
    // uv.x += sin(floor(iTime)) * cos(floor(iTime));
    // uv.y += cos(floor(iTime/2.)) * sin(floor(iTime));
    float angle = iTime * 0.5 + u_radius;
    float s = sin(angle);
    float c = cos(angle);
    uv = mat2(c, -s, s, c) * uv;

    float dist = length(uv) / .1;
    float a = atan(uv.y, (.1 + 0.2*u_radius)/uv.x);

    float sector = floor((a + 3.1415) / 6.2831 * 7.0);
    // float barValue = u_radius * 30.;
    float barValue = abs(bars[int(sector)] * 10.) + 2.;

    float d = 0.;//step(sin(a*7.)*7., 0.);// * step(dist, 8.);
    d += (.02)/pow(sin(a*3.5 + .7) + cos(dist/2. + barValue*3. + float(sector))*(.1 + abs(barValue/30.)), 2.);


    // d = .02/pow(sin(a*3.5)*(.8 + barValue/10.), 2.0);

    vec3 col = vec3(sin(barValue), .3, .2) * d * step(length(uv), barValue/3.);

    vec3 col3 = vec3(0.9, 0.3, 0.2) * (1. - step(0.5 + u_radius, length(uv)));
    vec3 col2 = vec3(0.9, 0.3, 0.2) * (.3 + u_radius*2.)/pow(length(uv), 3.4);



    col = max(col, col2);


    if (col3.r > 0.3) {
        col = col3;
    }

    gl_FragColor = vec4(col, col.r + .5 );//+ abs(bars[5])*2.);
}