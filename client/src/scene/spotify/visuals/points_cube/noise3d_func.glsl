//#UNIFORMS_START#
uniform float u_seed;
uniform float u_period;
uniform int u_harmonics;
uniform float u_harmonic_spread;
uniform float u_harmonic_gain;
uniform float u_exponent;
uniform float u_amplitude;
uniform float u_offset;
//#UNIFORMS_END#

// Simplex 3D Noise (Ashima Arts - Stefan Gustavson)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 =   v - i + dot(i, C.xxx) ;

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute( permute( permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m*m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                    dot(p2,x2), dot(p3,x3) ) );
}

float fbm(vec3 p) {
    float value = 0.0;
    float amplitude_fbm = 0.5;
    float frequency = 1.0;

    for (int i = 0; i < u_harmonics; i++) {
        value += snoise(p * frequency) * amplitude_fbm;
        frequency *= u_harmonic_spread;
        amplitude_fbm *= u_harmonic_gain;
    }
    return value;
}

// Helper to calculate noise value (either snoise or fbm)
float getNoiseValue(vec3 coord) {
    if (u_harmonics == 0) {
        return snoise(coord);
    } else {
        return fbm(coord);
    }
}

// Helper to apply post-processing (amplitude, offset, exponent)
float postProcessNoise(float noise_val) {
    float processed_val = noise_val * u_amplitude + u_offset;
    processed_val = pow(max(0.0, processed_val), u_exponent);
    return clamp(processed_val, 0.0, 1.0);
}


vec3 colorNoise(vec3 params, bool u_monochrome) {
    vec2 scaled_st = params.xy;

    float final_r, final_g, final_b;

    if (u_monochrome) {
        vec3 coord = vec3(scaled_st * u_period + u_seed, params.z + u_seed);
        float noise_val = getNoiseValue(coord);
        float processed_val = postProcessNoise(noise_val);
        final_r = processed_val;
        final_g = processed_val;
        final_b = processed_val;
    } else {
        // Define slightly different seeds or coordinate offsets for R, G, B
        // These offsets ensure each color channel samples a different part of the noise field.
        float seedR = u_seed;
        float seedG = u_seed + 13.78; // Arbitrary offset
        float seedB = u_seed - 27.31; // Arbitrary offset

        vec3 coordR = vec3(scaled_st * u_period + seedR, params.z + seedR);
        vec3 coordG = vec3(scaled_st * u_period + seedG, params.z + seedG);
        vec3 coordB = vec3(scaled_st * u_period + seedB, params.z + seedB);

        float noise_r_raw = getNoiseValue(coordR);
        float noise_g_raw = getNoiseValue(coordG);
        float noise_b_raw = getNoiseValue(coordB);

        final_r = postProcessNoise(noise_r_raw);
        final_g = postProcessNoise(noise_g_raw);
        final_b = postProcessNoise(noise_b_raw);
    }

    return vec3(final_r, final_g, final_b);
}