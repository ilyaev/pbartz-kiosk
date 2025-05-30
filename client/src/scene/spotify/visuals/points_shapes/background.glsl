uniform sampler2D tDiffuse;
uniform float rms;
uniform float iTime;
uniform float allrms;
uniform float kick;
uniform float kickCount;
uniform float rmsSpeed;
uniform float bars[10];
uniform sampler2D cover;
varying vec2 vUv;

float n21(vec2 p) {
    return fract(sin(p.x*123.231 + p.y*4432.342)*33344.22);
}

mat2 rotate2d(float angle) {
    return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
}


void main() {
    vec4 color = texture2D(tDiffuse, vUv);

    if (color.r == 0.0 && color.g == 0.0 && color.b == 0.0) {

        float n = n21(vec2(floor(rmsSpeed), 1.));
        float rows = floor(3. + (fract(n*10.23)*4. - 2.));

        float nt = fract(n*1232.22)*3.;

        vec2 shift = vec2(sin(nt*10.)*.3, cos(nt*5.)*.3) - vec2(.14, .14);

        float speedTick = floor(rmsSpeed);
        float phase = 1.;
        if (mod(speedTick, 2.) == 0.) {
            phase = -1.;
        }

        if (fract(n*3222.3322) > .5) {
            shift += vec2(phase * sin(fract(rmsSpeed)*3.14/2.)*.1, 0.);
        }  else {
            shift += vec2(0., phase * sin(fract(rmsSpeed)*3.14/2.)*.1);
        }

        vec2 tUv = vUv * vec2(1., 1./1.333) * vec2(rows, rows) + shift;

        // tUv = rotate2d(sin(fract(iTime*(.1 + n *.3) + nt*10.33)*3.14)) * (tUv - vec2(0.5)) + vec2(0.5);

        vec2 uv = fract(tUv);
        vec2 idx = floor(tUv);
        float id = idx.x + idx.y * rows;

        float current = n * rows * rows;
        float dim = 0.;

        if (floor(current) == id) {
            dim = sin(fract(rmsSpeed) * 3.14);
        }

        float vignette = smoothstep(0.3 + .2, 0.1, distance(uv, vec2(0.5)));
        dim *= vignette;

        vec3 coverColor = texture2D(cover, uv).rgb * dim;

        vec3 col = vec3(0.);

        float bg = .3/pow(abs(length(vUv/3. - vec2(0.5) - .3)), 2.3);

        col = coverColor;

        float nn = n21(vec2(floor(rmsSpeed + 1.), 1.));
        vec3 currentBgColor = vec3(n, fract(n*12.22), fract(n*123.22))*.5;
        vec3 nextBgColor = vec3(nn, fract(nn*12.22), fract(nn*123.22))*.5;
        vec3 bgColor = mix(currentBgColor, nextBgColor, fract(rmsSpeed));

        // col += bg * sin(bgColor + iTime + idx.x/3.*cos(fract(iTime*3.14) + idx.y/3.*sin(iTime*3.14)));
        col /= bg * (bgColor*12.);
        col += bg * bgColor;

        gl_FragColor = vec4(col, 1.);
    } else {
        gl_FragColor = color;
    }
}
