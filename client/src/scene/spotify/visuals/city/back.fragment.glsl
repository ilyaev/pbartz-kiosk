varying float vX;
varying float vY;
varying vec2 vUv;
varying float vHeight;
varying vec3 vNormal;
uniform vec2 grid;
uniform float iTime;
uniform float bars[7];
uniform float rms;

void main() {
    vec3 baseColor = vec3(.9, .3, .1);

    vec2 uv = vUv - vec2(.5, .53);

    // uv = fract(uv * vec2(1., 1.));

    // float a = (atan(uv.y, uv.x)  + 3.14) / 6.28;
    // float r = length(uv);

    vec3 backLight = .01/pow(uv.y+.1, 1.8) * baseColor;

    float circle = .0051/pow(abs(uv.y + sin(uv.x*10.+pow(rms,2.)*10. + iTime)*bars[1]*.1 + cos(uv.x*20. + iTime*5.)*bars[2]*.07 ), .8);

    // float circle = .0051/pow(abs(uv.y + sin(uv.x*20.* iTime*(1. - bars[0]) + iTime*3.  + sin(uv.x*80.*iTime*bars[1]*2.)*.10 )*.01) , .8);


    // float circle = .005/pow(abs(uv.y - pow(rms,1.2)*.3 + .03), .8);

    float opacity = 1.;

    gl_FragColor = vec4(backLight*0. + baseColor * circle, opacity);

    // vec2 uv = fract(vUv * 100.);

}