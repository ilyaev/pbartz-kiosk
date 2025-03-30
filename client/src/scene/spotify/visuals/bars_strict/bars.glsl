varying vec3 vUv;
uniform vec2 u_resolution;
uniform float u_radius;
uniform float iTime;
uniform float bars[32]; // Define bars as uniform array of 7 floats

void main() {
    vec2 ouv = vUv.xy/4.;
    float ratio = u_resolution.x / u_resolution.y;
    ouv.x *= ratio;

    ouv.x += .65;
    ouv.y += .215;

    vec2 uv = fract(ouv * vec2(25., 1.));
    vec2 id = floor(ouv * vec2(25., 1.));

    if (id.y == -1.) {
        ouv.x += sin(ouv.y);//*cos(ouv.y*5. + iTime)*.5;
        uv = fract(ouv * vec2(25., 1.));
        id = floor(ouv * vec2(25., 1.));
    }

    int bar = int(id.x);
    float barValue = min(.5, bars[bar]);
    vec3 col = vec3(0.);

    float row = abs(id.y);

    float rect = step(uv.x, .9);

    if (bar >= 0 && bar <= 32) {
        if (row == 0.) {
            rect *= smoothstep(uv.y * .8, uv.y,  barValue);
        } else {
            rect *= smoothstep((1. - barValue*(.3 + u_radius*1.5)), 1., uv.y);
        }
        col = vec3(1., 0., 0.) * rect*.5;
    }

    // col.g = (abs(id.y))*.2;

    col = max(col, abs(id.y)*.2 * vec3(.0, 1., 0.) );

    float s = (2. - 2./pow(1. + barValue, 3.0));

    col *= s;

    if (row == -0.) {
        col += .1/pow(-uv.y + .9, 1.2) * vec3(.9, .3, .1)*.3;
    }

    gl_FragColor = vec4(col, 1.);
}
