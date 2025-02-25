varying vec3 vUv;
uniform vec2 u_resolution;
uniform float u_radius;
uniform float iTime;
uniform float bars[7]; // Define bars as uniform array of 7 floats

void main() {
    vec2 uv = vUv.xy;
    uv.x *= u_resolution.x / u_resolution.y;
    // uv.x = sin(iTime) * 4. - 2.;

    float dist = distance(uv, vec2(sin(iTime/2.)*2., bars[2])); // Uncomment and use the dist variable in calculations
    float d = smoothstep(u_radius * 3., u_radius * 3. - bars[1], dist); // Use dist for smoothstep calculation


    vec3 col = vec3(0.9, .3, .2) * d;
    gl_FragColor = vec4(col, 1.);
}