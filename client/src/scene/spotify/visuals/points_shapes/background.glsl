// =====================
// Uniforms and Varyings
// =====================
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

// =====================
// Utility Functions
// =====================
// Simple hash-based noise function for pseudo-randomness
float n21(vec2 p) {
    return fract(sin(p.x*123.231 + p.y*4432.342)*33344.22);
}

// 2D rotation matrix (not used, but available for optional grid rotation)
mat2 rotate2d(float angle) {
    return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
}

// =====================
// Main Fragment Shader
// =====================
void main() {
    // Sample the main scene texture
    vec4 color = texture2D(tDiffuse, vUv);

    // --- Generate pseudo-random values for grid layout and animation ---
    float n = n21(vec2(floor(rmsSpeed), 1.));
    float rows = floor(3. + (fract(n*10.23)*4. - 2.));
    float nt = fract(n*1232.22)*3.;

    // Calculate shifting for grid animation
    vec2 shift = vec2(sin(nt*10.)*.3, cos(nt*5.)*.3) - vec2(.14, .14);

    float speedTick = floor(rmsSpeed);
    float phase = 1.;

    phase = 1.0 - 2.0 * step(0.5, mod(speedTick, 2.0));

    // Alternate shift direction based on random value
    float dir = step(0.5, fract(n*3222.3322));
    shift += vec2(
        (1.0 - dir) * phase * sin(fract(rmsSpeed) * 3.14/2.) * 0.2,
        dir * phase * sin(fract(rmsSpeed) * 3.14/2.) * 0.2
    );

    // Calculate tiled UVs for grid
    vec2 tUv = vUv * vec2(1., 1./1.333) * vec2(rows, rows) + shift;
    // Optionally rotate the grid (commented out)
    // tUv = rotate2d(sin(fract(iTime*(.1 + n *.3) + nt*10.33)*3.14)) * (tUv - vec2(0.5)) + vec2(0.5);

    // Get local UV and grid index
    vec2 uv = fract(tUv);
    vec2 idx = floor(tUv);
    float id = idx.x + idx.y * rows;

    // --- Determine which tile is active and apply vignette ---
    float current = n * rows * rows;
    float dim = sin(fract(rmsSpeed) * 3.14) * float((floor(current) == id));

    // Replace smoothstep with a simple linear falloff for vignette (faster)
    float vignette = clamp((0.5 - distance(uv, vec2(0.5))) / 0.4, 0.0, 1.0);
    dim *= vignette;

    // Sample cover art texture for the active tile
    vec3 coverColor = texture2D(cover, uv).rgb * dim;

    // --- Background color calculation ---
    vec3 col = coverColor;
    // Optimized radial falloff: avoid pow and abs, use squared distance
    float d = length(vUv / 3. - vec2(0.5) - 0.3);
    float bg = 0.3 / (d * d + 0.001); // Add small value to avoid div by zero

    // Generate background color based on noise
    float nn = n21(vec2(floor(rmsSpeed + 1.), 1.));
    vec3 currentBgColor = vec3(n, fract(n*12.22), fract(n*123.22))*.5;
    vec3 nextBgColor = vec3(nn, fract(nn*12.22), fract(nn*123.22))*.5;
    vec3 bgColor = mix(currentBgColor, nextBgColor, fract(rmsSpeed));

    // Optionally add animated background
    float hPos = (sin(rmsSpeed*10.) * 0.5 + 0.5) * rows;
    float vPos = (cos(rmsSpeed) * 0.5 + 0.5) * (rows / 1.333);
    col /= bg * (bgColor*12.);

    col += (
        float((abs(hPos - idx.x) < 1.)) * (1. - abs(hPos - idx.x))
        + float((abs(vPos - idx.y) < 1.)) * (1. - abs(vPos - idx.y))
    ) * bgColor * (.5 + 1.8 * kick) * bg;

    // Uncomment to add background color directly
    // col += bg * bgColor;

    // --- Output final color ---
    // Use the original color if not black, otherwise use the generated background
    float colorWeight = color.r + color.g + color.b;
    gl_FragColor = vec4(col, 1.);
    gl_FragColor *= float(!(colorWeight > 0.0));
    gl_FragColor += color * float(colorWeight > 0.0);
}
