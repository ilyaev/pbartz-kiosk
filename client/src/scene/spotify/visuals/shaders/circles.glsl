varying vec3 vUv;
uniform vec2 u_resolution;
uniform float u_radius;
uniform float iTime;
uniform float bars[7]; // Define bars as uniform array of 7 floats

void main() {
    vec2 uv = vUv.xy;
    uv.x *= u_resolution.x / u_resolution.y;
    uv.x += 2.;

    // float dist = distance(uv, vec2(0.0));
    // // float d = (1.3 * u_radius) / pow(dist, 2.0);
    // float d = smoothstep(u_radius*3., u_radius*3. - .1, dist);

    float d = 0.;

    for(int i = 0; i < 7; i++) {
        float dist = distance(uv, vec2(float(i) * .8+(u_radius*bars[i]*2. - .5), u_radius * bars[i]*3. + sin(float(i)*bars[i] + iTime + cos(float(i))) * .6));
        d += smoothstep(u_radius * 3., u_radius * 3. - .1, dist);
        // d += (.03 * u_radius) / pow(dist, 3.1);
        d += smoothstep(bars[i], bars[i] - .1, dist);
    }

    vec3 col = vec3(0.9, .3, .2) * d;
    gl_FragColor = vec4(col, 1.);
}