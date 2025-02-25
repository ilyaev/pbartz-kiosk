varying vec3 vUv;
uniform vec2 u_resolution;
uniform float u_radius;
uniform float iTime;
uniform float bars[7]; // Define bars as uniform array of 7 floats

float n21(vec2 p) {
    return fract(sin(p.x*123.231 + p.y*4432.342)*33344.22);
}

float line(vec2 U, vec2 A, vec2 B)
{
	vec2 UA = U - A;
    vec2 BA = (B - A);

    float s = dot(UA, BA) / length(BA);
    s = s / length(BA);
    s = clamp(s, 0., 1.);
    return length(UA - s*BA);
}

void main() {
    vec2 uv = vUv.xy/5. - vec2(.04, 0.);
    uv.x *= u_resolution.x / u_resolution.y;

    vec3 col = vec3(0.);

    float cells = 10.;

    vec2 ouv = uv;

    uv.x = fract(uv.x * cells);

    float x = floor(ouv.x * cells) + 4.;
    int xi = int(x);

    float value = abs(bars[xi]);

    if (xi >= 0 && xi < 7) {
        float prevValue = abs(bars[xi == 0 ? 6 : xi - 1]);
        float nextValue = abs(bars[xi == 6 ? 0 : xi + 1]);
        if (xi == 0) {
            prevValue = 0.0;
        }
        if (xi == 6) {
            nextValue = 0.0;
        }
        float y = line(uv, vec2(0., xi == 0 ? 0. : (value - prevValue) / 2.), vec2(.5, value));
        float y1 = line(uv, vec2(0.5,  value), vec2(1., xi == 6 ? 0. : (nextValue - value) / 2.));
        col.r = .01/pow(y, 1.2); // step(y, 0.03);
        col.r += .01/pow(y1, 1.2);
        col.g =  .5;//x * 0.1 + .1;
        col.g *= step(0.1, uv.x);
        col.g *= step(ouv.y, value);
    } else {
        col.r = 0.01/pow(uv.y, 1.2);
    }

    gl_FragColor = vec4(col, 1.);
}

