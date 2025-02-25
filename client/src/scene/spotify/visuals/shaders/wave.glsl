varying vec3 vUv;
uniform vec2 u_resolution;
uniform float u_radius;
uniform float iTime;
uniform float bars[7]; // Define bars as uniform array of 7 floats

#define MAX_STEPS 50
#define MIN_DISTANCE 0.001
#define MAX_DISTANCE 10.

float dPoint(vec3 ro, vec3 rd, vec3 p) {
    return length(cross(rd, p - ro))/length(rd);
}

float n21(vec2 p) {
    return fract(sin(p.x*123.231 + p.y*4432.342)*33344.22);
}


void main() {
    vec2 uv = vUv.xy/8.;
    uv.x *= u_resolution.x / u_resolution.y;

    vec3 col = vec3(.0);

    vec3 ro = vec3(0. + sin(iTime/3.), 0. , -3.- cos(iTime/3.));
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

        float a = 3.14/6.;
        p.yz *= mat2(vec2(sin(a), cos(a)), vec2(-cos(a), sin(a)));

        vec3 rc1 = vec3(.15);
        vec3 l = vec3(123., 124., 0.);

        vec3 q1 = p - rc1 * clamp(round(p/rc1), -l, l);
        id = round(p/rc1).xy;

        q1.z += sin(id.x/2.*bars[3] + cos(id.y*bars[1] + iTime*2. + sin(id.x*bars[2] + iTime/2. + bars[1])) + iTime*3.)*u_radius*2.;
        dt = length(q1) - .03;// + (.05 * fract(n*123.22 * floor(iTime)));
        ds += dt * .9;
        if (abs(dt) < MIN_DISTANCE || dt > MAX_DISTANCE) {
            break;
        }
    }

    if (dt < MIN_DISTANCE) {
        vec3 scol = vec3(0.9, 0.3, .1);
        col += pow((.05 + u_radius)/length(id + vec2(cos(iTime)*5., sin(iTime*1.)*10.))*24., 1.3) * scol;
    }

    gl_FragColor = vec4(col, 1.);
}