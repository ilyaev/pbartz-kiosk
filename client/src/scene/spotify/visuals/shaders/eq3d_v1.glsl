varying vec3 vUv;
uniform vec2 u_resolution;
uniform float u_radius;
uniform float iTime;
uniform float bars[7]; // Define bars as uniform array of 7 floats

#define MAX_STEPS 50
#define MIN_DISTANCE 0.001
#define MAX_DISTANCE 10.


void main() {
    vec2 uv = vUv.xy/8.;
    uv.x *= u_resolution.x / u_resolution.y;

    vec3 col = vec3(.0);

    vec2 cells = vec2(7. * 6., 28. * 3.);

    vec3 ro = vec3(0. + sin(iTime/3.), 0. , -3.- cos(iTime/3.));
    // vec3 ro = vec3(0. , 0. , -3.);
    vec3 lookat = vec3(0., 0., 0.);
    float zoom = .5;

    vec3 f = normalize(lookat - ro);
    vec3 r = normalize(cross(vec3(0., 1., 0.), f));
    vec3 u = cross(f, r);

    vec3 c = ro + f * zoom;
    vec3 I = c + uv.x * r + uv.y * u;

    vec3 rd = normalize(I - ro);

    float ds,dt;
    float n;
    vec2 id;
    for(int i = 0 ; i < MAX_STEPS ; i++) {
        vec3 p = ro + rd * ds;

        float a = 3.14/5.;
        p.yz *= mat2(vec2(sin(a), cos(a)), vec2(-cos(a), sin(a)));

        vec3 rc1 = vec3(.15);
        vec3 l = vec3(cells, 0.);

        vec3 q1 = p - rc1 * clamp(round(p/rc1), -l, l);
        id = round(p/rc1).xy;


        float middle = step(length(id), 60.*u_radius);

        q1.z += length(id + vec2(sin(iTime)*4.)) * abs(bars[6]) * u_radius * 2. * middle *.1;

        float radius = 0.02 + middle * .005;

        radius += step(length(id), 20.*abs(bars[6]))*.02;

        dt = length(q1) - radius;
        ds += dt * .9;
        if (abs(dt) < MIN_DISTANCE || dt > MAX_DISTANCE) {
            break;
        }
    }

    if (dt < MIN_DISTANCE) {
        vec3 scol = vec3(0.9, 0.3, .1);

        float bar = floor((abs(id.x) / cells.x) * 7.);
        float barValue = bars[int(bar)];
        col += scol * (1. - step(barValue*160., abs(id.y)));
        col += 4.1/pow(abs(id.y*2. - 333.*barValue), .9 + u_radius) * scol;
    }

    gl_FragColor = vec4(col, 1.);
}