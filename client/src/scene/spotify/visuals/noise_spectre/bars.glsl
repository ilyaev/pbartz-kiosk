varying vec3 vUv;
uniform vec2 u_resolution;
uniform float u_radius;
uniform float iTime;
uniform sampler2D spectre;
uniform float bars[32]; // Define bars as uniform array of 7 floats

uniform float u_noise_scale;
uniform float u_noise_strength;
uniform float u_noise_offset;

// --- Simplex Noise Functions (by Stefan Gustavson, adapted) ---

// Helper: mod289 (for vec3, used in permute(vec3))
vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

// Helper: mod289 (for vec4, kept for completeness)
vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

// ADDED: permute for vec3 (used in this snoise(vec2) implementation)
vec3 permute(vec3 x) {
  return mod289(((x*34.0)+1.0)*x);
}

// Original: permute for vec4 (kept for completeness)
vec4 permute(vec4 x) {
     return mod289(((x*34.0)+1.0)*x);
}

// ADDED: taylorInvSqrt for vec3 (used in this snoise(vec2) implementation)
vec3 taylorInvSqrt(vec3 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

// Original: taylorInvSqrt for vec4 (kept for completeness)
vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

// snoise function for 2D input
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                      0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                     -0.577350269189626,  // -1.0 + 2.0 * C.x
                      0.024390243902439); // 1.0 / 41.0
  // First corner
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);

  // Other corners
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);

  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;

  // Permutations
  // i = mod289(i); // OLD: Incorrect for vec2 i with the provided mod289
  i = mod(i, 289.0); // CORRECTED: Use built-in mod for vec2

  // The permute calls will now correctly use permute(vec3)
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
		+ i.x + vec3(0.0, i1.x, 1.0 ));

  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;

  // Gradients
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;

  // Normalise gradients implicitly by scaling m
  // taylorInvSqrt will now correctly use taylorInvSqrt(vec3)
  m *= taylorInvSqrt(a0*a0 + h*h);

  // Compute final noise value at P
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

vec3 renderPlasma(vec2 uv) {
    for(float i = 1.0; i < 3.0; i++){
        uv.x += .6 / i * cos(i * 2.5* uv.y + iTime);
        uv.y += 0.6 / i * cos(i * 3.5 * uv.y + iTime);
    }
    uv.x -= iTime/100.;
    vec3 col = .5 + 0.5*sin(iTime*5. + uv.yyy + vec3(iTime,2. + iTime,4. + iTime));
    return col/(2.1*abs(cos(iTime-uv.x)));
    // return col/(2.1*abs(cos(uv.x * 2.)));
}

vec3 renderPlasmaOriginal(vec2 uv) {
    for(float i = 1.0; i < 10.0; i++){
        uv.x += 0.6 / i * cos(i * 2.5* uv.y + iTime);
        uv.y += 0.6 / i * cos(i * 1.5 * uv.x + iTime);
    }
    vec3 col = 0.5 + 0.5*sin(iTime+uv.xyx+vec3(0,2,4));
    return col/(2.1*abs(cos(iTime-uv.y-uv.x)));
}

void main() {
    vec2 uv = vUv.xy / 4.5 + .5;

    // float l = length(uv);
    // float a = atan(uv.x, uv.y);

    // uv = vec2(l, a);

   float noise = snoise((uv + vec2(sin(iTime*.2), cos(iTime*.3))) * u_noise_scale);
    noise = (noise + 1.0) * 0.5; // Remap from [-1, 1] to [0, 1]
    float noise_modifier = noise * u_noise_strength + u_noise_offset;

    vec3 spectre_color = texture2D(spectre, vec2(uv.x, 0.1)).rgb;

    // Ensure noise_modifier is not zero or too small to avoid extreme values
    // A small positive u_noise_offset usually handles this.
    // You might want to add a safeguard like: noise_modifier = max(noise_modifier, 0.001);
    vec3 col = spectre_color / noise_modifier;

    // col /= renderPlasmaOriginal(uv).b;

    gl_FragColor = vec4(col, 1.);
}
