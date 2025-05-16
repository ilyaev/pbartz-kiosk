// --- Noise Helper Function (Permutation) ---
// Required for the noise3d function provided by the user.
vec4 permute(vec4 t){
    return mod(((t*34.0)+1.0)*t, 289.0); // Standard permute
}

// --- 3D Noise Function ---
// Provides a smooth, animating noise value for any given 3D coordinate (x, y, time).
// Based on the structure provided by the user.
// Expected output range is [0, 1].
float noise3d(vec3 p){
    vec3 a = floor(p); // Integer part of the coordinate
    vec3 d = p - a;    // Fractional part of the coordinate
    // Apply a smooth Hermite spline interpolation (3t^2 - 2t^3)
    d = d * d * (3.0 - 2.0 * d);

    // Calculate permutations and hashes for interpolation
    vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
    vec4 k1 = permute(b.xyxy);
    vec4 k2 = permute(k1.xyxy + b.zzww);

    vec4 c = k2 + a.zzzz;
    vec4 k3 = permute(c); // Permutations for z=a.z plane
    vec4 k4 = permute(c + 1.0); // Permutations for z=a.z + 1.0 plane

    // Map hash values to [0, 1) range
    vec4 o1 = fract(k3 * (1.0 / 41.0)); // Values for z=a.z plane corners
    vec4 o2 = fract(k4 * (1.0 / 41.0)); // Values for z=a.z + 1.0 plane corners

    // Interpolate between the two Z planes
    vec4 o3_interp_z = o2 * d.z + o1 * (1.0 - d.z); // Correctly interpolates vec4s in Z

    // Interpolate in X and Y using the Z-interpolated values (o3_interp_z)
    // Based on user's provided structure.
    vec2 o4_interp_xy = o3_interp_z.yw * d.x + o3_interp_z.xz * (1.0 - d.x); // Interpolates x

    // Final interpolation in Y
    return o4_interp_xy.y * d.y + o4_interp_xy.x * (1.0 - d.y); // Interpolates y

    // This function outputs a value in the [0, 1] range.
}
