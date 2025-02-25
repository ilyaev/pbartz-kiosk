varying vec3 vUv;
uniform float t;
uniform vec2 u_resolution;
uniform float u_volume;
uniform float u_fade;
uniform float u_tempo;
uniform float u_mode;

const float PI = 3.14159265359;
const float PI2 = 3.14159265359 * 2.;
const float NUM_SQUARES = 16.;

float N21(vec2 p) {
    return fract(sin(p.x * 132.33 + p.y*1433.43) * 55332.33);
}

mat2 rot2d(float a) {
    return mat2(vec2(sin(a), cos(a)), vec2(-cos(a), sin(a)));
}

vec3 starsLayer(vec2 ouv, float volume, float level) {
    vec3 col = vec3(0.);

    vec2 uv = fract(ouv) - .5;

    float d;

    for(int x = -1 ; x <= 1; x++) {
        for(int y = -1 ; y <= 1; y++) {
            vec2 offset = vec2(x,y);
            vec2 id = floor(ouv) + offset;
            float n = N21(id + level);
            if (n > .6) {
                float n1 = fract(n*123.432);
                float n2 = fract(n*1234.2432);

                float size = .01 + 0.05 * (n1 - .5)*volume;

                vec2 shift = vec2(n1 - .5, n2 - .5);
                d = max(d, smoothstep(.3, .4,size/length(uv - offset + shift)));
            }
        }
    }


    return col + d*vec3(.9,.3,.1);
}

vec3 backgroundStars(vec2 uv, float iTime, float volume) {
    vec3 col = vec3(0.);

    float t = iTime * 0.3*(u_tempo/100.);

    float layers = 6.;

    for(float i = 0. ; i < 1. ; i+= 1./layers) {
        float depth = fract(i + t);
        float scale = mix(20., .5, depth);
        float fade = depth * smoothstep(1., .9, depth);

        col = max(col, starsLayer(uv * scale + i * 456.32, volume, floor(i+t))* fade) ;
    }
    return col;
}



void main() {
    vec2 uv = vUv.xy / u_resolution;
    uv -= vec2(sin(t),cos(t))*.1*(u_volume*.05);
    uv.x *= u_resolution.x / u_resolution.y;

    // uv *= rot2d(t*(0.001 + .1 + max(-.1, min(.1, u_volume*.1))));
    uv *= rot2d(t*.1);

   vec2 mouse = vec2(.5);
   vec3 col = vec3(0.);

   float iTime = t;

   col += backgroundStars(uv, iTime, u_volume);

   gl_FragColor = vec4(col * u_fade, 1.);
}