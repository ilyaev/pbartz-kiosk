varying float vX;
varying float vY;
varying vec2 vUv;
varying float vHeight;
varying vec3 vNormal;
uniform vec2 grid;
uniform float iTime;

void main() {
    vec3 baseColor = vec3(.9, .3, .1);
    float d = distance(vec3(vX, vY, 0.), vec3(grid/2., 1.3));
    if (d > 4.) {
        discard;
    }
    float light = 5.01/pow(d, 2.2);
    gl_FragColor = vec4(min(baseColor * light, baseColor*5.), 1.);

    vec2 uv = vUv;

    if (abs(vNormal.y) > 0.) {
        uv = fract(uv * vec2(5., vHeight*3.));
    }
    if (abs(vNormal.x) > 0.) {
        uv = fract(uv * vec2(vHeight*3., 5.));
    }


    // float noise = sin(vX / 3.0) * 0.3;
    gl_FragColor.r += abs(uv.x - .5)*.2;
    gl_FragColor.g += abs(uv.y - .5)*.2;
    // gl_FragColor.b = abs(sin(d/10. + iTime + vX/5. + cos(vY/5.+iTime)));
    // gl_FragColor.b += abs(vNormal.y);
    // gl_FragColor.rgb += noise;
}